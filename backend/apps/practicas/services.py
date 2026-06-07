"""Servicios de consulta para prácticas y autorizaciones."""

from __future__ import annotations

from apps.academico.models import Estudiante, Grupo
from apps.participaciones.models import Participacion
from apps.participaciones.services import fila_seguimiento
from apps.practicas.models import AutorizacionEstudiante, Practica


def _materia_display_practica(practica) -> str | None:
    if practica.materia_id:
        return practica.materia.nombre
    if practica.caso.materia_id:
        return practica.caso.materia.nombre
    return None


def _grupos_estudiante_docente(estudiante: Estudiante, docente_id: int) -> str | None:
    nombres = list(
        Grupo.objects.filter(docente_id=docente_id, estudiantes=estudiante)
        .order_by('nombre')
        .values_list('nombre', flat=True),
    )
    return ', '.join(nombres) if nombres else None


def fila_mis_practicas(auth: AutorizacionEstudiante) -> dict:
    """Fila del listado «mis prácticas» para un estudiante."""
    base = fila_seguimiento(auth)
    practica = auth.practica
    nota_final = None
    try:
        nota_final = float(auth.participacion.resultado.nota_final)
    except Exception:  # noqa: BLE001 — sin participación o resultado
        nota_final = None

    return {
        **base,
        'codigo_acceso': auth.codigo_acceso,
        'materia_display': _materia_display_practica(practica),
        'fecha_inicio': practica.fecha_inicio,
        'fecha_fin': practica.fecha_fin,
        'tiempo_max_min': practica.tiempo_max_min,
        'practica_estado': practica.estado,
        'practica_estado_display': practica.get_estado_display(),
        'nota_final': nota_final,
    }


def listar_mis_practicas(estudiante: Estudiante) -> list[dict]:
    auths = AutorizacionEstudiante.objects.filter(
        estudiante=estudiante,
    ).select_related(
        'practica__caso', 'practica__materia', 'practica__caso__materia', 'estudiante',
    ).prefetch_related(
        'participacion__respuestas_seleccionadas', 'participacion__resultado',
    ).order_by('-fecha_creacion')
    return [fila_mis_practicas(auth) for auth in auths]


def fila_autorizacion_docente(auth: AutorizacionEstudiante) -> dict:
    """Fila de autorización para listados globales del docente."""
    practica = auth.practica
    part = None
    try:
        part = auth.participacion
    except Participacion.DoesNotExist:
        part = None

    if part:
        asignacion = part.get_estado_display()
    else:
        asignacion = 'Autorizado'

    return {
        'id': auth.id,
        'practica_id': practica.id,
        'practica_nombre': practica.nombre,
        'practica_estado': practica.estado,
        'practica_estado_display': practica.get_estado_display(),
        'estudiante_id': auth.estudiante_id,
        'estudiante_nombre': auth.estudiante.nombre_completo,
        'estudiante_correo': auth.estudiante.correo,
        'grupos_display': _grupos_estudiante_docente(auth.estudiante, practica.docente_id),
        'codigo_acceso': auth.codigo_acceso,
        'asignacion_display': asignacion,
        'reintento_autorizado': auth.reintento_autorizado,
        'fecha_creacion': auth.fecha_creacion,
    }


def listar_autorizaciones_docente(user, practica_id: str | None = None) -> list[dict]:
    from apps.usuarios.models import Usuario

    qs = AutorizacionEstudiante.objects.select_related(
        'practica__caso', 'estudiante', 'practica__docente',
    ).prefetch_related('participacion')
    if user.rol == Usuario.Rol.DOCENTE:
        qs = qs.filter(practica__docente=user)
    if practica_id:
        qs = qs.filter(practica_id=practica_id)
    return [fila_autorizacion_docente(auth) for auth in qs.order_by('-fecha_creacion')]


def autorizar_estudiantes_en_practica(
    practica: Practica,
    user,
    *,
    estudiante_ids: list[int] | None = None,
    grupo_ids: list[int] | None = None,
) -> list[AutorizacionEstudiante]:
    """Crea autorizaciones idempotentes para estudiantes y/o grupos."""
    from rest_framework.exceptions import ValidationError

    from apps.usuarios.models import Usuario

    ids_directos = set(estudiante_ids or [])
    if grupo_ids:
        grupos = Grupo.objects.filter(id__in=grupo_ids)
        if user.rol == Usuario.Rol.DOCENTE:
            grupos = grupos.filter(docente=user)
        for grupo in grupos:
            ids_directos.update(grupo.estudiantes.values_list('id', flat=True))

    if not ids_directos:
        raise ValidationError('Debes indicar al menos un estudiante o un grupo con estudiantes.')

    creadas: list[AutorizacionEstudiante] = []
    for est_id in ids_directos:
        auth, creada = AutorizacionEstudiante.objects.get_or_create(
            practica=practica, estudiante_id=est_id,
        )
        if creada:
            creadas.append(auth)
    return creadas
