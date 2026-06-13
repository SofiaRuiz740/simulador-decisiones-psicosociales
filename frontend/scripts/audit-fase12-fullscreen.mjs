/**
 * FASE 12 — Validación fullscreen vs modo normal.
 * Uso: node scripts/audit-fase12-fullscreen.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase12-result.json');
const SHOTS = join(__dirname, '..', 'audit-fase12-screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9300;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const report = { timestamp: new Date().toISOString(), baseUrl: BASE, pruebas: [], fallos: [] };

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
    ({ introKey, id }) => {
      localStorage.setItem('simulador.access', 'audit-f12');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id, email: 'f12@test', nombre_completo: 'Audit F12', rol: 'Estudiante' }),
      );
      localStorage.setItem(introKey, '1');
    },
    { introKey: INTRO_KEY, id: ESTUDIANTE_ID },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
  await page.waitForTimeout(600);
}

async function medirEscena(page) {
  return page.evaluate(() => {
    const viewport = document.querySelector('.simulacion-viewport');
    const escena = document.querySelector('app-escena-visual .escena');
    const exploracion = document.querySelector('app-exploracion-visual');
    if (!viewport || !escena || !exploracion) {
      return { ok: false, reason: 'elementos faltantes' };
    }
    const rv = viewport.getBoundingClientRect();
    const re = escena.getBoundingClientRect();
    const rx = exploracion.getBoundingClientRect();
    const bg = getComputedStyle(escena).backgroundImage;
    const exStyle = getComputedStyle(exploracion);
    return {
      ok: re.width > 200 && re.height > 200 && bg.includes('url('),
      viewport: { w: Math.round(rv.width), h: Math.round(rv.height) },
      escena: { w: Math.round(re.width), h: Math.round(re.height) },
      exploracion: {
        w: Math.round(rx.width),
        h: Math.round(rx.height),
        position: exStyle.position,
      },
      backgroundImage: bg.slice(0, 80),
      fullscreen: !!document.fullscreenElement,
    };
  });
}

async function toggleFullscreen(page) {
  const vp = page.locator('.simulacion-viewport');
  await vp.evaluate((el) => {
    if (document.fullscreenElement === el) {
      return document.exitFullscreen?.();
    }
    return el.requestFullscreen?.();
  });
  await page.waitForTimeout(500);
}

async function cicloFullscreen(page, vpName, captureShots = false) {
  const normal = await medirEscena(page);
  if (captureShots) {
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, `${vpName}_normal.png`) });
  }
  if (!normal.ok) fail(`${vpName}_normal`, 'escena vacía o sin fondo', normal);
  else ok(`${vpName}_normal`, normal);

  await toggleFullscreen(page);
  const fs1 = await medirEscena(page);
  if (captureShots) {
    await page.screenshot({ path: join(SHOTS, `${vpName}_fullscreen.png`) });
  }
  if (!fs1.fullscreen) fail(`${vpName}_entrar_fs`, 'fullscreen no activo', fs1);
  else if (!fs1.ok) fail(`${vpName}_entrar_fs`, 'escena vacía en fullscreen', fs1);
  else ok(`${vpName}_entrar_fs`, fs1);

  if (fs1.exploracion?.position !== 'absolute') {
    fail(`${vpName}_layout_fs`, `exploracion position=${fs1.exploracion?.position}`, fs1);
  } else {
    ok(`${vpName}_layout_fs`, fs1);
  }

  await toggleFullscreen(page);
  const normal2 = await medirEscena(page);
  if (normal2.fullscreen) fail(`${vpName}_salir_fs`, 'sigue en fullscreen', normal2);
  else if (!normal2.ok) fail(`${vpName}_salir_fs`, 'escena rota al salir', normal2);
  else ok(`${vpName}_salir_fs`, normal2);

  for (let i = 0; i < 2; i++) {
    await toggleFullscreen(page);
    await page.waitForTimeout(200);
  }
  const estable = await medirEscena(page);
  if (!estable.ok) fail(`${vpName}_toggle_repetido`, 'escena rota tras toggles', estable);
  else ok(`${vpName}_toggle_repetido`, estable);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await preparar(page);
    await cicloFullscreen(page, vp.name, vp.name === '1920x1080');
    await ctx.close();
  }
} catch (e) {
  fail('excepcion', String(e));
} finally {
  await browser.close();
}

report.resumen = {
  total: report.pruebas.length,
  ok: report.pruebas.filter((p) => p.ok).length,
  fallos: report.fallos.length,
  aprobado: report.fallos.length === 0,
  causaRaiz:
    'Reglas :fullscreen sobrescribían app-exploracion-visual con position:relative, colapsando el canvas (inset:0).',
  archivosModificados: ['simulacion-narrativa/simulacion-narrativa.scss'],
  capturas: ['audit-fase12-screenshots/1920x1080_normal.png', 'audit-fase12-screenshots/1920x1080_fullscreen.png'],
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.fallos.length > 0 ? 1 : 0);
