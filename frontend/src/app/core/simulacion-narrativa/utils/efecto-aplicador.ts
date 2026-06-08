import {
  CasoNarrativoCompleto,
  Efecto,
  EstrategiaClinica,
  EstadoPartida,
  SoporteHipotesis,
} from '../models';
import { aplicarModificadoresCompetencia } from '../models/competencia.model';
import { MetricaPersonaje } from '../models/metricas-personaje.model';
import {
  combinarModificadoresCompetencia,
  combinarModificadoresMetricas,
  resolverPerfilEstrategia,
} from './estrategia-clinica.util';
import { modificarMetricasPersonaje } from './metricas-personaje.util';
import { TrazabilidadService } from '../services/trazabilidad.service';
import {
  avanzarTiempoNarrativo,
  crearTiempoNarrativo,
} from '../models/tiempo-narrativo.model';
import { registrarEventoSimulacionActivado } from './evento-simulacion.util';
import {
  desbloquearConversacionRevisita,
  restablecerConversacionesUtiles,
} from './revisita.util';

function agregarUnico(lista: string[], valor: string): string[] {
  return lista.includes(valor) ? lista : [...lista, valor];
}

function registrarEvento(
  estado: EstadoPartida,
  tipo: string,
  entidadId: string,
  descripcion?: string,
): void {
  estado.historial.push({
    tipo,
    entidadId,
    descripcion,
    timestamp: new Date().toISOString(),
  });
}

export interface ContextoAplicacionEfectos {
  caso?: CasoNarrativoCompleto | null;
  trazabilidad?: TrazabilidadService;
  personajeId?: string;
  conversacionId?: string;
  escenarioId?: string;
  soportesHipotesis?: SoporteHipotesis[];
}

