# FASE 23B — Informe de coherencia narrativa

**Alcance:** 14 conversaciones JSON (`violencia-intrafamiliar/conversaciones/`)  
**Auditoría automática:** `scripts/audit-fase23b-coherencia.mjs`  
**Referencias rotas:** 0  
**IDs duplicados:** 0  

---

## Hallazgos corregidos

| Conversación | Problema encontrado | Nodo | Propuesta de corrección | Estado |
|---|---|---|---|---|
| entrevista-comisario | Oración duplicada literal en el prompt | decision-cierre | Una sola frase de cierre | ✅ Corregido |
| entrevista-comisario | Mismo template genérico que enfermería | decision-prep-info-critica | Texto contextualizado a comisaría | ✅ Corregido |
| entrevista-enfermera-pasillo | Dos frases genéricas encadenadas (plantilla repetida) | decision-prep-info-critica | Texto único sobre datos de ingreso | ✅ Corregido |
| entrevista-hermano-espera | Oración duplicada literal | decision-enfoque-hermano | Eliminar repetición | ✅ Corregido |
| entrevista-hermano-espera | Oración duplicada literal; repite idea de decision-sobrina | decision-miedo | Redactar según miedo post-relato, sin copiar | ✅ Corregido |
| entrevista-hermano-espera | Oración duplicada literal | decision-afrontamiento-familiar | Eliminar repetición | ✅ Corregido |
| entrevista-madre-espera | Oración duplicada literal | decision-episodio | Eliminar repetición | ✅ Corregido |
| entrevista-madre-espera | Dos formulaciones de cierre en la misma línea | decision-cierre-madre | Una sola instrucción de cierre | ✅ Corregido |
| entrevista-madre-espera | Rama «pedir-testigo» ya enlazaba diálogo de cierre | pedir-testigo | Destino correcto: cierre-madre-dialogo | ✅ Verificado |
| entrevista-policia-entrada | Prompt genérico idéntico a revisitas | decision-nivel4-antecedentes | Contextualizar al contacto policial | ✅ Corregido |
| revisita-hermano-tras-policia | Cola de prompt copiada de otras conversaciones | decision-cruzar-policia | Cierre específico al cruce policial | ✅ Corregido |
| revisita-madre-tras-ts | Cola de prompt copiada de otras conversaciones | decision-enfoque-ts | Cierre específico tras comisaría | ✅ Corregido |

---

## Hallazgos documentados (sin cambio — diseño intencional)

| Conversación | Problema encontrado | Nodo | Propuesta de corrección | Estado |
|---|---|---|---|---|
| consulta-lucia | Nodos «inalcanzables» desde nodoInicialId | saludo-confianza-alta, saludo-tension | Acceso vía `saludoMemoria` del motor (no es error) | ⏸ Sin cambio |
| Varias entrevistas | Prompts de jugador en tercera persona («reflexiona», «considera») | nodos decision-* / format-ref-* | Formato académico deliberado de reflexión clínica | ⏸ Sin cambio |
| entrevista-hermano-espera | Rama corta vs larga hacia cierre-hermano | decision-compromiso | Asimetría aceptable (cierre temprano vs exploración) | ⏸ Sin cambio |

---

## Resumen

- **12 correcciones** aplicadas en JSON narrativos.
- **0** referencias a nodos inexistentes.
- Principales causas de incoherencia percibida: **textos duplicados** (artefacto editorial) y **plantillas de prompt reutilizadas** entre personajes/escenas.
