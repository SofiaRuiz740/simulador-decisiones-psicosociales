import { Condicion } from './condicion.model';

export type CategoriaHipotesis =
  | 'diagnostica'
  | 'etiologica'
  | 'dinamica_familiar'
  | 'riesgo'
  | 'recursos'
  | 'otra';

export interface Hipotesis {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaHipotesis;
  evidenciasSoporte?: string[];
  personajesRelacionados?: string[];
  requisitosFormulacion?: Condicion[];
  /** Indicadores narrativos que sugieren esta hipótesis (pistas, no respuestas correctas). */
  indicadoresNarrativos?: string[];
}
