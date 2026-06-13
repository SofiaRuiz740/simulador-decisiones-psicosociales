import { Component, input } from '@angular/core';

import { BrainLine } from '../brain-line/brain-line';
import { MeditationPerson } from '../meditation-person/meditation-person';
import { PlantWave } from '../plant-wave/plant-wave';

export type PsychologyDecorVariant = 'dashboard' | 'panel-zen';

@Component({
  selector: 'app-psychology-bg-decor',
  imports: [BrainLine, MeditationPerson, PlantWave],
  templateUrl: './psychology-bg-decor.html',
  styleUrl: './psychology-bg-decor.scss',
})
export class PsychologyBgDecor {
  readonly variant = input<PsychologyDecorVariant>('dashboard');
}
