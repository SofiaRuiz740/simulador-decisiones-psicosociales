# Fase 17 — Adecuación académica según requerimientos de la psicóloga

## Alcance

**Modificado:** diálogos, decisiones académicas, flags de evaluación, pantalla final de competencias.

**No modificado:** hotspots, fullscreen, persistencia, sistema de puntuación, navegación hospital/comisaría, libreta, mapa.

---

## 1. Criterios académicos identificados

| # | Criterio | Flag / estrategia |
|---|----------|-------------------|
| 1 | Primeros auxilios psicológicos (PAI) | `criterio_pai` |
| 2 | Escucha activa sin juicios | `criterio_escucha_activa`, estrategia `escucha_activa` |
| 3 | Comunicación empática | `criterio_comunicacion_empatica` |
| 4 | Protocolo EPICEE / SPIKES | `criterio_spikes_epicee` |
| 5 | Manejo de familiares en crisis | `criterio_manejo_familiares_crisis` |
| 6 | Identificación del ciclo de violencia | `criterio_ciclo_violencia` |
| 7 | Factores protectores | `criterio_factores_protectores` |
| 8 | Factores de riesgo | `criterio_factores_riesgo`, `criterio_senales_previas` |
| 9 | Derivación interdisciplinaria | `criterio_derivacion_interdisciplinaria` |
| 10 | Necesidad de psicoterapia | `criterio_psicoterapia` |
| 11 | Necesidad de psiquiatría | `criterio_psiquiatria` |
| 12 | Valoración de riesgo de feminicidio | `criterio_riesgo_feminicidio` |
| 13 | Medidas de protección | `criterio_medidas_proteccion` |
| 14 | Activación de rutas institucionales | `criterio_rutas_institucionales` |
| 15 | Protección económica | `criterio_proteccion_economica` |
| 16 | Protección jurídica | (texto Ley 1257 / 2126 en comisaría) |
| 17 | Restablecimiento de derechos | (texto en TS comisaría) |
| 18 | Señales previas ignoradas | `criterio_senales_previas` |
| 19 | Intentos previos de ayuda | `criterio_intentos_ayuda` |
| 20 | Toma de decisiones éticas | `criterio_decision_etica` |
| 21 | Confrontación imprudente (penalización ética) | `criterio_confrontacion_imprudente` |

**Marco normativo integrado en decisiones (no memorístico):**

- Ley 1257 de 2008 — comisaría, medidas de protección.
- Ley 2126 de 2021 — orden de alejamiento provisional.
- Ley 1098 de 2006 — acompañamiento por menor fallecida (TS comisaría).

---

## 2. Dónde se evalúa cada criterio

| Criterio | Conversación | Nodo / decisión |
|----------|--------------|-----------------|
| PAI | `entrevista-madre-espera` | `validar-duelo`, `contener-silencio` |
| PAI | `revisita-lucia-informe` | `informar-con-contencion` |
| Escucha activa | `entrevista-madre-espera` | `contener-silencio` |
| Escucha activa | `revisita-lucia-informe` | `escuchar-sin-juicio` |
| Comunicación empática | `entrevista-madre-espera` | `validar-duelo` |
| Comunicación empática | `revisita-lucia-informe` | `informar-con-contencion` |
| SPIKES / EPICEE | `revisita-lucia-informe` | `informar-con-contencion` |
| Manejo familiares en crisis | `entrevista-madre-espera` | `validar-duelo` |
| Ciclo de violencia | `entrevista-madre-espera` | `explorar-antecedentes` |
| Factores protectores | `entrevista-madre-espera` | `explorar-red-apoyo` |
| Factores protectores | `entrevista-hermano-espera` | `explorar-protectores` |
| Factores de riesgo | `entrevista-madre-espera` | `explorar-antecedentes`, `explorar-relacion-agresor` |
| Factores de riesgo | `entrevista-hermano-espera` | `explorar-senales-previas` |
| Factores de riesgo | `revisita-lucia-informe` | `explorar-miedo` |
| Señales previas | `entrevista-hermano-espera` | `explorar-senales-previas` |
| Intentos de ayuda | `entrevista-hermano-espera` | `explorar-ayuda-previa` |
| Derivación interdisciplinaria | `entrevista-medico-urgencias` | `activar-ruta-violencia` |
| Derivación interdisciplinaria | `entrevista-trabajadora-social-comisaria` | `articulacion-red`, `derivar-psicosocial` |
| Psicoterapia / psiquiatría | `entrevista-trabajadora-social-comisaria` | `derivar-psicosocial` |
| Riesgo feminicidio | `entrevista-comisario` | `priorizar-proteccion`, `indagar-agresor` |
| Medidas de protección | `entrevista-comisario` | `priorizar-proteccion` |
| Medidas de protección | `entrevista-trabajadora-social-comisaria` | `plan-lucia` |
| Medidas de protección | `revisita-lucia-informe` | `plan-seguridad` |
| Rutas institucionales | `entrevista-medico-urgencias` | `activar-ruta-violencia` |
| Rutas institucionales | `entrevista-comisario` | `solicitar-constancia` |
| Protección económica | `entrevista-trabajadora-social-comisaria` | `plan-familia` |
| Protección jurídica | `entrevista-comisario` | respuesta `comisario-proteccion`, `comisario-agresor` |
| Restablecimiento derechos | `entrevista-trabajadora-social-comisaria` | `plan-lucia` |
| Ley 1098 | `entrevista-trabajadora-social-comisaria` | `ts-plan-menor` |
| Decisión ética | `entrevista-madre-espera` | `derivar-apoyo` |
| Decisión ética | `revisita-lucia-informe` | `plan-seguridad` |
| Decisión ética | `entrevista-comisario` | `solicitar-constancia` |
| Confrontación imprudente | `entrevista-hermano-espera` | `presionar-detalles` |

