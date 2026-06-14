import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';

import {
  ArchivoFuente,
  ExtrasService,
  ResultadoImportacion,
  ResultadoImportacionRubrica,
} from '../core/services/extras.service';
import { CasosService } from '../core/services/casos.service';
import { mensajeErrorHttpBlob } from '../core/utils/http-error';

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
  readonly casosCargados = signal(false);
  readonly cargandoCasos = signal(false);
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

  private mostrarError(err: unknown, fallback: string): void {
    const httpErr = err as HttpErrorResponse;
    void mensajeErrorHttpBlob(httpErr, fallback).then((msg) => {
      this.snackBar.open(msg, 'OK', { duration: 5000 });
    });
  }

  private textoExtraccionInvalido(texto: string): boolean {
    const t = texto.trim();
    return !t
      || t.startsWith('[Error al extraer')
      || t.startsWith('[DOCX no soportado');
  }

  seleccionar(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('El archivo supera el límite de 10 MB.', 'OK', { duration: 4000 });
      input.value = '';
      return;
    }
    this.loading.set(true);
    this.problemasCasoCreado.set(null);
    this.archivo.set(null);
    this.servicio.subirArchivo(file).pipe(
      switchMap((a) => {
        this.archivo.set(a);
        this.nombreCasoVal = a.nombre_original.replace(/\.[^.]+$/, '');
        return this.servicio.procesarArchivo(a.id);
      }),
    ).subscribe({
      next: (res) => {
        this.archivo.set(res);
        this.loading.set(false);
        if (this.textoExtraccionInvalido(res.texto_extraido)) {
          this.snackBar.open(
            res.texto_extraido || 'No se pudo extraer texto del documento.',
            'OK',
            { duration: 6000 },
          );
          return;
        }
        this.snackBar.open('Documento procesado. Revisa la vista previa y crea el caso.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err, 'No se pudo subir o procesar el documento.');
      },
    });
    input.value = '';
  }

  seleccionarEstudiantes(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
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
        this.mostrarError(err, 'No se pudo importar el archivo de estudiantes.');
      },
    });
    input.value = '';
  }

  seleccionarGrupos(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
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
        this.mostrarError(err, 'No se pudo importar el archivo de grupos.');
      },
    });
    input.value = '';
  }

  crearCaso() {
    const a = this.archivo();
    if (!a || this.textoExtraccionInvalido(a.texto_extraido)) return;
    this.loading.set(true);
    this.problemasCasoCreado.set(null);
    this.servicio.crearCasoDesdeArchivo(a.id, this.nombreCasoVal, this.areaCasoVal).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.snackBar.open('Caso creado en estado revisión.', 'OK', { duration: 2500 });
        this.casosCargados.set(false);
        this.casos.listarTodosCasos().subscribe({
          next: (lista) => {
            this.casosDisponibles.set(lista.map((c) => ({ id: c.id, nombre: c.nombre })));
            this.casosCargados.set(true);
          },
        });
        this.casos.validarCaso(res.caso_id).subscribe({
          next: (val) => {
            this.problemasCasoCreado.set(val.problemas);
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
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err, 'No se pudo crear el caso.');
      },
    });
  }

  /** Carga la lista de casos cuando el docente entra a la tab Rúbrica. */
  cargarCasosParaRubrica(): void {
    if (this.casosCargados() || this.cargandoCasos()) return;
    this.cargandoCasos.set(true);
    this.casos.listarTodosCasos().subscribe({
      next: (lista) => {
        this.casosDisponibles.set(lista.map((c) => ({ id: c.id, nombre: c.nombre })));
        this.casosCargados.set(true);
        this.cargandoCasos.set(false);
        if (!lista.length) {
          this.snackBar.open(
            'Aún no tienes casos. Importa o crea uno antes de cargar la rúbrica.',
            'OK',
            { duration: 4500 },
          );
        }
      },
      error: (err) => {
        this.cargandoCasos.set(false);
        this.mostrarError(err, 'No se pudieron cargar los casos.');
      },
    });
  }

  seleccionarRubrica(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.rubricaCasoId) {
      this.snackBar.open(
        'Selecciona primero un caso destino para asociar la rúbrica.',
        'OK', { duration: 3500 },
      );
      input.value = '';
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
        this.mostrarError(err, 'No se pudo importar la rúbrica.');
      },
    });
    input.value = '';
  }

  descargarPlantilla(p: { titulo: string; tipo: 'estudiantes' | 'grupos' | 'caso' | 'rubrica' | 'guia' | 'ejemplo' }): void {
    const handlers: Record<string, () => void> = {
      estudiantes: () => this.ejecutarDescarga(
        this.servicio.descargarPlantillaEstudiantes(),
        'plantilla-estudiantes.xlsx',
      ),
      grupos: () => this.ejecutarDescarga(
        this.servicio.descargarPlantillaGrupos(),
        'plantilla-grupos.xlsx',
      ),
      caso: () => this.ejecutarDescarga(
        this.servicio.descargarPlantillaCaso(),
        'plantilla-caso.docx',
      ),
      rubrica: () => this.ejecutarDescarga(
        this.servicio.descargarPlantillaRubrica(),
        'plantilla-rubrica.xlsx',
      ),
      guia: () => this.ejecutarDescarga(
        this.servicio.descargarGuiaImportacion(),
        'guia-importacion.pdf',
      ),
      ejemplo: () => this.ejecutarDescarga(
        this.servicio.descargarCasoEjemplo(),
        'caso-ejemplo.docx',
      ),
    };
    handlers[p.tipo]?.();
  }

  private ejecutarDescarga(
    peticion: ReturnType<ExtrasService['descargarPlantillaEstudiantes']>,
    nombreArchivo: string,
  ): void {
    this.loading.set(true);
    peticion.subscribe({
      next: (response) => {
        this.loading.set(false);
        try {
          this.servicio.guardarRespuestaDescarga(response, nombreArchivo);
          this.snackBar.open('Descarga iniciada.', 'OK', { duration: 2500 });
        } catch (err) {
          this.snackBar.open(
            err instanceof Error ? err.message : 'No se pudo descargar la plantilla.',
            'OK',
            { duration: 4500 },
          );
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.mostrarError(err, 'No se pudo descargar la plantilla.');
      },
    });
  }
}
