import { CasoNarrativoCompleto, EventoSimulacionActivado, EstadoPartida } from '../models';
import { evaluarCondiciones } from './condicion-evaluator';
import { aplicarEfectos, ContextoAplicacionEfectos } from './efecto-aplicador';
import {
  eventoYaActivado,
  registrarEventoSimulacionActivado,
} from './evento-simulacion.util';

export function evaluarEventosPendientes(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
  contexto: ContextoAplicacionEfectos,
): EventoSimulacionActivado[] {
  const activados: EventoSimulacionActivado[] = [];

  const eventosOrdenados = Object.values(caso.eventos).sort(
    (a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0),
  );

  for (const evento of eventosOrdenados) {
    if (evento.activableUnaVez !== false && eventoYaActivado(estado, evento.id)) continue;
    if (!evaluarCondiciones(evento.requisitosActivacion, estado, caso)) continue;

    const registro = registrarEventoSimulacionActivado(estado, evento);
    if (!registro) continue;

    aplicarEfectos(estado, evento.efectos, contexto);
    activados.push(registro);
  }

  return activados;
}
