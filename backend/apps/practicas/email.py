"""Envío de invitaciones a prácticas por correo (RF28)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMessage

from apps.usuarios.mail import conexion_smtp_docente

from .models import AutorizacionEstudiante

logger = logging.getLogger(__name__)


def _nombre_docente(docente) -> str:
    return docente.get_full_name() or docente.username


def _remitente_docente(docente) -> str:
    docente_email = (docente.email or '').strip()
    nombre = _nombre_docente(docente)
    if docente_email:
        return f'"{nombre}" <{docente_email}>'
    return settings.DEFAULT_FROM_EMAIL


def _cuerpo_invitacion(auth: AutorizacionEstudiante) -> tuple[str, str]:
    practica = auth.practica
    estudiante = auth.estudiante
    docente = practica.docente
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200').rstrip('/')
    enlace = f'{frontend}/estudiante'

    asunto = f'Invitación a la práctica: {practica.nombre}'
    cuerpo = (
        f'Hola {estudiante.nombre_completo},\n\n'
        f'{_nombre_docente(docente)} te invita a participar en la práctica académica:\n\n'
        f'  • Práctica: {practica.nombre}\n'
        f'  • Caso: {practica.caso.nombre}\n'
        f'  • Inicio: {practica.fecha_inicio:%Y-%m-%d %H:%M}\n'
        f'  • Fin:    {practica.fecha_fin:%Y-%m-%d %H:%M}\n\n'
        f'Tu código de acceso es: {auth.codigo_acceso}\n\n'
        f'Para ingresar al simulador:\n'
        f'  1. Abre {enlace}\n'
        f'  2. Usa tu correo: {estudiante.correo}\n'
        f'  3. Ingresa el código de acceso\n\n'
    )
    if practica.mensaje_personalizado:
        cuerpo += f'Mensaje del docente:\n{practica.mensaje_personalizado}\n\n'
    cuerpo += (
        f'—\n'
        f'Enviado por {_nombre_docente(docente)} ({docente.email or "sin correo"})\n'
    )
    return asunto, cuerpo


def enviar_invitacion_practica(
    auth: AutorizacionEstudiante,
    *,
    forzar: bool = False,
) -> tuple[bool, str | None]:
    """
    Envía la invitación al correo del estudiante.
    Retorna (éxito, mensaje_error).
    """
    if auth.notificado and not forzar:
        return True, None

    auth = AutorizacionEstudiante.objects.select_related(
        'estudiante', 'practica__docente', 'practica__caso',
    ).get(pk=auth.pk)

    practica = auth.practica
    docente = practica.docente
    estudiante = auth.estudiante

    if not estudiante.correo:
        return False, 'El estudiante no tiene correo registrado.'

    if not (docente.email or '').strip():
        return False, 'Tu usuario no tiene correo registrado.'

    conexion, err = conexion_smtp_docente(docente)
    if err:
        return False, err

    asunto, cuerpo = _cuerpo_invitacion(auth)
    reply_to = [docente.email] if docente.email else []

    try:
        mensaje = EmailMessage(
            subject=asunto,
            body=cuerpo,
            from_email=_remitente_docente(docente),
            to=[estudiante.correo],
            reply_to=reply_to,
            connection=conexion,
        )
        mensaje.send(fail_silently=False)
        AutorizacionEstudiante.objects.filter(pk=auth.pk).update(notificado=True)
        logger.info(
            'Invitación enviada: practica=%s estudiante=%s docente=%s',
            practica.id, estudiante.correo, docente.email,
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            'Error enviando invitación practica=%s estudiante=%s',
            practica.id, estudiante.correo,
        )
        AutorizacionEstudiante.objects.filter(pk=auth.pk).update(notificado=False)
        return False, str(exc)


def _cuerpo_revocacion(auth: AutorizacionEstudiante, motivo: str) -> tuple[str, str]:
    practica = auth.practica
    estudiante = auth.estudiante
    docente = practica.docente
    asunto = f'Tu acceso a la práctica fue revocado: {practica.nombre}'
    cuerpo = (
        f'Hola {estudiante.nombre_completo},\n\n'
        f'{_nombre_docente(docente)} ha retirado tu autorización para participar '
        f'en la práctica académica:\n\n'
        f'  • Práctica: {practica.nombre}\n'
        f'  • Caso: {practica.caso.nombre}\n\n'
        f'A partir de este momento tu código de acceso ya no es válido.\n\n'
    )
    if motivo:
        cuerpo += f'Motivo indicado por el docente:\n{motivo}\n\n'
    cuerpo += (
        f'Si crees que esto es un error, contacta directamente a tu docente.\n\n'
        f'—\n'
        f'Enviado por {_nombre_docente(docente)} ({docente.email or "sin correo"})\n'
    )
    return asunto, cuerpo


def enviar_revocacion_practica(
    auth: AutorizacionEstudiante,
    *,
    motivo: str = '',
) -> tuple[bool, str | None]:
    """Notifica al estudiante que su autorización fue revocada (RN26).

    Se intenta enviar por el SMTP del docente (mismo flujo que las
    invitaciones). Si no hay SMTP configurado o falla, devuelve `(False, error)`
    pero la revocación queda igualmente registrada en BD; la UI muestra el
    error para que el docente decida si reintenta.
    """
    auth = AutorizacionEstudiante.objects.select_related(
        'estudiante', 'practica__docente', 'practica__caso',
    ).get(pk=auth.pk)

    practica = auth.practica
    docente = practica.docente
    estudiante = auth.estudiante

    if not estudiante.correo:
        return False, 'El estudiante no tiene correo registrado.'
    if not (docente.email or '').strip():
        return False, 'Tu usuario no tiene correo registrado.'

    conexion, err = conexion_smtp_docente(docente)
    if err:
        return False, err

    asunto, cuerpo = _cuerpo_revocacion(auth, motivo)
    reply_to = [docente.email] if docente.email else []

    try:
        mensaje = EmailMessage(
            subject=asunto,
            body=cuerpo,
            from_email=_remitente_docente(docente),
            to=[estudiante.correo],
            reply_to=reply_to,
            connection=conexion,
        )
        mensaje.send(fail_silently=False)
        logger.info(
            'Revocación enviada: practica=%s estudiante=%s docente=%s',
            practica.id, estudiante.correo, docente.email,
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            'Error enviando revocación practica=%s estudiante=%s',
            practica.id, estudiante.correo,
        )
        return False, str(exc)
