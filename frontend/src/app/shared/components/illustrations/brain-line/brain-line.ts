import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-brain-line',
  template: `
    <img
      class="psych-png psych-png--brain"
      [class.psych-png--fallback]="useFallback()"
      [src]="src()"
      alt=""
      aria-hidden="true"
      (error)="onError()"
    />
  `,
  styleUrl: './brain-line.scss',
})
export class BrainLine {
  readonly useFallback = signal(false);
  readonly src = signal('assets/illustrations/brain-line.png');

  onError(): void {
    if (!this.useFallback()) {
      this.useFallback.set(true);
      this.src.set('assets/illustrations/brain-line.svg');
    }
  }
}
