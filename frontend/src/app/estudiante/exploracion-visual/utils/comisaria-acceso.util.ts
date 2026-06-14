import { Condicion } from '../../../core/simulacion-narrativa/models/condicion.model';
import { CasoNarrativoCompleto } from '../../../core/simulacion-narrativa/models/caso.model';
import { EstadoPartida } from '../../../core/simulacion-narrativa/models/estado-partida.model';
import { evaluarCondicion } from '../../../core/simulacion-narrativa/utils/condicion-evaluator';
import { HotspotEscena } from '../models/escena-visual.model';

/** Entrevistas hospitalarias obligatorias para desbloquear traslado a comisaría (sin revisitas opcionales). */
export const CONVERSACIONES_HOSPITAL_OBLIGATORIAS = [
  'entrevista-policia-entrada',
  'entrevista-madre-espera',
  'entrevista-hermano-espera',
  'entrevista-enfermera-pasillo',
  'entrevista-medico-urgencias',
  'revisita-lucia-informe',
] as const;

export const HOTSPOTS_TRASLADO_COMISARIA = [
  'ir-comisaria',
  'ir-comisaria-sala',
  'ir-comisaria-pasillo',
  'ir-comisaria-estacion',
  'ir-comisaria-uci',
] as const;

/** Escena donde se muestra el botón fijo de traslado (FASE 23C.2: entrada principal). */
export const ESCENAS_HOSPITAL_TRASLADO_DOCK = ['entrada'] as const;

export const ETIQUETA_TRASLADO_COMISARIA = 'Trasladarse a la comisaría';
export const DESTINO_ESCENA_COMISARIA = 'exterior-comisaria';
export const ESCENARIO_NARRATIVO_COMISARIA = 'investigacion-comisaria';

export function escenaMuestraTrasladoEnDock(escenaId: string): boolean {
  return (ESCENAS_HOSPITAL_TRASLADO_DOCK as readonly string[]).includes(escenaId);
}

export function crearHotspotTrasladoComisaria(): HotspotEscena {
  return {
    id: 'dock-traslado-comisaria',
    etiqueta: ETIQUETA_TRASLADO_COMISARIA,
    tipo: 'navegacion',
    destinoEscenaId: DESTINO_ESCENA_COMISARIA,
    posicion: { x: 0, y: 0, ancho: 0, alto: 0 },
  };
}

const ETIQUETAS_ENTREVISTA: Record<(typeof CONVERSACIONES_HOSPITAL_OBLIGATORIAS)[number], string> = {
  'entrevista-policia-entrada': 'Policía',
  'entrevista-madre-espera': 'Madre',
  'entrevista-hermano-espera': 'Hermano',
  'entrevista-enfermera-pasillo': 'Enfermera',
  'entrevista-medico-urgencias': 'Médico',
  'revisita-lucia-informe': 'Lucía (UCI)',
};

/** Requisitos JSON para hotspots de navegación «Trasladarse a la comisaría». */
export function requisitosTrasladoComisaria(): Condicion[] {
  return [
    {
      tipo: 'y',
      condiciones: CONVERSACIONES_HOSPITAL_OBLIGATORIAS.map((conversacionId) => ({
        tipo: 'conversacion_completada' as const,
        parametros: { conversacionId },
      })),
    },
    {
      tipo: 'no',
      condiciones: [
        {
          tipo: 'escenario_visitado',
          parametros: { escenarioId: 'investigacion-comisaria' },
        },
      ],
    },
    {
      tipo: 'no',
      condiciones: [
        {
          tipo: 'conversacion_completada',
          parametros: { conversacionId: 'cierre-investigacion' },
        },
      ],
    },
    {
      tipo: 'no',
      condiciones: [
        {
          tipo: 'flag_activo',
          parametros: { clave: 'caso_completado' },
        },
      ],
    },
  ];
}

export interface DiagnosticoTrasladoComisaria {
  hotspotVisible: boolean;
  investigacionHospitalariaCompleta: boolean;
  conversacionesPendientes: string[];
  conversacionesCompletadas: string[];
  escenariosVisitados: string[];
  escenarioActualId: string;
  comisariaYaVisitada: boolean;
  cierreInvestigacionActivo: boolean;
  casoCompletado: boolean;
  bloqueoPrincipal: string | null;
}

export function investigacionHospitalariaCompleta(estado: EstadoPartida): boolean {
  return CONVERSACIONES_HOSPITAL_OBLIGATORIAS.every((id) =>
    estado.conversacionesCompletadas.includes(id),
  );
}

