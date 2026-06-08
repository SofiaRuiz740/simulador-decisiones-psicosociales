import {
  CasoNarrativoCompleto,
  EstadoPartida,
  esContradiccionIdentificadaPorEstudiante,
  LibretaPsicologo,
  crearLibretaVacia,
} from '../models';
import { formatearTiempoNarrativo } from '../models/tiempo-narrativo.model';

function tiempoFormateado(estado: EstadoPartida): string {
  return formatearTiempoNarrativo(estado.tiempoNarrativo);
}

export function sincronizarLibretaDesdeEstado(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto | null,
): LibretaPsicologo {
  const libreta = estado.libreta ?? crearLibretaVacia();
  const notas = libreta.notasEstudiante;

  if (!caso) {
    estado.libreta = { ...libreta, notasEstudiante: notas };
    return estado.libreta;
  }

  const personasMap = new Map<string, { conversaciones: Set<string>; ultima?: string }>();

  for (const conversacionId of estado.conversacionesCompletadas) {
    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion?.personajeId) continue;

    const registro = personasMap.get(conversacion.personajeId) ?? {
      conversaciones: new Set<string>(),
    };
    registro.conversaciones.add(conversacionId);

    const traza = estado.trazabilidad.conversaciones.find((c) => c.conversacionId === conversacionId);
    if (traza?.completadaEn) {
      registro.ultima = traza.completadaEn;
    }

    personasMap.set(conversacion.personajeId, registro);
  }

  for (const [personajeId, registro] of Object.entries(estado.metricasPersonajes)) {
    if (!personasMap.has(personajeId)) {
      personasMap.set(personajeId, { conversaciones: new Set<string>() });
    }
  }

  const personasEntrevistadas = [...personasMap.entries()].map(([personajeId, registro]) => ({
    personajeId,
    nombre: caso.personajes[personajeId]?.nombre,
    conversacionesIds: [...registro.conversaciones],
    ultimaInteraccion: registro.ultima,
  }));

  const evidenciasEncontradas = estado.trazabilidad.evidencias.map((registro) => ({
    evidenciaId: registro.evidenciaId,
    titulo: registro.titulo,
    descubiertaEn: registro.descubiertaEn,
    escenarioId: registro.escenarioId,
  }));

  const contradiccionesDetectadas = estado.instanciasContradiccion
    .filter(esContradiccionIdentificadaPorEstudiante)
    .map((instancia) => ({
      instanciaId: instancia.id,
      plantillaId: instancia.plantillaId,
      titulo: instancia.titulo,
      descripcion: instancia.descripcion,
      estado: instancia.estado,
      creadaEn: instancia.creadaEn,
      detectadaEn: instancia.detectadaEn,
      afirmacionIds: instancia.afirmacionesEnConflicto.map((a) => a.afirmacion.id),
    }));

  const hipotesisFormuladas = estado.hipotesisConSoporte.map((hipotesis) => ({
    hipotesisId: hipotesis.hipotesisId,
    titulo: hipotesis.titulo ?? caso.hipotesis[hipotesis.hipotesisId]?.titulo,
    formuladaEn: hipotesis.formuladaEn,
    soportes: hipotesis.soportes,
  }));

  const estadosEmocionalesPercibidos = Object.entries(estado.metricasPersonajes).map(
    ([personajeId, metricas]) => ({
      personajeId,
      nombre: caso.personajes[personajeId]?.nombre,
      metricas,
      actualizadoEn: estado.inicioSesion,
    }),
  );

  const lineaTemporal = construirLineaTemporal(estado, caso);

  estado.libreta = {
    personasEntrevistadas,
    evidenciasEncontradas,
    contradiccionesDetectadas,
    hipotesisFormuladas,
    estadosEmocionalesPercibidos,
    lineaTemporal,
    notasEstudiante: notas,
  };

  return estado.libreta;
}

function construirLineaTemporal(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): LibretaPsicologo['lineaTemporal'] {
  const entradas: LibretaPsicologo['lineaTemporal'] = [];

  for (const registro of estado.trazabilidad.conversaciones) {
    if (!registro.completadaEn) continue;
    entradas.push({
      id: `conv-${registro.conversacionId}`,
      tipo: 'conversacion',
      entidadId: registro.conversacionId,
      titulo: registro.titulo,
      timestamp: registro.completadaEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const registro of estado.trazabilidad.evidencias) {
    entradas.push({
      id: `ev-${registro.evidenciaId}`,
      tipo: 'evidencia',
      entidadId: registro.evidenciaId,
      titulo: registro.titulo,
      timestamp: registro.descubiertaEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const instancia of estado.instanciasContradiccion.filter(
    esContradiccionIdentificadaPorEstudiante,
  )) {
    entradas.push({
      id: `con-${instancia.id}`,
      tipo: 'contradiccion',
      entidadId: instancia.id,
      titulo: instancia.titulo,
      timestamp: instancia.detectadaEn ?? instancia.creadaEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const hipotesis of estado.hipotesisConSoporte) {
    entradas.push({
      id: `hip-${hipotesis.hipotesisId}`,
      tipo: 'hipotesis',
      entidadId: hipotesis.hipotesisId,
      titulo: hipotesis.titulo ?? caso.hipotesis[hipotesis.hipotesisId]?.titulo,
      timestamp: hipotesis.formuladaEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const evento of estado.eventosActivados) {
    entradas.push({
      id: `evt-${evento.eventoId}`,
      tipo: 'evento',
      entidadId: evento.eventoId,
      titulo: evento.titulo,
      timestamp: evento.activadoEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const intervencion of estado.trazabilidad.intervencionesClinicas) {
    entradas.push({
      id: `int-${intervencion.id}`,
      tipo: 'intervencion',
      entidadId: intervencion.intervencionId ?? intervencion.id,
      titulo: intervencion.estrategia,
      timestamp: intervencion.timestamp,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  for (const nota of estado.libreta?.notasEstudiante ?? []) {
    entradas.push({
      id: `nota-${nota.id}`,
      tipo: 'nota',
      entidadId: nota.id,
      titulo: nota.contenido.slice(0, 60),
      timestamp: nota.creadaEn,
      tiempoNarrativo: tiempoFormateado(estado),
    });
  }

  return entradas.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
