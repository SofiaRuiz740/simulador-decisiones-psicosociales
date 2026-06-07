"""Conexión SMTP por docente (Gmail con su propia cuenta)."""

from __future__ import annotations

from django.conf import settings
from django.core.mail import get_connection

from apps.usuarios.models import Usuario


def conexion_smtp_docente(docente: Usuario):
    """
    Abre SMTP con el correo y clave del docente.
    Retorna (connection, error_mensaje).
    """
    if not (docente.email or '').strip():
        return None, 'Tu usuario no tiene correo registrado.'

    clave = (docente.correo_smtp_password or '').strip()
    if not clave:
        return None, (
            'Configura la contraseña de aplicación Gmail de tu cuenta en '
            'Perfil → Correo para invitaciones (mismo Gmail con el que te registraste).'
        )

    host = settings.EMAIL_HOST or 'smtp.gmail.com'
    backend = settings.EMAIL_BACKEND
    if 'console' in backend and host:
        backend = 'django.core.mail.backends.smtp.EmailBackend'

    try:
        conn = get_connection(
            backend=backend,
            host=host,
            port=settings.EMAIL_PORT,
            username=docente.email.strip(),
            password=clave,
            use_tls=settings.EMAIL_USE_TLS,
        )
        return conn, None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)
