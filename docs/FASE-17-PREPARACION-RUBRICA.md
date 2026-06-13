# Fase 17 — Preparación de diálogos para integración de rúbrica académica

## Alcance

**Modificado:** diálogos institucionales, longitud de entrevistas, estructura conversacional progresiva, contenedores `prep-slot-*` y flags `prep_rubrica_*`.

**No modificado:** persistencia, navegación, fullscreen, hotspots, libreta, mapa, comisaría (escenas), sistema de puntuación, flags `criterio_*` existentes (conservados en las mismas decisiones lógicas).

**No incluido en esta fase:** preguntas evaluativas, respuestas correctas ni rúbrica oficial. Los slots son contenedores vacíos listos para integración posterior.

---

## 1. Estructura obligatoria de entrevista

Todas las entrevistas institucionales siguen cinco fases:

| Fase | Propósito | Regla |
|------|-----------|-------|
| 1. Apertura | Presentación y encuadre | Sin información sensible |
| 2. Exploración inicial | Contexto general del servicio / procedimiento | Respuestas orientativas |
| 3. Profundización | Indagación temática específica | Datos parciales, no testimonios críticos |
| 4. Información crítica | Testimonios, discrepancias, antecedentes documentados | Revelación gradual |
| 5. Cierre | Coordinación, documentos, siguiente paso | `completar_conversacion` |

Flujo típico:

```
personaje (apertura neutra)
  → jugador (decision-prep-apertura | decision-identificacion)
  → personaje (acuse de recibo)
  → jugador (decision-prep-exploracion-inicial)
  → personaje (respuesta exploratoria)
  → jugador (decision-prep-profundizacion)
  → personaje (respuesta profunda)
  → jugador (decision-prep-info-critica)
  → personaje (testimonio / dato sensible)
  → jugador (decision-cierre)
  → personaje (cierre + completar_conversacion)
```

---

## 2. Convención de contenedores para rúbrica futura

### IDs de opción

```
prep-slot-{personaje}-{fase}-N
```

| Prefijo personaje | Entrevista |
|-------------------|------------|
| `pol` | Policía |
| `enf` | Enfermera |
| `med` | Médico |
| `com` | Comisario |
| `ts` | Trabajadora social |

| Sufijo fase | Nodo de decisión |
|-------------|------------------|
| `apertura` | `decision-prep-apertura` / `decision-identificacion` |
| `exploracion` | `decision-prep-exploracion-inicial` |
| `profundizacion` | `decision-prep-profundizacion` |
| `critica` | `decision-prep-info-critica` |
| `cierre` | `decision-cierre` |

### Flags de preparación

Cada opción de contenedor establece un flag por fase:

```
prep_rubrica_{personaje}_{fase}
```

Ejemplos: `prep_rubrica_pol_exploracion`, `prep_rubrica_med_info_critica`, `prep_rubrica_ts_cierre`.

Estos flags **no** alteran puntuación ni desbloqueos; solo marcan que el estudiante transitó una fase evaluable.

---

## 3. Archivos modificados

Ruta base: `frontend/public/simulacion-narrativa/casos/violencia-intrafamiliar/conversaciones/`

| Archivo | Nodos aprox. | Clics mínimos hasta cierre |
|---------|--------------|----------------------------|
| `entrevista-policia-entrada.json` | 22 | 6 |
| `entrevista-enfermera-pasillo.json` | 20 | 6 |
| `entrevista-medico-urgencias.json` | 21 | 6 |
| `entrevista-comisario.json` | 22 | 6 |
| `entrevista-trabajadora-social-comisaria.json` | 22 | 6 |

---

## 4. Contenido temático por personaje

### Policía (`entrevista-policia-entrada.json`)

| Fase | Temas |
|------|-------|
| Exploración | Marco institucional, coordinación con familia |
| Profundización | Llegada, llamada inicial, comportamiento observado, antecedentes (teaser) |
| Info crítica | Partes previos, paradero agresor, versión familiar (testimonios) |
| Cierre | Registro preliminar, alerta de reingreso |

### Enfermera (`entrevista-enfermera-pasillo.json`)

| Fase | Temas |
|------|-------|
| Exploración | Servicio nocturno, coordinación clínica, dinámica ingreso |
| Profundización | Estado general, reacción familiares, observaciones (teaser) |
| Info crítica | Lesiones visibles, altercado pasillo (testimonios) |
| Cierre | Reporte enfermería (`descubrir_evidencia: informe-urgencias`), derivación al médico |

### Médico (`entrevista-medico-urgencias.json`)

| Fase | Temas |
|------|-------|
| Exploración | Estado general, ingreso, prioridades clínicas |
| Profundización | Hallazgos, evolución, riesgos (parcial) |
| Info crítica | Discrepancia relato/lesiones, nota clínica, menor fallecida (testimonios) |
| Cierre | Protocolo violencia (`protocolo_violencia_solicitado`), flags `criterio_*` preservados |

### Comisario (`entrevista-comisario.json`)

| Fase | Temas |
|------|-------|
| Exploración | Procedimiento Ley 1257, medidas (teaser), antecedentes (teaser) |
| Profundización | Contraste versiones, valoración riesgo, hallazgos clínicos |
| Info crítica | Agresor, partes documentados, menor (testimonios) |
| Cierre | Síntesis, rutas institucionales (`criterio_rutas_institucionales`) |

### Trabajadora social (`entrevista-trabajadora-social-comisaria.json`)

| Fase | Temas |
|------|-------|
| Exploración | Red de apoyo, seguimiento, necesidades (teaser) |
| Profundización | Derivación interdisciplinaria, factores riesgo/protectores, duelo |
| Info crítica | Protección Lucía, protección económica, menor fallecida |
| Cierre | Plazos seguimiento, derivación clínica (`criterio_psicoterapia`, etc.) |

---

## 5. Elementos de juego conservados

- **Testimonios** (`testimonio`): permanecen en fase de información crítica.
- **Evidencias:** `descubrir_evidencia` en cierre enfermera (`informe-urgencias`).
- **Flags académicos existentes:** `criterio_*` y `protocolo_violencia_solicitado` sin cambio de ubicación lógica.
- **Requisitos de acceso:** comisario y TS mantienen `requisitosAcceso` originales.
- **Métricas:** `modificadoresMetricas` en opciones de confrontación (médico) y alerta (policía).

---

## 6. Integración futura de rúbrica

Para conectar la rúbrica oficial:

1. Reemplazar texto de opciones `prep-slot-*` por preguntas evaluativas validadas.
2. Añadir `efectos` de puntuación o validación en las mismas opciones (sin mover nodos).
3. Consultar flags `prep_rubrica_*` para saber qué fases completó el estudiante.
4. Opcional: agrupar slots por fase en el motor de evaluación docente.

No se requiere modificar escenas, hotspots ni servicios de sesión para esta integración.

---

## 7. Verificación

```powershell
Set-Location frontend/public/simulacion-narrativa/casos/violencia-intrafamiliar/conversaciones
node -e "const fs=require('fs'); ['entrevista-policia-entrada.json','entrevista-enfermera-pasillo.json','entrevista-medico-urgencias.json','entrevista-comisario.json','entrevista-trabajadora-social-comisaria.json'].forEach(f=>{JSON.parse(fs.readFileSync(f,'utf8')); console.log('OK',f);});"
```

Prueba manual sugerida: iniciar cada entrevista y confirmar que la primera réplica del personaje no expone antecedentes, lesiones ni discrepancias documentadas.
