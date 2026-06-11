# Fase 16A — Corrección quirúrgica de hotspots y comisaría

Archivo modificado: `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.7.0**).

Sin cambios en narrativa, diálogos, persistencia, fullscreen, layout de conversaciones, libreta ni mapa.

---

## Hotspots modificados — coordenadas

### 1. Madre de Lucía — `hotspot-madre-espera` (sala de espera)

Señora sentada en silla naranja; madre de Lucía (Carmen), no la niña fallecida.

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes (2.6.0)** | 40 | 18 | 11 | 48 |
| **Ahora (2.7.0)** | 43 | 17 | 9 | 38 |

**Ajuste:** desplazamiento al centro de la figura sentada; rectángulo más estrecho y corto para cubrir cabeza y torso sin incluir sillas adyacentes ni asiento inferior.

---

### 2. Hermano de Lucía — `hotspot-hermano-espera` / `hotspot-hermano-revisita-policia`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 12 | 20 | 11 | 58 |
| **Ahora** | 15 | 13 | 10 | 50 |

**Ajuste:** hotspot vertical sobre figura de pie a la izquierda; inicio más arriba (cabeza ~13 % Y) y centrado en silueta; alto reducido para excluir suelo y mobiliario del pasillo.

---

### 3. Enfermera — `hotspot-enfermera-pasillo`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 17 | 38 | 11 | 52 |
| **Ahora** | 13 | 12 | 10 | 46 |

**Ajuste:** el hotspot anterior empezaba en y=38 % y **no cubría la cabeza** (desplazado hacia abajo). Nuevo rectángulo vertical desde la cabeza (y=12 %) hasta torso, sin incluir pared ni suelo.

---

### 4. Lucía UCI — `hotspot-lucia-uci` / `hotspot-lucia-revisita-medico`

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 28 | 32 | 10 | 40 |
| **Ahora** | 25 | 28 | 9 | 34 |

**Ajuste:** ligero desplazamiento **izquierda** (x 28→25) y **arriba** (y 32→28); área más estrecha sobre rostro, hombros y torso en cama, sin monitores ni equipo lateral.

---

### 5. Comisario — `hotspot-comisario` (interior comisaría)

| | x | y | ancho | alto |
|---|---|---|-------|------|
| **Antes** | 29 | 24 | 13 | 38 |
| **Ahora** | 24 | 20 | 12 | 40 |

**Ajuste:** centrado sobre silla y figura sentada tras el escritorio; menos desplazamiento lateral hacia estanterías.

---

## Hotspots NO modificados (según alcance)

| ID | Escena |
|----|--------|
| `hotspot-policia-entrada` | entrada-hospital |
| `hotspot-medico-uci` | cuidados-intensivos |
| `hotspot-trabajadora-social` | interior-comisaria |
| `hotspot-madre-revisita-ts` | sala-espera |
| Todos los hotspots de navegación, evidencias y transiciones (salvo condiciones de comisaría abajo) |

---

## Problema 6 — Botón residual «Trasladarse a la comisaría»

### Dónde aparecía

| Hotspot ID | Escena visual |
|------------|---------------|
| `ir-comisaria` | `entrada-hospital` |
| `ir-comisaria-pasillo` | `pasillo-urgencias` |

### Condición que lo mantenía visible

Solo existía:

```json
{ "tipo": "escenario_conversaciones_completadas", "parametros": { "escenarioId": "consulta-inicial", ... } }
```

Una vez completadas las 6 entrevistas hospitalarias, el botón **permanecía visible indefinidamente**, incluso:

- después de visitar `exterior-comisaria` / `interior-comisaria`
- al regresar al hospital vía «Regresar al hospital»
- tras cerrar la investigación (`caso_completado`)

No había condición de ocultación por visita previa ni por cierre del caso.

### Corrección aplicada

Se añadieron dos requisitos adicionales en `ir-comisaria` e `ir-comisaria-pasillo`:

```json
{
  "tipo": "no",
  "condiciones": [
    { "tipo": "escenario_visitado", "parametros": { "escenarioId": "investigacion-comisaria" } }
  ]
},
{
  "tipo": "no",
  "condiciones": [
    { "tipo": "flag_activo", "parametros": { "clave": "caso_completado" } }
  ]
}
```

**Comportamiento resultante:**

| Momento | Visible |
|---------|---------|
| Antes de completar evaluación hospitalaria | No |
| Evaluación completa, sin haber ido a comisaría | Sí |
| Tras entrar a comisaría (escenario marcado visitado) | No |
| En escenas de comisaría | No (hotspot no existe en esas escenas) |
| Tras `caso_completado` | No |

El flag `investigacion-comisaria` en `escenariosVisitados` se registra al navegar a `exterior-comisaria` o `interior-comisaria` vía `establecerEscenarioNarrativo` (sin cambio de código).

### Instancias residuales verificadas

- No hay otros hotspots ni transiciones `transicion_narrativa` con etiqueta «Trasladarse a la comisaría».
- El mapa y la libreta no exponen este acceso.

---

## Validación recomendada

1. **Sala de espera:** madre sentada y hermano de pie — tooltip sobre la cabeza al hover.
2. **Pasillo:** enfermera — área vertical cabeza-torso.
3. **UCI:** Lucía en cama — sin solapar monitores.
4. **Comisaría interior:** comisario en silla.
5. **Comisaría acceso:** completar hospital → ver botón → ir a comisaría → regresar → **botón ausente**.

Resoluciones: 1366×768 y 1920×1080.
