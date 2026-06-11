/**
 * Fase 16B — Convierte cajas en píxeles del PNG fuente a % viewport (background-size: cover, 1920×1080).
 * Genera overlays en audit-fase16b-screenshots/ para validación visual.
 */
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'src/assets/simulacion-narrativa/escenarios');
const OUT = join(__dirname, '..', 'audit-fase16b-screenshots');
const VW = 1920;
const VH = 1080;

/** Cajas calibradas contra PNG fuente: { left, top, right, bottom } en píxeles de imagen. */
const CALIBRACION = {
  salaEsperaHospital: {
    file: 'salaEsperaHospital.png',
    personajes: {
      'hotspot-madre-espera': {
        label: 'Madre',
        box: { left: 618, top: 358, right: 708, bottom: 538 },
        nota: 'Cabeza, hombros y torso sentado; excluye sillas vecinas y falda/pies',
      },
      'hotspot-hermano-espera': {
        label: 'Hermano',
        box: { left: 288, top: 178, right: 378, bottom: 430 },
        nota: 'Vertical cabeza-cintura; excluye suelo y fila de sillas',
      },
    },
  },
  pasilloUrgencias: {
    file: 'pasilloUrgencias.png',
    personajes: {
      'hotspot-enfermera-pasillo': {
        label: 'Enfermera',
        box: { left: 272, top: 252, right: 352, bottom: 478 },
        nota: 'Vertical cabeza-cintura; excluye pared y pasillo central',
      },
    },
  },
  cuidadosIntensivos: {
    file: 'cuidadosIntensivos.png',
    personajes: {
      'hotspot-lucia-uci': {
        label: 'Lucía UCI',
        box: { left: 388, top: 298, right: 488, bottom: 438 },
        nota: 'Rostro, hombros y torso superior en cama; excluye monitores y cama',
      },
    },
  },
  interiorComisaria: {
    file: 'interiorComisaria.png',
    personajes: {
      'hotspot-comisario': {
        label: 'Comisario',
        box: { left: 472, top: 268, right: 572, bottom: 388 },
        nota: 'Cuerpo sentado; excluye escritorio y papeles',
      },
      'hotspot-trabajadora-social': {
        label: 'Trabajadora social',
        box: { left: 902, top: 158, right: 992, bottom: 338 },
        nota: 'Vertical cabeza-cintura; excluye sillas y mesa',
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
    resultados[id] = { ...hs, nota: data.nota, label: data.label };
    const x = (data.box.left * scale - ox);
    const y = (data.box.top * scale - oy);
    const w = (data.box.right - data.box.left) * scale;
    const h = (data.box.bottom - data.box.top) * scale;
    rects.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(34,197,94,0.35)" stroke="#22c55e" stroke-width="3"/>`,
      `<text x="${x + w / 2}" y="${y - 8}" text-anchor="middle" fill="#fff" font-size="18" font-family="Arial">${data.label}</text>`,
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

mkdirSync(OUT, { recursive: true });
const report = { viewport: `${VW}x${VH}`, escenas: {} };

for (const [key, config] of Object.entries(CALIBRACION)) {
  report.escenas[key] = await renderOverlay(key, config);
}

writeFileSync(join(OUT, 'coords-16b.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
