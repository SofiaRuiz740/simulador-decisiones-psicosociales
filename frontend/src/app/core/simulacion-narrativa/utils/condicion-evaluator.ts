import { Condicion } from '../models/condicion.model';
import { EstadoPartida } from '../models/estado-partida.model';
import { MetricaPersonaje } from '../models/metricas-personaje.model';
import {
  compararTiempoNarrativo,
  crearTiempoNarrativo,
} from '../models/tiempo-narrativo.model';
import { cumpleMetricaMinima } from './metricas-personaje.util';
import { conversacionesUtilesRestantes } from './fatiga-personaje.util';
import { objetivoCumplido } from './objetivo-narrativo.util';
import { CasoNarrativoCompleto } from '../models/caso.model';

/**
 * Evaluador genérico de condiciones basado únicamente en el estado de partida.
 * Sin ramas específicas por caso: toda la lógica se parametriza desde JSON.
 */
export function evaluarCondicion(
  condicion: Condicion,
  estado: EstadoPartida,
  caso?: CasoNarrativoCompleto | null,
): boolean {
  switch (condicion.tipo) {
    case 'y':
      return (condicion.condiciones ?? []).every((c) => evaluarCondicion(c, estado, caso));

    case 'o':
      return (condicion.condiciones ?? []).some((c) => evaluarCondicion(c, estado, caso));

    case 'no': {
      const [primera] = condicion.condiciones ?? [];
      return primera ? !evaluarCondicion(primera, estado, caso) : true;
    }

    case 'flag_activo':
      return Boolean(estado.flags[String(condicion.parametros?.['clave'])]);

    case 'evidencia_descubierta':
      return estado.evidenciasDescubiertas.includes(String(condicion.parametros?.['evidenciaId']));

    case 'todas_evidencias_descubiertas': {
      const ids = condicion.parametros?.['evidenciaIds'];
      if (!Array.isArray(ids)) return false;
      return ids.every((id) => estado.evidenciasDescubiertas.includes(String(id)));
    }

    case 'alguna_evidencia_descubierta': {
      const ids = condicion.parametros?.['evidenciaIds'];
      if (!Array.isArray(ids)) return false;
      return ids.some((id) => estado.evidenciasDescubiertas.includes(String(id)));
    }

    case 'hipotesis_formulada':
      return estado.hipotesisFormuladas.includes(String(condicion.parametros?.['hipotesisId']));

    case 'contradiccion_identificada': {
      const contradiccionId = String(condicion.parametros?.['contradiccionId']);
      return estado.instanciasContradiccion.some(
        (c) =>
          (c.id === contradiccionId || c.plantillaId === contradiccionId) &&
          (c.estado === 'detectada' || c.estado === 'analizada' || c.estado === 'resuelta'),
      );
    }

    case 'contradiccion_estado': {
      const contradiccionId = String(condicion.parametros?.['contradiccionId']);
      const estadoEsperado = String(condicion.parametros?.['estado']);
      const instancia = estado.instanciasContradiccion.find(
        (c) => c.id === contradiccionId || c.plantillaId === contradiccionId,
      );
      return instancia?.estado === estadoEsperado;
    }

    case 'escenario_visitado':
      return estado.escenariosVisitados.includes(String(condicion.parametros?.['escenarioId']));

    case 'conversacion_completada':
      return estado.conversacionesCompletadas.includes(
        String(condicion.parametros?.['conversacionId']),
      );

    case 'escenario_conversaciones_completadas': {
      const escenarioId = String(condicion.parametros?.['escenarioId']);
      const escenario = caso?.escenarios[escenarioId];
      const conversaciones = escenario?.conversacionesDisponibles ?? [];
      if (!conversaciones.length) return false;
      return conversaciones.every((conversacionId) =>
        estado.conversacionesCompletadas.includes(conversacionId),
      );
    }

    case 'intervencion_aplicada':
      return estado.intervencionesAplicadas.includes(
        String(condicion.parametros?.['intervencionId']),
      );

    case 'decision_registrada':
      return estado.decisiones.some(
        (d) =>
          d.tipo === String(condicion.parametros?.['tipo']) &&
          d.entidadId === String(condicion.parametros?.['entidadId']),
      );

    case 'personaje_estado': {
      const personajeId = String(condicion.parametros?.['personajeId']);
      const clave = String(condicion.parametros?.['clave']);
      const valorEsperado = condicion.parametros?.['valor'];
      const actual = estado.estadosPersonajes[personajeId]?.[clave];
      return actual === valorEsperado;
    }

    case 'personaje_metrica_minima': {
      const personajeId = String(condicion.parametros?.['personajeId']);
      const metrica = String(condicion.parametros?.['metrica']) as MetricaPersonaje;
      const valorMinimo = Number(condicion.parametros?.['valorMinimo'] ?? 0);
      return cumpleMetricaMinima(estado, personajeId, metrica, valorMinimo);
    }

    case 'personaje_conversaciones_disponibles': {
      const personajeId = String(condicion.parametros?.['personajeId']);
      const minimo = Number(condicion.parametros?.['minimo'] ?? 1);
      const personaje = caso?.personajes[personajeId];
      if (!personaje) return false;
      return conversacionesUtilesRestantes(estado, personaje) >= minimo;
    }

    case 'evento_simulacion_activado':
      return estado.eventosActivados.some(
        (e) => e.eventoId === String(condicion.parametros?.['eventoId']),
      );

    case 'objetivo_cumplido':
      return objetivoCumplido(estado, String(condicion.parametros?.['objetivoId']));

    case 'tiempo_narrativo_minimo': {
      const dia = Number(condicion.parametros?.['dia'] ?? estado.tiempoNarrativo.dia);
      const hora = Number(condicion.parametros?.['hora'] ?? 0);
      const minuto = Number(condicion.parametros?.['minuto'] ?? 0);
      const umbral = crearTiempoNarrativo({ dia, hora, minuto });
      return compararTiempoNarrativo(estado.tiempoNarrativo, umbral) >= 0;
    }

    case 'dia_narrativo_minimo':
      return estado.tiempoNarrativo.dia >= Number(condicion.parametros?.['dia'] ?? 1);

    default:
      return false;
  }
}

export function evaluarCondiciones(
  condiciones: Condicion[] | undefined,
  estado: EstadoPartida,
  caso?: CasoNarrativoCompleto | null,
): boolean {
  if (!condiciones?.length) return true;
  return condiciones.every((c) => evaluarCondicion(c, estado, caso));
}