export function aplicarEfecto(
  estado: EstadoPartida,
  efecto: Efecto,
  contexto: ContextoAplicacionEfectos = {},
): void {
  const p = efecto.parametros;
  const { caso, trazabilidad } = contexto;

  switch (efecto.tipo) {
    case 'establecer_flag': {
      const clave = String(p['clave']);
      estado.flags[clave] = Boolean(p['valor'] ?? true);
      registrarEvento(estado, efecto.tipo, clave);
      break;
    }

    case 'descubrir_evidencia': {
      const evidenciaId = String(p['evidenciaId']);
      estado.evidenciasDescubiertas = agregarUnico(estado.evidenciasDescubiertas, evidenciaId);
      const evidencia = caso?.evidencias[evidenciaId];
      evidencia?.afirmaciones?.forEach((afirmacion) => {
        estado.afirmacionesActivas.push({
          afirmacion,
          origen: 'evidencia',
          entidadId: evidenciaId,
          registradaEn: new Date().toISOString(),
        });
      });
      trazabilidad?.registrarEvidenciaDescubierta(
        estado,
        evidenciaId,
        evidencia?.titulo,
        contexto.escenarioId,
      );
      registrarEvento(estado, efecto.tipo, evidenciaId);
      break;
    }

    case 'formular_hipotesis': {
      const hipotesisId = String(p['hipotesisId']);
      estado.hipotesisFormuladas = agregarUnico(estado.hipotesisFormuladas, hipotesisId);
      const titulo = caso?.hipotesis[hipotesisId]?.titulo;
      const soportes = contexto.soportesHipotesis ?? [];
      estado.hipotesisConSoporte.push({
        hipotesisId,
        titulo,
        formuladaEn: new Date().toISOString(),
        soportes,
      });
      trazabilidad?.registrarHipotesisFormulada(estado, hipotesisId, titulo, soportes);
      registrarEvento(estado, efecto.tipo, hipotesisId);
      break;
    }

    case 'identificar_contradiccion': {
      const contradiccionId = String(p['contradiccionId']);
      const instancia = estado.instanciasContradiccion.find(
        (c) => c.id === contradiccionId || c.plantillaId === contradiccionId,
      );
      if (instancia && instancia.estado === 'posible') {
        const ahora = new Date().toISOString();
        instancia.estado = 'detectada';
        instancia.detectadaEn = ahora;
        instancia.actualizadaEn = ahora;
        estado.contradiccionesIdentificadas = agregarUnico(
          estado.contradiccionesIdentificadas,
          instancia.id,
        );
        trazabilidad?.registrarContradiccionInstancia(estado, instancia);
      }
      registrarEvento(estado, efecto.tipo, contradiccionId);
      break;
    }

    case 'aplicar_intervencion': {
      const intervencionId = String(p['intervencionId']);
      estado.intervencionesAplicadas = agregarUnico(estado.intervencionesAplicadas, intervencionId);
      registrarEvento(estado, efecto.tipo, intervencionId);
      break;
    }

    case 'cambiar_estado_personaje': {
      const personajeId = String(p['personajeId']);
      const clave = String(p['clave']);
      const valor = p['valor'] as string | number | boolean;
      estado.estadosPersonajes[personajeId] = {
        ...estado.estadosPersonajes[personajeId],
        [clave]: valor,
      };
      registrarEvento(estado, efecto.tipo, personajeId, `${clave}=${String(valor)}`);
      break;
    }

    case 'modificar_metrica_personaje': {
      const personajeId = String(p['personajeId']);
      const metrica = String(p['metrica']) as MetricaPersonaje;
      const delta = Number(p['delta']);
      modificarMetricasPersonaje(estado, personajeId, { [metrica]: delta });
      registrarEvento(estado, efecto.tipo, personajeId, `${metrica}${delta >= 0 ? '+' : ''}${delta}`);
      break;
    }

    case 'modificar_competencia': {
      const competencia = String(p['competencia']) as keyof typeof estado.competencias;
      const delta = Number(p['delta']);
      estado.competencias = aplicarModificadoresCompetencia(estado.competencias, {
        [competencia]: delta,
      });
      registrarEvento(estado, efecto.tipo, competencia, String(delta));
      break;
    }

    case 'registrar_intervencion_clinica': {
      const estrategia = String(p['estrategia']) as EstrategiaClinica;
      const personajeId = p['personajeId'] ? String(p['personajeId']) : contexto.personajeId;
      trazabilidad?.registrarIntervencionClinica(estado, {
        estrategia,
        origen: (p['origen'] as 'dialogo' | 'intervencion_estructurada') ?? 'dialogo',
        conversacionId: p['conversacionId'] ? String(p['conversacionId']) : contexto.conversacionId,
        opcionId: p['opcionId'] ? String(p['opcionId']) : undefined,
        intervencionId: p['intervencionId'] ? String(p['intervencionId']) : undefined,
        personajeId,
      });

      if (personajeId) {
        const perfil = resolverPerfilEstrategia(caso ?? null, estrategia);
        const metricas = combinarModificadoresMetricas(perfil.metricas, undefined);
        modificarMetricasPersonaje(estado, personajeId, metricas);
        estado.competencias = aplicarModificadoresCompetencia(
          estado.competencias,
          perfil.competencias ?? {},
        );
      }
      break;
    }

    case 'desbloquear_conversacion':
    case 'desbloquear_escenario': {
      const flagClave = String(p['flagClave'] ?? `desbloqueado_${String(p['entidadId'])}`);
      estado.flags[flagClave] = true;
      registrarEvento(estado, efecto.tipo, String(p['entidadId']));
      break;
    }

    case 'desbloquear_conversacion_revisita': {
      const conversacionId = String(p['conversacionId']);
      const personajeId = p['personajeId'] ? String(p['personajeId']) : undefined;
      const extra = p['conversacionesUtilesExtra']
        ? Number(p['conversacionesUtilesExtra'])
        : undefined;
      desbloquearConversacionRevisita(estado, conversacionId, personajeId, extra);
      registrarEvento(estado, efecto.tipo, conversacionId);
      break;
    }

    case 'restablecer_conversaciones_utiles': {
      const personajeId = String(p['personajeId']);
      const cantidad = Number(p['cantidad'] ?? 1);
      restablecerConversacionesUtiles(estado, personajeId, cantidad);
      registrarEvento(estado, efecto.tipo, personajeId, String(cantidad));
      break;
    }

    case 'activar_evento_simulacion': {
      const eventoId = String(p['eventoId']);
      const evento = caso?.eventos[eventoId];
      if (evento && registrarEventoSimulacionActivado(estado, evento)) {
        aplicarEfectos(estado, evento.efectos, contexto);
      }
      break;
    }

    case 'avanzar_tiempo_narrativo': {
      const minutos = Number(p['minutos'] ?? caso?.manifest.tiempoNarrativo?.minutosPorAccion ?? 10);
      estado.tiempoNarrativo = avanzarTiempoNarrativo(estado.tiempoNarrativo, minutos);
      if (p['etiqueta']) estado.tiempoNarrativo.etiqueta = String(p['etiqueta']);
      registrarEvento(estado, efecto.tipo, 'tiempo', String(minutos));
      break;
    }

    case 'establecer_tiempo_narrativo': {
      estado.tiempoNarrativo = crearTiempoNarrativo({
        dia: Number(p['dia'] ?? estado.tiempoNarrativo.dia),
        hora: Number(p['hora'] ?? estado.tiempoNarrativo.hora),
        minuto: Number(p['minuto'] ?? estado.tiempoNarrativo.minuto),
        etiqueta: p['etiqueta'] ? String(p['etiqueta']) : undefined,
      });
      registrarEvento(estado, efecto.tipo, 'tiempo');
      break;
    }

    case 'avanzar_nodo_conversacion': {
      const conversacionId = String(p['conversacionId']);
      const nodoId = String(p['nodoId']);
      estado.nodosConversacionActivos[conversacionId] = nodoId;
      registrarEvento(estado, efecto.tipo, conversacionId, nodoId);
      break;
    }

    case 'completar_conversacion': {
      const conversacionId = String(p['conversacionId']);
      estado.conversacionesCompletadas = agregarUnico(
        estado.conversacionesCompletadas,
        conversacionId,
      );
      delete estado.nodosConversacionActivos[conversacionId];
      trazabilidad?.registrarConversacionCompletada(estado, conversacionId);
      registrarEvento(estado, efecto.tipo, conversacionId);
      break;
    }

    case 'registrar_decision': {
      estado.decisiones.push({
        id: crypto.randomUUID(),
        tipo: String(p['tipo'] ?? 'decision'),
        entidadId: String(p['entidadId']),
        opcionId: p['opcionId'] ? String(p['opcionId']) : undefined,
        contexto: p['contexto'] ? String(p['contexto']) : undefined,
        timestamp: new Date().toISOString(),
      });
      break;
    }
  }
}

