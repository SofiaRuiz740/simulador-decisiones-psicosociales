/**
 * FASE 8 — Validación de persistencia y recarga.
 * Uso: node scripts/audit-fase8-persistencia.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9100;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const PARTIDA_KEY = `narrativa-partida:${CASO}:${ESTUDIANTE_ID}:directo`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const report = {
  timestamp: new Date().toISOString(),
  pruebas: [],
  fallos: [],
  claves: { intro: INTRO_KEY, partida: PARTIDA_KEY },
};

function ok(nombre, datos) {
  report.pruebas.push({ nombre, ok: true, ...datos });
}

function fail(nombre, motivo, datos = {}) {
  report.fallos.push(`${nombre}: ${motivo}`);
  report.pruebas.push({ nombre, ok: false, motivo, ...datos });
}

async function preparar(page) {
  await page.goto(`${BASE}/estudiante`);
  await page.evaluate(
    ({ introKey, estudianteId, partidaKey }) => {
      localStorage.setItem('simulador.access', 'audit-fase8');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({
          id: estudianteId,
          email: 'fase8@test',
          nombre_completo: 'Audit Fase 8',
          rol: 'Estudiante',
        }),
      );
      localStorage.setItem(introKey, '1');
      localStorage.removeItem(partidaKey);
    },
    { introKey: INTRO_KEY, estudianteId: ESTUDIANTE_ID, partidaKey: PARTIDA_KEY },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  await page.waitForTimeout(800);
}

async function avanzarDialogo(page, max = 30) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.dialogo-caja').isVisible().catch(() => false))) return;
    await page
      .waitForFunction(() => !document.querySelector('.cursor-typewriter'), undefined, { timeout: 8000 })
      .catch(() => undefined);
    await page.locator('.dialogo-caja-texto').click().catch(() => undefined);
    const op = page.locator('.btn-opcion').first();
    if (await op.isVisible().catch(() => false)) {
      await op.click();
    } else if (await page.locator('.btn-principal').first().isVisible().catch(() => false)) {
      await page.locator('.btn-principal').first().click();
    } else break;
    await page.waitForTimeout(350);
  }
}

async function completarPolicia(page) {
  await page.locator('button.hotspot-personaje[aria-label="Funcionario policial"]').click();
  await page.waitForSelector('.dialogo-caja');
  await avanzarDialogo(page);
  await page
    .waitForFunction(() => !document.querySelector('app-dialogo-narrativo .dialogo-caja'), undefined, {
      timeout: 12000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(500);
}

async function leerPartida(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, PARTIDA_KEY);
}

async function recargar(page) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  await page.waitForTimeout(800);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // BLOQUE 3 — hospital antes de entrevistas: recarga mantiene estado inicial
  await preparar(page);
  await recargar(page);
  const policiaVisibleInicial = await page
    .locator('button.hotspot-personaje[aria-label="Funcionario policial"]')
    .isVisible()
    .catch(() => false);
  if (policiaVisibleInicial) ok('recarga_antes_entrevistas', { escena: 'entrada-hospital' });
  else fail('recarga_antes_entrevistas', 'hotspot policía no visible');

  // Completar policía + persistencia
  await completarPolicia(page);
  const guardado1 = await leerPartida(page);
  if (
    guardado1?.estado?.conversacionesCompletadas?.includes('entrevista-policia-entrada') ||
    guardado1?.estado?.decisiones?.length > 0
  ) {
    ok('persistencia_tras_entrevista', {
      conversaciones: guardado1.estado.conversacionesCompletadas,
      escenaVisualId: guardado1.escenaVisualId,
      completada: guardado1.estado.conversacionesCompletadas.includes('entrevista-policia-entrada'),
    });
  } else {
    fail('persistencia_tras_entrevista', 'sin progreso guardado', { guardado1 });
  }

  if (!guardado1?.estado?.conversacionesCompletadas?.includes('entrevista-policia-entrada')) {
    fail('entrevista_policia_completa', 'la entrevista no llegó a completar_conversacion');
  }

  // Recarga durante progreso hospital
  await recargar(page);
  const guardado2 = await leerPartida(page);
  const restaurado =
    guardado2?.estado?.conversacionesCompletadas?.includes('entrevista-policia-entrada') ||
    guardado2?.estado?.decisiones?.length > 0;
  if (restaurado) ok('recarga_durante_hospital', { conversaciones: guardado2.estado.conversacionesCompletadas });
  else fail('recarga_durante_hospital', 'progreso perdido tras F5');

  // Reintento agotamiento tras recarga (solo si la entrevista quedó completada)
  if (guardado2?.estado?.conversacionesCompletadas?.includes('entrevista-policia-entrada')) {
    await page.locator('button.hotspot-personaje[aria-label="Funcionario policial"]').click();
    await page.waitForSelector('.dialogo-aviso, .dialogo-caja', { timeout: 8000 });
    const fatiga = await page.locator('.dialogo-aviso').isVisible().catch(() => false);
    if (fatiga) ok('agotamiento_tras_recarga', {});
    else fail('agotamiento_tras_recarga', 'no muestra diálogo de agotamiento');
    await page.locator('button:has-text("Retirarse en silencio")').click().catch(() => undefined);
  }

  // Navegar a sala + recarga escena
  await page.locator('button.hotspot-interactivo[aria-label="Entrar al hospital"]').click();
  await page.waitForTimeout(500);
  await page.locator('button.hotspot-personaje[aria-label="Madre (víctima)"]').first().waitFor({
    state: 'visible',
    timeout: 10000,
  });
  const guardado3 = await leerPartida(page);
  await recargar(page);
  const guardado4 = await leerPartida(page);
  const escenaSala = guardado4?.escenaVisualId === 'sala-espera';
  const madreVisible = await page
    .locator('button.hotspot-personaje[aria-label="Madre (víctima)"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (escenaSala && madreVisible) {
    ok('recarga_escena_sala', { escenaVisualId: guardado4.escenaVisualId });
  } else {
    fail('recarga_escena_sala', 'escena o hotspots no restaurados', { guardado3, guardado4, madreVisible });
  }

  // BLOQUE 5 — caso_completado: clonar partida real y marcar flag
  const basePartida = await leerPartida(page);
  if (basePartida?.estado) {
    basePartida.estado.flags = { ...basePartida.estado.flags, caso_completado: true };
    basePartida.estado.conversacionesCompletadas = [
      ...new Set([
        ...basePartida.estado.conversacionesCompletadas,
        'entrevista-policia-entrada',
        'entrevista-madre-espera',
        'entrevista-hermano-espera',
        'entrevista-enfermera-pasillo',
        'entrevista-medico-urgencias',
        'revisita-lucia-informe',
        'entrevista-comisario',
        'entrevista-trabajadora-social-comisaria',
        'cierre-investigacion',
      ]),
    ];
    basePartida.estado.escenarioActualId = 'investigacion-comisaria';
    basePartida.escenaVisualId = 'interior-comisaria';
    await page.evaluate(
      ({ key, partida }) => localStorage.setItem(key, JSON.stringify(partida)),
      { key: PARTIDA_KEY, partida: basePartida },
    );

    await recargar(page);
    const cierre = await page.locator('.cierre-caso').isVisible().catch(() => false);
    const estadoBarra = await page.locator('.meta-estado').textContent().catch(() => '');
    if (cierre && estadoBarra?.includes('Completada')) {
      ok('caso_completado_tras_recarga', { estadoBarra: estadoBarra.trim() });
    } else {
      fail('caso_completado_tras_recarga', 'pantalla final o estado no restaurado', {
        cierre,
        estadoBarra,
      });
    }
  } else {
    fail('caso_completado_tras_recarga', 'sin partida base para simular cierre');
  }
} catch (err) {
  report.fallos.push(`ERROR: ${String(err)}`);
} finally {
  await browser.close();
}

report.resumen = {
  total: report.pruebas.length,
  exitosas: report.pruebas.filter((p) => p.ok).length,
  fallos: report.fallos.length,
  aprobado: report.fallos.length === 0,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.fallos.length > 0 ? 1 : 0);
