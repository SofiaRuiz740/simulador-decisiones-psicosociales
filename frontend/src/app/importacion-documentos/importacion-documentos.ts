import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import {
  ArchivoFuente,
  ExtrasService,
  ResultadoImportacion,
  ResultadoImportacionRubrica,
} from '../core/services/extras.service';
import { CasosService } from '../core/services/casos.service';

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
  private readonly casos = inject(CasosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly archivo = signal<ArchivoFuente | null>(null);
  readonly tab = signal('caso');
  readonly resultadoEstudiantes = signal<ResultadoImportacion | null>(null);
  readonly resultadoGrupos = signal<ResultadoImportacion | null>(null);
  readonly resultadoRubrica = signal<ResultadoImportacionRubrica | null>(null);
  /** Problemas detectados al crear caso desde archivo (RF14/RN11). */
  readonly problemasCasoCreado = signal<{ codigo: string; mensaje: string }[] | null>(null);
  /** Casos del docente para el selector de rúbrica. */
  readonly casosDisponibles = signal<{ id: number; nombre: string }[]>([]);
  rubricaCasoId: number | null = null;
  nombreCasoVal = '';
  areaCasoVal = '';

  readonly tabs = [
    { id: 'caso', label: 'Caso' },
    { id: 'estudiantes', label: 'Estudiantes' },
    { id: 'grupos', label: 'Grupos' },
    { id: 'rubrica', label: 'Rúbrica' },
    { id: 'plantillas', label: 'Plantillas' },
  ];

  readonly plantillas = [
    { titulo: 'Plantilla estudiantes', formato: 'Excel', tipo: 'estudiantes' as const },
    { titulo: 'Plantilla grupos', formato: 'Excel', tipo: 'grupos' as const },
    { titulo: 'Plantilla caso', formato: 'DOCX', tipo: 'caso' as const },
    { titulo: 'Plantilla rúbrica', formato: 'Excel', tipo: 'rubrica' as const },
    { titulo: 'Guía de importación', formato: 'PDF', tipo: 'guia' as const },
    { titulo: 'Caso ejemplo', formato: 'DOCX', tipo: 'ejemplo' as const },
  ];

  // Carga lazy de casos al entrar a la tab rúbrica.
  private readonly _loadCasosOnRubrica = effect(() => {
    if (this.tab() === 'rubrica') this.cargarCasosParaRubrica();
  });

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

  seleccionarEstudiantes(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.loading.set(true);
    this.resultadoEstudiantes.set(null);
    this.servicio.importarEstudiantes(file).subscribe({
      next: (res) => {
        this.resultadoEstudiantes.set(res);
        this.loading.set(false);
        const msg = res.errores.length
          ? `Importación parcial: ${res.filas_exitosas}/${res.filas_procesadas} filas.`
          : `Importados ${res.filas_exitosas} estudiantes correctamente.`;
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.archivo?.[0] || 'No se pudo importar el archivo.';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
    (ev.target as HTMLInputElement).value = '';
  }

  seleccionarGrupos(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.loading.set(true);
    this.resultadoGrupos.set(null);
    this.servicio.importarGrupos(file).subscribe({
      next: (res) => {
        this.resultadoGrupos.set(res);
        this.loading.set(false);
        const msg = res.errores.length
          ? `Importación parcial: ${res.filas_exitosas}/${res.filas_procesadas} filas.`
          : `Importados ${res.filas_exitosas} grupos correctamente.`;
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.archivo?.[0] || 'No se pudo importar el archivo.';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
    (ev.target as HTMLInputElement).value = '';
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
    this.problemasCasoCreado.set(null);
    this.servicio.crearCasoDesdeArchivo(a.id, this.nombreCasoVal, this.areaCasoVal).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snackBar.open('Caso creado en estado revisión.', 'OK', { duration: 2500 });
        // Tras crear, validamos para mostrar lo que falta antes de redirigir.
        this.casos.validarCaso(res.caso_id).subscribe({
          next: (val) => {
            this.problemasCasoCreado.set(val.problemas);
            // Si el caso quedó bien, vamos al editor; si hay problemas, los mostramos
            // en el panel para que el docente complete antes de seguir.
            if (val.valido) {
              this.router.navigate(['/casos', res.caso_id]);
            } else {
              this.snackBar.open(
                `${val.problemas.length} elemento(s) por completar. Revisa el panel.`,
                'Abrir caso',
                { duration: 6000 },
              ).onAction().subscribe(() => this.router.navigate(['/casos', res.caso_id]));
            }
          },
          error: () => this.router.navigate(['/casos', res.caso_id]),
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo crear el caso.', 'OK', { duration: 3500 });
      },
    });
  }

  /** Carga la lista de casos cuando el docente entra a la tab Rúbrica. */
  cargarCasosParaRubrica(): void {
    if (this.casosDisponibles().length) return;
    this.casos.listarCasos().subscribe({
      next: (resp) => this.casosDisponibles.set(
        resp.results.map((c) => ({ id: c.id, nombre: c.nombre })),
      ),
      error: () => this.snackBar.open(
        'No se pudieron cargar los casos.', 'OK', { duration: 3500 },
      ),
    });
  }

  seleccionarRubrica(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file || !this.rubricaCasoId) {
      this.snackBar.open(
        'Selecciona primero un caso destino para asociar la rúbrica.',
        'OK', { duration: 3500 },
      );
      (ev.target as HTMLInputElement).value = '';
      return;
    }
    this.loading.set(true);
    this.resultadoRubrica.set(null);
    this.servicio.importarRubrica(this.rubricaCasoId, file).subscribe({
      next: (res) => {
        this.resultadoRubrica.set(res);
        this.loading.set(false);
        const msg = res.errores.length
          ? `Importación parcial: ${res.criterios_importados} criterio(s) cargados, ${res.errores.length} error(es).`
          : `${res.criterios_importados} criterio(s) importados a la rúbrica.`;
        this.snackBar.open(msg, 'OK', { duration: 4500 });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.detail || err?.error?.archivo?.[0] || 'No se pudo importar la rúbrica.';
        this.snackBar.open(msg, 'OK', { duration: 4500 });
      },
    });
    (ev.target as HTMLInputElement).value = '';
  }

  descargarPlantilla(p: { titulo: string; tipo: 'estudiantes' | 'grupos' | 'caso' | 'rubrica' | 'guia' | 'ejemplo' }): void {
    const handlers: Record<string, () => void> = {
      estudiantes: () => this.servicio.descargarPlantillaEstudiantes().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'plantilla-estudiantes.xlsx'),
        error: () => this.snackBar.open('No se pudo descargar la plantilla.', 'OK', { duration: 3500 }),
      }),
      grupos: () => this.servicio.descargarPlantillaGrupos().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'plantilla-grupos.xlsx'),
        error: () => this.snackBar.open('No se pudo descargar la plantilla.', 'OK', { duration: 3500 }),
      }),
      caso: () => this.servicio.descargarPlantillaCaso().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'plantilla-caso.docx'),
        error: () => this.snackBar.open('No se pudo descargar la plantilla.', 'OK', { duration: 3500 }),
      }),
      rubrica: () => this.servicio.descargarPlantillaRubrica().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'plantilla-rubrica.xlsx'),
        error: () => this.snackBar.open('No se pudo descargar la plantilla.', 'OK', { duration: 3500 }),
      }),
      guia: () => this.servicio.descargarGuiaImportacion().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'guia-importacion.pdf'),
        error: () => this.snackBar.open('No se pudo descargar la guía.', 'OK', { duration: 3500 }),
      }),
      ejemplo: () => this.servicio.descargarCasoEjemplo().subscribe({
        next: (blob) => this.servicio.descargarArchivo(blob, 'caso-ejemplo.docx'),
        error: () => this.snackBar.open('No se pudo descargar el ejemplo.', 'OK', { duration: 3500 }),
      }),
    };
    handlers[p.tipo]?.();
  }
}
