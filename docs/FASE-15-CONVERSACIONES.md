# Fase 15 — Rediseño de decisiones conversacionales

## Objetivo

Transformar las opciones de diálogo de un estilo tipo examen/cuestionario a intervenciones profesionales que suenen a entrevista clínica o investigativa.

## Restricciones respetadas

- Progresión de nodos (`siguienteNodoId`, rutas)
- Persistencia y efectos (`efectos`, `efectosAlMostrar`, flags)
- Desbloqueos (`requisitosAcceso`, `requisitosRevisita`)
- Hotspots (sin cambios)
- Fullscreen (sin cambios)
- IDs de opciones, nodos, testimonios y `estrategiaClinica`

## Cambios en presentación (UI)

Archivo: `frontend/src/app/estudiante/exploracion-visual/dialogo-narrativo/dialogo-narrativo.html`

| Antes | Después |
|-------|---------|
| Responder | Podría decir… |
| Seguir escuchando | Escuchar con atención |
| Finalizar entrevista | Despedirse con cuidado |
| Icono `edit_note` | Icono `forum` |

## Patrón de redacción

### Evitar
- Imperativos de examen: «Preguntar por…», «Solicitar…», «Explorar qué…»
- Prompts de jugador tipo «Cómo explorar…», «Qué indagar…»

### Preferir
- Frases habladas en primera persona con comillas: «Me gustaría comprender…», «¿Hay algo sobre Miguel que…?»
- Transiciones contextuales en nodos jugador: «Ella acaba de compartir algo muy doloroso. Usted elige cómo responder.»
- Escucha activa: «Escuchar con atención», «Permanezco a su lado en silencio…»

## Archivos modificados

### Hospital (consulta inicial)
- `entrevista-madre-espera.json`
- `entrevista-hermano-espera.json`
- `entrevista-enfermera-pasillo.json`
- `entrevista-policia-entrada.json`

### UCI
- `entrevista-medico-urgencias.json`
- `revisita-lucia-informe.json`
- `revisita-lucia-tras-medico.json`

### Comisaría
- `entrevista-comisario.json`
- `entrevista-trabajadora-social-comisaria.json`
- `revisita-madre-tras-ts.json`
- `revisita-hermano-tras-policia.json`

## Ejemplos antes / después

| Contexto | Antes | Después |
|----------|-------|---------|
| Madre — apertura | Reconocer el dolor y el impacto de la muerte… | «Lamento profundamente la muerte de su nieta. Comprendo lo difícil que debe ser este momento.» |
| Hermano — Miguel | Preguntar si había episodios violentos anteriores | «¿Había ocurrido algo similar con Miguel antes de esta noche?» |
| Comisario — agresor | Preguntar por medidas contra Miguel Álvarez… | «¿Hay algo sobre Miguel Álvarez que considere importante mencionar en este momento?» |
| Médico — lesiones | Preguntar si hay hallazgos compatibles con defensa | «¿Encuentra en el informe algo compatible con un mecanismo de defensa?» |
| Nodo jugador | Cómo explorar la conducta del yerno | Miguel aparece en el relato. Usted elige cómo profundizar. |

## Validación

- Todos los JSON de conversación parsean correctamente
- IDs, rutas, estrategias clínicas y efectos sin cambios estructurales
- `consulta-lucia.json` y `revelacion-lucia.json` fuera de alcance (no forman parte del flujo hospital/UCI/comisaría actual)

## Objetivo académico

El docente puede seguir evaluando criterio clínico, empatía, capacidad investigativa y toma de decisiones a través de `estrategiaClinica` y métricas; la redacción ahora refleja intervenciones reales en lugar de ítems de cuestionario.
