from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.academico.models import Estudiante
from apps.casos.models import Caso, Escenario, Pregunta
from apps.participaciones.models import Participacion
from apps.participaciones.services import fila_seguimiento, metricas_seguimiento
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


class SeedAdminCommandTests(TestCase):
    def test_seed_admin_creates_admin_user(self):
        from django.core.management import call_command

        call_command('seed_admin')
        user = get_user_model().objects.get(username='admin')
        self.assertEqual(user.rol, Usuario.Rol.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('Admin123!'))


class SeguimientoParticipacionesTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est = Estudiante.objects.create(
            correo='est@test.com', first_name='Ana', last_name='López',
            docente_creador=self.docente,
        )
        self.est.docentes.add(self.docente)
        self.caso = Caso.objects.create(
            nombre='Caso test', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        esc = Escenario.objects.create(caso=self.caso, orden=1, titulo='E1', narrativa='N')
        Pregunta.objects.create(escenario=esc, orden=1, enunciado='P1')
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica 1', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        self.auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )

    def test_fila_autorizado_sin_participacion(self):
        row = fila_seguimiento(self.auth)
        self.assertIsNone(row['id'])
        self.assertEqual(row['estado'], Participacion.Estado.NO_INICIADA)
        self.assertEqual(row['estado_display'], 'Autorizado')
        self.assertEqual(row['respondidas'], 0)

    def test_metricas_cuentan_pendientes(self):
        m = metricas_seguimiento(self.docente)
        self.assertEqual(m['autorizados'], 1)
        self.assertEqual(m['pendientes'], 1)
