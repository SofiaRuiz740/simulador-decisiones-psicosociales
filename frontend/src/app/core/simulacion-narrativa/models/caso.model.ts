import { Contradiccion, ReglaContradiccionDinamica } from './contradiccion.model';
import { Conversacion } from './conversacion.model';
import { DesbloqueoRevisita } from './revisita.model';
import { Escenario } from './escenario.model';
import { EstrategiaClinica, PerfilEstrategiaClinica } from './estrategia-clinica.model';
import { EventoSimulacion } from './evento-simulacion.model';
import { Evidencia } from './evidencia.model';
import { Hipotesis } from './hipotesis.model';
import { IntervencionPsicologica } from './intervencion.model';
import { ObjetivoNarrativo } from './objetivo-narrativo.model';
import { Personaje } from './personaje.model';
import { ConfigTiempoNarrativo } from './tiempo-narrativo.model';

export interface CasoManifest {
  id: string;
  version: string;
  titulo: string;
  descripcion: string;
  areaTematica: string;
  tiempoEstimadoMin: number;
  rolJugador: string;
  escenarioInicialId: string;
  escenarios: string[];
  personajes: string[];
  conversaciones: string[];
  evidencias: string[];
  contradicciones: string[];
  hipotesis: string[];
  intervenciones: string[];
  eventos?: string[];
  objetivos?: string[];
  perfilesEstrategia?: Partial<Record<EstrategiaClinica, PerfilEstrategiaClinica>>;
  reglasContradiccion?: ReglaContradiccionDinamica[];
  tiempoNarrativo?: ConfigTiempoNarrativo;
  desbloqueosRevisita?: DesbloqueoRevisita[];
}

export interface CasoCatalogoItem {
  id: string;
  titulo: string;
  descripcion: string;
  areaTematica: string;
  manifestPath: string;
}

export interface CasoCatalogo {
  version: string;
  casos: CasoCatalogoItem[];
}

export interface CasoNarrativoCompleto {
  manifest: CasoManifest;
  escenarios: Record<string, Escenario>;
  personajes: Record<string, Personaje>;
  conversaciones: Record<string, Conversacion>;
  evidencias: Record<string, Evidencia>;
  contradicciones: Record<string, Contradiccion>;
  hipotesis: Record<string, Hipotesis>;
  intervenciones: Record<string, IntervencionPsicologica>;
  eventos: Record<string, EventoSimulacion>;
  objetivos: Record<string, ObjetivoNarrativo>;
}
