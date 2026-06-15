import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { Resultado } from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';
import { UxService } from '../core/services/ux.service';

@Component({
  selector: 'app-resultado',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './resultado.html',
  styleUrl: './resultado.scss',
})
export class ResultadoEstudiante implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(SimulacionService);
  private readonly auth = inject(AuthService);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly resultado = signal<Resultado | null>(null);
  readonly porcentaje = computed(() => {
    const r = this.resultado();
    if (!r) return 0;
    return Math.round(Number(r.nota_final));
  });

  readonly tierEmoji = computed(() => {
    const p = this.porcentaje();
    if (p >= 90) return '🏆';
    if (p >= 70) return '🎉';
    if (p >= 50) return '👍';
    if (p > 0) return '🌱';
    return '💪';
  });

  readonly tierTitulo = computed(() => {
    const p = this.porcentaje();
    if (p >= 90) return '¡Excelente!';
    if (p >= 70) return '¡Muy bien!';
    if (p >= 50) return 'Buen intento';
    if (p > 0) return 'Hay camino por recorrer';
    return 'Práctica registrada';
  });

  readonly tierMensaje = computed(() => {
    const p = this.porcentaje();
    if (p >= 90) return 'Dominio sobresaliente del caso.';
    if (p >= 70) return 'Comprendiste muy bien la situación.';
    if (p >= 50) return 'Vas por buen camino, sigue practicando.';
    if (p > 0) return 'Revisa la retroalimentación para mejorar.';
    return 'Lee con detalle la retroalimentación abajo.';
  });

  readonly escalaMax = computed(() => {
    const r = this.resultado();
    if (!r) return 100;
    // Usamos la nota_final + el peso para inferir escala: si nota está en 0-100, escala=100.
    return 100;
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/panel-estudiante']);
      return;
    }
    this.servicio.obtenerResultado(id).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.router.navigate(['/panel-estudiante']);
      },
    });
  }

  async salir(): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Cerrar sesión',
      mensaje: 'Vas a salir del simulador. Para volver a entrar necesitarás el código de acceso que te envió el docente.',
      variant: 'info',
      textoConfirmar: 'Cerrar sesión',
      icono: 'logout',
    });
    if (!ok) return;
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
