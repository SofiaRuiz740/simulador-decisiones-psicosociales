import {
  AfirmacionActiva,
  CasoNarrativoCompleto,
  Contradiccion,
  ContradiccionInstancia,
  EstadoPartida,
  OrigenContradiccion,
  ReglaContradiccionDinamica,
} from '../models';
import { evaluarCondiciones } from './condicion-evaluator';

function origenDesdeTipos(
  tipoA: AfirmacionActiva['origen'],
  tipoB: AfirmacionActiva['origen'],
): OrigenContradiccion {
  if (tipoA === 'evidencia' && tipoB === 'evidencia') return 'evidencia_evidencia';
  if (tipoA === 'testimonio' && tipoB === 'testimonio') return 'testimonio_testimonio';
  return 'evidencia_testimonio';
}

function claveParAfirmaciones(a: AfirmacionActiva, b: AfirmacionActiva): string {
  return [a.afirmacion.id, b.afirmacion.id].sort().join('|');
}

function instanciaYaExiste(
  estado: EstadoPartida,
  afirmacionA: AfirmacionActiva,
  afirmacionB: AfirmacionActiva,
): boolean {
  const ids = claveParAfirmaciones(afirmacionA, afirmacionB);

  return estado.instanciasContradiccion.some((instancia) => {
    if (instancia.estado === 'descartada') return false;
    const instanciaIds = instancia.afirmacionesEnConflicto
      .map((a) => a.afirmacion.id)
      .sort()
      .join('|');
    return instanciaIds === ids;
  });
}

function plantillaYaRegistrada(estado: EstadoPartida, plantillaId: string): boolean {
  return estado.instanciasContradiccion.some(
    (instancia) => instancia.plantillaId === plantillaId && instancia.estado !== 'descartada',
  );
}

function crearInstanciaPosible(
  afirmacionA: AfirmacionActiva,
  afirmacionB: AfirmacionActiva,
  titulo: string,
  descripcion: string,
  origen: OrigenContradiccion,
  plantillaId?: string,
): ContradiccionInstancia {
  const ahora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    titulo,
    descripcion,
    origen,
    plantillaId,
    afirmacionesEnConflicto: [afirmacionA, afirmacionB],
    estado: 'posible',
    creadaEn: ahora,
    actualizadaEn: ahora,
  };
}

function crearInstanciaPosiblePredefinida(
  plantilla: Contradiccion,
  afirmaciones: AfirmacionActiva[],
): ContradiccionInstancia {
  const ahora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    titulo: plantilla.titulo,
    descripcion: plantilla.descripcion,
    origen: 'predefinida',
    plantillaId: plantilla.id,
    afirmacionesEnConflicto: afirmaciones,
    estado: 'posible',
    creadaEn: ahora,
    actualizadaEn: ahora,
  };
}

function afirmacionesDeEvidencias(
  estado: EstadoPartida,
  evidenciaIds: string[],
): AfirmacionActiva[] {
  return estado.afirmacionesActivas.filter(
    (a) => a.origen === 'evidencia' && evidenciaIds.includes(a.entidadId),
  );
}

function detectarPorTema(
  estado: EstadoPartida,
  regla: ReglaContradiccionDinamica,
): ContradiccionInstancia[] {
  const delTema = estado.afirmacionesActivas.filter((a) => a.afirmacion.tema === regla.tema);
  const nuevas: ContradiccionInstancia[] = [];

  for (let i = 0; i < delTema.length; i++) {
    for (let j = i + 1; j < delTema.length; j++) {
      const a = delTema[i];
      const b = delTema[j];

      if (a.afirmacion.valor === b.afirmacion.valor) continue;
      if (instanciaYaExiste(estado, a, b)) continue;

      nuevas.push(
        crearInstanciaPosible(a, b, regla.titulo, regla.descripcion, regla.origen, regla.id),
      );
    }
  }

  return nuevas;
}

