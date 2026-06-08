/**
 * Captura estado en t=0ms y t=500ms tras montar exploración (post-intro).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const CASO_ID = 'violencia-intrafamiliar';

function snapshot(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const info = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: cs.opacity,
        display: cs.display,
        visibility: cs.visibility,
        bgImage: cs.backgroundImage,
      };
    };
    return {
      introMounted: !!q('app-introduccion-narrativa'),
      exploracionMounted: !!q('app-exploracion-visual'),
      escenaMounted: !!q('section.escena'),
      stage: info(q('.simulacion-stage')),
      exploracion: info(q('app-exploracion-visual')),
      escena: info(q('section.escena')),
    };
  });
}

async function runScenario(label, setupFn, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await setupFn(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.btn-aceptar', { timeout: 30000 });
  await page.click('.btn-aceptar');
  await page.waitForSelector('app-exploracion-visual', { timeout: 60000 });

  const atMount = await snapshot(page);
  await page.waitForTimeout(500);
  const at500ms = await snapshot(page);
  await page.waitForTimeout(650);
  const at1150ms = await snapshot(page);

  await browser.close();
  return { label, url, atMount, at500ms, at1150ms, errors };
}

async function main() {
  const results = [];

  results.push(await runScenario(
    'caso-directo-1280x800',
    async (page) => {
      await page.evaluate((id) => {
        localStorage.setItem('simulador.access', 'inspect-token');
        localStorage.removeItem(`narrativa-intro-vista:${id}`);
      }, CASO_ID);
    },
    `${BASE}/estudiante/simulacion-narrativa/${CASO_ID}`,
  ));

  results.push(await runScenario(
    'viewport-movil-390x844',
    async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate((id) => {
        localStorage.setItem('simulador.access', 'inspect-token');
        localStorage.removeItem(`narrativa-intro-vista:${id}`);
      }, CASO_ID);
    },
    `${BASE}/estudiante/simulacion-narrativa/${CASO_ID}`,
  ));

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
