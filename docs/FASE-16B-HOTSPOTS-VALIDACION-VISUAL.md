# Fase 16B — Corrección definitiva de hotspots (validación visual)

Archivo: `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.8.0**).

Método: cajas trazadas en **píxeles del PNG fuente**, convertidas a % viewport con `background-size: cover` a **1920×1080**, validadas con overlays en `frontend/audit-fase16b-screenshots/`. Script: `frontend/scripts/calibrate-hotspots-16b.mjs`.

---

## 1. Madre de Lucía — `hotspot-madre-espera`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 43 | 17 | 9 | 38 |
| **Ahora (2.8.0)** | 49 | 41 | 7 | 25 |

**Justificación visual (`salaEsperaHospital.png`, 1264×842):** Caja fuente (618–708 px × 358–538 px) centrada en Carmen sentada en la silla naranja central. Cubre **cabello, rostro, hombros y torso superior** (hasta manos en regazo). Excluye sillas vacías laterales y falda/pies. El ajuste previo (y=17 %) quedaba sobre el respaldo y el techo; el nuevo y=41 % alinea el tooltip sobre la **cabeza**.

---

## 2. Hermano de Lucía — `hotspot-hermano-espera` / `hotspot-hermano-revisita-policia`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 15 | 13 | 10 | 50 |
| **Ahora (2.8.0)** | 23 | 16 | 7 | 35 |

**Justificación visual:** Caja fuente (288–378 px × 178–430 px) vertical sobre Diego de pie a la izquierda. Cubre **gorro capilar, rostro, hombros y torso hasta cintura**. No alcanza zapatillas ni fila de sillas del primer plano. El hotspot anterior era ancho y bajo (cubría suelo y mobiliario).

---

## 3. Enfermera — `hotspot-enfermera-pasillo`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 13 | 12 | 10 | 46 |
| **Ahora (2.8.0)** | 21.5 | 26 | 6.5 | 32 |

**Justificación visual (`pasilloUrgencias.png`):** Caja fuente (272–352 px × 252–478 px) estrecha sobre la figura de pie en primer plano izquierdo. Cubre **gorro, rostro, hombros, pecho y abdomen hasta cintura**. El recorte anterior (y=12 %) caía en la puerta/pared superior; el nuevo arranca en la **corona de la cabeza**.

---

## 4. Lucía UCI — `hotspot-lucia-uci` / `hotspot-lucia-revisita-medico`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 25 | 28 | 9 | 34 |
| **Ahora (2.8.0)** | 28 | 38 | 7 | 18 |

**Justificación visual (`cuidadosIntensivos.png`, 1372×784):** Caja fuente (388–488 px × 298–438 px) sobre rostro y torso superior en cama. Centrada entre torre de monitores (izquierda) y médico (derecha). **No cubre** rack de equipos ni colchón inferior. Altura reducida (18 %) para limitarse a cabeza-hombros-pecho.

---

## 5. Comisario — `hotspot-comisario`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 24 | 20 | 12 | 40 |
| **Ahora (2.8.0)** | 35 | 35 | 7.5 | 16 |

**Justificación visual (`interiorComisaria.png`, 1356×768):** Caja fuente (472–572 px × 268–388 px) vertical sobre el uniformado **sentado**. Cubre **gorra, rostro, hombros y pecho** hasta el borde superior del escritorio. Excluye pilas de papeles, mostrador y estantería lateral (hotspot anterior x=24 cubría mobiliario).

---

## 6. Trabajadora social — `hotspot-trabajadora-social`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.7.0)** | 54.9 | 50 | 26.2 | 37.1 |
| **Ahora (2.8.0)** | 66.5 | 20 | 7 | 24 |

**Justificación visual:** Caja fuente (902–992 px × 158–338 px) sobre la profesional de pie junto a la puerta de cristal. Cubre **cabello, rostro, hombros y torso hasta cintura**. El bloque anterior (26 % de ancho, y=50 %) cubría **sillas azules y mesa** de espera; el nuevo está centrado en la silueta humana.

---

## No modificados

- `hotspot-policia-entrada`
- `hotspot-medico-uci`
- `hotspot-madre-revisita-ts`
- Hotspots de navegación (coordenadas)

---

## Botón «Trasladarse a la comisaría»

**Verificado:** solo existen `ir-comisaria` y `ir-comisaria-pasillo` en `escenas-hospital.json`, con ocultación por `no escenario_visitado investigacion-comisaria` y `no caso_completado` (Fase 16A). Sin instancias en transiciones, mapa u otros JSON.

---

## Validación

Overlays generados en `frontend/audit-fase16b-screenshots/`:

- `salaEsperaHospital-overlay.png`
- `pasilloUrgencias-overlay.png`
- `cuidadosIntensivos-overlay.png`
- `interiorComisaria-overlay.png`

Regenerar: `node scripts/calibrate-hotspots-16b.mjs`
