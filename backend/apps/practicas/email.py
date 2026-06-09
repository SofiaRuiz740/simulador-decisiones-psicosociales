"""Envío de invitaciones y notificaciones de prácticas (RF28, RN26).

Usa el SMTP global del sistema configurado en .env (DEFAULT_FROM_EMAIL +
EMAIL_HOST/USER/PASSWORD). No depende de la cuenta personal de cada docente.

El docente queda como `Reply-To` para que las respuestas del estudiante
lleguen directamente a él, sin necesidad de que el docente tenga Gmail con
verificación en 2 pasos ni contraseñas de aplicación.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape

from .models import AutorizacionEstudiante

logger = logging.getLogger(__name__)


def _nombre_docente(docente) -> str:
    return docente.get_full_name() or docente.username


def _reply_to(docente) -> list[str]:
    correo = (docente.email or '').strip()
    return [correo] if correo else []


def _cuerpos_invitacion(auth: AutorizacionEstudiante) -> tuple[str, str, str]:
    practica = auth.practica
    estudiante = auth.estudiante
    docente = practica.docente
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080').rstrip('/')
    enlace = f'{frontend}/estudiante'

    asunto = 'Código de acceso para tu práctica asignada'

    texto = (
        f'Hola {estudiante.nombre_completo},\n\n'
        f'{_nombre_docente(docente)} te ha asignado la práctica:\n'
        f'  • Práctica: {practica.nombre}\n'
        f'  • Caso: {practica.caso.nombre}\n'
        f'  • Inicio: {practica.fecha_inicio:%Y-%m-%d %H:%M}\n'
        f'  • Fin:    {practica.fecha_fin:%Y-%m-%d %H:%M}\n\n'
        f'Tu código de acceso es:\n\n'
        f'    {auth.codigo_acceso}\n\n'
        f'Con este código podrás ingresar al simulador y realizar la actividad.\n\n'
        f'Cómo ingresar:\n'
        f'  1. Abre {enlace}\n'
        f'  2. Usa tu correo: {estudiante.correo}\n'
        f'  3. Ingresa el código de acceso\n\n'
    )
    if practica.mensaje_personalizado:
        texto += f'Mensaje del docente:\n{practica.mensaje_personalizado}\n\n'
    texto += (
        f'Gracias.\n\n'
        f'—\n'
        f'Enviado por {_nombre_docente(docente)}'
    )

    mensaje_docente_html = ''
    if practica.mensaje_personalizado:
        mensaje_docente_html = (
            '<p style="margin:1em 0;padding:.75em 1em;background:#f5f5f5;'
            'border-left:3px solid #1e3a8a;font-size:.95em;">'
            f'<strong>Mensaje del docente:</strong><br>{escape(practica.mensaje_personalizado)}'
            '</p>'
        )

    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6fb;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;line-height:1.55;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <h1 style="margin:0;font-size:1.25rem;color:#1e3a8a;">Código de acceso a tu práctica</h1>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 1em;">Hola <strong>{escape(estudiante.nombre_completo)}</strong>,</p>
      <p style="margin:0 0 1em;">{escape(_nombre_docente(docente))} te ha asignado la siguiente práctica académica:</p>
      <ul style="margin:0 0 1.25em;padding-left:1.2em;">
        <li><strong>Práctica:</strong> {escape(practica.nombre)}</li>
        <li><strong>Caso:</strong> {escape(practica.caso.nombre)}</li>
        <li><strong>Inicio:</strong> {practica.fecha_inicio:%Y-%m-%d %H:%M}</li>
        <li><strong>Fin:</strong> {practica.fecha_fin:%Y-%m-%d %H:%M}</li>
      </ul>
      <p style="margin:0 0 .4em;">Tu código de acceso es:</p>
      <div style="font-family:'Courier New',monospace;font-size:1.6rem;letter-spacing:.18em;text-align:center;padding:14px 16px;background:#1e3a8a;color:#ffffff;border-radius:8px;margin:.4em 0 1.25em;">
        {escape(auth.codigo_acceso)}
      </div>
      <p style="margin:0 0 .6em;">Para ingresar:</p>
      <ol style="margin:0 0 1.25em;padding-left:1.2em;">
        <li>Abre <a href="{escape(enlace)}" style="color:#1e3a8a;">{escape(enlace)}</a></li>
        <li>Usa tu correo: <code>{escape(estudiante.correo)}</code></li>
        <li>Ingresa el código de acceso</li>
      </ol>
      {mensaje_docente_html}
      <p style="margin:1.5em 0 0;color:#6b7280;font-size:.85em;">Gracias.<br>Enviado por {escape(_nombre_docente(docente))}.</p>
    </td></tr>
  </table>
</body></html>"""

    return asunto, texto, html


