import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-participaciones',
  templateUrl: './participaciones.html',
  styleUrl: './participaciones.scss',
})
export class Participaciones {
  readonly tab = signal<'seguimiento' | 'simulacion'>('seguimiento');

  readonly tabs = [
    { id: 'seguimiento' as const, label: 'Seguimiento docente' },
    { id: 'simulacion' as const, label: 'Vista previa simulación' },
  ];

  readonly columnasSeguimiento = [
    'Estudiante', 'Práctica', 'Caso', 'Estado', 'Progreso', 'Tiempo',
    'Restante', 'Intentos', 'Resp.',
  ];
}
