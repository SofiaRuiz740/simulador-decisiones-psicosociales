import { CasoNarrativoCompleto } from '../../../core/simulacion-narrativa/models/caso.model';
import { EstadoPartida } from '../../../core/simulacion-narrativa/models/estado-partida.model';
import { evaluarCondiciones } from '../../../core/simulacion-narrativa/utils/condicion-evaluator';
import { EscenaVisual, HotspotEscena } from '../models/escena-visual.model';

export function escenaEsAccesible(
  escena: EscenaVisual,
  estado: EstadoPartida | null | undefined,
  caso: CasoNarrativoCompleto | null | undefined,
): boolean {
  if (!estado) return false;
  return evaluarCondiciones(escena.requisitosAcceso, estado, caso);
}

export function hotspotEsAccesible(
  hotspot: HotspotEscena,
  estado: EstadoPartida | null | undefined,
  caso: CasoNarrativoCompleto | null | undefined,
): boolean {
  if (!estado) return false;
  return evaluarCondiciones(hotspot.requisitosAcceso, estado, caso);
}
