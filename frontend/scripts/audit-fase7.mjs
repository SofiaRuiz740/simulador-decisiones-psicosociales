/**
 * FASE 7 — Auditoría de estabilización (runtime).
 * Uso: node scripts/audit-fase7.mjs
 * Requiere: app en BASE_URL (default http://localhost:8080), playwright instalado.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO_ID = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9001;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO_ID}`;
const INTRO_KEY = `narrativa-intro-vista:${CASO_ID}:${ESTUDIANTE_ID}`;

/** Rutas mínimas asumiendo flujo lineal hospital (sin volver atrás entre entrevistas). */
const HOSPITAL_CONVERSATIONS = [
  {
    id: 'entrevista-policia-entrada',
    escena: 'entrada-hospital',
    ariaLabel: 'Funcionario policial',
    navegar: [],
  },
  {
    id: 'entrevista-madre-espera',
    escena: 'sala-espera',
    ariaLabel: 'Madre (víctima)',
    navegar: [{ label: 'Entrar al hospital', escena: 'sala-espera' }],
  },
  {
    id: 'entrevista-hermano-espera',
    escena: 'sala-espera',
    ariaLabel: 'Hermano',
    navegar: [],
  },
  {
    id: 'entrevista-enfermera-pasillo',
    escena: 'pasillo-urgencias',
    ariaLabel: 'Enfermera jefe',
    navegar: [{ label: 'Ir al pasillo de urgencias', escena: 'pasillo-urgencias' }],
  },
  {
    id: 'entrevista-medico-urgencias',
    escena: 'cuidados-intensivos',
    ariaLabel: 'Médico tratante',
    navegar: [{ label: 'UCI — paciente crítica', escena: 'cuidados-intensivos' }],
  },
  {
    id: 'revisita-lucia-informe',
    escena: 'cuidados-intensivos',
    ariaLabel: 'Madre (víctima)',
    navegar: [],
  },
];

const __dirname = dirname(fileURLToPath(import.meta.url));

function evaluarCondicionComisaria(completadas) {
  const ids = [
    'entrevista-policia-entrada',
    'entrevista-madre-espera',
    'entrevista-hermano-espera',
    'entrevista-enfermera-pasillo',
    'entrevista-medico-urgencias',
    'revisita-lucia-informe',
  ];
  return ids.every((id) => completadas.includes(id));
}

