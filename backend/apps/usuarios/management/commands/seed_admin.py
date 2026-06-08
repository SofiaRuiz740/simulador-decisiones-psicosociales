"""Crea o actualiza el administrador de plataforma (rol ADMIN + acceso Django Admin)."""

from django.core.management.base import BaseCommand
from decouple import config

from apps.usuarios.models import Usuario


class Command(BaseCommand):
    help = (
        'Crea o actualiza el usuario administrador con rol ADMIN, is_staff e is_superuser. '
        'Credenciales configurables vía ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD en .env'
    )

    def handle(self, *args, **options):
        username = config('ADMIN_USERNAME', default='admin')
        email = config('ADMIN_EMAIL', default='admin@simulador.local')
        password = config('ADMIN_PASSWORD', default='Admin123!')

        user, created = Usuario.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Admin',
                'last_name': 'Plataforma',
                'rol': Usuario.Rol.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            },
        )

        if not created:
            user.email = email
            user.rol = Usuario.Rol.ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True

        user.set_password(password)
        user.save()

        verb = 'Creado' if created else 'Actualizado'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} administrador: username="{username}" email="{email}" rol=ADMIN '
            f'(Django Admin + panel /admin en el frontend).',
        ))
        self.stdout.write(
            'Frontend: http://localhost:4200/auth/login → redirige a /admin\n'
            'Django Admin: http://localhost:8000/admin/',
        )
