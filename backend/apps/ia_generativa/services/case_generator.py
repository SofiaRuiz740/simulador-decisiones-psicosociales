"""Orquestador: payload → IA (o stub) → JSON validado → ``PropuestaCasoIA``.

También expone ``convertir_propuesta_en_caso`` que materializa el JSON en
los modelos reales (``Caso``, ``Escenario``, ``Pregunta``, ``Respuesta``,
``Rubrica``) para que el docente pueda editarlo desde el editor estándar.
"""

from __future__ import annotations

import logging
from typing import Any

from django.db import transaction

from apps.casos.models import Caso, Escenario, Pregunta, Respuesta, Rubrica

from ..models import PropuestaCasoIA
from . import ai_provider, prompt_builder

logger = logging.getLogger(__name__)


class GenerationError(Exception):
    """Error semántico del proceso de generación (no de transporte)."""


# ----------------------------------------------------------------------------
# Generación
# ----------------------------------------------------------------------------

@transaction.atomic
def generar_propuesta_caso(payload: dict, docente) -> PropuestaCasoIA:
    """Genera una propuesta, la valida y la guarda en estado ``EN_REVISION``.

    payload esperado (ya validado por el serializer):
        - tema (str)
        - objetivo_aprendizaje (str)
        - nivel_dificultad (str)
        - numero_escenarios (int)
        - numero_preguntas_por_escenario (int)
        - tono (str)
    """
    system_prompt = prompt_builder.SYSTEM_PROMPT
    user_prompt = prompt_builder.construir_user_prompt(payload)

    try:
        contenido, uso_real_llm = ai_provider.complete_json(system_prompt, user_prompt)
    except ai_provider.AIProviderError as exc:
        # Si el proveedor está mal configurado, caemos al stub mejorado y registramos.
        logger.warning('Proveedor IA falló: %s — usando stub mejorado.', exc)
        contenido = {}
        uso_real_llm = False

    if not contenido:
        contenido = _generar_stub_mejorado(payload)

    contenido = _normalizar(contenido, payload)
    _validar(contenido)

    propuesta = PropuestaCasoIA.objects.create(
        docente=docente,
        tema=payload['tema'],
        objetivo_aprendizaje=payload['objetivo_aprendizaje'],
        nivel_dificultad=payload.get('nivel_dificultad', 'medio'),
        numero_escenarios=int(payload.get('numero_escenarios', 3)),
        numero_preguntas_por_escenario=int(payload.get('numero_preguntas_por_escenario', 2)),
        tono=payload.get('tono', ''),
        contenido_json=contenido,
        estado=PropuestaCasoIA.Estado.EN_REVISION,
        generada_con_llm=uso_real_llm,
    )
    return propuesta


# ----------------------------------------------------------------------------
# Materialización: Propuesta → Caso real
# ----------------------------------------------------------------------------

@transaction.atomic
def convertir_propuesta_en_caso(propuesta: PropuestaCasoIA, docente) -> Caso:
    """Crea un Caso completo (escenarios/preguntas/respuestas/rúbrica) desde el JSON."""
    if propuesta.estado not in (PropuestaCasoIA.Estado.APROBADO, PropuestaCasoIA.Estado.EN_REVISION):
        raise GenerationError('La propuesta debe estar EN_REVISION o APROBADO para convertirla.')

    data = propuesta.contenido_json or {}
    storytelling = data.get('storytelling') or {}

    caso = Caso.objects.create(
        nombre=(data.get('titulo') or propuesta.tema)[:200],
        descripcion=data.get('descripcion', ''),
        contexto_historia=_texto_storytelling(storytelling),
        desarrollo_situacional=storytelling.get('conflicto_central', ''),
        area_psicosocial=(data.get('area_psicologia_social') or '')[:150],
        tiempo_estimado_min=_int(data.get('tiempo_estimado'), 30) or 30,
        estado=Caso.Estado.EN_REVISION,
        docente_creador=docente,
    )

    # Rúbrica primero, para tener ids de criterio disponibles al asignarlos a preguntas.
    criterios_normalizados = _crear_rubrica(caso, data.get('rubrica') or {})

    # Round-robin de criterios entre preguntas para que cada criterio reciba peso.
    cids = [c['id'] for c in criterios_normalizados] or ['']
    contador = 0
    for i, esc in enumerate(data.get('escenarios') or [], start=1):
        e = Escenario.objects.create(
            caso=caso, orden=i,
            titulo=(esc.get('titulo') or f'Escenario {i}')[:200],
            narrativa=_texto_escenario(esc),
            recursos_multimedia=_recursos_visuales(esc),
        )
        for j, preg in enumerate(esc.get('preguntas') or [], start=1):
            cid = cids[contador % len(cids)]
            contador += 1
            p = Pregunta.objects.create(
                escenario=e, orden=j,
                enunciado=preg.get('enunciado', ''),
                peso=_int(preg.get('peso'), 1) or 1,
                criterio_rubrica_id=cid,
            )
            for k, op in enumerate(preg.get('opciones') or [], start=1):
                Respuesta.objects.create(
                    pregunta=p, orden=k,
                    texto=op.get('texto', ''),
                    es_correcta=bool(op.get('es_correcta', False)),
                    justificacion=op.get('justificacion', ''),
                    retroalimentacion=_componer_retro(op),
                )

    propuesta.estado = PropuestaCasoIA.Estado.CONVERTIDO_EN_CASO
    propuesta.caso_resultante = caso
    propuesta.save(update_fields=['estado', 'caso_resultante', 'fecha_actualizacion'])

    return caso


