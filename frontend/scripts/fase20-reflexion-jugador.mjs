/**
 * Fase 20 — Reescribe nodos jugador hacia reflexión clínica interna (solo texto).
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(
  'public/simulacion-narrativa/casos/violencia-intrafamiliar/conversaciones',
);

const especificos = {
  'format-ref-d1-enfermera':
    'La enfermera orientó sobre el ingreso. Antes de continuar, la profesional reflexiona sobre cuál debería ser el siguiente paso.',
  'format-ref-d2-madre':
    'Mientras sostiene el duelo de Carmen, la psicóloga considera qué aspecto requiere mayor atención psicológica inmediata.',
  'format-ref-d3-uci':
    'Antes de acercarse a Lucía, repasa lo recogido en entrevistas previas. Con esa información, surge una pregunta clínica importante.',
  'format-ref-d4-comisario':
    'Tras articular con la comisaría, la profesional reflexiona sobre cuál debe ser la prioridad institucional en este punto.',
  'format-ref-d5-ts':
    'Ha articulado el plan con trabajo social. Organiza mentalmente qué aspecto requiere seguimiento prioritario.',
  'decision-academica-hospital-1':
    'Con lo observado en urgencias, la psicóloga ordena sus prioridades clínicas iniciales.',
  'decision-academica-hospital-2':
    'El relato familiar contrasta con otros datos. La profesional reflexiona sobre cómo interpretarlo clínicamente.',
  'decision-academica-hospital-3':
    'Antes de cerrar el acercamiento con Lucía, considera cuál describe mejor la intervención psicosocial pertinente.',
  'decision-academica-comisaria-4':
    'En la comisaría, la profesional reflexiona sobre cuál debe ser la prioridad psicosocial de la intervención.',
  'decision-academica-comisaria-5':
    'Con la información institucional disponible, considera qué conjunto normativo resulta pertinente para la protección integral.',
  'decision-academica-comisaria-6':
    'Repasando lo recogido en comisaría, reflexiona sobre cuál describe mejor la actuación técnica adecuada del profesional de salud mental.',
};

const patrones = [
  [
    /Usted decide cómo iniciar\.?/g,
    'Antes de intervenir, organiza mentalmente cómo quiere abrir esta entrevista.',
  ],
  [
    /Usted decide cómo abrir la exploración inicial\.?/g,
    'Antes de profundizar, ordena mentalmente cómo quiere encuadrar la exploración inicial.',
  ],
  [
    /Usted decide cómo abrir el acercamiento\.?/g,
    'Lucía está sedada y vulnerable. La profesional reflexiona sobre cómo abrir el acercamiento.',
  ],
  [
    /Usted decide por dónde comenzar\.?/g,
    'Con lo escuchado hasta ahora, considera por dónde conviene continuar la exploración.',
  ],
  [
    /Usted decide qué indagar\.?/g,
    'Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación.',
  ],
  [
    /Usted decide qué revisar\.?/g,
    'Observa lo ocurrido en acceso y pasillo; organiza mentalmente qué conviene revisar.',
  ],
  [
    /Usted decide qué profundizar\.?/g,
    'Hay aspectos que aún no están claros; reflexiona sobre cuál merece mayor atención.',
  ],
  [
    /Usted decide qué contrastar\.?/g,
    'Hay antecedentes que conviene revisar con cuidado; considera qué contrastar primero.',
  ],
  [
    /Usted decide qué precisar\.?/g,
    'Conviene valorar si el patrón sugiere escalamiento previo; reflexiona sobre qué precisar.',
  ],
  [
    /Usted decide qué coordinar\.?/g,
    'Conviene articular equipos antes de cerrar la entrevista clínica; organiza qué coordinar.',
  ],
  [
    /Usted decide cuál abordar\.?/g,
    'El plan de protección puede precisarse; considera cuál aspecto abordar ahora.',
  ],
  [
    /Usted decide cómo cerrar este contacto\.?/g,
    'La información policial puede cruzarse con la clínica; piensa en cómo cerrar este contacto.',
  ],
  [
    /Usted decide cómo sostenerla\.?/g,
    'Lucía está agotada y vulnerable; reflexiona sobre cómo sostenerla en este momento.',
  ],
  [
    /Usted decide cómo cerrarlo\.?/g,
    'El acercamiento clínico llega a un punto sensible; considera cómo cerrarlo con cuidado.',
  ],
  [
    /Usted decide cómo sostener lo conversado\.?/g,
    'La entrevista llega a un cierre posible; piensa en cómo sostener lo conversado.',
  ],
  [
    /Usted decide qué explorar primero\.?/g,
    'Hay varias líneas para comprender el caso; organiza mentalmente qué explorar primero.',
  ],
  [
    /Usted decide qué aspecto investigativo profundizar\.?/g,
    'Diego comparte un relato clave; la profesional considera qué aspecto investigativo profundizar.',
  ],
  [
    /Usted decide cómo abordarlo\.?/g,
    'Percibe miedo en su mirada; reflexiona sobre cómo abordarlo sin presionar.',
  ],
  [
    /Usted decide cómo explorar el afrontamiento familiar\.?/g,
    'Diego muestra agotamiento emocional; considera cómo explorar el afrontamiento familiar.',
  ],
  [
    /Usted decide cómo responder\.?/g,
    'Lucía pregunta directamente por el informe; la profesional reflexiona sobre cómo responder.',
  ],
  [
    /Usted elige cómo encuadrar la exploración inicial\.?/g,
    'La conversación está abierta; organiza mentalmente cómo encuadrar la exploración inicial.',
  ],
  [
    /Usted elige cómo proceder\.?/g,
    'La articulación con la comisaría requiere un cierre claro; considera cómo proceder.',
  ],
  [
    /Usted elige cómo concretarla\.?/g,
    'Es momento de cerrar la articulación; reflexiona sobre cómo concretarla.',
  ],
  [
    /Usted elige cómo encuadrar la exploración inicial\.?/g,
    'La articulación interinstitucional está abierta; organiza cómo encuadrar la exploración inicial.',
  ],
  [
    /El funcionario espera su presentación\. Antes de intervenir, organiza mentalmente cómo quiere abrir esta entrevista\./g,
    'Antes de hablar con el funcionario, la profesional repasa cómo quiere presentarse.',
  ],
  [
    /El comisario espera su presentación\. Antes de intervenir, organiza mentalmente cómo quiere abrir esta entrevista\./g,
    'Antes de hablar con el comisario, la profesional repasa cómo quiere presentarse.',
  ],
  [
    /La trabajadora social espera su presentación\. Antes de intervenir, organiza mentalmente cómo quiere abrir esta entrevista\./g,
    'Antes de hablar con trabajo social, la profesional repasa cómo quiere presentarse.',
  ],
  [
    /El médico puede orientar sobre el caso\. Antes de profundizar, ordena mentalmente cómo quiere encuadrar la exploración inicial\./g,
    'El médico puede orientar sobre el caso. Antes de profundizar, ordena mentalmente cómo quiere encuadrar la entrevista.',
  ],
  [
    /La enfermera está disponible para orientar\. Antes de profundizar, ordena mentalmente cómo quiere encuadrar la exploración inicial\./g,
    'La enfermera está disponible para orientar. Antes de profundizar, ordena mentalmente cómo quiere abrir la entrevista.',
  ],
  [
    /Puede profundizar en aspectos del ingreso\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Puede profundizar en aspectos del ingreso. Con lo escuchado, considera qué línea conviene explorar.',
  ],
  [
    /Puede profundizar en hallazgos y evolución\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Puede profundizar en hallazgos y evolución. Con lo clínico disponible, considera qué indagar.',
  ],
  [
    /Puede profundizar en medidas activadas y antecedentes revisados\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Puede profundizar en medidas activadas y antecedentes revisados. Considera qué indagar a continuación.',
  ],
  [
    /Puede profundizar en factores de riesgo y protección\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Puede profundizar en factores de riesgo y protección. Considera qué indagar a continuación.',
  ],
  [
    /Puede explorar el contexto sin presionar\. Con lo escuchado hasta ahora, considera por dónde conviene continuar la exploración\./g,
    'Puede explorar el contexto sin presionar. Considera por dónde continuar la exploración.',
  ],
  [
    /Puede profundizar en la dinámica de pareja sin juzgar\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Puede profundizar en la dinámica de pareja sin juzgar. Considera qué indagar a continuación.',
  ],
  [
    /Hay aspectos sensibles del vínculo que conviene precisar con cuidado\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Hay aspectos sensibles del vínculo que conviene precisar con cuidado. Reflexiona sobre qué profundizar.',
  ],
  [
    /Hay datos sensibles del ingreso que conviene precisar\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Hay datos sensibles del ingreso que conviene precisar. Reflexiona sobre qué profundizar.',
  ],
  [
    /Hay discrepancias y datos sensibles que conviene precisar\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Hay discrepancias y datos sensibles que conviene precisar. Reflexiona sobre qué profundizar.',
  ],
  [
    /Hay líneas investigativas sensibles que conviene precisar\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación\./g,
    'Hay líneas investigativas sensibles que conviene precisar. Reflexiona sobre qué profundizar.',
  ],
  [
    /Conviene contrastar lo observado con los avisos recibidos\. Con lo escuchado hasta ahora, considera qué línea conviene explorar a continuación sobre vecinos y alertas\./g,
    'Conviene contrastar lo observado con los avisos recibidos. Considera qué indagar sobre vecinos y alertas.',
  ],
  [
    /Registra su criterio\. La intervención continúa\./g,
    'La profesional asienta mentalmente su criterio. La intervención continúa.',
  ],
  [
    /Registra su criterio\. Cierra el acercamiento con Lucía\./g,
    'Asienta mentalmente su criterio. Cierra el acercamiento con Lucía.',
  ],
  [
    /Registra su criterio\. La articulación continúa\./g,
    'Asienta mentalmente su criterio. La articulación continúa.',
  ],
  [
    /Registra su criterio\. Cierra la articulación con trabajo social\./g,
    'Asienta mentalmente su criterio. Cierra la articulación con trabajo social.',
  ],
  [
    /Ha articulado con comisaría y trabajo social\. Antes de cerrar, considere su criterio profesional sobre la intervención psicosocial en este escenario\./g,
    'Ha articulado con comisaría y trabajo social. Antes de cerrar, la profesional repasa su criterio sobre la intervención psicosocial en este escenario.',
  ],
];

function transformNodo(nodo) {
  if (nodo.emisor !== 'jugador' || typeof nodo.texto !== 'string') return false;
  const id = nodo.id;
  if (especificos[id]) {
    nodo.texto = especificos[id];
    return true;
  }
  let texto = nodo.texto;
  let changed = false;
  for (const [re, repl] of patrones) {
    if (re.test(texto)) {
      texto = texto.replace(re, repl);
      changed = true;
    }
  }
  if (changed) {
    nodo.texto = texto;
  }
  return changed;
}

let total = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const full = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  let fileChanged = 0;
  for (const nodo of data.nodos ?? []) {
    if (transformNodo(nodo)) fileChanged++;
  }
  if (fileChanged) {
    fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`${file}: ${fileChanged} nodos`);
    total += fileChanged;
  }
}
console.log(`Total nodos actualizados: ${total}`);