---

## 3. Diálogos modificados

| Archivo | Cambios |
|---------|---------|
| `entrevista-madre-espera.json` | Apertura con PAI/empatía; `decision-episodio` con 4 exploraciones académicas; flags de criterio; eliminación de nodos huérfanos |
| `entrevista-hermano-espera.json` | `decision-enfoque-hermano` (señales, ayuda previa, protectores); flag confrontación imprudente |
| `revisita-lucia-informe.json` | SPIKES en mala noticia; escucha activa; exploración de riesgo/seguridad; plan de protección |
| `entrevista-medico-urgencias.json` | Flags derivación y rutas al activar protocolo |
| `entrevista-comisario.json` | Valoración feminicidio (Ley 1257); medidas y rutas; Ley 2126 en alejamiento |
| `entrevista-trabajadora-social-comisaria.json` | Derivación interdisciplinaria; restablecimiento derechos; protección económica; Ley 1098; psico/psiquiatría |

---

## 4. Nuevas decisiones añadidas

### Madre (`decision-episodio`)

- «Antes de continuar, quisiera entender si esta situación había ocurrido anteriormente.»
- «¿Con quién cuenta Lucía cuando las cosas se ponen difíciles en casa?»
- «¿Cómo describiría la relación entre Lucía y Miguel antes de esta noche?»

### Hermano (`decision-enfoque-hermano`)

- «¿Había señales previas que la familia terminaba minimizando?»
- «¿Intentaron pedir ayuda antes de que ocurriera esto?»
- «¿Quién en la familia la apoyaba cuando Miguel explotaba?»

### Lucía UCI (`revisita-lucia-informe`)

- «Estoy aquí para escucharla. Tómese el tiempo que necesite.»

### Comisaría

- Reformulación profesional de protección con Ley 1257.
- «¿Qué apoyo psicológico y psiquiátrico consideran necesarios para Lucía cuando evolucione?»

---

## 5. Competencias cubiertas (pantalla final)

La utilidad `evaluarCompetenciasFinales` (`evaluacion-academica.util.ts`) deriva **7 competencias visibles** al cierre:

| Competencia | Criterio de fortalecimiento |
|-------------|----------------------------|
| Escucha activa | Estrategia `escucha_activa` o flag `criterio_escucha_activa` |
| Valoración de riesgo | Estrategia `evaluacion_riesgo` o flags feminicidio/riesgo |
| Identificación de factores protectores | Flag `criterio_factores_protectores` |
| Identificación de factores de riesgo | Flags ciclo, señales previas, factores riesgo |
| Trabajo interdisciplinario | Flag derivación o comisario + TS completados |
| Activación de rutas | Estrategia `planificacion_seguridad` o flags rutas/medidas |
| Toma de decisiones éticas | Flag ética sin confrontación imprudente |

UI: sección **Competencias evaluadas** en `simulacion-narrativa.html` (✓ fortalecida / ○ pendiente).

---

## 6. Competencias / criterios pendientes de exposición explícita

Estos criterios tienen flags o texto narrativo, pero **no aparecen como ítem independiente** en la pantalla final (por diseño: 7 competencias agregadas):

- PAI, comunicación empática, SPIKES, manejo de familiares en crisis — evaluados vía flags; visibles en trazabilidad interna.
- Psicoterapia y psiquiatría — solo si el estudiante elige `derivar-psicosocial` en comisaría.
- Protección económica — flag `criterio_proteccion_economica` sin ítem UI dedicado.
- Intentos previos de ayuda — flag `criterio_intentos_ayuda`; contribuye indirectamente a factores de riesgo si se elige la opción del hermano.

**Sugerencia futura (fuera de alcance):** panel docente con desglose por los 21 criterios usando todos los flags `criterio_*`.

---

## Archivos de infraestructura

| Archivo | Rol |
|---------|-----|
| `utils/evaluacion-academica.util.ts` | Lógica de competencias finales |
| `simulacion-narrativa.ts` | `competenciasEvaluadas` computed |
| `simulacion-narrativa.html` | Bloque académico al cierre |
| `simulacion-narrativa.scss` | Estilos fortalecida/pendiente |
