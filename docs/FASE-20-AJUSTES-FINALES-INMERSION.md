# Fase 20 — Ajustes finales de experiencia, comisaría, decisiones internas y presentación visual

## Alcance

**Modificado:** acceso a comisaría desde múltiples escenas hospitalarias, textos de decisiones como reflexión clínica interna, uniformidad de retratos, recorte cinematográfico de personajes, capa de audio ambiental para comisaría.

**No modificado:** motor narrativo, persistencia, puntuación, flags, desbloqueos académicos, introducción, pantalla final, fullscreen, libreta, navegación, evaluaciones académicas (Fases 17–19), respuestas correctas de la rúbrica.

---

## Bloque 1 — Recuperar acceso a comisaría

### Problema

El hotspot «Trasladarse a la comisaría» solo existía en `entrada-hospital` e `ir-comisaria-pasillo` (`pasillo-urgencias`). Tras completar UCI el estudiante permanecía en escenas donde no había acceso visible, bloqueando el recorrido Hospital → UCI → Comisaría → Cierre.

### Causa

Condición de acceso correcta (6 conversaciones hospitalarias + comisaría no visitada + caso no completado), pero **ubicación insuficiente** del hotspot: no circular ni por flags incorrectas.

### Solución

Se replicó el hotspot `ir-comisaria` con los mismos `requisitosAcceso` en todas las escenas hospitalarias frecuentes al final del recorrido:

| Hotspot ID | Escena |
|------------|--------|
| `ir-comisaria` | `entrada-hospital` |
| `ir-comisaria-sala` | `sala-espera` |
| `ir-comisaria-pasillo` | `pasillo-urgencias` |
| `ir-comisaria-estacion` | `estacion-medica` |
| `ir-comisaria-uci` | `cuidados-intensivos` |

**Requisitos (sin cambios lógicos):**

1. `escenario_conversaciones_completadas` en `consulta-inicial` con las 6 entrevistas hospitalarias.
2. `no escenario_visitado investigacion-comisaria`.
3. `no flag_activo caso_completado`.

El hotspot permanece visible hasta que el estudiante ingresa a comisaría (escenario marcado como visitado); entonces se oculta en todas las escenas.

