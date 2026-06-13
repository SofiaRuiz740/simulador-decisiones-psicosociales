# Fase 21B — Calibración final de hotspots hospital

Archivo: `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.11.0**).

**Alcance:** solo coordenadas (`x`, `y`, `ancho`, `alto`) de hotspots de personaje. Sin cambios en diálogos, desbloqueos, navegación ni condiciones.

Método: cajas en píxeles del PNG fuente → % viewport (`background-size: cover`, 1920×1080). Script: `frontend/scripts/calibrate-hotspots-21b.mjs`.

---

## 1. Hermano — `hotspot-hermano-espera` / `hotspot-hermano-revisita-policia`

Escena: `sala-espera` (`salaEsperaHospital.png`, 1264×842)

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.10.0)** | 23 | 16 | 7 | 35 |
| **Después (2.11.0)** | 20.7 | 20.6 | 7.1 | 32.3 |

**Ajuste:** ~2.3 % a la izquierda, ~4.6 % hacia abajo. Ancho y alto similares (ligera reducción de alto por recorte superior).

**Objetivo:** rectángulo centrado en cabeza y torso de pie; sin pared ni fila de sillas.

---

## 2. Enfermera — `hotspot-enfermera-pasillo`

Escena: `pasillo-urgencias` (`pasilloUrgencias.png`, 1264×842)

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.10.0)** | 21.5 | 26 | 6.5 | 32 |
| **Después (2.11.0)** | 21.5 | 31.3 | 6.3 | 32.3 |

**Ajuste:** inicio ~5.1 % más bajo (borde superior en la corona). Ancho y alto prácticamente iguales.

**Objetivo:** sin espacio vacío encima de la cabeza; cubre gorro, rostro, hombros y torso.

---

## 3. Madre de Lucía — `hotspot-madre-espera`

Escena: `sala-espera` (`salaEsperaHospital.png`)

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.10.0)** | 49 | 41 | 7 | 25 |
| **Después (2.11.0)** | 50.3 | 41.1 | 4.6 | 25.3 |

**Ajuste:** ancho −35 % (~7.1 → 4.6 %), recentrado horizontal (+1.3 % en x). Altura sin cambio relevante.

**Objetivo:** proporcional al cuerpo sentado; cabeza, hombros y torso sin invadir silla lateral ni espacio vacío.

---

## Validación visual — overlays

Generados en `frontend/audit-fase21b-screenshots/`:

| Escena | Archivo overlay |
|--------|-----------------|
| Sala de espera | `salaEsperaHospital-overlay.png` |
| Pasillo urgencias | `pasilloUrgencias-overlay.png` |
| UCI (referencia) | `cuidadosIntensivos-overlay.png` |

Leyenda en overlays: **rojo punteado** = antes (2.10.0), **verde** = después (21B).

Coordenadas completas: `frontend/audit-fase21b-screenshots/coords-21b.json`.

### Criterios verificados

| Personaje | Criterio |
|-----------|----------|
| Hermano | Centrado sobre cuerpo; desplazado izq./abajo respecto a 2.10.0 |
| Enfermera | Borde superior en cabeza; sin vacío arriba |
| Madre | Ancho proporcional; sin invadir mobiliario lateral |

---

## No modificados

- `hotspot-madre-revisita-ts`
- `hotspot-policia-entrada`, `hotspot-medico-uci`, `hotspot-lucia-*`
- Hotspots de navegación y condiciones de acceso

---

## Regenerar overlays

```bash
cd frontend && node scripts/calibrate-hotspots-21b.mjs
```
