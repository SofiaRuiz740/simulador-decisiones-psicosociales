import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ArchivoFuente, ExtrasService } from '../core/services/extras.service';

@Component({
  selector: 'app-importacion-documentos',
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <section class="page">
      <header class="hero-block anim-fade-up">
        <div class="hero-text">
          <span class="kicker">Contenido</span>
          <h1>Importar caso desde documento</h1>
          <p>
            Sube un PDF o TXT con un caso ya escrito. Extraemos el texto y
            generamos un caso "En revisión" para que lo termines de editar.
          </p>
        </div>
        <div class="hero-icon">
          <mat-icon>upload_file</mat-icon>
        </div>
      </header>

      <!-- Stepper visual -->
      <div class="stepper">
        @for (s of pasos; track s.num) {
          <div class="step-pill"
            [class.actual]="pasoActual() === s.num"
            [class.hecho]="pasoActual() > s.num">
            <span class="num">{{ s.num }}</span>
            <div class="info">
              <strong>{{ s.titulo }}</strong>
              <span>{{ s.sub }}</span>
            </div>
            @if (pasoActual() > s.num) {
              <mat-icon class="check">check_circle</mat-icon>
            }
          </div>
        }
      </div>

      <!-- PASO 1: SUBIR -->
      <article class="step-card anim-fade-up" [class.active]="pasoActual() === 1">
        <header>
          <span class="num">1</span>
          <div>
            <h2>Subir archivo</h2>
            <p>Formatos aceptados: PDF, TXT (DOCX con extracción básica).</p>
          </div>
        </header>

        <div class="dropzone" (click)="fileInput.click()">
          <mat-icon>cloud_upload</mat-icon>
          <strong>Toca para seleccionar un archivo</strong>
          <small>Máx 10 MB. Aceptamos PDF, TXT o DOCX.</small>
        </div>
        <input #fileInput type="file" accept=".pdf,.txt,.docx" hidden (change)="seleccionar($event)" />

        @if (archivo(); as a) {
          <div class="file-info">
            <mat-icon>description</mat-icon>
            <div>
              <strong>{{ a.nombre_original }}</strong>
              <span>{{ a.tipo }} · {{ a.estado_display }}</span>
            </div>
          </div>
        }
      </article>

      <!-- PASO 2: PROCESAR -->
      @if (archivo()) {
        <article class="step-card anim-fade-up" [class.active]="pasoActual() === 2">
          <header>
            <span class="num">2</span>
            <div>
              <h2>Extraer texto</h2>
              <p>Procesamos el contenido del documento para que puedas revisarlo.</p>
            </div>
          </header>
          <button mat-flat-button color="primary" class="btn-accion"
            (click)="procesar()"
            [disabled]="loading() || archivo()!.estado !== 'SUBIDO'">
            <mat-icon>auto_fix_high</mat-icon> Procesar
          </button>

          @if (archivo()!.texto_extraido) {
            <div class="preview">
              <div class="preview-head">
                <mat-icon>article</mat-icon>
                <strong>Vista previa</strong>
              </div>
              <pre>{{ vistaPrevia() }}</pre>
            </div>
          }
        </article>
      }

      <!-- PASO 3: CREAR -->
      @if (archivo()?.texto_extraido) {
        <article class="step-card anim-fade-up" [class.active]="pasoActual() === 3">
          <header>
            <span class="num">3</span>
            <div>
              <h2>Crear caso</h2>
              <p>El caso se creará en estado "En revisión" para que lo edites con el editor estándar.</p>
            </div>
          </header>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre del caso</mat-label>
            <input matInput [(ngModel)]="nombreCasoVal" required maxlength="200" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Área psicosocial (opcional)</mat-label>
            <input matInput [(ngModel)]="areaCasoVal" maxlength="150" />
          </mat-form-field>

          <button mat-flat-button color="primary" class="btn-accion"
            (click)="crearCaso()" [disabled]="loading() || !nombreCasoVal.trim()">
            <mat-icon>create</mat-icon> Crear caso en revisión
          </button>
        </article>
      }

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; max-width: 920px; margin: 0 auto; }

    .hero-block .hero-icon {
      flex-shrink: 0;
      width: 80px; height: 80px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
      color: var(--mat-sys-on-primary);
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 30px color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
    }

    .stepper {
      display: flex; gap: 0.5rem; flex-wrap: wrap;
      .step-pill {
        flex: 1 1 220px;
        display: flex; align-items: center; gap: 0.7rem;
        padding: 0.7rem 0.95rem;
        background: var(--mat-sys-surface);
        border-radius: 14px;
        border: 1px solid var(--mat-sys-outline-variant);
        opacity: 0.6;
        transition: all 200ms ease;

        .num {
          flex-shrink: 0;
          width: 32px; height: 32px;
          border-radius: 10px;
          background: var(--mat-sys-surface-container);
          color: var(--mat-sys-on-surface);
          display: inline-flex; align-items: center; justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
        }
        .info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
        strong { font-size: 0.92rem; }
        span { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
        .check { color: var(--mat-sys-primary); }

        &.actual {
          opacity: 1;
          border-color: var(--mat-sys-primary);
          box-shadow: 0 8px 22px color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
          .num { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); }
        }
        &.hecho {
          opacity: 1;
          .num { background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent); color: var(--mat-sys-primary); }
        }
      }
    }

    .step-card {
      padding: 1.5rem;
      background: var(--mat-sys-surface);
      border-radius: 20px;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      display: flex; flex-direction: column; gap: 0.85rem;
      opacity: 0.75;
      transition: opacity 200ms ease, border-color 200ms ease;

      &.active {
        opacity: 1;
        border-color: var(--mat-sys-primary);
      }

      header {
        display: flex; align-items: center; gap: 0.85rem;
        .num {
          flex-shrink: 0;
          width: 42px; height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          color: var(--mat-sys-on-primary);
          display: inline-flex; align-items: center; justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800; font-size: 1.1rem;
        }
        h2 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.1rem; font-weight: 700; }
        p { margin: 0.15rem 0 0; color: var(--mat-sys-on-surface-variant); font-size: 0.88rem; }
      }
    }

    .dropzone {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
      padding: 2rem 1.5rem;
      background: var(--mat-sys-surface-container-low);
      border: 2px dashed var(--mat-sys-outline-variant);
      border-radius: 16px;
      cursor: pointer;
      transition: all 200ms ease;
      text-align: center;

      &:hover {
        background: color-mix(in srgb, var(--mat-sys-primary) 6%, var(--mat-sys-surface));
        border-color: var(--mat-sys-primary);
      }

      mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--mat-sys-primary); }
      strong { font-family: 'Plus Jakarta Sans', sans-serif; }
      small { color: var(--mat-sys-on-surface-variant); }
    }

    .file-info {
      display: flex; align-items: center; gap: 0.7rem;
      padding: 0.7rem 1rem;
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
      border-radius: 12px;
      mat-icon { color: var(--mat-sys-primary); }
      strong { font-weight: 700; }
      span { font-size: 0.82rem; color: var(--mat-sys-on-surface-variant); display: block; }
    }

    .preview {
      border-radius: 14px;
      background: var(--mat-sys-surface-container-low);
      padding: 0.85rem 1rem;

      .preview-head {
        display: flex; align-items: center; gap: 0.4rem;
        margin-bottom: 0.5rem;
        mat-icon { color: var(--mat-sys-primary); font-size: 18px; width: 18px; height: 18px; }
      }
      pre {
        margin: 0; padding: 0;
        white-space: pre-wrap; word-wrap: break-word;
        font-size: 0.85rem; line-height: 1.5;
        max-height: 300px; overflow-y: auto;
        font-family: 'Inter', sans-serif;
      }
    }

    .btn-accion {
      display: inline-flex; align-items: center; gap: 0.4rem;
      align-self: flex-start;
      height: 44px; padding: 0 1.2rem;
      border-radius: 12px; font-weight: 600;
    }

    .full { width: 100%; }
  `],
})
export class ImportacionDocumentos {
  private readonly servicio = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly archivo = signal<ArchivoFuente | null>(null);
  nombreCasoVal = '';
  areaCasoVal = '';

  readonly pasos = [
    { num: 1, titulo: 'Subir', sub: 'PDF o TXT desde tu equipo' },
    { num: 2, titulo: 'Extraer', sub: 'Procesamos el texto' },
    { num: 3, titulo: 'Crear', sub: 'Caso "En revisión" listo' },
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
        this.archivo.set(res); this.loading.set(false);
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
}
