import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';

async function inspectPracticaRoute() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const network = [];
  const errors = [];
  page.on('response', (r) => {
    if (r.url().includes('entrada.png')) network.push({ url: r.url(), status: r.status() });
  });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('simulador.access', 'inspect-token');
    localStorage.removeItem('narrativa-intro-vista:violencia-intrafamiliar');
    const practica = {
      id: 3,
      nombre: 'Práctica prueba',
      caso_id: 1,
      caso_nombre: 'Violencia intrafamiliar',
      tiempo_max_min: 60,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-12-31',
      mensaje_personalizado: '',
      estado: 'activa',
      autorizacion_id: 1,
      progreso: {
        practicaId: 3,
        casoNarrativoId: 'violencia-intrafamiliar',
        porcentaje: 0,
        estado: 'en_progreso',
        ultimaActividad: new Date().toISOString(),
        conversacionesCompletadas: 0,
        conversacionesTotales: 0,
      },
    };
    localStorage.setItem('simulador.practicas_estudiante', JSON.stringify([practica]));
    localStorage.setItem('simulador.practica_activa', JSON.stringify(practica));
  });

  await page.goto(`${BASE}/estudiante/practicas/3/simulacion`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.btn-aceptar', { timeout: 30000 }).catch(() => null);
  if (await page.$('.btn-aceptar')) await page.click('.btn-aceptar');
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  await page.waitForTimeout(18000);
  await page.waitForFunction(() => !document.querySelector('.exploracion-carga'), { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const info = (s) => {
      const el = document.querySelector(s);
      if (!el) return { exists: false };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        exists: true,
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: cs.opacity,
        display: cs.display,
        visibility: cs.visibility,
        bgImage: cs.backgroundImage,
      };
    };
    return {
      route: location.pathname,
      dom: {
        appExploracionVisual: !!document.querySelector('app-exploracion-visual'),
        appEscenaVisual: !!document.querySelector('app-escena-visual'),
        sectionEscena: !!document.querySelector('section.escena'),
        intro: !!document.querySelector('app-introduccion-narrativa'),
        error: document.querySelector('.simulacion-error')?.textContent?.trim() ?? null,
      },
      sizes: {
        stage: info('.simulacion-stage'),
        exploracion: info('app-exploracion-visual'),
        escenaSection: info('section.escena'),
      },
    };
  });

  console.log(JSON.stringify({ data, network, errors }, null, 2));
  await browser.close();
}

inspectPracticaRoute().catch((e) => { console.error(e); process.exit(1); });
