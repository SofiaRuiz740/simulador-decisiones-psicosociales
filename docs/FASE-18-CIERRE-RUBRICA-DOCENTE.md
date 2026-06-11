# Fase 18 — Cierre académico de la rúbrica docente

## Alcance

**Modificado:** contenido académico en diálogos existentes, cinco decisiones formativas nuevas, flags informativos `info_*` y `format_ref_d*`.

**No modificado:** hotspots, fullscreen, libreta, mapa, persistencia, navegación, introducción, `cierre-investigacion.json`, sistema de puntuación, motor narrativo, condiciones, flags `criterio_*` / `eval_*` existentes, desbloqueos.

---

## Bloque 1 — Factores protectores

| Personaje | Contenido añadido |
|-----------|-------------------|
| Madre de Lucía | Red familiar activa, disposición a acompañar y colaborar (`madre-colaboracion-institucional`, `madre-red-apoyo` ampliado) |
| Hermano | Intentos de ayuda, acompañamiento en recuperación (`hermano-apoyo-recuperacion`, `hermano-ayuda-previa` ampliado) |
| TS comisaría | Red familiar + institucional + seguimiento profesional (`ts-explor-red`, `ts-profun-factores`) |

Flag opcional: `info_factores_protectores_familia`.

---

## Bloque 2 — Evaluación psicosocial familiar y duelo

| Personaje | Nodos |
|-----------|-------|
| Madre | `madre-duelo-hospital`, `madre-afrontamiento-duelo` |
| Hermano | `decision-afrontamiento-familiar`, `hermano-reaccion-familiar`, `hermano-preocupaciones` |
| TS | `ts-evaluacion-familiar`, `ts-duelo` ampliado |

Flag: `info_eval_psicosocial_familiar`.

---

## Bloque 3 — Vulneración de derechos

| Personaje | Nodo |
|-----------|------|
| TS | `ts-derechos-vulnerados` — vida, integridad, seguridad, vivir libre de violencia (en análisis de caso) |
| Comisario | Cierre reforzado — protección de derechos y acceso a la justicia |

Flag: `info_vulneracion_derechos`.

---

## Bloque 4 — Personas dependientes y vulnerables

| Personaje | Nodo |
|-----------|------|
| TS | `ts-dependientes-vulnerables` — cuidados post-alta, situación laboral/económica, Diego dependiente |

Flag: `info_personas_dependientes`.

---

## Bloque 5 — Valoración de riesgo (inferencia clínica)

| Personaje | Nodo |
|-----------|------|
| Comisario | `comisario-riesgo-acumulativo` — amenazas, control, celos, aislamiento, antecedentes, escalamiento, arma blanca (sin etiqueta explícita) |
| TS | `ts-profun-factores` ampliado — factores acumulativos y necesidad de medidas |

Flag: `info_riesgo_acumulativo`.

---

## Bloque 6 — Decisiones formativas (5)

No bloquean progreso. Registran `format_ref_d1` … `format_ref_d5` con valor A/B/C.

| # | Ubicación | Pregunta |
|---|-----------|----------|
| 1 | Tras enfermera (`format-ref-d1-enfermera`) | Siguiente paso profesional |
| 2 | Tras madre (`format-ref-d2-madre`) | Atención psicológica inmediata |
| 3 | Antes UCI (`format-ref-d3-uci`) | Mayor factor de riesgo observado |
| 4 | Tras comisario (`format-ref-d4-comisario`) | Prioridad institucional |
| 5 | Tras TS, antes de cierre (`format-ref-d5-ts`) | Seguimiento prioritario |

---

## Bloque 7 — Validación

| Criterio | Cubierto en |
|----------|-------------|
| Factores protectores identificables | Madre, hermano, TS |
| Evaluación psicosocial familiar | Madre, hermano, TS |
| Afrontamiento del duelo | Madre, hermano, TS |
| Vulneración de derechos | TS, comisario |
| Personas vulnerables/dependientes | TS |
| Riesgo inferible por evidencia | Comisario, TS, Lucía (Fase 17) |
| Decisiones formativas adicionales | 5 nuevas |
| Sin revelar respuesta correcta | Solo flags de opción elegida |
| Sin cambio de navegación/lógica | Mismos `completar_conversacion` y requisitos |

---

## Archivos modificados

- `entrevista-enfermera-pasillo.json`
- `entrevista-madre-espera.json`
- `entrevista-hermano-espera.json`
- `revisita-lucia-informe.json`
- `entrevista-comisario.json`
- `entrevista-trabajadora-social-comisaria.json`
