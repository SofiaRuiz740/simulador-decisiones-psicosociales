"""Validaciones compartidas de la app academico."""

from rest_framework.exceptions import ValidationError

from apps.usuarios.models import Usuario

from .models import Materia


def validar_materia_docente(materia: Materia | None, user) -> Materia | None:
    """Comprueba que la materia pertenezca al docente actual (admin puede usar cualquiera)."""
    if materia is None:
        return None
    if user.rol == Usuario.Rol.ADMIN:
        return materia
    if materia.docente_id != user.id:
        raise ValidationError({'materia': 'La materia no pertenece a tu catálogo.'})
    return materia