function detectarGenerica(estado: EstadoPartida): ContradiccionInstancia[] {
  const nuevas: ContradiccionInstancia[] = [];
  const porTema = new Map<string, AfirmacionActiva[]>();

  for (const afirmacion of estado.afirmacionesActivas) {
    const lista = porTema.get(afirmacion.afirmacion.tema) ?? [];
    lista.push(afirmacion);
    porTema.set(afirmacion.afirmacion.tema, lista);
  }

  for (const [tema, afirmaciones] of porTema) {
    const valoresUnicos = new Set(afirmaciones.map((a) => a.afirmacion.valor));
    if (valoresUnicos.size < 2) continue;

    for (let i = 0; i < afirmaciones.length; i++) {
      for (let j = i + 1; j < afirmaciones.length; j++) {
        const a = afirmaciones[i];
        const b = afirmaciones[j];
        if (a.afirmacion.valor === b.afirmacion.valor) continue;
        if (instanciaYaExiste(estado, a, b)) continue;

        nuevas.push(
          crearInstanciaPosible(
            a,
            b,
            `Contradicción en "${tema}"`,
            `Se detectan versiones opuestas sobre "${tema}": "${a.afirmacion.valor}" frente a "${b.afirmacion.valor}".`,
            origenDesdeTipos(a.origen, b.origen),
          ),
        );
      }
    }
  }

  return nuevas;
}

export function registrarAfirmacionActiva(
  estado: EstadoPartida,
  afirmacion: AfirmacionActiva['afirmacion'],
  origen: AfirmacionActiva['origen'],
  entidadId: string,
): void {
  const yaRegistrada = estado.afirmacionesActivas.some(
    (a) => a.afirmacion.id === afirmacion.id && a.entidadId === entidadId,
  );
  if (yaRegistrada) return;

  estado.afirmacionesActivas.push({
    afirmacion,
    origen,
    entidadId,
    registradaEn: new Date().toISOString(),
  });
}

export function detectarContradiccionesDinamicas(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): ContradiccionInstancia[] {
  const reglas = caso.manifest.reglasContradiccion ?? [];
  const posibles: ContradiccionInstancia[] = [];

  for (const regla of reglas) {
    posibles.push(...detectarPorTema(estado, regla));
  }

  posibles.push(...detectarGenerica(estado));

  return posibles;
}

export function evaluarContradiccionesPredefinidasPosibles(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): ContradiccionInstancia[] {
  const posibles: ContradiccionInstancia[] = [];

  for (const plantilla of Object.values(caso.contradicciones)) {
    if (plantillaYaRegistrada(estado, plantilla.id)) continue;
    if (!evaluarCondiciones(plantilla.requisitosRevelacion, estado, caso)) continue;

    const afirmaciones = afirmacionesDeEvidencias(
      estado,
      plantilla.evidenciasInvolucradas ?? [],
    );
    posibles.push(crearInstanciaPosiblePredefinida(plantilla, afirmaciones));
  }

  return posibles;
}

/** Registra posibles contradicciones sin marcarlas como identificadas por el estudiante. */
export function integrarContradiccionesPosibles(
  estado: EstadoPartida,
  nuevas: ContradiccionInstancia[],
): void {
  for (const instancia of nuevas) {
    estado.instanciasContradiccion.push(instancia);
  }
}

export function promoverContradiccionADetectada(
  estado: EstadoPartida,
  instanciaId: string,
): ContradiccionInstancia | null {
  const instancia = estado.instanciasContradiccion.find((c) => c.id === instanciaId);
  if (!instancia || instancia.estado !== 'posible') return null;

  const ahora = new Date().toISOString();
  instancia.estado = 'detectada';
  instancia.detectadaEn = ahora;
  instancia.actualizadaEn = ahora;

  if (!estado.contradiccionesIdentificadas.includes(instancia.id)) {
    estado.contradiccionesIdentificadas.push(instancia.id);
  }

  return instancia;
}

export function buscarInstanciaPosible(
  estado: EstadoPartida,
  referenciaId: string,
): ContradiccionInstancia | undefined {
  return estado.instanciasContradiccion.find(
    (c) =>
      c.estado === 'posible' &&
      (c.id === referenciaId || c.plantillaId === referenciaId),
  );
}