# ----------------------------------------------------------------------------
# Helpers privados
# ----------------------------------------------------------------------------

def _texto_storytelling(s: dict) -> str:
    bloques = [
        s.get('introduccion', ''),
        s.get('contexto_general', ''),
        f"Personaje: {s.get('personaje_principal', '')}" if s.get('personaje_principal') else '',
        f"Objetivo: {s.get('objetivo_del_estudiante', '')}" if s.get('objetivo_del_estudiante') else '',
    ]
    return '\n\n'.join(b for b in bloques if b).strip()


def _texto_escenario(esc: dict) -> str:
    bloques = [
        esc.get('contexto', ''),
        esc.get('narrativa', ''),
        f"Emoción dominante: {esc.get('emocion_principal', '')}" if esc.get('emocion_principal') else '',
    ]
    return '\n\n'.join(b for b in bloques if b).strip()


def _recursos_visuales(esc: dict) -> list[dict]:
    """Guarda la sugerencia visual como recurso pseudo-multimedia (sirve para Unity futuro)."""
    sug = esc.get('ambiente_visual_sugerido')
    if not sug:
        return []
    return [{'tipo': 'sugerencia_visual', 'descripcion': sug}]


def _componer_retro(opcion: dict) -> str:
    retro = opcion.get('retroalimentacion', '').strip()
    impacto = opcion.get('impacto_narrativo', '').strip()
    if retro and impacto:
        return f'{retro}\n\n— Impacto narrativo: {impacto}'
    return retro or impacto


def _crear_rubrica(caso: Caso, rubrica_raw: dict) -> list[dict]:
    """Crea la rúbrica del caso y devuelve la lista normalizada de criterios."""
    criterios_in = rubrica_raw.get('criterios') or []
    if not criterios_in:
        return []

    criterios_norm: list[dict] = []
    total_peso = sum(_int(c.get('puntaje_maximo'), 0) for c in criterios_in) or 1
    for idx, c in enumerate(criterios_in, start=1):
        peso_raw = _int(c.get('puntaje_maximo'), 0)
        peso = round(peso_raw * 100 / total_peso) if peso_raw else 0
        criterios_norm.append({
            'id': f'c{idx}',
            'nombre': c.get('nombre', f'Criterio {idx}'),
            'descripcion': c.get('descripcion', ''),
            'peso': peso,
            'niveles': [
                {
                    'nivel': i + 1,
                    'nombre': n.get('nivel') or f'Nivel {i + 1}',
                    'descriptor': n.get('descripcion', ''),
                }
                for i, n in enumerate(c.get('niveles') or [])
            ] or [
                {'nivel': 1, 'nombre': 'Incipiente', 'descriptor': ''},
                {'nivel': 2, 'nombre': 'En desarrollo', 'descriptor': ''},
                {'nivel': 3, 'nombre': 'Logrado', 'descriptor': ''},
                {'nivel': 4, 'nombre': 'Sobresaliente', 'descriptor': ''},
            ],
        })

    # Ajustar pesos para sumar 100 exacto.
    suma = sum(c['peso'] for c in criterios_norm)
    if suma != 100 and criterios_norm:
        criterios_norm[0]['peso'] += (100 - suma)

    Rubrica.objects.create(
        caso=caso,
        descripcion=rubrica_raw.get('descripcion', '') or 'Rúbrica generada con IA, revisable por el docente.',
        escala_maxima=100,
        nota_aprobacion=60,
        criterios=criterios_norm,
    )
    return criterios_norm


