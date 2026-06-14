import { Condicion } from '../../../core/simulacion-narrativa/models/condicion.model';
import { CasoNarrativoCompleto } from '../../../core/simulacion-narrativa/models/caso.model';
import { EstadoPartida } from '../../../core/simulacion-narrativa/models/estado-partida.model';
import { evaluarCondicion } from '../../../core/simulacion-narrativa/utils/condicion-evaluator';

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
  const comisariaYaVisitada = estado.escenariosVisitados.includes('investigacion-comisaria');
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
  } else if (casoCompletado) {
    bloqueoPrincipal = 'El caso ya está cerrado (flag caso_completado)';
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
  console.log('Caso completado:', diagnostico.casoCompletado);
  if (diagnostico.bloqueoPrincipal) {
    console.warn('Bloqueo:', diagnostico.bloqueoPrincipal);
  }
  console.groupEnd();
}

let ultimoLogComisaria: string | null = null;
