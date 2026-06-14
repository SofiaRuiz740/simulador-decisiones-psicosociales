import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-meditation-person',
  template: `
    <img
      class="psych-png psych-png--meditation"
      [src]="src()"
      alt=""
      aria-hidden="true"
      (error)="onError()"
    />
  `,
  styleUrl: './meditation-person.scss',
})
export class MeditationPerson {
  readonly src = signal('assets/illustrations/meditation-person.png');

  onError(): void {
    if (!this.src().includes('.svg')) {
      this.src.set('assets/illustrations/meditation-person.svg');
    }
  }
}
