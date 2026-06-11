"""Servicios de solicitudes de reapertura y reinicio de prácticas."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.participaciones.models import Participacion
from apps.usuarios.models import Usuario

from .models import AutorizacionEstudiante, Practica, RegistroReinicioPractica, SolicitudReapertura


def _practica_completada(auth: AutorizacionEstudiante) -> bool:
    """True si hay participación finalizada o resultado narrativo."""
    try:
        part = auth.participacion
        if part.estado in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA):
            return True
    except Participacion.DoesNotExist:
        pass
    from apps.resultados.models import ResultadoNarrativo

    return ResultadoNarrativo.objects.filter(autorizacion=auth).exists()


@transaction.atomic
def reiniciar_practica_estudiante(
    auth: AutorizacionEstudiante,
    docente: Usuario,
    *,
    alcance: str = RegistroReinicioPractica.Alcance.INDIVIDUAL,
    motivo: str = '',
) -> RegistroReinicioPractica:
    """Reinicia progreso backend de una autorización (participación + resultado narrativo)."""
    from apps.resultados.models import ResultadoNarrativo

    try:
        part = auth.participacion
        part.delete()
    except Participacion.DoesNotExist:
        pass

    ResultadoNarrativo.objects.filter(autorizacion=auth).delete()

    auth.reintento_autorizado = True
    auth.save(update_fields=['reintento_autorizado'])

    return RegistroReinicioPractica.objects.create(
        practica=auth.practica,
        docente=docente,
        estudiante=auth.estudiante,
        autorizacion=auth,
        alcance=alcance,
        motivo=motivo[:300],
        estudiantes_afectados=1,
    )


@transaction.atomic
def reiniciar_practica_global(practica: Practica, docente: Usuario, *, motivo: str = '') -> RegistroReinicioPractica:
    """Reinicia la práctica para todos los estudiantes autorizados."""
    from apps.resultados.models import ResultadoNarrativo

    auths = list(practica.autorizaciones.filter(revocada=False))
    for auth in auths:
        try:
            auth.participacion.delete()
        except Participacion.DoesNotExist:
            pass
        ResultadoNarrativo.objects.filter(autorizacion=auth).delete()
        auth.reintento_autorizado = True
        auth.save(update_fields=['reintento_autorizado'])

    return RegistroReinicioPractica.objects.create(
        practica=practica,
        docente=docente,
        alcance=RegistroReinicioPractica.Alcance.GLOBAL,
        motivo=motivo[:300],
        estudiantes_afectados=len(auths),
    )


def crear_solicitud_reapertura(auth: AutorizacionEstudiante, motivo: str = '') -> SolicitudReapertura:
    if auth.revocada:
        raise ValidationError('Tu autorización fue revocada.')
    if not _practica_completada(auth):
        raise ValidationError('Solo puedes solicitar reintento cuando la práctica está completada.')
    if SolicitudReapertura.objects.filter(
        autorizacion=auth,
        estado=SolicitudReapertura.Estado.PENDIENTE,
    ).exists():
        raise ValidationError('Ya tienes una solicitud pendiente para esta práctica.')

    return SolicitudReapertura.objects.create(
        autorizacion=auth,
        estudiante=auth.estudiante,
        practica=auth.practica,
        motivo=motivo.strip(),
    )


@transaction.atomic
def aprobar_solicitud_reapertura(solicitud: SolicitudReapertura, docente: Usuario) -> SolicitudReapertura:
    if solicitud.estado != SolicitudReapertura.Estado.PENDIENTE:
        raise ValidationError('La solicitud ya fue resuelta.')

    reiniciar_practica_estudiante(
        solicitud.autorizacion,
        docente,
        motivo=f'Aprobación solicitud #{solicitud.id}',
    )

    solicitud.estado = SolicitudReapertura.Estado.APROBADA
    solicitud.docente_resolvio = docente
    solicitud.fecha_resolucion = timezone.now()
    solicitud.save(update_fields=['estado', 'docente_resolvio', 'fecha_resolucion'])
    return solicitud


@transaction.atomic
def rechazar_solicitud_reapertura(
    solicitud: SolicitudReapertura,
    docente: Usuario,
    mensaje: str = '',
) -> SolicitudReapertura:
    if solicitud.estado != SolicitudReapertura.Estado.PENDIENTE:
        raise ValidationError('La solicitud ya fue resuelta.')

    solicitud.estado = SolicitudReapertura.Estado.RECHAZADA
    solicitud.docente_resolvio = docente
    solicitud.mensaje_resolucion = mensaje.strip()
    solicitud.fecha_resolucion = timezone.now()
    solicitud.save(update_fields=['estado', 'docente_resolvio', 'mensaje_resolucion', 'fecha_resolucion'])
    return solicitud


def fila_solicitud_reapertura(sol: SolicitudReapertura) -> dict:
    return {
        'id': sol.id,
        'estudiante_id': sol.estudiante_id,
        'estudiante_nombre': sol.estudiante.nombre_completo,
        'estudiante_correo': sol.estudiante.correo,
        'practica_id': sol.practica_id,
        'practica_nombre': sol.practica.nombre,
        'autorizacion_id': sol.autorizacion_id,
        'estado': sol.estado,
        'estado_display': sol.get_estado_display(),
        'motivo': sol.motivo,
        'mensaje_resolucion': sol.mensaje_resolucion,
        'fecha_solicitud': sol.fecha_solicitud,
        'fecha_resolucion': sol.fecha_resolucion,
    }
