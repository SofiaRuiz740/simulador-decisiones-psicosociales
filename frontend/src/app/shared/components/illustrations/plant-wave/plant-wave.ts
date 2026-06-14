import { Component } from '@angular/core';

@Component({
  selector: 'app-plant-wave',
  template: `
    <svg class="plant-wave" viewBox="0 0 180 240" fill="none" aria-hidden="true">
      <path d="M90 210 L90 118" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />
      <path
        d="M90 118 C72 108 58 92 54 74 C50 58 58 44 72 36"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M90 118 C108 108 122 92 126 74 C130 58 122 44 108 36"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M72 36 C80 28 88 24 90 22 C92 24 100 28 108 36"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.9"
      />
      <path
        d="M62 52 C70 46 80 42 90 40 C100 42 110 46 118 52"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.75"
      />
      <path
        d="M58 68 C68 62 78 58 90 56 C102 58 112 62 122 68"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.65"
      />
      <path
        d="M64 86 C74 80 82 76 90 74 C98 76 106 80 116 86"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.55"
      />
      <path
        d="M70 100 C78 96 84 94 90 92 C96 94 102 96 110 100"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.45"
      />
      <path
        d="M20 196 Q50 178 90 184 T160 196"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.7"
      />
      <path
        d="M10 218 Q55 198 90 206 T170 218"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.5"
      />
      <path
        d="M30 228 Q70 214 90 220 T150 228"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        opacity="0.4"
      />
    </svg>
  `,
  styleUrl: './plant-wave.scss',
})
export class PlantWave {}
