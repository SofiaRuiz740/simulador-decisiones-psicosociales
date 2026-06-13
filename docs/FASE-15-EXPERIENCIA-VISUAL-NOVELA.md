# Fase 15 — Reconstrucción de la experiencia de conversación (tipo novela visual)

## Restricciones respetadas

- Narrativa, progresión, puntuación, condiciones, persistencia, hotspots y lógica de entrevistas: **sin cambios**
- Modificado únicamente: composición visual, presentación de personajes, jerarquía visual y animaciones

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `dialogo-narrativo.html` | Retratos movidos fuera de la placa central; ocupan laterales de pantalla completa |
| `dialogo-narrativo.scss` | Rediseño completo de layout, escala, jerarquía activo/inactivo y transiciones |

---

## Comparativa de tamaños

### Antes

| Propiedad | Valor anterior |
|-----------|----------------|
| Columna lateral | `clamp(168px, 22vw, 300px)` dentro de placa única |
| Altura retrato | `clamp(280px, 40vh, 500px)` |
| Ancho imagen | `max-width: 122%` del contenedor lateral pequeño |
| Escala activo | Sin zoom (solo opacidad 1 vs 0.62) |
| Opacidad inactivo | `0.62` (móvil: `0.5`) |
| Posición | Dentro de grid 3 columnas con caja de diálogo |
| Fondo | Overlay oscuro sin blur fuerte |

### Después (escritorio ≥1366px)

| Propiedad | Valor nuevo |
|-----------|-------------|
| Ancho personaje | `clamp(280px, 27–28vw, 440px)` pegado al borde |
| Altura retrato | `clamp(500px, 78–84vh, 96vh)` |
| Ancho caja diálogo | `min(42–48vw, 640–680px)` centrada, independiente |
| Escala activo | **`1.08`** (108 %, móvil: `1.05–1.06`) |
| Opacidad inactivo | **`0.48`** (móvil: `0.42`) |
| Contraste inactivo | `brightness(0.78) saturate(0.86) contrast(0.92)` |
| Posición NPC | `position: absolute; left: 0; bottom: 0` |
| Posición psicóloga | `position: absolute; right: 0; bottom: 0` |
| Fondo | `backdrop-filter: blur(10px)` + viñeta radial |

**Incremento aproximado de altura:** de ~40vh máx. → **~78–84vh** (+95 % área vertical útil).

---

## Cambios de posición

1. **NPC:** sale del grid central y se ancla al **borde izquierdo** de la escena.
2. **Psicóloga:** se ancla al **borde derecho** de la escena.
3. **Caja de diálogo:** queda **centrada** en la parte inferior, con `z-index: 10` por encima de los retratos.
4. **Recorte inferior:** contenedor con `overflow: hidden`; imagen al `108%` de altura con `object-position: bottom` (pies/parte baja pueden recortarse; rostro y hombros preservados con `object-fit: contain`).

---

## Jerarquía activo / inactivo

| Estado | Escala | Opacidad | Sombra / contraste |
|--------|--------|----------|-------------------|
| **Activo** | `scale(1.08)` | `1` | Sombra más marcada, brillo y saturación completos |
| **Inactivo** | `scale(1)` | `0.48` | Sombra suave, brillo 78 %, saturación 86 % |

- `transform-origin`: `bottom left` (NPC) / `bottom right` (psicóloga)
- Transición de turno: **`300ms`** (`opacity`, `transform`, `filter`)
- El personaje inactivo **permanece visible**, en segundo plano

---

## Animaciones

| Evento | Duración | Comportamiento |
|--------|----------|----------------|
| Apertura overlay | 300 ms | Fade-in + blur |
| Entrada personajes | 320 ms | Desplazamiento vertical 18px + fade |
| Entrada caja | 300 ms | Slide-up desde abajo |
| Cambio de turno | 300 ms | Escala y opacidad suaves (sin saltos) |
| Cierre | 280–300 ms | Fade-out coordinado |

---

## Validación recomendada

Probar con estos personajes (todos usan el mismo componente):

- Policía (`entrevista-policia-entrada`)
- Madre de Lucía (`entrevista-madre-espera`)
- Hermano (`entrevista-hermano-espera`)
- Enfermera (`entrevista-enfermera-pasillo`)
- Médico (`entrevista-medico-urgencias`)
- Lucía UCI (`revisita-lucia-informe`)
- Comisario (`entrevista-comisario`)
- Trabajadora social (`entrevista-trabajadora-social-comisaria`)

### Checklist

- [ ] Retratos ocupan la mayor parte del lateral (sin grandes huecos vacíos)
- [ ] Ningún retrato tapa texto de la caja
- [ ] Ningún retrato tapa botones u opciones
- [ ] El personaje que habla se resalta claramente (zoom + opacidad)
- [ ] El oyente permanece visible pero atenuado
- [ ] Fondo desenfocado al abrir conversación

---

## Capturas comparativas

Las capturas antes/después deben tomarse en el entorno local al abrir cualquier entrevista del caso *violencia-intrafamiliar*:

1. **Antes:** commit anterior a este cambio (grid 3 columnas, retratos ~40vh).
2. **Después:** retratos a ~80vh en laterales, caja centrada, activo al 108 %.

> Nota: las capturas no se generan automáticamente en este entregable; usar la misma resolución (recomendado 1920×1080) para comparar.
