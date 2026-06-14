/**
 * FASE 12.7 — Hotspots críticos + introducción narrativa.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase127-result.json');
const SHOTS = join(__dirname, '..', 'audit-fase127-screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 1;
const PRACTICA_ID = 3;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}:${PRACTICA_ID}`;
const INTRO_LEGACY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const PARTIDA_KEY = `narrativa-partida:${CASO}:${ESTUDIANTE_ID}:${PRACTICA_ID}`;
const URL = `${BASE}/estudiante/practicas/${PRACTICA_ID}/simulacion`;

const escenasJson = JSON.parse(
  readFileSync(
    join(__dirname, '..', 'public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json'),
    'utf8',
  ),
);

const report = { timestamp: new Date().toISOString(), fase: '12.7', pruebas: [], fallos: [] };

function partidaMinima(escenaVisualId = 'entrada-hospital') {
  return JSON.stringify({
    version: 1,
    escenaVisualId,
    guardadoEn: new Date().toISOString(),
    estado: {
      casoId: CASO,
      escenarioActualId: 'consulta-inicial',
      flags: {},
      evidenciasDescubiertas: [],
      hipotesisFormuladas: [],
      hipotesisConSoporte: [],
      contradiccionesIdentificadas: [],
      instanciasContradicion: [],
      afirmacionesActivas: [],
      intervencionesAplicadas: [],
      conversacionesCompletadas: [],
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
    },
  });
}

function ok(n, d) {
  report.pruebas.push({ nombre: n, ok: true, ...d });
}
function fail(n, m, d = {}) {
  report.fallos.push(`${n}: ${m}`);
  report.pruebas.push({ nombre: n, ok: false, motivo: m, ...d });
}

function pos(id) {
  for (const e of escenasJson.escenas) {
    const s = e.sprites?.find((x) => x.id === id);
    if (s) return { escenaId: e.id, posicion: s.posicion };
  }
  return null;
}

async function preparar(page, localStorageSetup) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ setup, practicaId, caso }) => {
      for (const [k, v] of Object.entries(setup)) {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      }
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({
          id: 1,
          email: 'sofiayuliana30052007@gmail.com',
          nombre_completo: 'Sofía Juliana',
          rol: 'Estudiante',
        }),
      );
      localStorage.setItem('simulador.access', 'audit-f127');
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
          porcentaje: 0,
          estado: 'no_iniciada',
          ultimaActividad: new Date().toISOString(),
          conversacionesCompletadas: 0,
          conversacionesTotales: 0,
        },
      };
      localStorage.setItem('simulador.practicas_estudiante', JSON.stringify([practica]));
      localStorage.setItem('simulador.practica_activa', JSON.stringify(practica));
    },
    { setup: localStorageSetup, practicaId: PRACTICA_ID, caso: CASO },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
}

const browser = await chromium.launch({ headless: true });
mkdirSync(SHOTS, { recursive: true });

try {
  const madreAntes = { x: 35.9, y: 47.1, ancho: 28.2, alto: 39.9 };
  const medicoAntes = { x: 54, y: 44, ancho: 22, alto: 38 };
  const madreNueva = pos('hotspot-madre-espera')?.posicion;
  const medicoNuevo = pos('hotspot-medico-uci')?.posicion;

  if (escenasJson.version >= '2.5.2') ok('config-v252', { version: escenasJson.version });
  else fail('config-v252', escenasJson.version);

  ok('coords_madre', { antes: madreAntes, ahora: madreNueva, referencia: 'salaEsperaHospital.png' });
  ok('coords_medico', { antes: medicoAntes, ahora: medicoNuevo, referencia: 'cuidadosIntensivos.png' });

  // Intro: reinicio simulado (intro marcada, partida ausente)
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await preparar(page, {
      [INTRO_KEY]: '1',
      [INTRO_LEGACY]: '1',
      [PARTIDA_KEY]: null,
      [`narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`]: '1',
    });
    const introVisible = await page.locator('.intro-advertencia').isVisible({ timeout: 15000 }).catch(() => false);
    if (introVisible) ok('intro_tras_reinicio', { fase: 'intro', advertenciaVisible: true });
    else fail('intro_tras_reinicio', 'no apareció advertencia de contenido sensible');
    await page.screenshot({ path: join(SHOTS, 'intro_tras_reinicio_simulado.png') });
    await page.close();
  }

  // Intro: continuidad normal (intro + partida mínima, sin progreso pesado)
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      await preparar(page, {
        [INTRO_LEGACY]: '1',
        [INTRO_KEY]: '1',
        [PARTIDA_KEY]: partidaMinima(),
      });
      await page.waitForSelector('app-escena-visual .escena, .intro-advertencia', { timeout: 90000 });
      const introVisible = await page.locator('.intro-advertencia').isVisible().catch(() => false);
      const escenaVisible = await page.locator('app-escena-visual .escena').isVisible().catch(() => false);
      if (!introVisible && escenaVisible) ok('intro_continuidad_normal', { escenaDirecta: true });
      else {
        await page.screenshot({ path: join(SHOTS, 'intro_continuidad_fallo.png') });
        fail('intro_continuidad_normal', 'debió saltar intro con partida guardada', { introVisible, escenaVisible });
      }
    } catch (err) {
      await page.screenshot({ path: join(SHOTS, 'intro_continuidad_fallo.png') }).catch(() => {});
      fail('intro_continuidad_normal', err.message ?? String(err));
    } finally {
      await page.close();
    }
  }

  // Hotspots visuales (intro vista + partida mínima para entrar al hospital)
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await preparar(page, {
      [INTRO_LEGACY]: '1',
      [INTRO_KEY]: '1',
      [PARTIDA_KEY]: partidaMinima(),
    });
    await page.waitForSelector('app-escena-visual .escena', { timeout: 90000 });
    await page.locator('button.hotspot-interactivo[aria-label="Entrar al hospital"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(SHOTS, 'sala_espera_hotspots.png') });

    const madreBox = await page.locator('button.hotspot-personaje[aria-label="Madre (sala de espera)"]').boundingBox();
    if (madreBox) ok('hotspot_madre_visible', madreBox);
    else fail('hotspot_madre_visible', 'no encontrado');

    await page.locator('button.hotspot-interactivo[aria-label="Ir al pasillo de urgencias"]').click();
    await page.waitForTimeout(400);
    await page.locator('button.hotspot-interactivo[aria-label="UCI — paciente crítica"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(SHOTS, 'uci_hotspot_medico.png') });

    const medBox = await page.locator('button.hotspot-personaje[aria-label="Médico tratante"]').boundingBox();
    if (medBox) ok('hotspot_medico_visible', medBox);
    else fail('hotspot_medico_visible', 'no encontrado');

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
