"""Prueba el SMTP global del sistema enviando un correo de validación.

Uso:
    docker compose exec backend python manage.py test_email correo@ejemplo.com
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Envía un correo de prueba con el SMTP global del sistema.'

    def add_arguments(self, parser):
        parser.add_argument('destino', help='Correo destino del mensaje de prueba.')

    def handle(self, *args, **options):
        destino = options['destino'].strip().lower()
        if '@' not in destino:
            raise CommandError(f'"{destino}" no parece un correo válido.')

        asunto = 'Prueba SMTP — Simulador'
        cuerpo = (
            'Si recibes este mensaje, el SMTP global del sistema está configurado correctamente.\n'
            f'Remitente: {settings.DEFAULT_FROM_EMAIL}\n'
            f'Backend:   {settings.EMAIL_BACKEND}\n'
        )
        try:
            EmailMultiAlternatives(
                subject=asunto,
                body=cuerpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destino],
            ).send(fail_silently=False)
        except Exception as exc:
            raise CommandError(f'Error al enviar: {exc}') from exc

        self.stdout.write(self.style.SUCCESS(
            f'Correo enviado a {destino} usando {settings.EMAIL_BACKEND}.'
        ))
