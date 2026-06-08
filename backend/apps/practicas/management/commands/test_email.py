"""Prueba el envío de correo con las credenciales SMTP del docente."""

from django.core.mail import EmailMessage
from django.core.management.base import BaseCommand, CommandError

from apps.usuarios.mail import conexion_smtp_docente
from apps.usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Envía un correo de prueba usando el Gmail configurado en el perfil del docente'

    def add_arguments(self, parser):
        parser.add_argument('email_docente', help='Correo del docente (usuario en la plataforma)')
        parser.add_argument(
            'destino',
            nargs='?',
            help='Correo destino (por defecto: el mismo docente)',
        )

    def handle(self, *args, **options):
        email_docente = options['email_docente'].strip().lower()
        try:
            docente = Usuario.objects.get(email__iexact=email_docente, rol=Usuario.Rol.DOCENTE)
        except Usuario.DoesNotExist as exc:
            raise CommandError(f'No hay docente con correo {email_docente}') from exc

        if not docente.correo_smtp_configurado:
            raise CommandError(
                'El docente no tiene configurada la contraseña Gmail. '
                'Menú usuario → Correo para invitaciones.'
            )

        destino = options['destino'] or docente.email
        conexion, err = conexion_smtp_docente(docente)
        if err:
            raise CommandError(err)

        msg = EmailMessage(
            subject='Prueba Simulador — invitaciones Gmail',
            body='Si recibes esto, tu cuenta Gmail está lista para enviar invitaciones a estudiantes.',
            from_email=f'"{docente.get_full_name() or docente.username}" <{docente.email}>',
            to=[destino],
            connection=conexion,
        )
        try:
            msg.send(fail_silently=False)
        except Exception as exc:
            raise CommandError(f'Error al enviar: {exc}') from exc

        self.stdout.write(self.style.SUCCESS(f'Correo enviado desde {docente.email} hacia {destino}'))
