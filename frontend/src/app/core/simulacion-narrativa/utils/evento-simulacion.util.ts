import {
  EventoSimulacion,
  EventoSimulacionActivado,
  EstadoPartida,
} from '../models';
import {
  avanzarTiempoNarrativo,
  formatearTiempoNarrativo,
} from '../models/tiempo-narrativo.model';

export function eventoYaActivado(estado: EstadoPartida, eventoId: string): boolean {
  return estado.eventosActivados.some((e) => e.eventoId === eventoId);
}

export function registrarEventoSimulacionActivado(
  estado: EstadoPartida,
  evento: EventoSimulacion,
): EventoSimulacionActivado | null {
  if (evento.activableUnaVez !== false && eventoYaActivado(estado, evento.id)) {
    return null;
  }

  if (evento.avanceTiempoMinutos) {
    estado.tiempoNarrativo = avanzarTiempoNarrativo(
      estado.tiempoNarrativo,
      evento.avanceTiempoMinutos,
    );
  }

  const registro: EventoSimulacionActivado = {
    eventoId: evento.id,
    titulo: evento.titulo,
    activadoEn: new Date().toISOString(),
    tiempoNarrativo: formatearTiempoNarrativo(estado.tiempoNarrativo),
  };

  estado.eventosActivados.push(registro);
  estado.historial.push({
    tipo: 'evento_simulacion_activado',
    entidadId: evento.id,
    descripcion: evento.titulo,
    timestamp: registro.activadoEn,
  });

  return registro;
}
