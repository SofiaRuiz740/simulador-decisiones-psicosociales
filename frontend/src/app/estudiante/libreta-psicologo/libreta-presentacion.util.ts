import { RolPersonaje } from '../../core/simulacion-narrativa/models/personaje.model';
import { EstadoContradiccionInstancia } from '../../core/simulacion-narrativa/models/contradiccion-instancia.model';
import { TipoEntradaLineaTemporal } from '../../core/simulacion-narrativa/models/libreta.model';
import { MetricaPersonaje } from '../../core/simulacion-narrativa/models/metricas-personaje.model';

export type CategoriaMetrica = 'Bajo' | 'Medio' | 'Alto';

export function categorizarMetrica(valor: number): CategoriaMetrica {
  if (valor <= 33) return 'Bajo';
  if (valor <= 66) return 'Medio';
  return 'Alto';
}

export const ETIQUETAS_METRICA: Record<MetricaPersonaje, string> = {
  confianza: 'Confianza',
  ansiedad: 'Ansiedad',
  colaboracion: 'Colaboración',
  aperturaEmocional: 'Apertura emocional',
};

export const ETIQUETAS_ROL: Record<RolPersonaje, string> = {
  consultante: 'Consultante',
  agresor_presunto: 'Agresor presunto',
  menor: 'Menor',
  familiar: 'Familiar',
  derivador: 'Derivador',
  testigo: 'Testigo',
  profesional: 'Profesional',
  otro: 'Otro',
};

export const ETIQUETAS_ESTADO_CONTRADICCION: Record<EstadoContradiccionInstancia, string> = {
  posible: 'Pendiente de análisis',
  detectada: 'Detectada',
  analizada: 'Analizada',
  resuelta: 'Resuelta',
  descartada: 'Descartada',
};

export const ETIQUETAS_TIPO_LINEA: Record<TipoEntradaLineaTemporal, string> = {
  conversacion: 'Conversación',
  evidencia: 'Evidencia',
  contradiccion: 'Contradicción',
  hipotesis: 'Hipótesis',
  evento: 'Evento',
  intervencion: 'Intervención',
  nota: 'Nota personal',
};

export function claseCategoriaMetrica(categoria: CategoriaMetrica): string {
  switch (categoria) {
    case 'Bajo':
      return 'cat-bajo';
    case 'Medio':
      return 'cat-medio';
    case 'Alto':
      return 'cat-alto';
  }
}
