# FASE 14 — Recalibración definitiva de hotspots

Archivo modificado: `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.6.0**).

Referencia visual: PNG en `frontend/src/assets/simulacion-narrativa/escenarios/`.

Solo se ajustaron coordenadas (`posicion`). Sin cambios en narrativa, diálogos, progresión, persistencia, comisaría (escena), libreta ni mapa.

---

## 1. Paciente UCI — `hotspot-lucia-uci` / `hotspot-lucia-revisita-medico`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 30 | 48 | 22 | 36 |
| **Después** | 28 | 32 | 10 | 40 |

**Justificación:** En `cuidadosIntensivos.png` la paciente yace en la cama del lado izquierdo; cabeza y hombros ~32 % X / 34–45 % Y. El rectángulo anterior era ancho (22 %) y bajo (y 48), invadiendo la cama y el área central del médico. El nuevo hotspot es **vertical y estrecho**, desplazado **arriba e izquierda**, cubriendo cabeza-hombros-torso sobre la cama sin incluir el rack de monitores (x &lt; 26) ni el equipo del lado derecho.

---

## 2. Enfermera — `hotspot-enfermera-pasillo`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 10.2 | 46 | 27.6 | 39 |
| **Después** | 17 | 38 | 11 | 52 |

**Justificación:** En `pasilloUrgencias.png` la enfermera está de pie en el pasillo izquierdo (~23 % X), cuerpo vertical de gorro a pies. El hotspot previo era **demasiado horizontal** (ancho 27.6) y desplazado hacia la pared/puertas (x 10). Formato **vertical** (ancho 11, alto 52) centrado en la figura, de cabeza a torso, sin cubrir el pasillo central ni la pared derecha.

---

## 3. Hermano de Lucía — `hotspot-hermano-espera` / `hotspot-hermano-revisita-policia`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 15.9 | 47.1 | 28.2 | 39.9 |
| **Después** | 12 | 20 | 11 | 58 |

**Justificación:** En `salaEsperaHospital.png` el hermano está **de pie a la izquierda**, figura completa vertical entre sillas y recepción. El área anterior era un bloque horizontal bajo (y 47) que incluía suelo y sillas. Nuevo hotspot **más a la izquierda** (x 12), **vertical** (11 × 58), de gorro a zapatillas, sin cubrir el pasillo central ni las filas de sillas del fondo.

*(Ambos IDs comparten la misma posición física en sala de espera; solo se actualizaron sus coordenadas, no su lógica narrativa.)*

---

## 4. Madre de Lucía — `hotspot-madre-espera`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 41 | 24 | 17 | 34 |
| **Después** | 40 | 18 | 11 | 48 |

**Justificación:** Recalibración completa contra `salaEsperaHospital.png`. La madre está **sentada** en la segunda silla naranja del frente, postura encorvada. El rectángulo anterior (17 × 34) era corto y ancho, desalineado con el torso sentado. Nuevo hotspot **vertical estrecho** (11 × 48) desde la cabeza hasta los pies visibles, centrado en la figura sentada (~40 % X), sin cubrir la máquina expendedora ni las sillas vacías adyacentes.

---

## 5. Comisario — `hotspot-comisario`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 18.9 | 49 | 26.2 | 37.1 |
| **Después** | 29 | 24 | 13 | 38 |

**Justificación:** En `interiorComisaria.png` el comisario está **sentado** tras el escritorio, cabeza ~38 % X / 42 % Y. El hotspot previo era un bloque horizontal bajo (y 49) demasiado a la izquierda, cubriendo estantes y borde del escritorio. Desplazado hacia el **centro del puesto de trabajo** (x 29), formato **vertical** sobre cabeza-hombros-torso y silla, sin incluir pilas de papeles del mostrador ni la trabajadora social (derecha).

---

## Hotspots no modificados

- `hotspot-medico-uci`
- `hotspot-policia-entrada`
- `hotspot-madre-revisita-ts`
- `hotspot-trabajadora-social`
- Todos los hotspots de navegación, evidencias y transiciones

---

## Validación recomendada

1. Recorrer sala de espera → hermano y madre.
2. Pasillo → enfermera.
3. UCI → paciente (Lucía); confirmar que médico mantiene su área previa.
4. Interior comisaría → comisario sentado.
5. Probar en 1366×768 y 1920×1080.

Script de referencia: `frontend/scripts/audit-fase127-hotspots-intro.mjs` (adaptar coordenadas esperadas a 2.6.0).
