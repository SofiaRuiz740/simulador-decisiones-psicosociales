import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-sidebar-zen',
  template: `
    <img
      class="sidebar-zen"
      [src]="src()"
      alt=""
      aria-hidden="true"
      draggable="false"
      (error)="onError()"
    />
  `,
  styleUrl: './sidebar-zen.scss',
})
export class SidebarZen {
  readonly src = signal('assets/illustrations/sidebar-zen.png');

  onError(): void {
    if (!this.src().includes('.svg')) {
      this.src.set('assets/illustrations/sidebar-zen.svg');
    }
  }
}