export function diagnosticarTrasladoComisaria(
  estado: EstadoPartida | null | undefined,
  caso?: CasoNarrativoCompleto | null,
): DiagnosticoTrasladoComisaria | null {
  if (!estado) return null;

  const conversacionesPendientes = CONVERSACIONES_HOSPITAL_OBLIGATORIAS.filter(
    (id) => !estado.conversacionesCompletadas.includes(id),
  );
  const hospitalCompleto = conversacionesPendientes.length === 0;
  const comisariaYaVisitada = estado.escenariosVisitados.includes(ESCENARIO_NARRATIVO_COMISARIA);
  const cierreInvestigacionActivo = estado.conversacionesCompletadas.includes('cierre-investigacion');
  const casoCompletado = Boolean(estado.flags['caso_completado']);

  const requisitos = requisitosTrasladoComisaria();
  const hotspotVisible = requisitos.every((c) => evaluarCondicion(c, estado, caso));

  let bloqueoPrincipal: string | null = null;
  if (!hospitalCompleto) {
    const pendientes = conversacionesPendientes
      .map((id) => ETIQUETAS_ENTREVISTA[id] ?? id)
      .join(', ');
    bloqueoPrincipal = `Faltan entrevistas obligatorias: ${pendientes}`;
  } else if (comisariaYaVisitada) {
    bloqueoPrincipal = 'La comisaría ya fue visitada (investigacion-comisaria en escenariosVisitados)';
  } else if (cierreInvestigacionActivo || casoCompletado) {
    bloqueoPrincipal = cierreInvestigacionActivo
      ? 'La investigación ya fue cerrada (cierre-investigacion)'
      : 'El caso ya está cerrado (flag caso_completado)';
  }

  return {
    hotspotVisible,
    investigacionHospitalariaCompleta: hospitalCompleto,
    conversacionesPendientes: [...conversacionesPendientes],
    conversacionesCompletadas: CONVERSACIONES_HOSPITAL_OBLIGATORIAS.filter((id) =>
      estado.conversacionesCompletadas.includes(id),
    ),
    escenariosVisitados: [...estado.escenariosVisitados],
    escenarioActualId: estado.escenarioActualId,
    comisariaYaVisitada,
    cierreInvestigacionActivo,
    casoCompletado,
    bloqueoPrincipal,
  };
}

/** Diagnóstico temporal Fase 21A — consola del navegador. */
export function registrarDiagnosticoComisariaEnConsola(
  escenaId: string,
  hotspotId: string,
  estado: EstadoPartida | null | undefined,
  caso?: CasoNarrativoCompleto | null,
): void {
  if (!estado || !HOTSPOTS_TRASLADO_COMISARIA.includes(hotspotId as (typeof HOTSPOTS_TRASLADO_COMISARIA)[number])) {
    return;
  }

  const diagnostico = diagnosticarTrasladoComisaria(estado, caso);
  if (!diagnostico) return;

  const clave = JSON.stringify({
    escenaId,
    hotspotId,
    pendientes: diagnostico.conversacionesPendientes,
    visible: diagnostico.hotspotVisible,
    comisariaVisitada: diagnostico.comisariaYaVisitada,
  });

  if (clave === ultimoLogComisaria) return;
  ultimoLogComisaria = clave;

  console.groupCollapsed(
    `[FASE-21A comisaría] ${escenaId} / ${hotspotId} → ${diagnostico.hotspotVisible ? 'VISIBLE' : 'OCULTO'}`,
  );
  console.log('Entrevistas obligatorias completadas:', diagnostico.conversacionesCompletadas);
  console.log('Entrevistas obligatorias pendientes:', diagnostico.conversacionesPendientes);
  console.log('Escenarios visitados:', diagnostico.escenariosVisitados);
  console.log('Escenario narrativo actual:', diagnostico.escenarioActualId);
  console.log('Comisaría ya visitada:', diagnostico.comisariaYaVisitada);
  console.log('Cierre investigación:', diagnostico.cierreInvestigacionActivo);
  console.log('Caso completado:', diagnostico.casoCompletado);
  if (diagnostico.bloqueoPrincipal) {
    console.warn('Bloqueo:', diagnostico.bloqueoPrincipal);
  }
  console.groupEnd();
}

let ultimoLogComisaria: string | null = null;