**Archivo:** `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.9.0**).

---

## Bloque 2 — Decisiones como reflexión interna

### Problema

Los nodos `emisor: "jugador"` con preguntas directas («¿Qué debería hacer…?», «Usted decide…») rompían la inmersión clínica.

### Solución

1. **Script batch:** `frontend/scripts/fase20-reflexion-jugador.mjs` — transformó 48 nodos jugador a formulaciones de reflexión profesional interna.
2. **Corrección manual** de duplicados generados por reemplazos superpuestos y textos residuales «Usted elige».
3. **UI de diálogo:** etiqueta **«Reflexión clínica»** cuando las opciones no son líneas habladas (`«…»`); **«Podría decir…»** cuando sí lo son.

**Archivos de conversación modificados (11):**

- `entrevista-policia-entrada.json`
- `entrevista-madre-espera.json`
- `entrevista-hermano-espera.json`
- `entrevista-enfermera-pasillo.json`
- `entrevista-medico-urgencias.json`
- `revisita-lucia-informe.json`
- `revisita-lucia-tras-medico.json`
- `revisita-madre-tras-ts.json`
- `revisita-hermano-tras-policia.json`
- `entrevista-comisario.json`
- `entrevista-trabajadora-social-comisaria.json`

**Componentes UI:**

- `frontend/src/app/estudiante/exploracion-visual/dialogo-narrativo/dialogo-narrativo.ts`
- `frontend/src/app/estudiante/exploracion-visual/dialogo-narrativo/dialogo-narrativo.html`

**Sin cambios:** IDs de nodos, flags, opciones, rutas de evaluación, puntuación.

---

## Bloque 3 — Escalado uniforme de personajes

### Ajustes CSS (`dialogo-narrativo.scss`)

| Rol | Escala base |
|-----|-------------|
| Default (policía, enfermera, médico, hermano, comisario, TS, psicóloga) | `--dialogo-escala-retrato: 1.05` |
| `victima` (Lucía UCI) | `0.9` (~−10%) |
| `madre-victima` (Carmen) | `0.9` (~−10%) |

Clases dinámicas `personaje-escena--rol-{rolVisual}` aplicadas en el template HTML.

---

## Bloque 4 — Recorte inteligente de retratos

Por rol, mediante `object-fit: cover` y `object-position` específico:

- **Lucía / madre:** encuadre superior (rostro + hombros), menos margen vacío.
- **Policía, enfermera, médico, hermano:** ligero ajuste vertical/horizontal.
- **Comisario / TS:** encuadre institucional centrado en rostro.
- **Psicóloga:** posición lateral coherente con el panel de diálogo.

Prioridad: emoción facial visible; parte inferior del cuerpo puede quedar detrás del panel.

**Archivo:** `dialogo-narrativo.scss`, `dialogo-narrativo.html`.

---

## Bloque 5 — Música ambiental

### Implementación

- Registro de asset `AUDIO_AMBIENTE_COMISARIA` en `asset.model.ts`.
- `AmbienteAudioService`: fases `hospital` / `comisaria`, transiciones `transicionHospitalAComisaria()` y `transicionComisariaAHospital()`.
- Fallback sintético (pads suaves) si no existe `ambiente-comisaria.mp3`.
- `exploracion-visual.ts`: `effect()` que cambia capa al navegar entre escenas hospitalarias y comisaría.
- Volumen bajo por defecto; controles existentes intactos.

**Archivos:**

- `frontend/src/app/core/simulacion-narrativa/models/asset.model.ts`
- `frontend/src/app/core/simulacion-narrativa/services/ambiente-audio.service.ts`
- `frontend/src/app/estudiante/exploracion-visual/exploracion-visual.ts`
- `frontend/src/assets/simulacion-narrativa/audio/LEEME.txt`

**Nota:** No hay archivos MP3 en el repositorio; la capa instrumental usa síntesis Web Audio como respaldo hasta añadir assets reales.

---

## Validaciones ejecutadas

| Criterio | Resultado |
|----------|-----------|
| Hotspots comisaría en 5 escenas hospitalarias | ✓ JSON validado |
| Requisitos de acceso sin alteración lógica | ✓ Mismos 6 IDs de conversación |
| Sin «Usted decide» / «Usted elige» en nodos jugador | ✓ `grep` sin coincidencias |
| Sin cambio de flags/evaluación en JSON | ✓ Solo campo `texto` en nodos jugador |
| Retratos: escala 1.05 / 0.9 victima-madre | ✓ SCSS |
| object-position por rol | ✓ SCSS |
| Audio comisaría + transiciones | ✓ Servicio + effect |
| Linter TS/SCSS modificados | ✓ Sin errores |
| Build Docker frontend | ✓ Ver sección despliegue |

### Validación manual pendiente (runtime)

- Completar 6 entrevistas hospitalarias → hotspot visible desde UCI/sala/pasillo/estación.
- Navegar a comisaría → entrevistar comisario y TS → cerrar caso.
- Fullscreen, libreta y controles de audio operativos.

---

## Archivos modificados (resumen)

| Área | Archivos |
|------|----------|
| Hotspots comisaría | `escenas-hospital.json` |
| Reflexión clínica | 11 JSON conversaciones + `fase20-reflexion-jugador.mjs` |
| UI diálogo | `dialogo-narrativo.ts`, `.html`, `.scss` |
| Audio | `asset.model.ts`, `ambiente-audio.service.ts`, `exploracion-visual.ts`, `LEEME.txt` |
| Documentación | `docs/FASE-20-AJUSTES-FINALES-INMERSION.md` |

---

## Despliegue

```bash
docker compose build frontend && docker compose up -d frontend
```

---

## Capturas de referencia

No se incluyeron capturas en esta entrega; validar visualmente en el navegador tras el rebuild del contenedor frontend.
