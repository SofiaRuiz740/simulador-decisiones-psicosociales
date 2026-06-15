/**
 * FASE 23B — Auditoría coherencia narrativa (JSON conversaciones).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONV_DIR = join(
  __dirname,
  '..',
  'public/simulacion-narrativa/casos/violencia-intrafamiliar/conversaciones',
);
const OUT = join(__dirname, '..', 'audit-fase23b-coherencia.json');

const hallazgos = [];

function add(conversacion, problema, nodo, propuesta, severidad = 'media') {
  hallazgos.push({ conversacion, problema, nodo, propuesta, severidad });
}

function refsFromNodo(nodo) {
  const refs = [];
  if (nodo.siguienteNodoId) refs.push({ tipo: 'siguienteNodoId', id: nodo.siguienteNodoId });
  for (const op of nodo.opciones ?? []) {
    if (op.siguienteNodoId) refs.push({ tipo: `opcion:${op.id}`, id: op.siguienteNodoId });
  }
  return refs;
}

function textoDuplicado(texto) {
  if (!texto || texto.length < 40) return null;
  const mitad = Math.floor(texto.length / 2);
  const a = texto.slice(0, mitad).trim();
  const b = texto.slice(mitad).trim();
  if (a.length > 20 && b.startsWith(a.slice(0, Math.min(30, a.length)))) return a;
  const oraciones = texto.split(/(?<=[.!?])\s+/);
  if (oraciones.length >= 2 && oraciones[0] === oraciones[1]) return oraciones[0];
  const dup = texto.match(/^(.{15,}?)[.;]\s*\1/);
  return dup ? dup[1] : null;
}

for (const file of readdirSync(CONV_DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(CONV_DIR, file);
  const conv = JSON.parse(readFileSync(path, 'utf8'));
  const convId = conv.id ?? file;
  const nodos = conv.nodos ?? [];
  const ids = new Set(nodos.map((n) => n.id));
  const byId = new Map(nodos.map((n) => [n.id, n]));

  if (conv.nodoInicialId && !ids.has(conv.nodoInicialId)) {
    add(
      convId,
      `nodoInicialId "${conv.nodoInicialId}" no existe en nodos`,
      conv.nodoInicialId,
      'Crear el nodo o corregir nodoInicialId',
      'critica',
    );
  }

  const duplicados = nodos.map((n) => n.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  if (duplicados.length) {
    add(convId, `IDs de nodo duplicados: ${[...new Set(duplicados)].join(', ')}`, '—', 'Unificar IDs', 'critica');
  }

  for (const nodo of nodos) {
    for (const ref of refsFromNodo(nodo)) {
      if (!ids.has(ref.id)) {
        add(
          convId,
          `Referencia rota (${ref.tipo}) → "${ref.id}" inexistente`,
          nodo.id,
          `Corregir destino o crear nodo "${ref.id}"`,
          'critica',
        );
      }
    }

    const dup = textoDuplicado(nodo.texto);
    if (dup) {
      add(
        convId,
        `Texto duplicado/redundante en el mismo nodo`,
        nodo.id,
        `Redactar una sola vez: "${dup.slice(0, 60)}…"`,
        'media',
      );
    }

    if (/considera cómo|piensa en cómo|reflexiona sobre cuál|considera qué aspecto/i.test(nodo.texto ?? '')) {
      if (nodo.emisor === 'jugador' && (nodo.opciones?.length ?? 0) > 0) {
        add(
          convId,
          'Prompt de jugador en tercera persona (rompe inmersión / parece salto meta-narrativo)',
          nodo.id,
          'Reformular en segunda persona clínica: «Debe decidir…» o voz narradora breve sin duplicar instrucción',
          'baja',
        );
      }
    }
  }

  // Alcanzabilidad desde nodoInicial
  const inicial = conv.nodoInicialId;
  if (inicial && ids.has(inicial)) {
    const visitados = new Set();
    const cola = [inicial];
    while (cola.length) {
      const id = cola.shift();
      if (visitados.has(id)) continue;
      visitados.add(id);
      const n = byId.get(id);
      if (!n) continue;
      if (n.siguienteNodoId && ids.has(n.siguienteNodoId)) cola.push(n.siguienteNodoId);
      for (const op of n.opciones ?? []) {
        if (op.siguienteNodoId && ids.has(op.siguienteNodoId)) cola.push(op.siguienteNodoId);
      }
    }
    for (const n of nodos) {
      if (!visitados.has(n.id)) {
        add(
          convId,
          'Nodo inalcanzable desde nodoInicialId (rama huérfana)',
          n.id,
          'Conectar desde un nodo anterior o eliminar si es legacy',
          'media',
        );
      }
    }
  }

  // Saltos: opción lleva a cierre sin pasar por nodos de personaje cuando hay rama paralela más larga
  for (const nodo of nodos) {
    if (nodo.emisor !== 'jugador' || !nodo.opciones?.length) continue;
    const destinos = nodo.opciones.map((o) => o.siguienteNodoId).filter(Boolean);
    const unicos = [...new Set(destinos)];
    if (unicos.length > 1) {
      const profundidades = unicos.map((dest) => {
        let d = 0;
        let cur = byId.get(dest);
        const seen = new Set();
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id);
          d += 1;
          if (!cur.siguienteNodoId && !(cur.opciones?.length)) break;
          if (cur.siguienteNodoId) cur = byId.get(cur.siguienteNodoId);
          else if (cur.opciones?.[0]?.siguienteNodoId) cur = byId.get(cur.opciones[0].siguienteNodoId);
          else break;
        }
        return { dest, d, esCierre: /^cierre-/i.test(dest) };
      });
      const cortoCierre = profundidades.filter((p) => p.esCierre && p.d <= 1);
      const largo = profundidades.filter((p) => !p.esCierre && p.d >= 3);
      if (cortoCierre.length && largo.length) {
        add(
          convId,
          'Rama salta al cierre mientras otra opción recorre varios nodos (asimetría narrativa)',
          nodo.id,
          'Añadir nodo intermedio de personaje en la rama corta o unificar destinos de cierre',
          'media',
        );
      }
    }
  }
}

const report = {
  timestamp: new Date().toISOString(),
  fase: '23B',
  total: hallazgos.length,
  criticas: hallazgos.filter((h) => h.severidad === 'critica').length,
  hallazgos,
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, criticas: report.criticas }, null, 2));
for (const h of hallazgos) {
  console.log(`\n[${h.severidad}] ${h.conversacion} / ${h.nodo}\n  ${h.problema}`);
}
