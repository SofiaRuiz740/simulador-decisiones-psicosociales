/**
 * FASE 21C — Validación botón hospital → comisaría (runtime).
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase21c-result.json');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const EST = 1;
const PRAC = 3;
const PARTIDA_KEY = `narrativa-partida:${CASO}:${EST}:${PRAC}`;
const URL = `${BASE}/estudiante/practicas/${PRAC}/simulacion`;

const OBLIGATORIAS = [
  'entrevista-policia-entrada',
  'entrevista-madre-espera',
  'entrevista-hermano-espera',
  'entrevista-enfermera-pasillo',
  'entrevista-medico-urgencias',
  'revisita-lucia-informe',
];

function partidaCompleta(extra = {}) {
  return JSON.stringify({
    version: 1,
    escenaVisualId: 'cuidados-intensivos',
    guardadoEn: new Date().toISOString(),
    estado: {
      casoId: CASO,
      escenarioActualId: 'consulta-inicial',
      flags: {},
      evidenciasDescubiertas: ['informe-urgencias'],
      hipotesisFormuladas: [],
      hipotesisConSoporte: [],
      contradiccionesIdentificadas: [],
      instanciasContradicion: [],
      afirmacionesActivas: [],
      intervencionesAplicadas: [],
      conversacionesCompletadas: [...OBLIGATORIAS],
      conversacionesEnFatiga: [],
      conversacionesRevisitaDesbloqueadas: [],
      nodosConversacionActivos: {},
      nodosVisitadosPorConversacion: {},
      estadosPersonajes: {},
      metricasPersonajes: {},
      conversacionesUtilesPorPersonaje: {},
      bonusConversacionesUtiles: {},
      memoriaPersonajes: {},
      tiempoNarrativo: { dia: 1, hora: 23, minuto: 50 },
      eventosActivados: [],
      objetivosCumplidos: [],
      competencias: {},
      trazabilidad: {},
      libreta: {},
      escenariosVisitados: ['consulta-inicial'],
      decisiones: [],
      historial: [],
      inicioSesion: new Date().toISOString(),
      ...extra,
    },
  });
}

const report = { timestamp: new Date().toISOString(), fase: '21C', pruebas: [], fallos: [] };

function ok(n, d) {
  report.pruebas.push({ nombre: n, ok: true, ...d });
}
function fail(n, m, d = {}) {
  report.fallos.push(`${n}: ${m}`);
  report.pruebas.push({ nombre: n, ok: false, motivo: m, ...d });
}

async function preparar(page, partidaJson, intro = '1') {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ partidaJson, intro, practicaId, caso, partidaKey }) => {
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id: 1, email: 'sofiayuliana30052007@gmail.com', nombre_completo: 'Sofía', rol: 'Estudiante' }),
      );
      localStorage.setItem('simulador.access', 'audit-21c');
      localStorage.setItem(`narrativa-intro-vista:${caso}:1:${practicaId}`, intro);
      localStorage.setItem(`narrativa-intro-vista:${caso}:1`, intro);
      if (partidaJson) localStorage.setItem(partidaKey, partidaJson);
      else localStorage.removeItem(partidaKey);
      const practica = {
        id: practicaId,
        nombre: 'Simulación',
        caso_id: 1,
        caso_nombre: 'Simulación Violencia',
        tiempo_max_min: 120,
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(Date.now() + 86400000).toISOString(),
        mensaje_personalizado: '',
        estado: 'EN_CURSO',
        autorizacion_id: 3,
        progreso: {
          practicaId,
          casoNarrativoId: caso,
          porcentaje: 50,
          estado: 'en_progreso',
          ultimaActividad: new Date().toISOString(),
          conversacionesCompletadas: 6,
          conversacionesTotales: 6,
        },
      };
      localStorage.setItem('simulador.practicas_estudiante', JSON.stringify([practica]));
      localStorage.setItem('simulador.practica_activa', JSON.stringify(practica));
    },
    { partidaJson, intro, practicaId: PRAC, caso: CASO, partidaKey: PARTIDA_KEY },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
}

const browser = await chromium.launch({ headless: true });

try {
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await preparar(page, partidaCompleta());
    const visible = await page
      .locator('button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (visible) ok('boton_visible_6_de_6', { escena: 'cuidados-intensivos' });
    else fail('boton_visible_6_de_6', 'no visible con 6 entrevistas completas');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await preparar(
      page,
      partidaCompleta({ escenariosVisitados: ['consulta-inicial', 'investigacion-comisaria'] }),
    );
    const visible = await page
      .locator('button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!visible) ok('boton_oculto_si_comisaria_visitada', {});
    else fail('boton_oculto_si_comisaria_visitada', 'debió ocultarse');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await preparar(
      page,
      partidaCompleta({
        conversacionesCompletadas: OBLIGATORIAS.filter((id) => id !== 'revisita-lucia-informe'),
      }),
    );
    const visible = await page
      .locator('button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!visible) ok('boton_oculto_sin_lucia', {});
    else fail('boton_oculto_sin_lucia', 'visible sin revisita-lucia-informe');
    await page.close();
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
if (report.fallos.length) process.exit(1);
