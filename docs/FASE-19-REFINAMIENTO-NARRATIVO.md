# Fase 19 — Refinamiento de experiencia narrativa y decisiones formativas

## Alcance

**Modificado:** retroalimentación contextual en decisiones formativas, cadena progresiva de entrevistas (policía, médico, comisario, TS), coherencia temporal hospital/comisaría.

**No modificado:** hotspots, fullscreen, libreta, mapa, persistencia, puntuación, cierre (`cierre-investigacion.json`), navegación, introducción, sistema de evaluación académica (Fases 17–18), flags `eval_*` / `criterio_*`, desbloqueos, motor narrativo.

---

## Bloque 1 — Consecuencias narrativas mínimas (decisiones formativas)

Cada opción A/B/C de las decisiones formativas enruta a un nodo `feedback-format-dN-{a,b,c}` con observación profesional breve. Los flags `format_ref_d1` … `format_ref_d5` se mantienen; no hay impacto en puntuación ni progreso.

| # | Archivo | Nodos de retroalimentación |
|---|---------|---------------------------|
| 1 | `entrevista-enfermera-pasillo.json` | Textos exactos del brief (A/B/C) → `cierre-enfermera` |
| 2 | `entrevista-madre-espera.json` | Observaciones neutrales sobre duelo, judiciales y antecedentes → `cierre-madre` |
| 3 | `revisita-lucia-informe.json` | Observaciones sobre discusiones, control coercitivo y economía → `lucia-semiconsciente` |
| 4 | `entrevista-comisario.json` | Reconciliación, protección integral, mediación → `cierre-comisario` |
| 5 | `entrevista-trabajadora-social-comisaria.json` | Riesgo/red, reconciliación, intervención institucional → `cierre-ts` |

Se eliminaron los nodos genéricos `registro-format-dN`.

---

## Bloque 2 — Entrevistas progresivas

### Policía (`entrevista-policia-entrada.json`)

| Nivel | Contenido | Nodos |
|-------|-----------|-------|
| 1 Llegada | Traslado, registro preliminar | `decision-prep-exploracion-inicial` → `pol-explor-*` |
| 2 Escena | Arribo, conducta en acceso | `decision-prep-profundizacion` → `pol-profun-llegada` / `pol-profun-comportamiento` |
| 3 Vecinos | Llamada, relato vecinal | `decision-nivel3-vecinos` → `pol-profun-llamada` / `pol-n3-relato-vecinos` |
| 4 Antecedentes | Partes previos, paradero, versión | `decision-nivel4-antecedentes` → `policia-antecedentes` / `policia-paradero` / `policia-version` |
| 5 Escalamiento | Patrón creciente | `decision-nivel5-escalamiento` → `policia-cronologia-vecinos` |

### Médico (`entrevista-medico-urgencias.json`)

| Nivel | Contenido | Nodos |
|-------|-----------|-------|
| 1 Estado | Ingreso reciente, sedación | `med-explor-estado` (texto aligerado) |
| 2 Lesiones | Hallazgos parciales | `med-profun-hallazgos` |
| 3 Pronóstico | Evolución UCI | `med-profun-evolucion` / `med-profun-riesgos` |
| 4 Interdisciplinar | Psicología, TS, psiquiatría | `decision-nivel4-interdisciplinar` → `med-n4-interdisciplinar` |
| 5 Normativo | Res. 459, Ley 1257, EPICEE/SPIKES | `decision-nivel5-normativo` → `med-marco-normativo` → `med-epicee-orientacion` |

Resolución 459, Ley 1257 y EPICEE/SPIKES aparecen solo al final de la entrevista.

### Comisario (`entrevista-comisario.json`)

| Nivel | Contenido | Nodos |
|-------|-----------|-------|
| 1 Proceso | Expediente, evolución recibida | `decision-prep-exploracion-inicial` → `com-explor-procedimiento` |
| 2 Medidas | Ley 1257, medidas ya activadas | `com-explor-medidas-teaser` |
| 3 Antecedentes | Partes previos (teaser) | `com-explor-antecedentes-teaser` |
| 4 Análisis | Contraste, protección, hallazgos, no mediación | `decision-prep-profundizacion` → `comisario-contraste` (+ `comisario-contraste-detalle`) |
| 5 Protección | Riesgo acumulativo, agresor, partes, menor | `decision-prep-info-critica` |

### Trabajadora social (`entrevista-trabajadora-social-comisaria.json`)

| Nivel | Contenido | Nodos |
|-------|-----------|-------|
| 1 Situación Lucía | Recuperación parcial | `ts-explor-necesidades-teaser` |
| 2 Red de apoyo | Articulación institucional | `ts-explor-red` |
| 3 Seguimiento | Plan psicosocial familiar | `ts-explor-seguimiento` |
| 4 Factores | Riesgo/protectores en capas | `ts-profun-factores` → `ts-profun-factores-detalle` |
| 5 Institucional | Plan protección, derechos, dependientes | `decision-prep-info-critica` |

---

## Bloque 3 — Coherencia temporal

### Hospital (noche de los hechos)

Marcadores reforzados en policía, enfermera, médico, madre, revisita UCI: *esta noche*, *hace pocas horas*, *acaba de ingresar*, *aún consolidamos*, *todavía no conocemos toda la información*.

### Comisaría (15 días después)

Marcadores reforzados en comisario y TS: *han pasado quince días*, *evolución clínica parcial*, *recuperación física parcial*, *medidas ya iniciadas*, *fuera de UCI*, *aquel episodio*.

Correcciones destacadas:
- `ts-explor-seguimiento`: ya no menciona paciente en UCI pendiente de despertar.
- `comisario-riesgo-acumulativo`: *aquel episodio, hace quince días* en lugar de *esta noche*.
- `ts-derivacion-clinica`: *en esta etapa de recuperación*.

---

## Bloque 4 — Validación final

| Criterio | Estado |
|----------|--------|
| Decisiones formativas con retroalimentación contextual | ✔ |
| Retroalimentaciones no revelan respuesta correcta | ✔ |
| Policía entrega información progresivamente | ✔ |
| Médico entrega información progresivamente | ✔ |
| Comisario entrega información progresivamente | ✔ |
| TS entrega información progresivamente | ✔ |
| Hospital = noche de los hechos | ✔ |
| Comisaría = ~15 días después | ✔ |
| Sin cambios en puntuación | ✔ |
| Sin cambios en navegación / persistencia | ✔ |
| Lógica académica Fases 17–18 intacta | ✔ |
| JSON de conversaciones válidos (14 archivos) | ✔ |

---

## Archivos modificados

- `conversaciones/entrevista-enfermera-pasillo.json`
- `conversaciones/entrevista-madre-espera.json`
- `conversaciones/revisita-lucia-informe.json`
- `conversaciones/entrevista-policia-entrada.json`
- `conversaciones/entrevista-medico-urgencias.json`
- `conversaciones/entrevista-comisario.json`
- `conversaciones/entrevista-trabajadora-social-comisaria.json`
