/**
 * Audita que no existan sprites/imágenes de personajes sobre escenarios de exploración.
 * Uso: node scripts/audit-personajes-escena.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4200';
const CASO_ID = 'violencia-intrafamiliar';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ casoId, estudianteId }) => {
    localStorage.setItem('simulador.access', 'audit-token');
    localStorage.setItem(
      'simulador.user',
      JSON.stringify({ id: estudianteId, email: 'audit@test', nombre_completo: 'Audit', rol: 'Estudiante' }),
    );
    localStorage.setItem(`narrativa-intro-vista:${casoId}:${estudianteId}`, '1');
  }, { casoId: CASO_ID, estudianteId: 1 });

  await page.goto(`${BASE}/estudiante/simulacion-narrativa/${CASO_ID}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  await page.waitForSelector('app-escena-visual, .simulacion-error, .simulacion-carga', {
    timeout: 45000,
  });

  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const escena = document.querySelector('app-escena-visual');
    const imgsEscena = escena
      ? [...escena.querySelectorAll('img')].map((img) => ({
          src: img.getAttribute('src') ?? '',
          class: img.className,
        }))
      : [];

    const spriteNodes = document.querySelectorAll(
      'app-sprite-personaje, .sprite-personaje, .sprite-imagen',
    ).length;

    const hotspotNodes = document.querySelectorAll(
      'app-hotspot-personaje, .hotspot-personaje',
    ).length;

    const personajeImgsGlobal = [...document.querySelectorAll('img')]
      .filter((img) => (img.getAttribute('src') ?? '').includes('/personajes/'))
      .map((img) => ({
        src: img.getAttribute('src'),
        class: img.className,
        inDialogo: !!img.closest('app-dialogo-narrativo'),
        inEscena: !!img.closest('app-escena-visual'),
      }));

    const bgPersonajes = [...document.querySelectorAll('[style*="personajes"]')].map(
      (el) => el.getAttribute('style'),
    );

    return {
      url: location.href,
      escenaPresente: !!escena,
      imgsEnEscena: imgsEscena,
      spriteNodes,
      hotspotNodes,
      personajeImgsGlobal,
      bgPersonajes,
      htmlEscena: escena?.innerHTML.slice(0, 800) ?? null,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  const violaciones = [
    result.spriteNodes > 0,
    result.imgsEnEscena.length > 0,
    result.personajeImgsGlobal.some((i) => i.inEscena && !i.inDialogo),
  ];

  if (violaciones.some(Boolean)) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
