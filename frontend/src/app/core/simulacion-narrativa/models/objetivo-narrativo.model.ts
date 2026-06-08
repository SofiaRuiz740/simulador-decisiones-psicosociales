import { Condicion } from './condicion.model';

export type CategoriaObjetivoNarrativo =
  | 'vinculo_terapeutico'
  | 'factores_riesgo'
  | 'contradicciones'
  | 'proteccion'
  | 'investigacion'
  | 'intervencion'
  | 'otro';

/**
 * Meta interna para análisis docente. Nunca se expone como objetivo de videojuego.
 */
export interface ObjetivoNarrativo {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaObjetivoNarrativo;
  requisitosCumplimiento: Condicion[];
  pesoAnalisis?: number;
}

export interface ObjetivoNarrativoEstado {
  objetivoId: string;
  cumplidoEn: string;
}