export function aplicarEfectos(
  estado: EstadoPartida,
  efectos: Efecto[] | undefined,
  contexto: ContextoAplicacionEfectos = {},
): void {
  efectos?.forEach((e) => aplicarEfecto(estado, e, contexto));
}

export function aplicarEstrategiaClinica(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto | null,
  estrategia: EstrategiaClinica,
  personajeId: string | undefined,
  datos: {
    origen: 'dialogo' | 'intervencion_estructurada';
    conversacionId?: string;
    opcionId?: string;
    intervencionId?: string;
    modificadoresMetricasExtra?: Partial<Record<MetricaPersonaje, number>>;
  },
  trazabilidad: TrazabilidadService,
): void {
  const perfil = resolverPerfilEstrategia(caso, estrategia);
  const metricas = combinarModificadoresMetricas(perfil.metricas, datos.modificadoresMetricasExtra);

  if (personajeId && Object.keys(metricas).length) {
    modificarMetricasPersonaje(estado, personajeId, metricas);
  }

  if (perfil.competencias) {
    estado.competencias = aplicarModificadoresCompetencia(
      estado.competencias,
      perfil.competencias,
    );
  }

  trazabilidad.registrarIntervencionClinica(estado, {
    estrategia,
    origen: datos.origen,
    conversacionId: datos.conversacionId,
    opcionId: datos.opcionId,
    intervencionId: datos.intervencionId,
    personajeId,
  });
}
