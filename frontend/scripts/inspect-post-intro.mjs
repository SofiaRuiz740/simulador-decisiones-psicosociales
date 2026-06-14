/**
 * Inspección runtime post-introducción narrativa.
 * Uso: node scripts/inspect-post-intro.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const CASO_ID = 'violencia-intrafamiliar';
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO_ID}`;

function inspectElement(page, selector, label) {
  return page.evaluate(({ selector, label }) => {
    const el = document.querySelector(selector);
    if (!el) {
      return { label, selector, exists: false };
    }
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const inlineBg = el.style.backgroundImage || null;
    return {
      label,
      selector,
      exists: true,
      tag: el.tagName.toLowerCase(),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      computed: {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        position: cs.position,
        zIndex: cs.zIndex,
        width: cs.width,
        height: cs.height,
        backgroundImage: cs.backgroundImage,
        backgroundColor: cs.backgroundColor,
      },
      inlineStyle: el.getAttribute('style'),
      inlineBackgroundImage: inlineBg,
    };
  }, { selector, label });
}

function findOverlays(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.simulacion-stage');
    if (!stage) return { stageMissing: true, overlays: [] };

    const stageRect = stage.getBoundingClientRect();
    const centerX = stageRect.left + stageRect.width / 2;
    const centerY = stageRect.top + stageRect.height / 2;

    const stack = document.elementsFromPoint(centerX, centerY);
    return {
      stageMissing: false,
      center: { x: Math.round(centerX), y: Math.round(centerY) },
      stackTopDown: stack.slice(0, 15).map((el) => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: (typeof el.className === 'string' ? el.className : '') || null,
          zIndex: cs.zIndex,
          position: cs.position,
          opacity: cs.opacity,
          display: cs.display,
          visibility: cs.visibility,
          pointerEvents: cs.pointerEvents,
          backgroundColor: cs.backgroundColor,
          rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      }),
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];
  const networkEntrada = [];

  page.on('console', (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(entry);
    if (msg.type() === 'error') consoleErrors.push(entry);
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('entrada.png')) {
      networkEntrada.push({ url: u, status: res.status(), ok: res.ok() });
    }
  });

  // Auth mínima + intro no vista
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ casoId, estudianteId }) => {
    localStorage.setItem('simulador.access', 'inspect-token');
    localStorage.setItem(
      'simulador.user',
      JSON.stringify({ id: estudianteId, email: 'inspect@test', nombre_completo: 'Inspect', rol: 'Estudiante' }),
    );
    localStorage.removeItem(`narrativa-intro-vista:${casoId}:${estudianteId}`);
  }, { casoId: CASO_ID, estudianteId: 1 });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Esperar advertencia intro
  await page.waitForSelector('.btn-aceptar', { timeout: 30000 });
  await page.click('.btn-aceptar');

  // Esperar fin intro: desaparece app-introduccion-narrativa, aparece app-exploracion-visual
  await page.waitForSelector('app-exploracion-visual', { timeout: 60000 });
  await page.waitForFunction(
    () => !document.querySelector('app-introduccion-narrativa'),
    { timeout: 60000 },
  );

  // 3 escenas × 5s + 2 crossfades + transición 2s + margen
  await page.waitForTimeout(20000);

  // Esperar carga escenas si aplica
  await page.waitForFunction(
    () => !document.querySelector('.exploracion-carga'),
    { timeout: 15000 },
  ).catch(() => undefined);

  // +1s para animación escena-entrada
  await page.waitForTimeout(1500);

  const selectors = [
    ['.simulacion-stage', '.simulacion-stage'],
    ['app-exploracion-visual', 'app-exploracion-visual'],
    ['.exploracion', '.exploracion'],
    ['app-escena-visual', 'app-escena-visual'],
    ['section.escena', 'section.escena'],
  ];

  const elements = {};
  for (const [key, sel] of selectors) {
    elements[key] = await inspectElement(page, sel, key);
  }

  const overlays = await findOverlays(page);

  const domPresence = await page.evaluate(() => ({
    appExploracionVisual: !!document.querySelector('app-exploracion-visual'),
    appEscenaVisual: !!document.querySelector('app-escena-visual'),
    sectionEscena: !!document.querySelector('section.escena'),
    appIntroduccionNarrativa: !!document.querySelector('app-introduccion-narrativa'),
    exploracionCarga: !!document.querySelector('.exploracion-carga'),
    barraSimulacion: !!document.querySelector('app-barra-simulacion'),
    libretaHost: !!document.querySelector('.libreta-host'),
    libretaBackdrop: !!document.querySelector('.libreta-backdrop'),
    dialogoNarrativo: !!document.querySelector('app-dialogo-narrativo'),
  }));

  // Petición directa entrada.png si no capturada en red
  if (networkEntrada.length === 0) {
    const status = await page.evaluate(async () => {
      try {
        const r = await fetch('/assets/simulacion-narrativa/escenarios/entrada.png', { method: 'HEAD' });
        return { url: r.url, status: r.status, ok: r.ok };
      } catch (e) {
        return { error: String(e) };
      }
    });
    networkEntrada.push(status);
  }

  const report = {
    url: URL,
    timestamp: new Date().toISOString(),
    domPresence,
    elements,
    overlays,
    networkEntrada,
    consoleErrors,
    pageErrors,
    consoleLogsSample: consoleLogs.slice(-30),
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error('INSPECT_FAILED', err);
  process.exit(1);
});