# ----------------------------------------------------------------------------
# Validación / normalización del JSON devuelto por la IA
# ----------------------------------------------------------------------------

REQUERIDOS = ('titulo', 'descripcion', 'storytelling', 'escenarios', 'rubrica')


def _validar(contenido: dict) -> None:
    faltantes = [k for k in REQUERIDOS if not contenido.get(k)]
    if faltantes:
        raise GenerationError(
            f'La IA devolvió un JSON sin las claves obligatorias: {", ".join(faltantes)}.',
        )
    if not isinstance(contenido['escenarios'], list) or not contenido['escenarios']:
        raise GenerationError('La IA devolvió cero escenarios.')
    for i, esc in enumerate(contenido['escenarios'], start=1):
        preguntas = esc.get('preguntas') or []
        if not preguntas:
            raise GenerationError(f'El escenario #{i} no tiene preguntas.')
        for j, p in enumerate(preguntas, start=1):
            ops = p.get('opciones') or []
            if len(ops) < 2:
                raise GenerationError(
                    f'La pregunta {i}.{j} tiene menos de 2 opciones.',
                )
            if not any(o.get('es_correcta') for o in ops):
                raise GenerationError(
                    f'La pregunta {i}.{j} no marca ninguna opción como correcta.',
                )


def _normalizar(contenido: dict, payload: dict) -> dict:
    """Asegura que algunos campos opcionales tengan valores por defecto coherentes."""
    contenido.setdefault('objetivo_aprendizaje', payload['objetivo_aprendizaje'])
    contenido.setdefault('nivel_dificultad', payload.get('nivel_dificultad', 'medio'))
    contenido.setdefault('tiempo_estimado', 30)
    contenido.setdefault('storytelling', {})
    contenido.setdefault('rubrica', {'criterios': []})
    contenido.setdefault('retroalimentacion_general', '')
    contenido.setdefault('recomendaciones_docente', '')
    return contenido


# ----------------------------------------------------------------------------
# Stub mejorado (cuando no hay API key configurada)
# ----------------------------------------------------------------------------

