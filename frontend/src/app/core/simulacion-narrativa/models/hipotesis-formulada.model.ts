export type TipoSoporteHipotesis = 'evidencia' | 'testimonio' | 'contradiccion';

export interface SoporteHipotesis {
  tipo: TipoSoporteHipotesis;
  entidadId: string;
}

export interface HipotesisFormuladaRuntime {
  hipotesisId: string;
  titulo?: string;
  formuladaEn: string;
  soportes: SoporteHipotesis[];
}
