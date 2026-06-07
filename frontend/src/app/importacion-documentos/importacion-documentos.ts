import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ArchivoFuente, ExtrasService } from '../core/services/extras.service';

@Component({
  selector: 'app-importacion-documentos',
  imports: [
    CommonModule,
    FormsModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './importacion-documentos.html',
  styleUrl: './importacion-documentos.scss',
})
export class ImportacionDocumentos {
  private readonly servicio = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly archivo = signal<ArchivoFuente | null>(null);
  readonly tab = signal('caso');
  nombreCasoVal = '';
  areaCasoVal = '';

  readonly tabs = [
    { id: 'caso', label: 'Caso' },
    { id: 'estudiantes', label: 'Estudiantes' },
    { id: 'grupos', label: 'Grupos' },
    { id: 'plantillas', label: 'Plantillas' },
  ];

  readonly plantillas = [
    { titulo: 'Plantilla caso', formato: 'DOCX' },
    { titulo: 'Plantilla estudiantes', formato: 'Excel' },
    { titulo: 'Plantilla grupos', formato: 'Excel' },
    { titulo: 'Plantilla rúbrica', formato: 'Excel' },
    { titulo: 'Guía de importación', formato: 'PDF' },
    { titulo: 'Caso ejemplo', formato: 'DOCX' },
  ];

  readonly pasoActual = computed(() => {
    const a = this.archivo();
    if (!a) return 1;
    if (!a.texto_extraido) return 2;
    return 3;
  });

  vistaPrevia(): string {
    const txt = this.archivo()?.texto_extraido ?? '';
    return txt.length > 1500 ? txt.slice(0, 1500) + '…' : txt;
  }

  seleccionar(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.loading.set(true);
    this.servicio.subirArchivo(file).subscribe({
      next: (a) => {
        this.archivo.set(a);
        this.nombreCasoVal = a.nombre_original.replace(/\.[^.]+$/, '');
        this.loading.set(false);
        this.snackBar.open('Archivo subido. Procesa para extraer el texto.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(err?.error?.archivo?.[0] || 'No se pudo subir.', 'OK', { duration: 4000 });
      },
    });
  }

  procesar() {
    const a = this.archivo();
    if (!a) return;
    this.loading.set(true);
    this.servicio.procesarArchivo(a.id).subscribe({
      next: (res) => {
        this.archivo.set(res);
        this.loading.set(false);
        this.snackBar.open('Texto extraído.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo procesar.', 'OK', { duration: 3500 });
      },
    });
  }

  crearCaso() {
    const a = this.archivo();
    if (!a) return;
    this.loading.set(true);
    this.servicio.crearCasoDesdeArchivo(a.id, this.nombreCasoVal, this.areaCasoVal).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snackBar.open('Caso creado. Te llevamos al editor.', 'OK', { duration: 2500 });
        this.router.navigate(['/casos', res.caso_id]);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo crear el caso.', 'OK', { duration: 3500 });
      },
    });
  }

  avisoImportacion(tipo: string): void {
    this.snackBar.open(`Importación de ${tipo} disponible próximamente.`, 'OK', { duration: 3500 });
  }

  descargarPlantilla(nombre: string): void {
    this.snackBar.open(`Descarga de «${nombre}» disponible próximamente.`, 'OK', { duration: 3000 });
  }
}
