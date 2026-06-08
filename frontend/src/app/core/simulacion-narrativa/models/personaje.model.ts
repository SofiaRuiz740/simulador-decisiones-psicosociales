import { Condicion } from './condicion.model';
import { ConfigFatigaPersonaje } from './fatiga.model';
import { ConfigMemoriaNarrativa } from './memoria-narrativa.model';
import { MetricasPersonaje } from './metricas-personaje.model';

export type RolPersonaje =
  | 'consultante'
  | 'agresor_presunto'
  | 'menor'
  | 'familiar'
  | 'derivador'
  | 'testigo'
  | 'profesional'
  | 'otro';

export interface EstadoPersonajeLegacy {
  clave: string;
  valor: string | number | boolean;
}

export interface Personaje {
  id: string;
  nombre: string;
  rol: RolPersonaje;
  edad?: number;
  relacionFamilia?: string;
  descripcion: string;
  personalidad?: string;
  avatarUrl?: string;
  metricasIniciales?: Partial<MetricasPersonaje>;
  estadosIniciales?: EstadoPersonajeLegacy[];
  configFatiga?: ConfigFatigaPersonaje;
  memoriaNarrativa?: ConfigMemoriaNarrativa;
  revelaciones?: {
    id: string;
    titulo: string;
    contenido: string;
    requisitos?: Condicion[];
  }[];
}
