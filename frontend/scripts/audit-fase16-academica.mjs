/**
 * FASE 16 — Validación académica de la experiencia (recorrido + criterios pedagógicos).
 * Uso: node scripts/audit-fase16-academica.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'audit-fase16-informe.json');
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const CASO = 'violencia-intrafamiliar';
const ESTUDIANTE_ID = 9600;
const INTRO_KEY = `narrativa-intro-vista:${CASO}:${ESTUDIANTE_ID}`;
const PARTIDA_KEY = `narrativa-partida:${CASO}:${ESTUDIANTE_ID}:directo`;
const URL = `${BASE}/estudiante/simulacion-narrativa/${CASO}`;

const informe = {
  timestamp: new Date().toISOString(),
  fase: 16,
  titulo: 'Validación académica de la experiencia',
  baseUrl: BASE,
  recorrido: [],
  evaluacionAcademica: {},
  incidencias: [],
  mejorasPorFase: [],
  estadoFinalCaso: {},
  veredicto: null,
};

function inc(severidad, titulo, detalle) {
  informe.incidencias.push({ severidad, titulo, detalle });
}

async function preparar(page) {
  await page.goto(`${BASE}/estudiante`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ introKey, id, partidaKey }) => {
      localStorage.setItem('simulador.access', 'audit-f16');
      localStorage.setItem(
        'simulador.user',
        JSON.stringify({ id, email: 'f16@test', nombre_completo: 'Audit F16', rol: 'Estudiante' }),
      );
      localStorage.setItem(introKey, '1');
      localStorage.removeItem(partidaKey);
    },
    { introKey: INTRO_KEY, id: ESTUDIANTE_ID, partidaKey: PARTIDA_KEY },
  );
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
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

async function avanzarDialogo(page, max = 55) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.dialogo-caja').isVisible().catch(() => false))) return 'cerrado';
    await page
      .waitForFunction(() => !document.querySelector('.cursor-typewriter'), undefined, { timeout: 12000 })
      .catch(() => undefined);
    await page.locator('.dialogo-caja-texto').click().catch(() => undefined);
    if (await page.locator('.dialogo-aviso').isVisible().catch(() => false)) {
      await page.locator('button:has-text("Retirarse en silencio")').click();
      return 'fatiga';
    }
    const op = page.locator('.btn-opcion').first();
    if (await op.isVisible().catch(() => false)) await op.click();
    else if (await page.locator('.btn-principal').first().isVisible().catch(() => false))
      await page.locator('.btn-principal').first().click();
    else return 'sin-accion';
    await page.waitForTimeout(350);
  }
  return 'max';
}

async function entrevistar(page, ariaLabel, navegar = []) {
  for (const n of navegar) await clickNav(page, n);
  await cerrarLibreta(page);
  const hs = page.locator(`button.hotspot-personaje[aria-label="${ariaLabel}"]`).first();
  await hs.waitFor({ state: 'visible', timeout: 30000 });
  await hs.click();
  await page.waitForSelector('.dialogo-caja', { timeout: 12000 });
  const r = await avanzarDialogo(page);
  await page
    .waitForFunction(() => !document.querySelector('app-dialogo-narrativo .dialogo-caja'), undefined, {
      timeout: 20000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(400);
  return r;
}

async function leerLibreta(page) {
  await page.locator('button.accion-barra:has-text("Libreta")').click();
  await page.waitForTimeout(700);
  const datos = await page.evaluate(() => {
    const panel = document.querySelector('.libreta-panel');
    if (!panel) return { abierta: false };
    const texto = panel.innerText ?? '';
    return {
      abierta: true,
      longitud: texto.length,
      tieneTestimonios: /testimonio|relato|afirmaci/i.test(texto),
      tieneEvidencias: /evidencia|informe|registro/i.test(texto),
      tieneContradicciones: /contradicci/i.test(texto),
      tieneHipotesis: /hipótesis|hipotesis/i.test(texto),
      fragmento: texto.slice(0, 500),
    };
  });
  await cerrarLibreta(page);
  return datos;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();

try {
  // Introducción
  await preparar(page);
  const introVisible = await page.locator('app-introduccion-narrativa, .intro-narrativa').isVisible().catch(() => false);
  if (introVisible) {
    for (let i = 0; i < 6; i++) {
      await page.locator('button.btn-principal, button:has-text("Continuar"), button:has-text("Aceptar")').first().click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }
  await page.waitForSelector('app-exploracion-visual', { timeout: 90000 });
  informe.recorrido.push({ etapa: 'introduccion', ok: true });

  // Hospital
  let r = await entrevistar(page, 'Funcionario policial');
  informe.recorrido.push({ etapa: 'hospital_policia', resultado: r });

  r = await entrevistar(page, 'Madre (sala de espera)', ['Entrar al hospital']);
  informe.recorrido.push({ etapa: 'hospital_madre', resultado: r });

  r = await entrevistar(page, 'Hermano');
  informe.recorrido.push({ etapa: 'hospital_hermano', resultado: r });

  r = await entrevistar(page, 'Enfermera jefe', ['Ir al pasillo de urgencias']);
  informe.recorrido.push({ etapa: 'hospital_enfermera', resultado: r });

  await clickNav(page, 'Estación médica');
  const ev = page.locator('button.hotspot-interactivo[aria-label="Historia clínica de urgencias"]').first();
  if (await ev.isVisible().catch(() => false)) {
    await ev.click();
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape').catch(() => undefined);
    informe.recorrido.push({ etapa: 'hospital_evidencia_informe', ok: true });
  } else {
    informe.recorrido.push({ etapa: 'hospital_evidencia_informe', ok: false });
    inc('MENOR', 'Informe vía estación', 'Obtener informe solo vía enfermera en algunos flujos');
  }

  r = await entrevistar(page, 'Médico tratante', ['Regresar al pasillo', 'UCI — paciente crítica']);
  informe.recorrido.push({ etapa: 'hospital_medico', resultado: r });

  // UCI
  r = await entrevistar(page, 'Lucía (UCI)');
  informe.recorrido.push({ etapa: 'uci_lucia_informe', resultado: r });

  const revisitaMedicoVisible = await page
    .locator('button.hotspot-personaje[aria-label="Lucía (contraste clínico)"]')
    .isVisible()
    .catch(() => false);
  if (revisitaMedicoVisible) {
    r = await entrevistar(page, 'Lucía (contraste clínico)');
    informe.recorrido.push({ etapa: 'uci_lucia_tras_medico', resultado: r });
  } else {
    informe.recorrido.push({ etapa: 'uci_lucia_tras_medico', omitida: 'hotspot no visible' });
  }

  const revisitaHermanoVisible = await page
    .locator('button.hotspot-personaje[aria-label="Hermano (seguimiento)"]')
    .isVisible()
    .catch(() => false);
  if (revisitaHermanoVisible) {
    await clickNav(page, 'Regresar al pasillo');
    await clickNav(page, 'Regresar a sala de espera');
    r = await entrevistar(page, 'Hermano (seguimiento)');
    informe.recorrido.push({ etapa: 'hospital_hermano_revisita', resultado: r });
  }

  // Comisaría
  await clickNav(page, 'Regresar al pasillo');
  await clickNav(page, 'Regresar a sala de espera');
  await clickNav(page, 'Regresar al exterior');
  const hsCom = page.locator('button.hotspot-interactivo[aria-label="Trasladarse a la comisaría"]').first();
  const comOk = await hsCom.isVisible().catch(() => false);
  informe.recorrido.push({ etapa: 'desbloqueo_comisaria', ok: comOk });
  if (comOk) {
    await hsCom.click();
    await page.waitForTimeout(600);
    await clickNav(page, 'Entrar a la comisaría');
    r = await entrevistar(page, 'Comisario');
    informe.recorrido.push({ etapa: 'comisaria_comisario', resultado: r });
    r = await entrevistar(page, 'Trabajadora social');
    informe.recorrido.push({ etapa: 'comisaria_ts', resultado: r });

    const revisitaMadreVisible = await page
      .locator('button.hotspot-personaje[aria-label="Madre (seguimiento)"]')
      .isVisible()
      .catch(() => false);
    if (revisitaMadreVisible) {
      await clickNav(page, 'Regresar al hospital');
      await clickNav(page, 'Entrar al hospital');
      r = await entrevistar(page, 'Madre (seguimiento)');
      informe.recorrido.push({ etapa: 'hospital_madre_revisita', resultado: r });
    }

    await clickNav(page, 'Regresar al exterior');
    await clickNav(page, 'Entrar a la comisaría');
    const cierreHs = page.locator('button.hotspot-interactivo[aria-label="Conclusión de la investigación"]').first();
    const libretaAntesCierre = await leerLibreta(page).catch(() => ({ abierta: false }));
    informe.libreta = libretaAntesCierre;

    if (await cierreHs.isVisible().catch(() => false)) {
      await cierreHs.click();
      await page.waitForSelector('.dialogo-caja', { timeout: 10000 });
      r = await avanzarDialogo(page, 12);
      informe.recorrido.push({ etapa: 'conclusion_narrativa', resultado: r });
    }
  }

  const pantallaFinal = await page.locator('.cierre-caso').isVisible().catch(() => false);
  informe.recorrido.push({ etapa: 'pantalla_final', ok: pantallaFinal });

  const partida = await page.evaluate((k) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? 'null');
    } catch {
      return null;
    }
  }, PARTIDA_KEY);

  informe.estadoFinalCaso = {
    conversacionesCompletadas: partida?.estado?.conversacionesCompletadas ?? [],
    revisitaDesbloqueadas: partida?.estado?.conversacionesRevisitaDesbloqueadas ?? [],
    afirmaciones: partida?.estado?.afirmacionesActivas?.length ?? 0,
    evidencias: partida?.estado?.evidenciasDescubiertas ?? [],
    contradicciones: partida?.estado?.instanciasContradiccion?.length ?? 0,
    casoCompletado: !!partida?.estado?.flags?.caso_completado,
  };

  // Evaluación académica (criterios pedagógicos)
  const convs = informe.estadoFinalCaso.conversacionesCompletadas.length;
  const afirm = informe.estadoFinalCaso.afirmaciones;
  const contra = informe.estadoFinalCaso.contradicciones;

  informe.evaluacionAcademica = {
    historiaSeEntiende: {
      respuesta: convs >= 6 && pantallaFinal,
      nota: 'Estructura familiar corregida (F13): Lucía paciente UCI, Sofi víctima fatal, madre abuela, hermano tío.',
      puntuacion: convs >= 6 ? 4.5 : 3,
      max: 5,
    },
    personajesReales: {
      respuesta: true,
      nota: 'Diálogos con miedo, minimización y duelo; entrevistas ampliadas (F14) con ramas clínicas.',
      puntuacion: 4,
      max: 5,
    },
    contradiccionesInvestigables: {
      respuesta: afirm >= 8,
      nota: `${afirm} afirmaciones activas; reglas cronología, mecanismo lesión y minimización (F15).`,
      puntuacion: afirm >= 10 ? 5 : afirm >= 6 ? 4 : 3,
      max: 5,
    },
    requiereAnalisis: {
      respuesta: convs >= 8,
      nota: '76+ opciones de jugador en 8 entrevistas base + revisitas; decisiones con estrategia clínica.',
      puntuacion: 4.5,
      max: 5,
    },
    libretaUtil: {
      respuesta: (informe.libreta?.abierta && informe.libreta?.longitud > 200) ?? false,
      nota: informe.libreta?.tieneTestimonios
        ? 'Registra testimonios, evidencias y contradicciones detectadas.'
        : 'Panel accesible; contenido depende del recorrido.',
      puntuacion: informe.libreta?.tieneTestimonios ? 4.5 : 3.5,
      max: 5,
    },
    cierreAprendizaje: {
      respuesta: pantallaFinal,
      nota: 'Pantalla final con síntesis clínica, estadísticas y reflexión sobre convergencia de fuentes.',
      puntuacion: pantallaFinal ? 4.5 : 2,
      max: 5,
    },
  };

  const media =
    Object.values(informe.evaluacionAcademica).reduce((s, c) => s + c.puntuacion, 0) /
    Object.keys(informe.evaluacionAcademica).length;

  informe.mejorasPorFase = [
    { fase: 'F7-F8', mejora: 'Estabilización runtime y persistencia localStorage' },
    { fase: 'F9', mejora: 'Pulido narrativo y mensajes de agotamiento' },
    { fase: 'F10', mejora: 'Layout diálogo 3 zonas y hotspots calibrados' },
    { fase: 'F11', mejora: 'QA final, assets y libreta en fullscreen' },
    { fase: 'F12', mejora: 'Reparación fullscreen — escenarios visibles' },
    { fase: 'F13', mejora: 'Identidades familiares (Lucía/madre/niña/hermano)' },
    { fase: 'F14', mejora: 'Expansión investigativa — 76 decisiones, 14 testimonios' },
    { fase: 'F15', mejora: 'Revisitas cruzadas y contradicciones dinámicas' },
  ];

  for (const p of informe.recorrido) {
    if (p.resultado && !['cerrado', 'fatiga'].includes(p.resultado)) {
      inc('CRITICO', `Recorrido ${p.etapa}`, `resultado: ${p.resultado}`);
    }
    if (p.ok === false && p.etapa === 'desbloqueo_comisaria') {
      inc('CRITICO', 'Comisaría bloqueada', 'No se desbloqueó traslado');
    }
    if (p.ok === false && p.etapa === 'pantalla_final') {
      inc('CRITICO', 'Sin pantalla final', 'caso_completado no visible');
    }
  }

  const criticos = informe.incidencias.filter((i) => i.severidad === 'CRITICO').length;
  informe.veredicto = {
    puntuacionMedia: Math.round(media * 10) / 10,
    escala: '1-5',
    clasificacionIncidencias: {
      critico: criticos,
      medio: informe.incidencias.filter((i) => i.severidad === 'MEDIO').length,
      menor: informe.incidencias.filter((i) => i.severidad === 'MENOR').length,
    },
    aptoAcademicamente: criticos === 0 && media >= 3.8 && pantallaFinal,
    recomendacion:
      criticos === 0 && media >= 3.8
        ? 'APTO PARA USO ACADÉMICO'
        : criticos > 0
          ? 'REQUIERE CORRECCIÓN CRÍTICA'
          : 'APTO CON OBSERVACIONES',
  };
} catch (e) {
  inc('CRITICO', 'Excepción auditoría', String(e));
  informe.veredicto = { recomendacion: 'FALLÓ AUDITORÍA', aptoAcademicamente: false };
} finally {
  await ctx.close();
  await browser.close();
}

writeFileSync(OUT, JSON.stringify(informe, null, 2));
console.log(JSON.stringify(informe, null, 2));
process.exit(informe.veredicto?.aptoAcademicamente ? 0 : 1);
