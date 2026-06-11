# Fase 17 — Integración de rúbrica académica en diálogos

## Alcance

**Modificado:** diálogos narrativos, contenido académico embebido, decisiones evaluativas (6), flags de respuesta interna.

**No modificado:** hotspots, fullscreen, mapa, libreta, persistencia, guardado, sistema de puntuación, navegación, introducción, `cierre-investigacion.json`.

---

## Decisiones evaluativas integradas

Aparecen **después** de obtener información suficiente en entrevistas. No muestran la respuesta correcta al estudiante; registran flags internos para evaluación docente.

| # | Escenario | Ubicación | Respuesta correcta | Flag correcto |
|---|-----------|-----------|-------------------|---------------|
| 1 | Hospital | `revisita-lucia-informe` → `decision-academica-hospital-1` | B — Contención y PAP | `eval_hospital_d1_correcta` |
| 2 | Hospital | `decision-academica-hospital-2` | B — Res. 459 + Ley 1257 | `eval_hospital_d2_correcta` |
| 3 | Hospital | `decision-academica-hospital-3` | D — Actuación integral | `eval_hospital_d3_correcta` |
| 4 | Comisaría | `entrevista-trabajadora-social-comisaria` → `decision-academica-comisaria-4` | B — Riesgo feminicidio + protección | `eval_comisaria_d4_correcta` |
| 5 | Comisaría | `decision-academica-comisaria-5` | A — Ley 2126 + 1098 + 1257 | `eval_comisaria_d5_correcta` |
| 6 | Comisaría | `decision-academica-comisaria-6` | C — Valoración integral + rutas | `eval_comisaria_d6_correcta` |

Flags de respuesta elegida: `eval_hospital_d1`…`d3`, `eval_comisaria_d4`…`d6` (valores A/B/C/D).

---

## Información académica por personaje

### Hospital

| Personaje | Aporta | Marco / técnica |
|-----------|--------|-----------------|
| Policía | Llegada, vecinos, escalamiento, sin denuncias formales | Hechos para inferir patrón (sin nombrarlo) |
| Madre de Lucía | Relación, aislamiento, dependencia, factores riesgo/protectores | Carmen = mamá de Lucía, abuela de Sofi |
| Hermano | Discusiones, ayuda previa, normalización, red de apoyo | Apertura progresiva (no empujón inmediato) |
| Enfermera | Crisis familiar, PAP, manejo de crisis, remisión al médico | Sin diagnósticos ni interpretación clínica |
| Médico | Gravedad, lesiones múltiples, pronóstico, protección futura | Res. 459, Ley 1257, EPICEE/SPIKES, interdisciplinar |
| Lucía UCI | Control, celos, aislamiento, chantaje, miedo, escalada | Ampliada en 5 fases + decisiones hospital |

### Comisaría

| Personaje | Aporta | Marco / técnica |
|-----------|--------|-----------------|
| Comisario | Medidas, antecedentes, riesgo, acceso a justicia, no mediación | Ley 1257, Ley 2126 |
| TS comisaría | Evaluación psicosocial, derechos, economía, dependientes, seguimiento | Ley 1098, protección integral + decisiones comisaría |

---

## Justificación respuestas correctas (información en simulación)

| Decisión | Información disponible en entrevistas |
|----------|--------------------------------------|
| D1 (B) | Enfermera: PAP y manejo de crisis; madre/hermano en duelo; Lucía sedada — priorizar contención |
| D2 (B) | Médico: Resolución 459 de 2012 + Ley 1257 en nodo `med-marco-normativo` |
| D3 (D) | PAP (enfermera, madre), EPICEE/SPIKES (médico, Lucía), factores riesgo/protectores (madre, hermano, Lucía, TS), interdisciplinar (médico, TS) |
| D4 (B) | Comisario: feminicidio, medidas Ley 1257; comisario explica por qué no mediación |
| D5 (A) | Comisario: Ley 1257/2126; TS: Ley 1098 en `ts-plan-menor` |
| D6 (C) | TS: valoración emocional, dependientes, vulneración derechos, rutas salud/mental; comisario: riesgo y protección |

---

## Archivos modificados

- `entrevista-policia-entrada.json`
- `entrevista-madre-espera.json`
- `entrevista-hermano-espera.json`
- `entrevista-enfermera-pasillo.json`
- `entrevista-medico-urgencias.json`
- `revisita-lucia-informe.json`
- `entrevista-comisario.json`
- `entrevista-trabajadora-social-comisaria.json`

---

## Verificación

```powershell
Set-Location frontend/public/simulacion-narrativa/casos/violencia-intrafamiliar/conversaciones
node -e "const fs=require('fs'); fs.readdirSync('.').filter(f=>f.endsWith('.json')).forEach(f=>{JSON.parse(fs.readFileSync(f,'utf8')); console.log('OK',f);});"
```

Prueba manual: completar hospital → Lucía UCI (3 decisiones) → comisaría → TS (3 decisiones). Confirmar que ninguna respuesta correcta se revela en pantalla.
