/**
 * Audita assets registrados vs archivos físicos en src/assets/simulacion-narrativa/.
 * Ejecutar: npm run audit:assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets', 'simulacion-narrativa');
const MODEL_PATH = path.join(
  ROOT,
  'src',
  'app',
  'core',
  'simulacion-narrativa',
  'models',
  'asset.model.ts',
);

function extractRecord(name, content) {
  const start = content.indexOf(`export const ${name}`);
  if (start === -1) return null;

  const braceStart = content.indexOf('{', start);
  let depth = 0;
  let end = braceStart;

  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  const literal = content.slice(braceStart, end);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
}

function listFiles(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, base));
    } else if (entry.name !== '.gitkeep') {
      results.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return results;
}

function auditCategory(label, registry, physicalFiles, { optional = false } = {}) {
  const entries = Object.entries(registry ?? {});
  const registeredPaths = new Set(
    entries.flatMap(([, value]) => {
      if (typeof value === 'string') return [value];
      if (value && typeof value === 'object') {
        return Object.values(value).flatMap((v) =>
          typeof v === 'string' ? [v] : Object.values(v),
        );
      }
      return [];
    }),
  );

  const exists = [];
  const missing = [];
  const details = [];

  for (const [id, ruta] of entries) {
    if (typeof ruta === 'string') {
      const ok = physicalFiles.has(ruta);
      details.push({ id, ruta, ok });
      (ok ? exists : missing).push({ id, ruta });
    } else if (ruta && typeof ruta === 'object') {
      for (const [subId, subRuta] of Object.entries(ruta)) {
        if (typeof subRuta === 'string') {
          const ok = physicalFiles.has(subRuta);
          details.push({ id: `${id}.${subId}`, ruta: subRuta, ok });
          (ok ? exists : missing).push({ id: `${id}.${subId}`, ruta: subRuta });
        } else if (subRuta && typeof subRuta === 'object') {
          for (const [exp, expRuta] of Object.entries(subRuta)) {
            const ok = physicalFiles.has(expRuta);
            details.push({ id: `${id}.${subId}.${exp}`, ruta: expRuta, ok });
            (ok ? exists : missing).push({ id: `${id}.${subId}.${exp}`, ruta: expRuta });
          }
        }
      }
    }
  }

  const unregistered = [...physicalFiles]
    .filter((f) => f.startsWith(label + '/') && !registeredPaths.has(f))
    .sort();

  return { label, optional, exists, missing, unregistered, details, registeredCount: details.length };
}

function printSection(result) {
  const { displayName, exists, missing, unregistered, optional, registeredCount } = result;
  console.log(`\n## ${displayName.toUpperCase()} (${registeredCount} registrados)`);

  if (registeredCount === 0 && optional) {
    console.log('  (sin registros — categoría opcional)');
    return;
  }

  console.log('\n  ✓ Existen:');
  if (exists.length === 0) console.log('    (ninguno)');
  else exists.forEach(({ id, ruta }) => console.log(`    • ${id} → ${ruta}`));

  console.log('\n  ✗ Faltantes:');
  if (missing.length === 0) console.log('    (ninguno)');
  else missing.forEach(({ id, ruta }) => console.log(`    • ${id} → ${ruta}`));

  if (unregistered.length) {
    console.log('\n  ? Archivos sin registrar:');
    unregistered.forEach((f) => console.log(`    • ${f}`));
  }
}

function main() {
  const model = fs.readFileSync(MODEL_PATH, 'utf8');
  const physical = new Set(listFiles(ASSETS_DIR));

  const registries = [
    { label: 'escenarios', key: 'escenarios', registry: extractRecord('ESCENARIOS_REGISTRADOS', model) },
    { label: 'roles visuales', key: 'personajes', registry: extractRecord('ROLES_VISUALES_REGISTRADOS', model) },
    {
      label: 'retratos conversar',
      key: 'personajes',
      registry: extractRecord('RETRATOS_CONVERSAR_REGISTRADOS', model),
    },
    {
      label: 'retratos expresión',
      key: 'retratos',
      registry: extractRecord('RETRATOS_EXPRESION_REGISTRADOS', model),
      optional: true,
    },
    { label: 'iconos', key: 'iconos', registry: extractRecord('ICONOS_REGISTRADOS', model) },
  ];

  console.log('═══════════════════════════════════════════════════════');
  console.log('  AUDITORÍA DE ASSETS — simulacion-narrativa');
  console.log(`  Carpeta: ${ASSETS_DIR}`);
  console.log(`  Archivos físicos: ${physical.size}`);
  console.log('═══════════════════════════════════════════════════════');

  const results = registries.map(({ label, key, registry, optional }) => {
    const result = auditCategory(key, registry, physical, { optional });
    return { ...result, displayName: label };
  });

  results.forEach(printSection);

  const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);
  const totalExists = results.reduce((n, r) => n + r.exists.length, 0);
  const totalUnregistered = results.reduce((n, r) => n + r.unregistered.length, 0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log(`  Registrados y presentes : ${totalExists}`);
  console.log(`  Registrados y faltantes : ${totalMissing}`);
  console.log(`  Archivos sin registrar  : ${totalUnregistered}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (totalMissing > 0 || totalUnregistered > 0) {
    process.exitCode = 1;
  }
}

main();
