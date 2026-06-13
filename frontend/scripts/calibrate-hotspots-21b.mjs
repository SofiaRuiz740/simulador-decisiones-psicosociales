/**
 * Fase 21B — Calibración fina hermano / enfermera / madre (sala + pasillo).
 * Genera overlays en audit-fase21b-screenshots/ y coords-21b.json
 */
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'src/assets/simulacion-narrativa/escenarios');
const OUT = join(__dirname, '..', 'audit-fase21b-screenshots');
const ESCENAS_JSON = join(
  __dirname,
  '..',
  'public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json',
);
const VW = 1920;
const VH = 1080;

/** Cajas ajustadas Fase 21B — píxeles fuente PNG. */
const CALIBRACION = {
  salaEsperaHospital: {
    file: 'salaEsperaHospital.png',
    personajes: {
      'hotspot-madre-espera': {
        label: 'Madre',
        antes: { left: 618, top: 358, right: 708, bottom: 538 },
        box: { left: 636, top: 358, right: 694, bottom: 538 },
        nota: 'Cabeza-hombros-torso sentado; ancho reducido; sin silla lateral',
      },
      'hotspot-hermano-espera': {
        label: 'Hermano',
        antes: { left: 288, top: 178, right: 378, bottom: 430 },
        box: { left: 262, top: 212, right: 352, bottom: 442 },
        nota: 'Centrado cabeza-torso; desplazado izquierda y abajo',
      },
    },
  },
  pasilloUrgencias: {
    file: 'pasilloUrgencias.png',
    personajes: {
      'hotspot-enfermera-pasillo': {
        label: 'Enfermera',
        antes: { left: 272, top: 252, right: 352, bottom: 478 },
        box: { left: 272, top: 288, right: 352, bottom: 518 },
        nota: 'Borde superior en corona; sin vacío encima',
      },
    },
  },
  cuidadosIntensivos: {
    file: 'cuidadosIntensivos.png',
    personajes: {
      'hotspot-lucia-uci': {
        label: 'Lucía UCI (referencia)',
        antes: { left: 388, top: 298, right: 488, bottom: 438 },
        box: { left: 388, top: 298, right: 488, bottom: 438 },
        nota: 'Sin cambio Fase 21B — solo validación overlay',
      },
    },
  },
};

function coverTransform(imgW, imgH, vw, vh) {
  const scale = Math.max(vw / imgW, vh / imgH);
  const sw = imgW * scale;
  const sh = imgH * scale;
  const ox = (sw - vw) / 2;
  const oy = (sh - vh) / 2;
  return { scale, ox, oy };
}

function boxToHotspot(box, imgW, imgH) {
  const { scale, ox, oy } = coverTransform(imgW, imgH, VW, VH);
  const leftPx = box.left * scale - ox;
  const topPx = box.top * scale - oy;
  const rightPx = box.right * scale - ox;
  const bottomPx = box.bottom * scale - oy;
  return {
    x: round1((leftPx / VW) * 100),
    y: round1((topPx / VH) * 100),
    ancho: round1(((rightPx - leftPx) / VW) * 100),
    alto: round1(((bottomPx - topPx) / VH) * 100),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function renderOverlay(sceneKey, config) {
  const inputPath = join(ASSETS, config.file);
  const meta = await sharp(inputPath).metadata();
  const { width: imgW, height: imgH } = meta;
  const { scale, ox, oy } = coverTransform(imgW, imgH, VW, VH);

  const base = await sharp(inputPath)
    .resize(Math.round(imgW * scale), Math.round(imgH * scale))
    .extract({
      left: Math.round(ox),
      top: Math.round(oy),
      width: VW,
      height: VH,
    })
    .png()
    .toBuffer();

  const rects = [];
  const resultados = {};

  for (const [id, data] of Object.entries(config.personajes)) {
    const hs = boxToHotspot(data.box, imgW, imgH);
    const antesHs = boxToHotspot(data.antes, imgW, imgH);
    resultados[id] = {
      antes: antesHs,
      despues: hs,
      nota: data.nota,
      label: data.label,
    };
    const x = data.box.left * scale - ox;
    const y = data.box.top * scale - oy;
    const w = (data.box.right - data.box.left) * scale;
    const h = (data.box.bottom - data.box.top) * scale;
    const ax = data.antes.left * scale - ox;
    const ay = data.antes.top * scale - oy;
    const aw = (data.antes.right - data.antes.left) * scale;
    const ah = (data.antes.bottom - data.antes.top) * scale;
    rects.push(
      `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="rgba(239,68,68,0.2)" stroke="#ef4444" stroke-width="2" stroke-dasharray="8 4"/>`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(34,197,94,0.35)" stroke="#22c55e" stroke-width="3"/>`,
      `<text x="${x + w / 2}" y="${y - 10}" text-anchor="middle" fill="#fff" font-size="18" font-family="Arial">${data.label} (21B)</text>`,
      `<text x="${x + w / 2}" y="${y + h + 22}" text-anchor="middle" fill="#fca5a5" font-size="14" font-family="Arial">rojo=antes verde=después</text>`,
    );
  }

  const svg = `<svg width="${VW}" height="${VH}">${rects.join('')}</svg>`;
  const outPath = join(OUT, `${sceneKey}-overlay.png`);
  await sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);
  return resultados;
}

function aplicarCoordsEnJson(report) {
  const data = JSON.parse(readFileSync(ESCENAS_JSON, 'utf8'));
  const mapa = {
    'hotspot-madre-espera': report.escenas.salaEsperaHospital?.['hotspot-madre-espera']?.despues,
    'hotspot-hermano-espera': report.escenas.salaEsperaHospital?.['hotspot-hermano-espera']?.despues,
    'hotspot-hermano-revisita-policia':
      report.escenas.salaEsperaHospital?.['hotspot-hermano-espera']?.despues,
    'hotspot-enfermera-pasillo': report.escenas.pasilloUrgencias?.['hotspot-enfermera-pasillo']?.despues,
  };

  for (const escena of data.escenas) {
    for (const sprite of escena.sprites ?? []) {
      const coords = mapa[sprite.id];
      if (coords) {
        sprite.posicion = {
          x: coords.x,
          y: coords.y,
          ancho: coords.ancho,
          alto: coords.alto,
        };
      }
    }
  }

  data.version = '2.11.0';
  writeFileSync(ESCENAS_JSON, JSON.stringify(data, null, 2) + '\n');
}

mkdirSync(OUT, { recursive: true });
const report = { viewport: `${VW}x${VH}`, fase: '21B', escenas: {} };

for (const [key, config] of Object.entries(CALIBRACION)) {
  report.escenas[key] = await renderOverlay(key, config);
}

writeFileSync(join(OUT, 'coords-21b.json'), JSON.stringify(report, null, 2));
aplicarCoordsEnJson(report);
console.log(JSON.stringify(report, null, 2));
