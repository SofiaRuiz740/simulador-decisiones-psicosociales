/**
 * FASE 12.6 — Validación regresiones visuales + diálogo.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase126-result.json');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9260;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const ENTREVISTAS = [
  { escena: 'entrada-hospital', label: 'Funcionario policial', id: 'entrevista-policia-entrada' },
  { nav: ['Entrar al hospital'], escena: 'sala-espera', label: 'Madre (sala de espera)', id: 'entrevista-madre-espera' },
  { escena: 'sala-espera', label: 'Hermano', id: 'entrevista-hermano-espera' },
  { nav: ['Ir al pasillo de urgencias'], escena: 'pasillo-urgencias', label: 'Enfermera jefe', id: 'entrevista-enfermera-pasillo' },
  { nav: ['UCI — paciente crítica'], escena: 'cuidados-intensivos', label: 'Médico tratante', id: 'entrevista-medico-urgencias' },
  { escena: 'cuidados-intensivos', label: 'Lucía (UCI)', id: 'revisita-lucia-informe' },
];

const report = { timestamp: new Date().toISOString(), fase: '12.6', pruebas: [], fallos: [] };
const escenasJson = JSON.parse(
  readFileSync(
    join(__dirname, '..', 'public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json'),
    'utf8',
  ),
);

function ok(n, d) {
  report.pruebas.push({ nombre: n, ok: true, ...d });
}
function fail(n, m, d = {}) {
  report.fallos.push(`${n}: ${m}`);
  report.pruebas.push({ nombre: n, ok: false, motivo: m, ...d });
}

async function preparar(page) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ introKey, id, caso }) => {
      localStorage.setItem('simulador.access', 'audit-f126');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id, email: 'f126@test', nombre_completo: 'Audit F126', rol: 'Estudiante' }),
      );
      localStorage.setItem(introKey, '1');
      localStorage.removeItem(`narrativa-partida:${caso}:${id}:directo`);
    },
    { introKey: INTRO_KEY, id: ESTUDIANTE_ID, caso: CASO },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
}

async function clickNav(page, label) {
  const btn = page.locator(`button.hotspot-interactivo[aria-label="${label}"]`).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function abrirEntrevista(page, label) {
  const hs = page.locator(`button.hotspot-personaje[aria-label="${label}"]`).first();
  if (!(await hs.isVisible().catch(() => false))) return false;
  await hs.click();
  await page.waitForSelector('.dialogo-composicion', { timeout: 12000 });
  await page.waitForTimeout(350);
  return true;
}

async function medirRetratos(page) {
  return page.evaluate(() => {
    const npc = document.querySelector('.personaje-escena--npc .personaje-imagen');
    const psico = document.querySelector('.personaje-escena--psicologa .personaje-imagen');
    if (!npc || !psico) return { ok: false, reason: 'sin retratos' };
    const rn = npc.getBoundingClientRect();
    const rp = psico.getBoundingClientRect();
    const texto = document.querySelector('.dialogo-caja-texto')?.getBoundingClientRect();
    const overlap =
      texto &&
      !(rn.right <= texto.left || rn.left >= texto.right || rn.bottom <= texto.top || rn.top >= texto.bottom);
    return {
      ok: rn.height >= 200 && rp.height >= 200 && !overlap,
      npcH: Math.round(rn.height),
      psicoH: Math.round(rp.height),
      overlapTexto: overlap,
    };
  });
}

async function avanzarSinCerrar(page, pasos = 8) {
  for (let i = 0; i < pasos; i++) {
    if (!(await page.locator('.dialogo-caja').isVisible().catch(() => false))) {
      return { cerradoEn: i, visible: false };
    }
    await page
      .waitForFunction(() => !document.querySelector('.cursor-typewriter'), undefined, { timeout: 8000 })
      .catch(() => undefined);
    const op = page.locator('.btn-opcion').first();
    if (await op.isVisible().catch(() => false)) {
      await op.click();
      await page.waitForTimeout(400);
      continue;
    }
    await page.locator('.dialogo-caja-texto').click().catch(() => undefined);
    const seguir = page.locator('.btn-principal').first();
    if (await seguir.isVisible().catch(() => false)) {
      await seguir.click();
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
  await page.waitForTimeout(1500);
  const visible = await page.locator('.dialogo-caja').isVisible().catch(() => false);
  return { cerradoEn: null, visible };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  await preparar(page);

  if (escenasJson.version >= '2.5.1') ok('config-hotspots-v251', { version: escenasJson.version });
  else fail('config-hotspots-v251', `version=${escenasJson.version}`);

  for (const item of ENTREVISTAS) {
    for (const n of item.nav ?? []) await clickNav(page, n);
    const abierto = await abrirEntrevista(page, item.label);
    if (!abierto) {
      fail(`hotspot_${item.id}`, `no visible: ${item.label}`);
      continue;
    }

    const retratos = await medirRetratos(page);
    if (retratos.ok) ok(`retratos_${item.id}`, retratos);
    else fail(`retratos_${item.id}`, 'retratos pequeños o solapan texto', retratos);

    const flujo = await avanzarSinCerrar(page, 6);
    if (flujo.visible) ok(`sin_cierre_auto_${item.id}`, flujo);
    else fail(`sin_cierre_auto_${item.id}`, 'diálogo se cerró solo', flujo);

    await page.locator('.dialogo-cerrar').click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
} finally {
  await browser.close();
}

report.resumen = {
  total: report.pruebas.length,
  ok: report.pruebas.filter((p) => p.ok).length,
  fallos: report.fallos.length,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.resumen, null, 2));
if (report.fallos.length) {
  console.error(report.fallos.join('\n'));
  process.exit(1);
}
