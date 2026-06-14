/**
 * FASE 11 — QA final y estabilización para entrega.
 * Uso: node scripts/audit-fase11-qa-final.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase11-result.json');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9200;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const PARTIDA_KEY = `narrativa-partida:${CASO}:${ESTUDIANTE_ID}:directo`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const report = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE,
  incidencias: [],
  pruebas: [],
  bloques: {},
};

function incidencia(severidad, bloque, titulo, detalle, corregida = false) {
  report.incidencias.push({ severidad, bloque, titulo, detalle, corregida });
}

function prueba(nombre, ok, datos = {}) {
  report.pruebas.push({ nombre, ok, ...datos });
  if (!ok) incidencia('CRITICO', 'general', nombre, datos.motivo ?? 'falló');
}

async function preparar(page) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ introKey, estudianteId, partidaKey }) => {
      localStorage.setItem('simulador.access', 'audit-fase11');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({
          id: estudianteId,
          email: 'fase11@test',
          nombre_completo: 'QA Fase 11',
          rol: 'Estudiante',
        }),
      );
      localStorage.setItem(introKey, '1');
      localStorage.removeItem(partidaKey);
    },
    { introKey: INTRO_KEY, estudianteId: ESTUDIANTE_ID, partidaKey: PARTIDA_KEY },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  await page.waitForTimeout(800);
}

async function cerrarLibreta(page) {
  await page.locator('.libreta-panel button[aria-label="Cerrar libreta"]').click({ timeout: 1500 }).catch(() => undefined);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);
}

async function clickNav(page, label) {
  await cerrarLibreta(page);
  const btn = page.locator(`button.hotspot-interactivo[aria-label="${label}"]`).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(550);
    return true;
  }
  return false;
}

async function avanzarDialogo(page, max = 35) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.dialogo-caja').isVisible().catch(() => false))) return 'cerrado';
    await page
      .waitForFunction(() => !document.querySelector('.cursor-typewriter'), undefined, { timeout: 10000 })
      .catch(() => undefined);
    await page.locator('.dialogo-caja-texto').click().catch(() => undefined);
    const fatiga = await page.locator('.dialogo-aviso').isVisible().catch(() => false);
    if (fatiga) {
      await page.locator('button:has-text("Retirarse en silencio")').click();
      return 'fatiga';
    }
    const op = page.locator('.btn-opcion').first();
    if (await op.isVisible().catch(() => false)) {
      await op.click();
    } else if (await page.locator('.btn-principal').first().isVisible().catch(() => false)) {
      await page.locator('.btn-principal').first().click();
    } else return 'sin-accion';
    await page.waitForTimeout(380);
  }
  return 'max';
}

async function entrevistar(page, ariaLabel, navegar = []) {
  for (const n of navegar) await clickNav(page, n);
  const hs = page.locator(`button.hotspot-personaje[aria-label="${ariaLabel}"]`).first();
  await cerrarLibreta(page);
  await hs.waitFor({ state: 'visible', timeout: 25000 });
  await hs.click();
  await page.waitForSelector('.dialogo-caja', { timeout: 12000 });
  const r = await avanzarDialogo(page);
  await page
    .waitForFunction(() => !document.querySelector('app-dialogo-narrativo .dialogo-caja'), undefined, {
      timeout: 15000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(450);
  return r;
}

async function recogerInforme(page) {
  await clickNav(page, 'Estación médica');
  const ev = page.locator('button.hotspot-interactivo[aria-label="Historia clínica de urgencias"]').first();
  if (await ev.isVisible().catch(() => false)) {
    await ev.click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

async function flujoCompleto(page) {
  const pasos = [];

  let r = await entrevistar(page, 'Funcionario policial');
  pasos.push({ paso: 'policia', resultado: r });

  r = await entrevistar(page, 'Madre (víctima)', ['Entrar al hospital']);
  pasos.push({ paso: 'madre', resultado: r });

  r = await entrevistar(page, 'Hermano');
  pasos.push({ paso: 'hermano', resultado: r });

  r = await entrevistar(page, 'Enfermera jefe', ['Ir al pasillo de urgencias']);
  pasos.push({ paso: 'enfermera', resultado: r });

  const informe = await recogerInforme(page);
  pasos.push({ paso: 'evidencia_informe', ok: informe });

  r = await entrevistar(page, 'Médico tratante', ['Regresar al pasillo', 'UCI — paciente crítica']);
  pasos.push({ paso: 'medico', resultado: r });

  r = await entrevistar(page, 'Madre (víctima)');
  pasos.push({ paso: 'revisita_uci', resultado: r });

  const comisariaNav = await clickNav(page, 'Regresar al pasillo');
  await clickNav(page, 'Regresar a sala de espera');
  await clickNav(page, 'Regresar al exterior');
  const hsCom = page.locator('button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]').first();
  const comisariaOk = await hsCom.isVisible().catch(() => false);
  pasos.push({ paso: 'desbloqueo_comisaria', visible: comisariaOk });
  if (comisariaOk) {
    await hsCom.click();
    await page.waitForTimeout(600);
    await clickNav(page, 'Entrar a la comisaría');
    r = await entrevistar(page, 'Comisario');
    pasos.push({ paso: 'comisario', resultado: r });
    r = await entrevistar(page, 'Trabajadora social');
    pasos.push({ paso: 'trabajadora_social', resultado: r });
    const cierreHs = page
      .locator('button.hotspot-interactivo[aria-label="Conclusión de la investigación"]')
      .first();
    if (await cierreHs.isVisible().catch(() => false)) {
      await cierreHs.click();
      await page.waitForSelector('.dialogo-caja', { timeout: 10000 });
      r = await avanzarDialogo(page, 10);
      pasos.push({ paso: 'conclusion', resultado: r });
    } else {
      pasos.push({ paso: 'conclusion', resultado: 'hotspot_no_visible' });
    }
  }

  const cierreFinal = await page.locator('.cierre-caso').isVisible().catch(() => false);
  pasos.push({ paso: 'pantalla_final', visible: cierreFinal });
  return pasos;
}

async function auditarConsola(page) {
  const errores = [];
  const warnings = [];
  const failed404 = [];

  page.on('console', (msg) => {
    const t = msg.text();
    if (msg.type() === 'error') errores.push(t);
    if (msg.type() === 'warning' && /error|failed|404/i.test(t)) warnings.push(t);
  });
  page.on('response', (res) => {
    if (res.status() === 404) failed404.push(res.url());
  });

  return { errores, warnings, failed404, attach: () => ({ errores, warnings, failed404 }) };
}

async function main() {
  // BLOQUE 3 — assets estáticos
  const assetsRun = spawnSync('node', ['scripts/audit-assets.mjs'], {
    cwd: join(__dirname, '..'),
    encoding: 'utf8',
  });
  report.bloques.assets = {
    exitCode: assetsRun.status,
    stdout: assetsRun.stdout?.slice(-800),
    stderr: assetsRun.stderr?.slice(0, 400),
  };
  const assetsMissing = /Registrados y faltantes\s*:\s*(\d+)/.exec(assetsRun.stdout ?? '');
  const missingCount = assetsMissing ? Number(assetsMissing[1]) : assetsRun.status === 0 ? 0 : 1;
  prueba('assets_registrados', missingCount === 0, {
    motivo: missingCount > 0 ? `${missingCount} assets registrados faltantes` : undefined,
  });

  const browser = await chromium.launch({ headless: true });

  // BLOQUE 1 + 2 — flujo completo + consola
  const ctx1 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page1 = await ctx1.newPage();
  const consola = await auditarConsola(page1);

  try {
    await preparar(page1);

    // BLOQUE 5 — fullscreen (al inicio, sin overlay de cierre)
    const vp = page1.locator('.simulacion-viewport');
    await vp.evaluate((el) => el.requestFullscreen?.()).catch(() => undefined);
    await page1.waitForTimeout(400);
    const fsActive = await page1.evaluate(() => !!document.fullscreenElement);
    await page1.locator('button.accion-barra:has-text("Libreta")').click();
    await page1.waitForTimeout(600);
    const libretaFs = await page1.locator('.libreta-panel').evaluate((el) => {
      return el.classList.contains('mat-drawer-opened') || getComputedStyle(el).visibility === 'visible';
    }).catch(() => false);
    await cerrarLibreta(page1);
    await page1.evaluate(() => document.exitFullscreen?.()).catch(() => undefined);
    report.bloques.fullscreen = { fsActive, libretaFs };
    prueba('fullscreen_libreta', libretaFs, { motivo: 'libreta no abre en fullscreen' });

    const pasos = await flujoCompleto(page1);
    report.bloques.recorridoCompleto = pasos;

    for (const p of pasos) {
      if (p.resultado && p.resultado !== 'cerrado' && p.resultado !== 'fatiga') {
        incidencia('CRITICO', 'B1', `Flujo ${p.paso}`, `resultado: ${p.resultado}`);
      }
      if (p.ok === false && p.paso !== 'evidencia_informe') {
        incidencia('CRITICO', 'B1', `Flujo ${p.paso}`, 'evidencia informe no obtenida');
      }
      if (p.ok === false && p.paso === 'evidencia_informe') {
        incidencia(
          'MENOR',
          'B1',
          'Evidencia informe vía estación',
          'No se abrió desde estación médica; el flujo puede obtenerla vía enfermera.',
        );
      }
      if (p.visible === false && ['desbloqueo_comisaria', 'pantalla_final'].includes(p.paso)) {
        incidencia('CRITICO', 'B1', `Flujo ${p.paso}`, 'elemento esperado no visible');
      }
    }

    const { errores, warnings, failed404 } = consola.attach();
    const http404List = [...new Set(failed404)].filter((u) => !u.includes('favicon'));
    report.bloques.consola = {
      erroresCriticos: errores.filter((e) => !/favicon|DevTools|manifest/i.test(e)),
      warnings,
      http404: http404List,
    };

    const soloAudio404 =
      http404List.length > 0 && http404List.every((u) => u.includes('ambiente-hospital.mp3'));
    const erroresCrit = report.bloques.consola.erroresCriticos.filter(
      (e) => !/ambiente-hospital\.mp3/i.test(e) && !(soloAudio404 && /404/i.test(e)),
    );
    const http404 = http404List.filter((u) => !u.includes('ambiente-hospital.mp3'));
    prueba('consola_sin_errores_criticos', erroresCrit.length === 0, {
      motivo: erroresCrit.slice(0, 3).join(' | '),
    });
    prueba('sin_404_criticos', http404.length === 0, {
      motivo: http404.slice(0, 3).join(' | '),
    });
    if (report.bloques.consola.http404.some((u) => u.includes('ambiente-hospital.mp3'))) {
      incidencia(
        'MENOR',
        'B3',
        'Audio ambiente-hospital.mp3 ausente',
        'Se usa capa sintética de respaldo (LEEME.txt). Opcional para entrega.',
      );
    }

    // BLOQUE 6 — persistencia tras flujo parcial
    const partida = await page1.evaluate((k) => {
      try {
        return JSON.parse(localStorage.getItem(k) ?? 'null');
      } catch {
        return null;
      }
    }, PARTIDA_KEY);
    report.bloques.persistencia = {
      tienePartida: !!partida,
      conversaciones: partida?.estado?.conversacionesCompletadas ?? [],
      escenaVisualId: partida?.escenaVisualId,
    };
    prueba(
      'persistencia_activa',
      !!partida?.estado?.conversacionesCompletadas?.length,
      { motivo: 'sin conversaciones guardadas' },
    );

    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForSelector('app-exploracion-visual', { timeout: 90000 });
    await page1.waitForTimeout(800);
    const partida2 = await page1.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), PARTIDA_KEY);
    const restaura =
      (partida2?.estado?.conversacionesCompletadas?.length ?? 0) >=
      (partida?.estado?.conversacionesCompletadas?.length ?? 0);
    prueba('persistencia_recarga', restaura, { motivo: 'progreso perdido tras F5' });
  } catch (err) {
    incidencia('CRITICO', 'B1', 'Excepción flujo', String(err));
  } finally {
    await ctx1.close();
  }

  // BLOQUE 4 — responsive (escena + diálogo overlap)
  report.bloques.responsive = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await preparar(page);
    await page.locator('button.hotspot-personaje[aria-label="Funcionario policial"]').click();
    await page.waitForSelector('.dialogo-caja', { timeout: 10000 });
    await page.waitForTimeout(600);
    const layout = await page.evaluate(() => {
      const caja = document.querySelector('.dialogo-caja');
      const npc = document.querySelector('.personaje-escena--npc');
      const psi = document.querySelector('.personaje-escena--psicologa');
      if (!caja || !npc || !psi) return { ok: false, reason: 'elementos faltantes' };
      const rC = caja.getBoundingClientRect();
      const rN = npc.getBoundingClientRect();
      const rP = psi.getBoundingClientRect();
      const overlapNpc = !(rN.right <= rC.left || rN.left >= rC.right || rN.bottom <= rC.top);
      const overlapPsi = !(rP.right <= rC.left || rP.left >= rC.right || rP.bottom <= rC.top);
      return {
        ok: !overlapNpc && !overlapPsi,
        overlapNpc,
        overlapPsi,
        npcLeft: Math.round(rN.left),
        psiMarginRight: Math.round(window.innerWidth - rP.right),
      };
    });
    report.bloques.responsive.push({ viewport: vp.name, ...layout });
    if (!layout.ok) {
      incidencia('MEDIO', 'B4', `Overlap diálogo ${vp.name}`, JSON.stringify(layout));
    }
    await ctx.close();
  }

  await browser.close();

  // Resumen incidencias
  report.resumen = {
    pruebasTotal: report.pruebas.length,
    pruebasOk: report.pruebas.filter((p) => p.ok).length,
    incidencias: {
      critico: report.incidencias.filter((i) => i.severidad === 'CRITICO').length,
      medio: report.incidencias.filter((i) => i.severidad === 'MEDIO').length,
      menor: report.incidencias.filter((i) => i.severidad === 'MENOR').length,
    },
    aprobadoEntrega:
      report.incidencias.filter((i) => i.severidad === 'CRITICO' && !i.corregida).length === 0,
    recomendacion:
      report.incidencias.filter((i) => i.severidad === 'CRITICO' && !i.corregida).length === 0
        ? 'APTO PARA ENTREGA'
        : 'REVISAR INCIDENCIAS CRÍTICAS ANTES DE ENTREGAR',
  };

  report.correccionesFase11 = [
    {
      severidad: 'CRITICO',
      titulo: 'Retrato trabajadora social 404',
      archivo: 'asset.model.ts',
      corregida: true,
    },
    {
      severidad: 'CRITICO',
      titulo: 'Libreta bloqueaba clics en fullscreen',
      archivo: 'libreta-psicologo.ts/scss',
      corregida: true,
    },
  ];

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.resumen.aprobadoEntrega ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
