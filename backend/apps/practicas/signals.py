"""Signal: al crear una AutorizacionEstudiante, envía email con el código de acceso."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .email import enviar_invitacion_practica
from .models import AutorizacionEstudiante


@receiver(post_save, sender=AutorizacionEstudiante)
def notificar_estudiante(sender, instance: AutorizacionEstudiante, created: bool, **kwargs):
    if not created:
        return
    enviar_invitacion_practica(instance)
