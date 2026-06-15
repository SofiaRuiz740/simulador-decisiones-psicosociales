/**
 * FASE 22A — Validación encuadre de retratos en diálogo.
 * Uso: node scripts/audit-fase22a-retratos.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCSS = join(__dirname, '..', 'src/app/estudiante/exploracion-visual/dialogo-narrativo/dialogo-narrativo.scss');
const OUT = join(__dirname, '..', 'audit-fase22a-result.json');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9220;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const ENTREVISTAS = [
  { label: 'Policía', nav: [], hotspot: 'Funcionario policial', id: 'entrevista-policia-entrada' },
  {
    label: 'Madre de Lucía',
    nav: ['Entrar al hospital'],
    hotspot: 'Madre en sala de espera',
    id: 'entrevista-madre-espera',
  },
  {
    label: 'Enfermera',
    nav: ['Entrar al hospital', 'Ir al pasillo de urgencias'],
    hotspot: 'Enfermera jefe',
    id: 'entrevista-enfermera-pasillo',
  },
  {
    label: 'Médico',
    nav: ['Entrar al hospital', 'Ir al pasillo de urgencias', 'UCI — paciente crítica'],
    hotspot: 'Médico tratante',
    id: 'entrevista-medico-urgencias',
  },
  {
    label: 'Lucía',
    nav: ['Entrar al hospital', 'Ir al pasillo de urgencias', 'UCI — paciente crítica'],
    hotspot: 'Lucía',
    id: 'revisita-lucia-informe',
  },
];

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const report = { timestamp: new Date().toISOString(), fase: '22A', pruebas: [], fallos: [] };

function ok(n, d) {
  report.pruebas.push({ nombre: n, ok: true, ...d });
}
function fail(n, m, d = {}) {
  report.fallos.push(`${n}: ${m}`);
  report.pruebas.push({ nombre: n, ok: false, motivo: m, ...d });
}

function auditScss() {
  const css = readFileSync(SCSS, 'utf8');
  const checks = [
    ['object-fit: contain', /object-fit:\s*contain/.test(css)],
    ['sin object-fit: cover en retrato', !/\.personaje-imagen[\s\S]*object-fit:\s*cover/.test(css)],
    ['object-position anclado abajo', /object-position:[^;]*bottom/.test(css)],
    ['personaje-escena overflow visible', /\.personaje-escena[\s\S]*?overflow:\s*visible/.test(css)],
    [':host overflow visible', /:host[\s\S]*?overflow:\s*visible/.test(css)],
    ['sin height 108% en retrato', !/height:\s*108%/.test(css)],
  ];
  for (const [nombre, passed] of checks) {
    if (passed) ok(`scss_${nombre}`, {});
    else fail(`scss_${nombre}`, 'criterio no cumplido');
  }
}

async function preparar(page) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ introKey, id }) => {
      localStorage.setItem('simulador.access', 'audit-f22a');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id, email: 'f22a@test', nombre_completo: 'Audit F22A', rol: 'Estudiante' }),
      );
      localStorage.setItem(introKey, '1');
    },
    { introKey: INTRO_KEY, id: ESTUDIANTE_ID },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
}

async function navegar(page, labels) {
  for (const label of labels) {
    const btn = page.getByRole('button', { name: label, exact: true });
    await btn.waitFor({ state: 'visible', timeout: 20000 });
    await btn.click();
    await page.waitForTimeout(600);
  }
}

async function abrirEntrevista(page, ent) {
  await navegar(page, ent.nav);
  const hotspot = page.locator(`button.hotspot-personaje[aria-label="${ent.hotspot}"]`).first();
  if (!(await hotspot.isVisible().catch(() => false))) {
    return false;
  }
  await hotspot.click();
  await page.waitForSelector('.dialogo-composicion', { timeout: 15000 });
  await page.waitForSelector('.personaje-imagen', { timeout: 10000 });
  await page.waitForTimeout(400);
  return true;
}

async function medirRetrato(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.personaje-imagen')];
    const host = document.querySelector('app-dialogo-narrativo');
    const hostStyle = host ? getComputedStyle(host) : null;
    const escenas = [...document.querySelectorAll('.personaje-escena')];

    const medidas = imgs.map((img) => {
      const r = img.getBoundingClientRect();
      const style = getComputedStyle(img);
      const escena = img.closest('.personaje-escena');
      const re = escena?.getBoundingClientRect();
      const rs = escena ? getComputedStyle(escena) : null;
      const headMargin = Math.max(12, Math.round(r.height * 0.22));
      return {
        src: img.getAttribute('src')?.split('/').pop() ?? '',
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        topVisible: r.top >= -2,
        headZoneVisible: r.top + headMargin <= window.innerHeight && r.top >= -2,
        fullyInViewportWidth: r.left >= -4 && r.right <= window.innerWidth + 4,
        escenaOverflow: rs?.overflow ?? null,
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        escenaTop: re ? Math.round(re.top) : null,
      };
    });

    const allContain = medidas.every((m) => m.objectFit === 'contain');
    const allHeadVisible = medidas.every((m) => m.headZoneVisible && m.topVisible);
    const escenasVisible = escenas.every((el) => getComputedStyle(el).overflow === 'visible');

    return {
      ok: allContain && allHeadVisible && escenasVisible && hostStyle?.overflow === 'visible',
      hostOverflow: hostStyle?.overflow ?? null,
      escenasVisible,
      allContain,
      allHeadVisible,
      medidas,
    };
  });
}

auditScss();

const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    try {
      await preparar(page);
      for (const ent of ENTREVISTAS.slice(0, 3)) {
        const abierto = await abrirEntrevista(page, ent);
        const nombre = `${vp.name}_${ent.label.replace(/\s+/g, '_')}`;
        if (!abierto) {
          fail(nombre, 'no se pudo abrir entrevista');
          continue;
        }
        const medida = await medirRetrato(page);
        if (medida.ok) ok(nombre, medida);
        else fail(nombre, 'retrato recortado o estilo incorrecto', medida);
        await page.locator('.dialogo-cerrar').click().catch(() => {});
        await page.waitForTimeout(350);
      }
    } finally {
      await context.close();
    }
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
