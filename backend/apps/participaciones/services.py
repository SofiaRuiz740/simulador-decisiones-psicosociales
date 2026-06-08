"""Consultas de seguimiento docente sobre autorizaciones y participaciones."""

from __future__ import annotations

from django.utils import timezone

from apps.casos.models import Pregunta
from apps.participaciones.models import Participacion
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


def tiempo_usado_seg(part: Participacion) -> int:
    """Segundos consumidos (persistidos o en curso)."""
    if part.estado != Participacion.Estado.EN_CURSO and part.tiempo_usado_seg:
        return part.tiempo_usado_seg
    if part.inicio and part.estado == Participacion.Estado.EN_CURSO:
        return int((timezone.now() - part.inicio).total_seconds())
    return part.tiempo_usado_seg or 0


def tiempo_max_seg(part: Participacion) -> int:
    return part.practica.tiempo_max_min * 60


def tiempo_restante_seg(part: Participacion) -> int:
    if part.estado != Participacion.Estado.EN_CURSO:
        return 0
    return max(0, tiempo_max_seg(part) - tiempo_usado_seg(part))


def tiempo_agotado(part: Participacion) -> bool:
    return (
        part.estado == Participacion.Estado.EN_CURSO
        and tiempo_usado_seg(part) >= tiempo_max_seg(part)
    )


def _total_preguntas(part: Participacion) -> int:
    return Pregunta.objects.filter(escenario__caso=part.practica.caso).count()


def finalizar_participacion(part: Participacion, *, por_tiempo: bool = False):
    """Cierra la participación, calcula resultado y devuelve el Resultado."""
    from apps.resultados.services import calcular_resultado

    if part.estado in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA):
        return part.resultado

    respondidas = part.respuestas_seleccionadas.count()
    total = _total_preguntas(part)
    incompleta = por_tiempo or respondidas < total

    part.estado = (
        Participacion.Estado.INCOMPLETA if incompleta
        else Participacion.Estado.FINALIZADA
    )
    part.fin = timezone.now()
    if part.inicio:
        part.tiempo_usado_seg = min(tiempo_usado_seg(part), tiempo_max_seg(part))
    part.save(update_fields=['estado', 'fin', 'tiempo_usado_seg'])

    return calcular_resultado(part)


def asegurar_tiempo_vigente(part: Participacion) -> None:
    """Finaliza automáticamente si el tiempo se agotó (RF32)."""
    from rest_framework.exceptions import ValidationError

    if part.estado != Participacion.Estado.EN_CURSO:
        return
    if tiempo_agotado(part):
        finalizar_participacion(part, por_tiempo=True)
        raise ValidationError('El tiempo de participación se agotó.')


def cerrar_practica(practica: Practica) -> None:
    """Al cerrar la práctica: nota cero (RF47) y parcial/incompleta (RF48)."""
    from apps.resultados.services import calcular_resultado

    for auth in practica.autorizaciones.select_related('estudiante').all():
        try:
            part = auth.participacion
        except Participacion.DoesNotExist:
            part = Participacion.objects.create(
                practica=practica,
                estudiante=auth.estudiante,
                autorizacion=auth,
                estado=Participacion.Estado.NO_INICIADA,
            )
            calcular_resultado(part)
            continue

        if part.estado == Participacion.Estado.EN_CURSO:
            finalizar_participacion(part, por_tiempo=tiempo_agotado(part))
        elif part.estado == Participacion.Estado.NO_INICIADA:
            calcular_resultado(part)


def _autorizaciones_queryset(user: Usuario, practica_id: str | None = None):
    qs = AutorizacionEstudiante.objects.select_related(
        'practica__caso', 'estudiante',
    ).prefetch_related('participacion__respuestas_seleccionadas')
    if user.rol == Usuario.Rol.DOCENTE:
        qs = qs.filter(practica__docente=user)
    if practica_id:
        qs = qs.filter(practica_id=practica_id)
    return qs.order_by('-fecha_creacion')


def fila_seguimiento(auth: AutorizacionEstudiante) -> dict:
    """Construye una fila de seguimiento a partir de una autorización."""
    part: Participacion | None = None
    try:
        part = auth.participacion
    except Participacion.DoesNotExist:
        part = None

    total_preg = Pregunta.objects.filter(escenario__caso_id=auth.practica.caso_id).count()
    respondidas = part.respuestas_seleccionadas.count() if part else 0
    progreso_pct = round(respondidas / total_preg * 100) if total_preg else 0

    max_seg = auth.practica.tiempo_max_min * 60
    if part:
        estado = part.estado
        estado_display = part.get_estado_display()
        tiempo_usado = tiempo_usado_seg(part)
        if part.estado == Participacion.Estado.EN_CURSO:
            tiempo_restante = tiempo_restante_seg(part)
        else:
            tiempo_restante = 0
        intentos = 1 if part.estado in (
            Participacion.Estado.FINALIZADA,
            Participacion.Estado.INCOMPLETA,
        ) else 0
    else:
        estado = Participacion.Estado.NO_INICIADA
        estado_display = 'Autorizado'
        tiempo_usado = 0
        tiempo_restante = max_seg
        intentos = 0

    return {
        'id': part.id if part else None,
        'autorizacion_id': auth.id,
        'estudiante_id': auth.estudiante_id,
        'estudiante_nombre': auth.estudiante.nombre_completo,
        'estudiante_correo': auth.estudiante.correo,
        'practica_id': auth.practica_id,
        'practica_nombre': auth.practica.nombre,
        'caso_id': auth.practica.caso_id,
        'caso_nombre': auth.practica.caso.nombre,
        'estado': estado,
        'estado_display': estado_display,
        'progreso_pct': progreso_pct,
        'total_preguntas': total_preg,
        'respondidas': respondidas,
        'tiempo_usado_seg': tiempo_usado,
        'tiempo_restante_seg': tiempo_restante,
        'intentos': intentos,
    }


def listar_seguimiento(user: Usuario, practica_id: str | None = None, estado: str | None = None) -> list[dict]:
    rows = [fila_seguimiento(a) for a in _autorizaciones_queryset(user, practica_id)]
    if estado:
        rows = [r for r in rows if r['estado'] == estado]
    return rows


def metricas_seguimiento(user: Usuario) -> dict:
    rows = listar_seguimiento(user)
    en_curso = sum(1 for r in rows if r['estado'] == Participacion.Estado.EN_CURSO)
    finalizados = sum(
        1 for r in rows
        if r['estado'] in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA)
    )
    pendientes = sum(1 for r in rows if r['estado'] == Participacion.Estado.NO_INICIADA)
    return {
        'autorizados': len(rows),
        'en_curso': en_curso,
        'finalizados': finalizados,
        'pendientes': pendientes,
    }
