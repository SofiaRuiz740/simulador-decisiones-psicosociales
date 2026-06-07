from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.usuarios.models import Usuario


class SeedAdminManagementCommandTest(TestCase):
    def test_idempotent_update(self):
        call_command('seed_admin', stdout=StringIO())
        call_command('seed_admin', stdout=StringIO())
        self.assertEqual(Usuario.objects.filter(username='admin').count(), 1)
        user = Usuario.objects.get(username='admin')
        self.assertEqual(user.rol, Usuario.Rol.ADMIN)