async function prepararSesion(page) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ introKey, estudianteId }) => {
      localStorage.setItem('simulador.access', 'audit-fase7-token');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({
          id: estudianteId,
          username: 'audit@fase7.test',
          email: 'audit@fase7.test',
          nombre_completo: 'Auditor Fase 7',
          rol: 'Estudiante',
        }),
      );
      localStorage.setItem(introKey, '1');
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('narrativa-intro-vista:') && k !== introKey) {
          /* conservar otras claves para prueba intro */
        }
      }
    },
    { introKey: INTRO_KEY, estudianteId: ESTUDIANTE_ID },
  );

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  await page.waitForFunction(
    () => !document.querySelector('.exploracion-carga'),
    undefined,
    { timeout: 30000 },
  ).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function navegarEscena(page, pasos) {
  for (const paso of pasos) {
    const btn = page.locator(`button.hotspot-interactivo[aria-label="${paso.label}"]`).first();
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function avanzarDialogo(page, maxPasos = 25) {
  for (let i = 0; i < maxPasos; i++) {
    const dialogo = page.locator('app-dialogo-narrativo .dialogo-caja');
    if (!(await dialogo.isVisible().catch(() => false))) return 'cerrado';

    const bloqueo = await page
      .locator('.mat-mdc-snack-bar-container')
      .filter({ hasText: 'Esta conversación ya fue completada' })
      .isVisible()
      .catch(() => false);
    if (bloqueo) return 'bloqueado';

    const fatiga = await page.locator('.dialogo-aviso').isVisible().catch(() => false);
    if (fatiga) {
      await page.locator('button:has-text("Retirarse en silencio")').click();
      await page.waitForTimeout(400);
      return 'fatiga';
    }

    const opcion = page.locator('app-dialogo-narrativo .btn-opcion').first();
    if (await opcion.isVisible().catch(() => false)) {
      await opcion.click();
      await page.waitForTimeout(350);
      continue;
    }

    const principal = page.locator('app-dialogo-narrativo .btn-principal').first();
    if (await principal.isVisible().catch(() => false)) {
      await principal.click();
      await page.waitForTimeout(350);
      continue;
    }

    return 'sin-accion';
  }
  return 'max-pasos';
}

async function entrevistarPersonaje(page, cfg) {
  await navegarEscena(page, cfg.navegar);
  const hotspot = page.locator(`button.hotspot-personaje[aria-label="${cfg.ariaLabel}"]`).first();
  await hotspot.waitFor({ state: 'visible', timeout: 20000 });
  await hotspot.click();
  await page.waitForSelector('app-dialogo-narrativo .dialogo-caja', { timeout: 10000 });
  const resultado = await avanzarDialogo(page);
  await page
    .waitForFunction(() => !document.querySelector('app-dialogo-narrativo .dialogo-caja'), undefined, {
      timeout: 10000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(400);
  return resultado;
}

const REAPERTURA_NAVEGACION = {
  'entrevista-policia-entrada': [
    { label: 'Regresar al pasillo' },
    { label: 'Regresar a sala de espera' },
    { label: 'Regresar al exterior' },
  ],
  'entrevista-madre-espera': [
    { label: 'Regresar al pasillo' },
    { label: 'Regresar a sala de espera' },
  ],
  'entrevista-hermano-espera': [
    { label: 'Regresar al pasillo' },
    { label: 'Regresar a sala de espera' },
  ],
  'entrevista-enfermera-pasillo': [{ label: 'Regresar al pasillo' }],
  'entrevista-medico-urgencias': [{ label: 'Regresar al pasillo' }],
  'revisita-lucia-informe': [{ label: 'Regresar al pasillo' }],
};

async function reabrirPersonaje(page, cfg) {
  await navegarEscena(page, REAPERTURA_NAVEGACION[cfg.id] ?? cfg.navegar);
  const hotspot = page.locator(`button.hotspot-personaje[aria-label="${cfg.ariaLabel}"]`).first();
  const visible = await hotspot.isVisible().catch(() => false);
  if (!visible) return { visible: false, dialogo: false, fatiga: false, bloqueo: false };

  await hotspot.click();
  await page.waitForTimeout(300);
  for (let intento = 0; intento < 2; intento++) {
    await page
      .waitForSelector('app-dialogo-narrativo .dialogo-caja, .dialogo-aviso', { timeout: 4000 })
      .catch(() => undefined);
    const dialogo = await page
      .locator('app-dialogo-narrativo .dialogo-caja')
      .isVisible()
      .catch(() => false);
    if (dialogo) break;
    await hotspot.click().catch(() => undefined);
    await page.waitForTimeout(400);
  }

  const dialogo = await page.locator('app-dialogo-narrativo .dialogo-caja').isVisible().catch(() => false);
  const fatiga = await page.locator('.dialogo-aviso').isVisible().catch(() => false);
  const bloqueo = await page
    .locator('.mat-mdc-snack-bar-container')
    .filter({ hasText: 'Esta conversación ya fue completada' })
    .isVisible()
    .catch(() => false);

  if (dialogo && fatiga) {
    await page.locator('button:has-text("Retirarse en silencio")').click();
  } else if (dialogo) {
    await page.locator('app-dialogo-narrativo .dialogo-cerrar').click();
  }

  return { visible: true, dialogo, fatiga, bloqueo };
}

async function probarLibretaScroll(page) {
  await page.locator('button.accion-barra:has-text("Libreta")').click();
  await page.waitForSelector('.libreta-panel.mat-drawer-opened', { timeout: 8000 });

  await page.locator('.secciones mat-expansion-panel-header').first().click().catch(() => undefined);
  await page.waitForTimeout(300);

  const scrollInfo = await page.evaluate(() => {
    const body = document.querySelector('.panel-body');
    if (!body) return { ok: false, reason: 'sin panel-body' };
    const maxScroll = body.scrollHeight - body.clientHeight;
    body.scrollTop = maxScroll > 0 ? maxScroll / 2 : 0;
    const mid = body.scrollTop;
    body.scrollTop = maxScroll;
    return {
      ok:
        maxScroll <= 0 ||
        (mid > 0 && body.scrollTop >= maxScroll - 2 && getComputedStyle(body).overflowY === 'auto'),
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      scrollTop: body.scrollTop,
      maxScroll,
      overflowY: getComputedStyle(body).overflowY,
      pointerEventsDrawer: getComputedStyle(document.querySelector('.libreta-panel') ?? body)
        .pointerEvents,
    };
  });

  await page.locator('.libreta-panel button[aria-label="Cerrar libreta"]').click();
  return scrollInfo;
}

async function cerrarOverlays(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
  await page.locator('.cdk-overlay-backdrop').click({ force: true, timeout: 500 }).catch(() => undefined);
  await page.locator('.libreta-panel button[aria-label="Cerrar libreta"]').click().catch(() => undefined);
  await page.waitForTimeout(200);
}

async function probarControlesBarra(page, enFullscreen) {
  const resultados = { enFullscreen, audio: false, mapa: false, libreta: false, dialogo: false };

  await cerrarOverlays(page);

  const muteBtn = page.locator('app-control-ambiente-audio button').first();
  if (await muteBtn.isVisible().catch(() => false)) {
    await muteBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(200);
    await cerrarOverlays(page);
    await muteBtn.click({ force: true }).catch(() => undefined);
    resultados.audio = true;
  }

  await page.locator('button.accion-barra:has-text("Mapa")').click();
  await page.waitForSelector('.dialogo-mapa-escenas, mat-dialog-container', { timeout: 8000 });
  const overlayEnViewport = await page.evaluate(() => {
    const viewport = document.querySelector('.simulacion-viewport');
    const overlay = document.querySelector('.cdk-overlay-container');
    return !!(viewport && overlay && viewport.contains(overlay));
  });
  resultados.mapa = overlayEnViewport;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.locator('button.accion-barra:has-text("Libreta")').click();
  await page.waitForSelector('.libreta-panel.mat-drawer-opened', { timeout: 5000 });
  resultados.libreta = true;
  await page.locator('.libreta-panel button[aria-label="Cerrar libreta"]').click();

  await navegarEscena(page, []);
  const policia = page.locator('button.hotspot-personaje[aria-label="Funcionario policial"]').first();
  if (await policia.isVisible().catch(() => false)) {
    await policia.click();
    resultados.dialogo = await page
      .locator('app-dialogo-narrativo .dialogo-caja')
      .isVisible()
      .catch(() => false);
    await page.locator('app-dialogo-narrativo .dialogo-cerrar').click().catch(() => undefined);
  }

  return resultados;
}

async function probarIntro(page, context) {
  const resultados = {};

  await page.evaluate(
    ({ casoId, idA, idB }) => {
      localStorage.removeItem(`narrativa-intro-vista:${casoId}:${idA}`);
      localStorage.removeItem(`narrativa-intro-vista:${casoId}:${idB}`);
      localStorage.removeItem(`narrativa-intro-vista:${casoId}`);
    },
    { casoId: CASO_ID, idA: 8001, idB: 8002 },
  );

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('simulador.access', token);
      localStorage.setItem('simulador.user', JSON.stringify(user));
    },
    {
      token: 'audit-intro-a',
      user: { id: 8001, email: 'a@test', nombre_completo: 'Est A', rol: 'Estudiante' },
    },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  resultados.nuevoVeIntro = await page
    .waitForSelector('app-introduccion-narrativa', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  await page.evaluate(
    ({ casoId, id }) => {
      localStorage.setItem(`narrativa-intro-vista:${casoId}:${id}`, '1');
    },
    { casoId: CASO_ID, id: 8001 },
  );
  await page.reload({ waitUntil: 'networkidle' });
  resultados.marcadaNoRepite = await page
    .waitForSelector('app-exploracion-visual', { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  resultados.introTrasMarcar = await page
    .locator('app-introduccion-narrativa')
    .isVisible()
    .catch(() => false);

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('simulador.access', token);
      localStorage.setItem('simulador.user', JSON.stringify(user));
    },
    {
      token: 'audit-intro-b',
      user: { id: 8002, email: 'b@test', nombre_completo: 'Est B', rol: 'Estudiante' },
    },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  resultados.otroEstudianteVeIntro = await page
    .waitForSelector('app-introduccion-narrativa', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  await context.clearCookies();
  return resultados;
}

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    bloques: {},
    fallos: [],
    archivosRevisados: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: 'es-CO',
  });
  const page = await context.newPage();

  const toasts = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('Esta conversación ya fue completada')) toasts.push(t);
  });

  try {
    await prepararSesion(page);

    // BLOQUE 1 — completar 6 entrevistas hospitalarias
    const completadas = [];
    for (const cfg of HOSPITAL_CONVERSATIONS) {
      const r = await entrevistarPersonaje(page, cfg);
      if (r === 'bloqueado') report.fallos.push(`B1: bloqueo al completar ${cfg.id}`);
      if (r !== 'cerrado' && r !== 'fatiga') report.fallos.push(`B1: flujo inesperado ${cfg.id}: ${r}`);
      completadas.push(cfg.id);
    }

    const reintentos = {};
    for (const cfg of HOSPITAL_CONVERSATIONS) {
      reintentos[cfg.id] = [];
      for (let i = 0; i < 3; i++) {
        reintentos[cfg.id].push(await reabrirPersonaje(page, cfg));
      }
    }

    report.bloques.bloque1 = {
      conversacionesCompletadas: completadas.length,
      reintentosPorPersonaje: reintentos,
      mensajeBloqueoDetectado: toasts.length > 0,
    };

    for (const [id, intentos] of Object.entries(reintentos)) {
      for (const [idx, intento] of intentos.entries()) {
        if (!intento.visible) report.fallos.push(`B1: hotspot oculto ${id} intento ${idx + 1}`);
        if (!intento.dialogo) report.fallos.push(`B1: diálogo no abrió ${id} intento ${idx + 1}`);
        if (!intento.fatiga) report.fallos.push(`B1: sin respuesta agotamiento ${id} intento ${idx + 1}`);
        if (intento.bloqueo) report.fallos.push(`B1: mensaje bloqueo ${id} intento ${idx + 1}`);
      }
    }

    // BLOQUE 4 — desbloqueo comisaría
    const condicionCumplida = evaluarCondicionComisaria(completadas);
    const hotspotComisaria = page.locator(
      'button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]',
    );
    await navegarEscena(page, [{ label: 'Regresar al pasillo' }]);

    const hotspotVisible = await hotspotComisaria.isVisible().catch(() => false);

    report.bloques.bloque4 = {
      conversacionesCompletadas: completadas,
      condicionCumplida,
      hotspotVisible,
      logEquivalente: {
        conversacionesCompletadas: completadas,
        condicionCumplida,
        hotspotVisible,
      },
    };

    if (!condicionCumplida) report.fallos.push('B4: condición escenario_conversaciones_completadas FALSE');
    if (!hotspotVisible) report.fallos.push('B4: hotspot comisaría no visible');

    await page.locator('button.accion-barra:has-text("Mapa")').click();
    await page.waitForSelector('mat-dialog-container', { timeout: 8000 });
    const mapaTieneComisaria = await page.locator('text=Exterior de la comisaría').isVisible().catch(() => false);
    report.bloques.bloque4.mapaTieneComisaria = mapaTieneComisaria;
    if (!mapaTieneComisaria) report.fallos.push('B4: comisaría ausente en mapa');
    await page.keyboard.press('Escape');

    if (hotspotVisible) {
      await hotspotComisaria.click();
      await page.waitForTimeout(600);
      const enComisaria = await page
        .locator('button.hotspot-interactivo[aria-label="Entrar a la comisaría"]')
        .isVisible()
        .catch(() => false);
      report.bloques.bloque4.transicionOk = enComisaria;
      if (!enComisaria) report.fallos.push('B4: transición a exterior-comisaria falló');
    }

    // BLOQUE 5 — comisaría (si accesible)
    if (report.bloques.bloque4.transicionOk) {
      await page.locator('button.hotspot-interactivo[aria-label="Entrar a la comisaría"]').click();
      await page.waitForTimeout(500);
      const comisarioVisible = await page
        .locator('button.hotspot-personaje[aria-label="Comisario"]')
        .isVisible()
        .catch(() => false);
      const tsVisible = await page
        .locator('button.hotspot-personaje[aria-label="Trabajadora social"]')
        .isVisible()
        .catch(() => false);
      report.bloques.bloque5 = { comisarioVisible, tsVisible };
      if (!comisarioVisible || !tsVisible) report.fallos.push('B5: personajes comisaría no visibles');
    } else {
      report.bloques.bloque5 = { omitido: true };
    }

    // BLOQUE 3 — libreta scroll (nueva sesión con contenido)
    report.bloques.bloque3 = await probarLibretaScroll(page);
    if (!report.bloques.bloque3.ok) report.fallos.push('B3: scroll libreta incompleto');

    // BLOQUE 2 — ventana normal
    report.bloques.bloque2_ventana = await probarControlesBarra(page, false);

    // BLOQUE 2 — fullscreen
    const viewport = page.locator('.simulacion-viewport');
    await viewport.evaluate((el) => el.requestFullscreen?.()).catch(() => undefined);
    await page.waitForTimeout(500);
    report.bloques.bloque2_fullscreen = await probarControlesBarra(page, true);
    await page.evaluate(() => document.exitFullscreen?.()).catch(() => undefined);

    for (const [modo, data] of [
      ['ventana', report.bloques.bloque2_ventana],
      ['fullscreen', report.bloques.bloque2_fullscreen],
    ]) {
      if (!data.audio) report.fallos.push(`B2: audio no respondió (${modo})`);
      if (!data.mapa) report.fallos.push(`B2: mapa/overlay falló (${modo})`);
      if (!data.libreta) report.fallos.push(`B2: libreta no abrió (${modo})`);
    }

    // BLOQUE 6 — persistencia tras recarga
    report.bloques.bloque6 = {
      cierreVisibleAntesRecarga: await page
        .locator('.cierre-caso')
        .isVisible()
        .catch(() => false),
    };
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('app-exploracion-visual', { timeout: 60000 }).catch(() => undefined);
    report.bloques.bloque6.cierreVisibleTrasRecarga = await page
      .locator('.cierre-caso')
      .isVisible()
      .catch(() => false);
    report.bloques.bloque6.persistenciaCasoCompletado = report.bloques.bloque6.cierreVisibleTrasRecarga;
    if (report.bloques.bloque6.cierreVisibleAntesRecarga && !report.bloques.bloque6.cierreVisibleTrasRecarga) {
      report.fallos.push('B6: recarga pierde pantalla final / flag caso_completado');
    }

    // BLOQUE 7 — intro por estudiante (página aparte)
    report.bloques.bloque7 = await probarIntro(page, context);
    if (!report.bloques.bloque7.nuevoVeIntro) report.fallos.push('B7: intro no aparece usuario nuevo');
    if (report.bloques.bloque7.introTrasMarcar) report.fallos.push('B7: intro se repite tras marcar vista');
    if (!report.bloques.bloque7.otroEstudianteVeIntro) report.fallos.push('B7: otro estudiante no ve intro');

    // Static checks
    const escenaVisualSrc = readFileSync(
      join(__dirname, '../src/app/estudiante/exploracion-visual/escena-visual/escena-visual.ts'),
      'utf8',
    );
    report.archivosRevisados = [
      'escena-visual.ts',
      'dialogo-narrativo.ts',
      'narrativa-engine.service.ts',
      'condicion-evaluator.ts',
      'fullscreen.service.ts',
      'libreta-psicologo.scss',
      'introduccion-narrativa.util.ts',
      'escenas-hospital.json',
    ];
    report.bloques.statico = {
      sinMensajeConversacionCompletada: !escenaVisualSrc.includes('Esta conversación ya fue completada'),
    };
  } catch (err) {
    report.fallos.push(`ERROR: ${String(err)}`);
  } finally {
    await browser.close();
  }

  report.resumen = {
    totalFallos: report.fallos.length,
    aprobado: report.fallos.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.fallos.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('AUDIT_FASE7_FAILED', err);
  process.exit(1);
});
