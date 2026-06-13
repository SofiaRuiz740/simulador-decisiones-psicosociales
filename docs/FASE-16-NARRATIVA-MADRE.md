# Fase 16 — Corrección narrativa de la madre de Lucía

## Problema identificado

La madre de Lucía (abuela de Sofi) compartía `personajeId: "lucia"` con la paciente en UCI. Eso provocaba:

- Cabecera de diálogo mostrando **«Lucía Morales»** mientras hablaba la abuela.
- Mensajes de **agotamiento** de la paciente («la cabeza me late…») al agotarse la madre.
- Libreta contabilizando entrevistas familiares bajo el nombre de la víctima sobreviviente.
- Ambigüedad en frases como «la niña» sin distinguir a Sofi de Lucía.

## Estructura familiar (referencia)

| Personaje | Rol | Relación |
|-----------|-----|----------|
| Lucía Morales | Paciente UCI, víctima sobreviviente | Hija de Carmen; madre de Sofi |
| Sofi Morales | Víctima fatal | Hija de Lucía; nieta de Carmen |
| Carmen Morales (`madre-lucia`) | Entrevistada en sala de espera | Madre de Lucía; abuela de Sofi |
| Diego Morales (`hermano`) | Entrevistado en recepción | Hermano de Lucía; tío de Sofi |

## Inconsistencias encontradas

1. **`personajeId` compartido** entre madre y paciente (`lucia`).
2. **Mapeo visual** `lucia → madre-victima` como default global (confundía UCI).
3. **Agotamiento** heredado de `lucia.json` (lenguaje de paciente sedada).
4. **Referencias ambiguas** a «la niña» sin nombre en diálogos de madre y hermano.
5. **Introducción / escenario** no nombraban a Carmen ni a Sofi explícitamente.

## Cambios realizados

### Nuevo personaje

- `personajes/madre-lucia.json` — **Carmen Morales**, madre de Lucía, con mensajes de agotamiento propios de familiar en sala de espera.

### Conversaciones corregidas

| Archivo | Cambios principales |
|---------|---------------------|
| `entrevista-madre-espera.json` | `personajeId: madre-lucia`; duelo por **nieta Sofi**; preocupación por **hija Lucía** en UCI; testimonios atribuidos a Carmen |
| `revisita-madre-tras-ts.json` | Idem; cierre: «no dejen sola a Lucía allá arriba en UCI» |
| `entrevista-hermano-espera.json` | Rol de **tío** explícito; Sofi nombrada; Lucía como hermana |
| `revisita-hermano-tras-policia.json` | Consistencia de roles y nombres |
| `entrevista-enfermera-pasillo.json` | «madre de Lucía» y «Carmen» en lugar de genéricos |
| `consulta-inicial.json` | Narrativa con Carmen y Diego identificados |
| `introduccion.json` | Sofi nombrada como víctima fatal del episodio |

### Soporte visual (sin cambiar desbloqueos)

- `escenas-hospital.json`: sprites de madre usan `madre-lucia`; `lucia` mapea a `victima`.
- `manifest.json`: registro de personaje y desbloqueo de revisita apuntan a `madre-lucia`.
- `presentacion-personaje.util.ts`: etiquetas «Madre de Lucía (abuela)».

### Sin modificar

- IDs de conversaciones, nodos, opciones y rutas.
- Requisitos de acceso y revisitas (mismos `conversacionId`).
- Hotspots y coordenadas.
- Lógica de flags, evidencias y contradicciones (solo `personajesInvolucrados` ampliado).

## Frases evitadas / corregidas

| Evitar (rol incorrecto) | Uso correcto en madre |
|-------------------------|------------------------|
| «Perdí a mi hija» (refiriéndose a Sofi) | «Perdí a mi nieta Sofi» |
| «Mi hija falleció» | «Mi nieta falleció» |
| Hablar como madre de la víctima fatal | Hablar como **abuela** en duelo + **madre** preocupada por Lucía |
| «Mi hija» = Lucía viva en UCI | Válido: «no puedo perder también a mi hija» (Lucía) |

## Validación

- JSON de conversaciones y personajes parsean correctamente.
- Lucía (UCI) mantiene `personajeId: lucia` y diálogos propios de madre de Sofi.
- Carmen (`madre-lucia`) ya no comparte nombre ni fatiga con la paciente.
