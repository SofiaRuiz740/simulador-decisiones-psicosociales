/**
 * FASE 12.5 — Validación composición visual de diálogos.
 * Uso: node scripts/audit-fase125-dialogo-composicion.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase125-result.json');
const SHOTS = join(__dirname, '..', 'audit-fase125-screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9250;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const report = {
  timestamp: new Date().toISOString(),
  fase: '12.5',
  titulo: 'Composición visual de diálogos',
  baseUrl: BASE,
  pruebas: [],
  fallos: [],
};

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
      localStorage.setItem('simulador.access', 'audit-f125');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id, email: 'f125@test', nombre_completo: 'Audit F125', rol: 'Estudiante' }),
      );
      localStorage.setItem(introKey, '1');
    },
    { introKey: INTRO_KEY, id: ESTUDIANTE_ID },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
  await page.waitForTimeout(500);
}

async function abrirDialogo(page) {
  const policia = page.locator('button.hotspot-personaje[aria-label="Funcionario policial"]').first();
  if (!(await policia.isVisible().catch(() => false))) {
    return false;
  }
  await policia.click();
  await page.waitForSelector('.dialogo-composicion', { timeout: 15000 });
  await page.waitForSelector('.dialogo-caja-texto', { timeout: 10000 });
  await page.waitForTimeout(400);
  return true;
}

async function medirComposicion(page) {
  return page.evaluate(() => {
    const composicion = document.querySelector('.dialogo-composicion');
    const caja = document.querySelector('.dialogo-caja');
    const npc = document.querySelector('.personaje-escena--npc');
    const psico = document.querySelector('.personaje-escena--psicologa');
    const texto = document.querySelector('.dialogo-caja-texto');
    const acciones = document.querySelector('.dialogo-caja-acciones');
    const npcImg = npc?.querySelector('.personaje-imagen');
    const psicoImg = psico?.querySelector('.personaje-imagen');

    if (!composicion || !caja || !npc || !psico || !texto) {
      return { ok: false, reason: 'elementos faltantes' };
    }

    const rc = composicion.getBoundingClientRect();
    const rk = caja.getBoundingClientRect();
    const rn = npc.getBoundingClientRect();
    const rp = psico.getBoundingClientRect();
    const rt = texto.getBoundingClientRect();

    const npcLeftOfCaja = rn.right <= rk.left + 4;
    const psicoRightOfCaja = rp.left >= rk.right - 4;
    const npcBottomAligned = Math.abs(rn.bottom - rk.bottom) <= 28;
    const psicoBottomAligned = Math.abs(rp.bottom - rk.bottom) <= 28;
    const composicionContainsAll =
      rn.left >= rc.left - 12 &&
      rp.right <= rc.right + 12 &&
      rk.top >= rc.top - 4 &&
      Math.max(rn.bottom, rp.bottom, rk.bottom) <= rc.bottom + 16;

    const overlapsText = (elRect) =>
      !(elRect.right < rt.left || elRect.left > rt.right || elRect.bottom < rt.top || elRect.top > rt.bottom);

    const npcOverlapsText = overlapsText(rn);
    const psicoOverlapsText = overlapsText(rp);
    const npcVisible = npcImg ? npcImg.getBoundingClientRect().height > 80 : false;
    const psicoVisible = psicoImg ? psicoImg.getBoundingClientRect().height > 80 : false;

    const grid = getComputedStyle(composicion).display === 'grid';
    const integradoEnPlaca = rn.bottom >= rc.bottom - 18 && rp.bottom >= rc.bottom - 18;

    return {
      ok:
        grid &&
        npcLeftOfCaja &&
        psicoRightOfCaja &&
        npcBottomAligned &&
        psicoBottomAligned &&
        composicionContainsAll &&
        !npcOverlapsText &&
        !psicoOverlapsText &&
        npcVisible &&
        psicoVisible &&
        integradoEnPlaca,
      grid,
      npcLeftOfCaja,
      psicoRightOfCaja,
      npcBottomAligned,
      psicoBottomAligned,
      composicionContainsAll,
      npcOverlapsText,
      psicoOverlapsText,
      npcVisible,
      psicoVisible,
      integradoEnPlaca,
      rects: {
        composicion: { w: Math.round(rc.width), h: Math.round(rc.height), bottom: Math.round(rc.bottom) },
        caja: { w: Math.round(rk.width), h: Math.round(rk.height) },
        npc: { w: Math.round(rn.width), h: Math.round(rn.height) },
        psico: { w: Math.round(rp.width), h: Math.round(rp.height) },
      },
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

async function probarViewport(browser, vp, conFullscreen = false) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  try {
    await preparar(page);
    const abierto = await abrirDialogo(page);
    if (!abierto) {
      fail(`${vp.name}_dialogo`, 'no se pudo abrir entrevista policial');
      return;
    }

    mkdirSync(SHOTS, { recursive: true });
    const modo = conFullscreen ? 'fullscreen' : 'ventana';
    const nombre = `${vp.name}_${modo}`;

    if (conFullscreen) {
      await toggleFullscreen(page);
      if (!(await page.evaluate(() => !!document.fullscreenElement))) {
        fail(`${nombre}`, 'fullscreen no activado');
        return;
      }
    }

    const medida = await medirComposicion(page);
    await page.screenshot({ path: join(SHOTS, `${nombre}.png`) });

    if (!medida.ok) {
      fail(nombre, 'composición no cumple criterios', medida);
    } else {
      ok(nombre, medida);
    }
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    await probarViewport(browser, vp, false);
    await probarViewport(browser, vp, true);
  }
} finally {
  await browser.close();
}

report.resumen = {
  total: report.pruebas.length,
  ok: report.pruebas.filter((p) => p.ok).length,
  fallos: report.fallos.length,
  apto: report.fallos.length === 0,
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.resumen, null, 2));
if (report.fallos.length) {
  console.error(report.fallos.join('\n'));
  process.exit(1);
}
