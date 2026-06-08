"""Utilidades SMTP por docente."""

from apps.usuarios.models import Usuario


def guardar_clave_smtp_si_provista(user: Usuario, clave: str | None) -> bool:
    """Guarda la clave si viene en la petición. Retorna si el docente puede enviar correo."""
    if clave and str(clave).strip():
        user.correo_smtp_password = str(clave).strip()
        user.save(update_fields=['correo_smtp_password'])
    return user.correo_smtp_configurado
