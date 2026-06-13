# Fase 21A — Recuperar transición hospital → comisaría

## Problema

Tras completar la fase hospitalaria, el hotspot «Trasladarse a la comisaría» no aparecía para algunos recorridos, bloqueando Hospital → UCI → Comisaría → Cierre.

**Alcance:** solo lógica de aparición del hotspot de traslado. Sin cambios en diálogos, puntuación, evaluación, personajes ni hotspots de entrevista.

---

## Hotspots auditados

| ID | Escena visual |
|----|---------------|
| `ir-comisaria` | `entrada-hospital` |
| `ir-comisaria-sala` | `sala-espera` |
| `ir-comisaria-pasillo` | `pasillo-urgencias` |
| `ir-comisaria-estacion` | `estacion-medica` |
| `ir-comisaria-uci` | `cuidados-intensivos` |

Archivo: `frontend/public/simulacion-narrativa/visual/violencia-intrafamiliar/escenas-hospital.json` (versión **2.10.0**).

---

## Criterio correcto de desbloqueo

El traslado aparece cuando se cumplen **las tres** condiciones:

1. **Investigación hospitalaria obligatoria completa** (6 entrevistas):
   - `entrevista-policia-entrada` — Policía
   - `entrevista-enfermera-pasillo` — Enfermera
   - `entrevista-medico-urgencias` — Médico
   - `revisita-lucia-informe` — Lucía (UCI)
   - `entrevista-madre-espera` — Madre
   - `entrevista-hermano-espera` — Hermano

2. **Comisaría aún no visitada:** `no escenario_visitado investigacion-comisaria`

3. **Caso no cerrado:** `no flag_activo caso_completado`

### Entrevistas que NO bloquean

Las revisitas y contenido de Fases 17–19 **no** forman parte del desbloqueo:

- `revisita-lucia-tras-medico`
- `revisita-hermano-tras-policia`
- `revisita-madre-tras-ts`
- Decisiones formativas / evaluación académica (flags `eval_*`, `format_ref_*`)

`consulta-inicial.json` lista 9 conversaciones en `conversacionesDisponibles`, pero el hotspot usa solo las 6 obligatorias. Si se usara el listado completo del escenario sin `conversacionIds` explícitos, la transición quedaría bloqueada hasta completar revisitas opcionales (incluida `revisita-madre-tras-ts`, que exige la entrevista en comisaría — condición circular).

---

## Cambios realizados

### 1. Condiciones explícitas por entrevista

Se reemplazó `escenario_conversaciones_completadas` en los 5 hotspots de traslado por un bloque `y` con seis `conversacion_completada` individuales. Misma lógica, sin depender del listado dinámico del escenario narrativo.

### 2. Utilidad de diagnóstico

`frontend/src/app/estudiante/exploracion-visual/utils/comisaria-acceso.util.ts`:

- `CONVERSACIONES_HOSPITAL_OBLIGATORIAS`
- `diagnosticarTrasladoComisaria()`
- `registrarDiagnosticoComisariaEnConsola()` — logs temporales `[FASE-21A comisaria]`

### 3. Consola del navegador (temporal)

En escenas hospitalarias, al evaluar un hotspot de traslado se registra:

- entrevistas completadas / pendientes
- `escenariosVisitados`
- `escenarioActualId`
- si `investigacion-comisaria` ya fue visitada
- `caso_completado`
- mensaje de bloqueo principal

También disponible manualmente:

```js
__fase21aDiagnosticoComisaria()
```

### 4. Script de auditoría estática

`frontend/scripts/audit-fase21a-comisaria.mjs` — valida hotspots en JSON y simula estados sin Playwright.

---

## Causas probables observadas

| Bloqueo | Mensaje en consola |
|---------|-------------------|
| Falta Lucía u otra entrevista | `Faltan entrevistas obligatorias: …` |
| Sesión previa visitó comisaría | `La comisaría ya fue visitada` |
| Caso cerrado | `El caso ya está cerrado` |
| Lucía sin informe clínico | Entrevista `revisita-lucia-informe` no inicia hasta descubrir `informe-urgencias` (estación médica o opción en entrevista con enfermera) |

---

## Validaciones ejecutadas

| Prueba | Resultado |
|--------|-----------|
| 5 hotspots con mismos requisitos | ✓ |
| 6/6 convos → hotspot visible | ✓ (simulación) |
| 5/6 (sin Lucía) → oculto | ✓ |
| 6/6 + comisaría visitada → oculto | ✓ |
| Revisitas opcionales excluidas del contador | ✓ |
| Linter TS | ✓ |
| `node scripts/audit-fase21a-comisaria.mjs` | ✓ |

### Caso de prueba manual (runtime)

1. Iniciar práctica desde cero (o limpiar partida guardada).
2. Completar las 6 entrevistas obligatorias (incluir informe clínico antes de Lucía UCI).
3. Abrir consola → ver `[FASE-21A comisaria] … → VISIBLE`.
4. Clic en «Trasladarse a la comisaría».
5. «Regresar al hospital» → hotspot ya no visible (`comisariaYaVisitada: true`).

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `escenas-hospital.json` | Requisitos `y` + `conversacion_completada` (v2.10.0) |
| `comisaria-acceso.util.ts` | Nuevo — criterio y diagnóstico |
| `escena-visual.ts` | Log temporal por hotspot |
| `exploracion-visual.ts` | `__fase21aDiagnosticoComisaria` en `window` |
| `scripts/audit-fase21a-comisaria.mjs` | Nuevo — auditoría estática |
| `docs/FASE-21A-TRANSICION-COMISARIA.md` | Este documento |

---

## Despliegue

```bash
docker compose build frontend && docker compose up -d frontend
```
