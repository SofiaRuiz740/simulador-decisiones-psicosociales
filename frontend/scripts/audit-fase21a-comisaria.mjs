/**
 * FASE 21A — Diagnóstico estático de condiciones hospital → comisaría.
 * Uso: node scripts/audit-fase21a-comisaria.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CONVERSACIONES_OBLIGATORIAS = [
  'entrevista-policia-entrada',
  'entrevista-madre-espera',
  'entrevista-hermano-espera',
  'entrevista-enfermera-pasillo',
  'entrevista-medico-urgencias',
  'revisita-lucia-informe',
];

const HOTSPOT_IDS = [
  'ir-comisaria',
  'ir-comisaria-sala',
  'ir-comisaria-pasillo',
  'ir-comisaria-estacion',
  'ir-comisaria-uci',
];

function evaluarCondicion(condicion, estado) {
  switch (condicion.tipo) {
    case 'y':
      return (condicion.condiciones ?? []).every((c) => evaluarCondicion(c, estado));
    case 'no': {
      const [primera] = condicion.condiciones ?? [];
      return primera ? !evaluarCondicion(primera, estado) : true;
    }
    case 'flag_activo':
      return Boolean(estado.flags[String(condicion.parametros?.clave)]);
    case 'escenario_visitado':
      return estado.escenariosVisitados.includes(String(condicion.parametros?.escenarioId));
    case 'conversacion_completada':
      return estado.conversacionesCompletadas.includes(
        String(condicion.parametros?.conversacionId),
      );
    case 'escenario_conversaciones_completadas': {
      const ids = condicion.parametros?.conversacionIds ?? [];
      return ids.every((id) => estado.conversacionesCompletadas.includes(String(id)));
    }
    default:
      return false;
  }
}

function evaluarRequisitos(requisitos, estado) {
  if (!requisitos?.length) return true;
  return requisitos.every((c) => evaluarCondicion(c, estado));
}

const escenasPath = join(
  ROOT,
  'public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json',
);
const consultaPath = join(
  ROOT,
  'public/simulacion-narrativa/casos/violencia-intrafamiliar/escenarios/consulta-inicial.json',
);

const escenas = JSON.parse(readFileSync(escenasPath, 'utf8'));
const consulta = JSON.parse(readFileSync(consultaPath, 'utf8'));

console.log('=== FASE 21A — Auditoría transición hospital → comisaría ===\n');

const hotspots = [];
for (const escena of escenas.escenas) {
  for (const hotspot of escena.hotspots ?? []) {
    if (HOTSPOT_IDS.includes(hotspot.id)) {
      hotspots.push({ escenaId: escena.id, hotspot });
    }
  }
}

console.log(`Hotspots de traslado encontrados: ${hotspots.length}`);
for (const { escenaId, hotspot } of hotspots) {
  console.log(`  - ${hotspot.id} @ ${escenaId}`);
}

const opcionalesEnEscenario = consulta.conversacionesDisponibles.filter(
  (id) => !CONVERSACIONES_OBLIGATORIAS.includes(id),
);
console.log('\nConversaciones en consulta-inicial NO obligatorias para comisaría:');
for (const id of opcionalesEnEscenario) {
  console.log(`  - ${id} (opcional / revisita)`);
}

const estadoBase = {
  conversacionesCompletadas: [...CONVERSACIONES_OBLIGATORIAS],
  escenariosVisitados: ['consulta-inicial'],
  flags: {},
};

const estadoSinLucia = {
  conversacionesCompletadas: CONVERSACIONES_OBLIGATORIAS.filter((id) => id !== 'revisita-lucia-informe'),
  escenariosVisitados: ['consulta-inicial'],
  flags: {},
};

const estadoComisariaVisitada = {
  ...estadoBase,
  escenariosVisitados: ['consulta-inicial', 'investigacion-comisaria'],
};

const casos = [
  ['6/6 completadas, comisaría no visitada', estadoBase, true],
  ['5/6 (falta Lucía)', estadoSinLucia, false],
  ['6/6 pero comisaría ya visitada', estadoComisariaVisitada, false],
];

console.log('\nSimulación de condiciones (primer hotspot):');
const requisitosRef = hotspots[0]?.hotspot.requisitosAcceso ?? [];
for (const [nombre, estado, esperado] of casos) {
  const visible = evaluarRequisitos(requisitosRef, estado);
  const ok = visible === esperado ? 'OK' : 'FALLO';
  console.log(`  [${ok}] ${nombre}: visible=${visible} (esperado=${esperado})`);
}

const idsEnHotspot = requisitosRef
  .find((c) => c.tipo === 'escenario_conversaciones_completadas')
  ?.parametros?.conversacionIds;
const usaYExplicito = requisitosRef.some((c) => c.tipo === 'y');

console.log('\nFormato de requisitos en JSON:');
console.log(`  - Usa bloque "y" con conversacion_completada: ${usaYExplicito}`);
console.log(`  - Usa escenario_conversaciones_completadas: ${!!idsEnHotspot}`);
if (idsEnHotspot) {
  console.log(`  - IDs en escenario_conversaciones_completadas: ${idsEnHotspot.length}`);
}

const fallbackTodas = consulta.conversacionesDisponibles.every((id) =>
  estadoBase.conversacionesCompletadas.includes(id),
);
console.log('\nSi se usara TODAS las conversacionesDisponibles del escenario (sin lista explícita):');
console.log(`  - Desbloquearía con solo 6 obligatorias: ${fallbackTodas} (debe ser false)`);
console.log(
  `  - Bloquearía por revisitas opcionales: ${!fallbackTodas ? 'sí — riesgo si se quita conversacionIds' : 'no'}`,
);

console.log('\n=== Fin auditoría ===');
