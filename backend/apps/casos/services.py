"""Servicios de dominio para Casos: validación y duplicado."""

from django.db import transaction

from .models import Caso, Escenario, Pregunta, Respuesta, Rubrica


def problemas_de_validacion(caso: Caso) -> list[dict]:
    """Revisa la coherencia del caso. Devuelve [] si está listo para publicar.

    Cada problema es {'codigo': str, 'mensaje': str, 'ubicacion': str|None}.
    """
    problemas: list[dict] = []

    if not (caso.contexto_historia or '').strip() and not (caso.desarrollo_situacional or '').strip():
        problemas.append({
            'codigo': 'sin_historia',
            'mensaje': 'El caso no tiene contexto/historia ni desarrollo situacional.',
            'ubicacion': None,
        })

    escenarios = list(caso.escenarios.all())
    if not escenarios:
        problemas.append({
            'codigo': 'sin_escenarios',
            'mensaje': 'Agrega al menos un escenario antes de publicar.',
            'ubicacion': None,
        })

    for esc in escenarios:
        preguntas = list(esc.preguntas.all())
        if not preguntas:
            problemas.append({
                'codigo': 'escenario_sin_preguntas',
                'mensaje': f'El escenario "{esc.titulo}" no tiene preguntas.',
                'ubicacion': f'escenario:{esc.id}',
            })
            continue
        for p in preguntas:
            respuestas = list(p.respuestas.all())
            if len(respuestas) < 2:
                problemas.append({
                    'codigo': 'pregunta_pocas_respuestas',
                    'mensaje': f'La pregunta "{p.enunciado[:60]}…" necesita al menos 2 respuestas.',
                    'ubicacion': f'pregunta:{p.id}',
                })
            if not any(r.es_correcta for r in respuestas):
                problemas.append({
                    'codigo': 'pregunta_sin_correcta',
                    'mensaje': f'La pregunta "{p.enunciado[:60]}…" no tiene ninguna respuesta marcada como correcta.',
                    'ubicacion': f'pregunta:{p.id}',
                })

    rubrica = getattr(caso, 'rubrica', None)
    if rubrica is None or not (rubrica.criterios or []):
        problemas.append({
            'codigo': 'sin_rubrica',
            'mensaje': 'El caso no tiene rúbrica con criterios definidos.',
            'ubicacion': 'rubrica',
        })
    elif rubrica.suma_pesos_criterios != 100:
        problemas.append({
            'codigo': 'pesos_no_suman_100',
            'mensaje': (
                f'La suma de pesos de la rúbrica es {rubrica.suma_pesos_criterios}, '
                f'debe ser 100 para usar la rúbrica completa.'
            ),
            'ubicacion': 'rubrica',
        })

    return problemas


def completitud_porcentaje(caso: Caso) -> int:
    """Estimación 0–100 de qué tan listo está el caso para publicar."""
    pts = 0
    if (caso.contexto_historia or '').strip() or (caso.desarrollo_situacional or '').strip():
        pts += 15
    if caso.escenarios.exists():
        pts += 20
    if Pregunta.objects.filter(escenario__caso=caso).exists():
        pts += 20
    rub = getattr(caso, 'rubrica', None)
    if rub is not None and (rub.criterios or []):
        pts += 15 if rub.suma_pesos_criterios == 100 else 8
    if not problemas_de_validacion(caso):
        pts += 25
    elif caso.estado == Caso.Estado.VALIDADO:
        pts += 15
    return min(100, pts)


@transaction.atomic
def duplicar_caso(original: Caso, docente) -> Caso:
    """Crea una copia profunda del caso: escenarios, preguntas, respuestas y rúbrica."""
    nuevo = Caso.objects.create(
        nombre=f'{original.nombre} (copia)',
        descripcion=original.descripcion,
        desarrollo_situacional=original.desarrollo_situacional,
        contexto_historia=original.contexto_historia,
        area_psicosocial=original.area_psicosocial,
        tiempo_estimado_min=original.tiempo_estimado_min,
        estado=Caso.Estado.BORRADOR,
        docente_creador=docente,
    )

    for esc in original.escenarios.all():
        new_esc = Escenario.objects.create(
            caso=nuevo,
            orden=esc.orden,
            titulo=esc.titulo,
            narrativa=esc.narrativa,
            recursos_multimedia=list(esc.recursos_multimedia or []),
        )
        for p in esc.preguntas.all():
            new_p = Pregunta.objects.create(
                escenario=new_esc,
                orden=p.orden,
                enunciado=p.enunciado,
                peso=p.peso,
                criterio_rubrica_id=p.criterio_rubrica_id,
            )
            for r in p.respuestas.all():
                Respuesta.objects.create(
                    pregunta=new_p,
                    texto=r.texto,
                    es_correcta=r.es_correcta,
                    justificacion=r.justificacion,
                    retroalimentacion=r.retroalimentacion,
                    orden=r.orden,
                )

    rub = getattr(original, 'rubrica', None)
    if rub is not None:
        Rubrica.objects.create(
            caso=nuevo,
            descripcion=rub.descripcion,
            escala_maxima=rub.escala_maxima,
            nota_aprobacion=rub.nota_aprobacion,
            criterios=list(rub.criterios or []),
            niveles_globales=list(rub.niveles_globales or []),
        )

    return nuevo
