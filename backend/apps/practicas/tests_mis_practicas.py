from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante
from apps.casos.models import Caso
from apps.participaciones.models import Participacion
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


class MisPracticasAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.estudiante_user = Usuario.objects.create_user(
            username='est_user', email='est@test.com', password='pass',
            rol=Usuario.Rol.ESTUDIANTE,
        )
        self.est = Estudiante.objects.create(
            correo='est@test.com', first_name='Ana', last_name='López',
            docente_creador=self.docente, usuario=self.estudiante_user,
        )
        self.caso = Caso.objects.create(
            nombre='Caso A', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica 1', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timezone.timedelta(days=1),
        )
        self.auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )

    def test_estudiante_lista_sus_practicas(self):
        self.client.force_authenticate(user=self.estudiante_user)
        resp = self.client.get('/api/practicas/mis-practicas/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['codigo_acceso'], self.auth.codigo_acceso)
        self.assertEqual(resp.data[0]['practica_nombre'], 'Práctica 1')

    def test_docente_no_puede_mis_practicas(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/practicas/mis-practicas/')
        self.assertEqual(resp.status_code, 403)


class AutorizacionesListAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est = Estudiante.objects.create(
            correo='e2@test.com', first_name='Luis', last_name='P',
            docente_creador=self.docente,
        )
        self.est.docentes.add(self.docente)
        caso = Caso.objects.create(nombre='C', docente_creador=self.docente)
        now = timezone.now()
        practica = Practica.objects.create(
            nombre='P1', caso=caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timezone.timedelta(days=1),
        )
        auth = AutorizacionEstudiante.objects.create(practica=practica, estudiante=self.est)
        Participacion.objects.create(
            practica=practica, estudiante=self.est,
            autorizacion=auth,
            estado=Participacion.Estado.EN_CURSO,
        )

    def test_docente_lista_autorizaciones(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/practicas/autorizaciones/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['asignacion_display'], 'En curso')
