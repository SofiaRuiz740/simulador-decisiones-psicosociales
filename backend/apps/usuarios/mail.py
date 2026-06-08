"""Conexión SMTP por docente (Gmail con su propia cuenta)."""

from __future__ import annotations

from django.conf import settings
from django.core.mail import get_connection

from apps.usuarios.models import Usuario


def conexion_smtp_docente(docente: Usuario):
    """
    Abre SMTP con el correo y clave del docente.
    Retorna (connection, error_mensaje).

    Modos:
    - Si EMAIL_BACKEND=console (modo dev sin Gmail real): se usa el backend de
      consola — el correo aparece en los logs del backend (`docker compose logs
      backend`), no se envía a internet, y NO se exige clave configurada.
    - Si EMAIL_BACKEND=smtp (modo producción): el docente debe tener una
      contraseña de aplicación Gmail guardada (Perfil → Correo para invitaciones).
    """
    if not (docente.email or '').strip():
        return None, 'Tu usuario no tiene correo registrado.'

    backend = settings.EMAIL_BACKEND
    # Modo dev: console backend explícito. Imprime el correo en logs y devuelve OK.
    if 'console' in backend:
        try:
            return get_connection(backend=backend), None
        except Exception as exc:  # noqa: BLE001
            return None, str(exc)

    clave = (docente.correo_smtp_password or '').strip()
    if not clave:
        return None, (
            'Configura la contraseña de aplicación Gmail de tu cuenta en '
            'Perfil → Correo para invitaciones (mismo Gmail con el que te registraste).'
        )

    host = settings.EMAIL_HOST or 'smtp.gmail.com'
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
