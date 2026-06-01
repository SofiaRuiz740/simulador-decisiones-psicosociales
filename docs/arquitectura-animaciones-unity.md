# Arquitectura de animaciones e integración futura con Unity

> Complementa `docs/10-unity-roadmap.md`. Este documento se centra en el
> **flujo visual de la experiencia narrativa** desde la perspectiva del
> frontend Angular y deja claro cómo está preparado el módulo de IA generativa
> para alimentar tanto Angular como un futuro cliente Unity con el mismo JSON.

## Hoy (Angular)

El módulo `ia-generativa/` ya produce una experiencia tipo simulador narrativo:

- **`components/game-preview/`** es la "escena" del simulador.
  - Una sección por escenario, con paleta de fondo dinámica por cada paso
    (orbs flotantes con `filter: blur` y `transition: background 700ms`).
  - Entradas con `@angular/animations` (`trigger('escena')` y `trigger('stagger')`)
    para fade + slide + scale.
  - Decisiones como botones grandes con estados visuales
    (`elegida`, `correcta`, `incorrecta`).
  - Retroalimentación e **impacto narrativo** aparecen como bloques animados
    inmediatamente después de elegir.
  - HUD superior con barra de progreso y "paso n / total".

- **`generar-caso/`** muestra un panel de **pasos animados** que simulan al
  usuario el flujo "construyendo contexto → escenarios → decisiones → rúbrica"
  mientras la IA real (o el stub) trabaja en el backend.

- **`simulacion/`** (módulo del estudiante) usa el mismo lenguaje visual:
  paletas por escena, transiciones, HUD con timer y progreso. La experiencia
  ya se siente como simulador, no como formulario.

## Por qué este diseño facilita Unity

El JSON que produce la IA (`contenido_json`) ya contiene los **metadatos
visuales** que un cliente Unity necesitaría para ambientar la escena:

```json
"escenarios": [
  {
    "titulo": "...",
    "ambiente_visual_sugerido": "auditorio universitario en penumbra, ...",
    "emocion_principal": "tensión",
    "decision_clave": "...",
    "preguntas": [
      {
        "opciones": [
          {
            "texto": "...",
            "impacto_narrativo": "..."
          }
        ]
      }
    ]
  }
]
```

Esto significa que la **misma propuesta IA** puede renderizarse en:

1. **Angular (hoy)** → `app-game-preview` lee `ambiente_visual_sugerido` y lo
   muestra como chip; usa `emocion_principal` para colorear la escena.
2. **Unity (futuro)** → un script en C# que leyera el mismo JSON podría:
   - Cargar el skybox / fondo coherente con `ambiente_visual_sugerido`.
   - Disparar animaciones del personaje según `emocion_principal`.
   - Reproducir el `impacto_narrativo` con cinemática (`Cinemachine`).
   - Mostrar las opciones como botones flotantes en world-space.

El backend ya devuelve este JSON tanto para Angular (vía
`POST /api/ia/generar-caso/`) como, en el futuro, para Unity (vía
`GET /api/unity/caso-completo/`, ya disponible — ver
`docs/10-unity-roadmap.md`).

## Roadmap visual sugerido

| Fase | Qué se hace | Esfuerzo |
|---|---|---|
| A (✅ hoy) | Angular Animations + paleta dinámica + decisiones interactivas | Ya hecho |
| B | Capa de audio en Angular: ambient loop por escenario, click suave en decisiones | Bajo |
| C | Personaje 2D en SVG/Lottie: cambia gesto según `emocion_principal` | Medio |
| D | Embeber WebGL de Unity en Angular como vista alternativa | Alto |
| E | Producción de assets 3D para casos "joya" | Muy alto |

Las fases B-C se pueden hacer sin tocar el backend ni el contrato JSON. Las
fases D-E ya están descritas en `docs/10-unity-roadmap.md`.

## Reglas que no deben cambiar

- El **contrato JSON** que produce la IA es la fuente única de verdad para
  Angular y Unity. Cualquier nuevo metadato visual debe agregarse al JSON
  primero, no al componente Angular.
- Las paletas de escena en Angular son **derivadas** del índice del escenario
  y del campo `emocion_principal`. No hardcodear paletas por título.
- La rúbrica y las decisiones nunca dependen del cliente: ambas viven en el
  JSON y en los modelos de `apps.casos`. Unity solo es un cliente de
  presentación.