def enviar_invitacion_practica(
    auth: AutorizacionEstudiante,
    *,
    forzar: bool = False,
) -> tuple[bool, str | None]:
    """Envía la invitación con el código de acceso al estudiante.

    - Si la autorización ya fue notificada y no se fuerza, devuelve OK sin reenviar.
    - Si falla, NO marca como notificada (queda pendiente).
    - El correo sale desde DEFAULT_FROM_EMAIL del sistema; el docente
      aparece como Reply-To.
    """
    if auth.notificado and not forzar:
        return True, None

    auth = AutorizacionEstudiante.objects.select_related(
        'estudiante', 'practica__docente', 'practica__caso',
    ).get(pk=auth.pk)

    estudiante = auth.estudiante
    practica = auth.practica
    docente = practica.docente

    if not estudiante.correo:
        return False, 'El estudiante no tiene correo registrado.'

    asunto, texto, html = _cuerpos_invitacion(auth)

    try:
        mensaje = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[estudiante.correo],
            reply_to=_reply_to(docente),
        )
        mensaje.attach_alternative(html, 'text/html')
        mensaje.send(fail_silently=False)
        AutorizacionEstudiante.objects.filter(pk=auth.pk).update(notificado=True)
        logger.info(
            'Invitación enviada: practica=%s estudiante=%s codigo=%s',
            practica.id, estudiante.correo, auth.codigo_acceso,
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            'Error enviando invitación practica=%s estudiante=%s',
            practica.id, estudiante.correo,
        )
        AutorizacionEstudiante.objects.filter(pk=auth.pk).update(notificado=False)
        return False, str(exc)


def _cuerpos_revocacion(auth: AutorizacionEstudiante, motivo: str) -> tuple[str, str, str]:
    practica = auth.practica
    estudiante = auth.estudiante
    docente = practica.docente

    asunto = f'Tu acceso a la práctica fue revocado: {practica.nombre}'

    texto = (
        f'Hola {estudiante.nombre_completo},\n\n'
        f'{_nombre_docente(docente)} retiró tu autorización para participar en la práctica:\n\n'
        f'  • Práctica: {practica.nombre}\n'
        f'  • Caso: {practica.caso.nombre}\n\n'
        f'Tu código de acceso ya no es válido.\n\n'
    )
    if motivo:
        texto += f'Motivo indicado por el docente:\n{motivo}\n\n'
    texto += (
        f'Si crees que esto es un error, contacta directamente a tu docente.\n\n'
        f'—\n'
        f'Enviado por {_nombre_docente(docente)}'
    )

    motivo_html = (
        f'<p style="margin:1em 0;padding:.75em 1em;background:#fff7ed;border-left:3px solid #d97706;font-size:.95em;">'
        f'<strong>Motivo del docente:</strong><br>{escape(motivo)}</p>'
        if motivo else ''
    )

    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6fb;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;line-height:1.55;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <h1 style="margin:0;font-size:1.2rem;color:#b91c1c;">Acceso a práctica revocado</h1>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 1em;">Hola <strong>{escape(estudiante.nombre_completo)}</strong>,</p>
      <p style="margin:0 0 1em;">{escape(_nombre_docente(docente))} retiró tu autorización para participar en la práctica <strong>{escape(practica.nombre)}</strong> ({escape(practica.caso.nombre)}).</p>
      <p style="margin:0 0 1em;">Tu código de acceso ya no es válido.</p>
      {motivo_html}
      <p style="margin:1.5em 0 0;color:#6b7280;font-size:.85em;">Si crees que esto es un error, contacta a tu docente.</p>
    </td></tr>
  </table>
</body></html>"""

    return asunto, texto, html


def enviar_revocacion_practica(
    auth: AutorizacionEstudiante,
    *,
    motivo: str = '',
) -> tuple[bool, str | None]:
    """Notifica al estudiante que su autorización fue revocada (RN26).

    Usa el SMTP global del sistema. La revocación ya quedó persistida en BD
    por el caller — esta función solo envía el correo.
    """
    auth = AutorizacionEstudiante.objects.select_related(
        'estudiante', 'practica__docente', 'practica__caso',
    ).get(pk=auth.pk)

    estudiante = auth.estudiante
    practica = auth.practica
    docente = practica.docente

    if not estudiante.correo:
        return False, 'El estudiante no tiene correo registrado.'

    asunto, texto, html = _cuerpos_revocacion(auth, motivo)

    try:
        mensaje = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[estudiante.correo],
            reply_to=_reply_to(docente),
        )
        mensaje.attach_alternative(html, 'text/html')
        mensaje.send(fail_silently=False)
        logger.info(
            'Revocación enviada: practica=%s estudiante=%s',
            practica.id, estudiante.correo,
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            'Error enviando revocación practica=%s estudiante=%s',
            practica.id, estudiante.correo,
        )
        return False, str(exc)
