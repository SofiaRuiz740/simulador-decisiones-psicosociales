"""Tests del acceso público estudiante (correo + código)."""

from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante
from apps.casos.models import Caso
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


class AccesoEstudianteAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc_acc',
            email='doc_acc@test.com',
            password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.caso = Caso.objects.create(nombre='Caso acceso', docente_creador=self.docente)
        self.est = Estudiante.objects.create(
            correo='estudiante@test.com',
            first_name='Est',
            last_name='Acceso',
            docente_creador=self.docente,
        )
        self.now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica activa',
            caso=self.caso,
            docente=self.docente,
            fecha_inicio=self.now - timedelta(hours=1),
            fecha_fin=self.now + timedelta(days=1),
            estado=Practica.Estado.EN_CURSO,
        )
        self.auth = AutorizacionEstudiante.objects.create(
            practica=self.practica,
            estudiante=self.est,
        )

    def test_acceso_ok_con_correo_y_codigo_validos(self):
        resp = self.client.post('/api/auth/estudiante-acceso/', {
            'correo': self.est.correo,
            'codigo': self.auth.codigo_acceso,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertEqual(resp.data['estudiante']['correo'], self.est.correo)

    def test_acceso_rechazado_si_practica_vencida(self):
        self.practica.fecha_fin = self.now - timedelta(minutes=5)
        self.practica.save(update_fields=['fecha_fin'])

        resp = self.client.post('/api/auth/estudiante-acceso/', {
            'correo': self.est.correo,
            'codigo': self.auth.codigo_acceso,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('non_field_errors', resp.data)
        self.assertIn('finalizó', resp.data['non_field_errors'][0].lower())
        self.practica.refresh_from_db()
        self.assertEqual(self.practica.estado, Practica.Estado.FINALIZADA)

    def test_acceso_rechazado_codigo_invalido(self):
        resp = self.client.post('/api/auth/estudiante-acceso/', {
            'correo': self.est.correo,
            'codigo': 'ZZZZZZZZ',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('non_field_errors', resp.data)