def _generar_stub_mejorado(payload: dict) -> dict[str, Any]:
    """Esqueleto pedagógicamente coherente para que el flujo funcione sin LLM real.

    Marcado claramente como STUB para que el docente sepa que debe editar.
    """
    tema = payload['tema'].strip()
    objetivo = payload['objetivo_aprendizaje'].strip()
    n_esc = int(payload.get('numero_escenarios', 3))
    n_preg = int(payload.get('numero_preguntas_por_escenario', 2))

    def opciones(j: int) -> list[dict]:
        return [
            {
                'texto': 'Cedes a la presión del grupo para no quedar fuera.',
                'es_correcta': False,
                'justificacion': 'Conformidad normativa (Asch): el deseo de pertenencia anula el juicio crítico.',
                'retroalimentacion': 'Esta opción ilustra la fuerza de la conformidad como necesidad de pertenencia, pero a costa de la integridad personal.',
                'impacto_narrativo': 'El grupo te incluye, pero pierdes credibilidad ante una compañera observadora.',
            },
            {
                'texto': 'Detienes la dinámica y propones reflexionar antes de actuar.',
                'es_correcta': True,
                'justificacion': 'Asertividad y autonomía moral: distancia psicológica para evaluar el dilema.',
                'retroalimentacion': 'Buena decisión: introduces un quiebre que abre espacio al pensamiento crítico grupal.',
                'impacto_narrativo': 'El grupo se incomoda primero, luego dos personas se suman a tu postura.',
            },
            {
                'texto': 'Te retiras en silencio para no confrontar.',
                'es_correcta': False,
                'justificacion': 'Bystander effect (Latané & Darley): la pasividad refuerza el statu quo.',
                'retroalimentacion': 'La evitación posterga el dilema; el grupo lo lee como aprobación tácita.',
                'impacto_narrativo': 'El conflicto crece sin que tú estés presente para moderarlo.',
            },
        ]

    escenarios = []
    momentos = ['Inicio del dilema', 'Escalada del conflicto', 'Cierre y consecuencias',
                'Reconfiguración del grupo', 'Reflexión final']
    emociones = ['tensión', 'incomodidad', 'indignación', 'duda', 'esperanza']
    for i in range(n_esc):
        escenarios.append({
            'titulo': f'{momentos[i % len(momentos)]} ({tema})',
            'contexto': f'En el contexto de "{tema}", la situación llega a un punto donde tu decisión es visible.',
            'narrativa': (
                'Estás en el aula. La luz del proyector cae sobre el grupo. Tres compañeros '
                'esperan tu reacción. El silencio se vuelve denso. Sabes que cualquier cosa que digas '
                'definirá tu lugar en la dinámica.'
            ),
            'ambiente_visual_sugerido': 'aula universitaria al atardecer, luz tenue del proyector, ventanas abiertas',
            'emocion_principal': emociones[i % len(emociones)],
            'decision_clave': 'Decides cómo actuar frente a la presión.',
            'preguntas': [
                {
                    'enunciado': f'¿Qué haces en este momento ({j + 1})?',
                    'tipo': 'seleccion_unica',
                    'opciones': opciones(j),
                }
                for j in range(n_preg)
            ],
        })

    return {
        'titulo': f'{tema} — caso piloto',
        'descripcion': (
            f'Caso introductorio sobre "{tema}". Diseñado para evaluar: {objetivo}.\n\n'
            '(MODO STUB — generado sin proveedor de IA. Revisa y edita antes de publicar.)'
        ),
        'objetivo_aprendizaje': objetivo,
        'area_psicologia_social': 'Influencia social y toma de decisiones grupales',
        'nivel_dificultad': payload.get('nivel_dificultad', 'medio'),
        'tiempo_estimado': 30,
        'storytelling': {
            'introduccion': (
                'Estás cursando un seminario donde la convivencia del grupo se ha tensado en las '
                'últimas semanas. Tus decisiones empiezan a tener peso real sobre quienes te rodean.'
            ),
            'personaje_principal': 'Tú, estudiante universitario/a con rol informal de mediador/a.',
            'contexto_general': 'Universidad pública en Bogotá, semestre intermedio.',
            'conflicto_central': f'Cómo actuar éticamente frente al dilema central de "{tema}".',
            'tono_narrativo': payload.get('tono', 'académico, narrativo, sobrio'),
            'objetivo_del_estudiante': objetivo,
        },
        'escenarios': escenarios,
        'rubrica': {
            'criterios': [
                {
                    'nombre': 'Razonamiento ético',
                    'descripcion': 'Capacidad de identificar dilemas y argumentar la decisión.',
                    'puntaje_maximo': 40,
                    'niveles': [
                        {'nivel': 'Incipiente', 'descripcion': 'No identifica el dilema.', 'puntaje': 25},
                        {'nivel': 'En desarrollo', 'descripcion': 'Lo identifica pero no lo argumenta.', 'puntaje': 50},
                        {'nivel': 'Logrado', 'descripcion': 'Argumenta con base teórica.', 'puntaje': 75},
                        {'nivel': 'Sobresaliente', 'descripcion': 'Integra varias perspectivas.', 'puntaje': 100},
                    ],
                },
                {
                    'nombre': 'Análisis psicosocial',
                    'descripcion': 'Uso de marcos teóricos de psicología social.',
                    'puntaje_maximo': 35,
                    'niveles': [
                        {'nivel': 'Incipiente', 'descripcion': 'No referencia teoría.', 'puntaje': 25},
                        {'nivel': 'En desarrollo', 'descripcion': 'Menciona una teoría sin aplicarla.', 'puntaje': 50},
                        {'nivel': 'Logrado', 'descripcion': 'Aplica una teoría al caso.', 'puntaje': 75},
                        {'nivel': 'Sobresaliente', 'descripcion': 'Conecta varias teorías.', 'puntaje': 100},
                    ],
                },
                {
                    'nombre': 'Toma de decisiones',
                    'descripcion': 'Calidad y consistencia de las decisiones a lo largo del caso.',
                    'puntaje_maximo': 25,
                    'niveles': [
                        {'nivel': 'Incipiente', 'descripcion': 'Decisiones contradictorias.', 'puntaje': 25},
                        {'nivel': 'En desarrollo', 'descripcion': 'Decisiones parcialmente coherentes.', 'puntaje': 50},
                        {'nivel': 'Logrado', 'descripcion': 'Decisiones coherentes.', 'puntaje': 75},
                        {'nivel': 'Sobresaliente', 'descripcion': 'Decisiones coherentes y argumentadas.', 'puntaje': 100},
                    ],
                },
            ],
        },
        'retroalimentacion_general': (
            'Recuerda que este caso evalúa cómo razonas bajo presión social. '
            'No hay respuestas perfectas: hay decisiones más o menos defendibles teóricamente.'
        ),
        'recomendaciones_docente': (
            'Usa el caso al cierre de la unidad de influencia social. Pide al estudiante explicar '
            'la teoría detrás de su decisión en cada escenario.'
        ),
    }


def _int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
