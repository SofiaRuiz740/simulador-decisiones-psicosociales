from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante, Grupo, Materia
from apps.casos.models import Caso
from apps.practicas.models import Practica
from apps.reportes.services import eventos_actividad
from apps.usuarios.models import Usuario


class EventosActividadTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.admin = Usuario.objects.create_user(
            username='admin', email='admin@test.com', password='pass',
            rol=Usuario.Rol.ADMIN,
        )

    def test_eventos_incluyen_creaciones_recientes(self):
        Caso.objects.create(nombre='Caso A', docente_creador=self.docente)
        Materia.objects.create(nombre='Psicología', docente=self.docente)
        eventos = eventos_actividad(limit=10)
        tipos = {e['tipo'] for e in eventos}
        self.assertIn('CASO_CREADO', tipos)
        self.assertIn('MATERIA_CREADA', tipos)


class AdminDocentesAPITests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin', email='admin@test.com', password='pass',
            rol=Usuario.Rol.ADMIN,
        )
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        est = Estudiante.objects.create(
            correo='est@test.com', first_name='Ana', last_name='L',
            docente_creador=self.docente,
        )
        est.docentes.add(self.docente)
        Grupo.objects.create(nombre='G1', docente=self.docente)
        Materia.objects.create(nombre='M1', docente=self.docente)
        Caso.objects.create(nombre='C1', docente_creador=self.docente)
        now = timezone.now()
        Practica.objects.create(
            nombre='P1',
            caso=Caso.objects.get(nombre='C1'),
            docente=self.docente,
            fecha_inicio=now,
            fecha_fin=now,
        )

    def test_solo_admin_lista_docentes(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/reportes/admin/docentes/')
        self.assertEqual(resp.status_code, 403)

    def test_admin_ve_conteos_docente(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/reportes/admin/docentes/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        row = resp.data[0]
        self.assertEqual(row['email'], 'doc1@test.com')
        self.assertEqual(row['casos_count'], 1)
        self.assertEqual(row['practicas_count'], 1)
        self.assertEqual(row['estudiantes_count'], 1)
        self.assertEqual(row['grupos_count'], 1)
        self.assertEqual(row['materias_count'], 1)


class AdminActividadAPITests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin2', email='admin2@test.com', password='pass',
            rol=Usuario.Rol.ADMIN,
        )
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        Caso.objects.create(nombre='Caso reciente', docente_creador=self.docente)

    def test_actividad_limitada(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/reportes/admin/actividad/?limit=5')
        self.assertEqual(resp.status_code, 200)
        self.assertLessEqual(len(resp.data), 5)
        self.assertTrue(any(e['tipo'] == 'CASO_CREADO' for e in resp.data))


class DocenteReportesAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc3', email='doc3@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.otro = Usuario.objects.create_user(
            username='doc4', email='doc4@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.admin = Usuario.objects.create_user(
            username='admin3', email='admin3@test.com', password='pass',
            rol=Usuario.Rol.ADMIN,
        )
        self.grupo = Grupo.objects.create(nombre='G-doc', docente=self.docente)
        Materia.objects.create(nombre='M-doc', docente=self.docente)
        Caso.objects.create(nombre='C-doc', docente_creador=self.docente)

    def test_docente_metricas(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/reportes/docente/metricas/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['casos'], 1)
        self.assertIn('feedback_pendiente', resp.data)

    def test_docente_actividad_solo_suyo(self):
        Caso.objects.create(nombre='C-otro', docente_creador=self.otro)
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/reportes/docente/actividad/?limit=20')
        self.assertEqual(resp.status_code, 200)
        titulos = [e['titulo'] for e in resp.data]
        self.assertTrue(any('C-doc' in t for t in titulos))
        self.assertFalse(any('C-otro' in t for t in titulos))

    def test_resumen_reportes_docente(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/reportes/resumen/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('exportaciones', resp.data)
        self.assertIn('sin_feedback', resp.data)

    def test_grupo_pdf_requiere_propiedad(self):
        self.client.force_authenticate(user=self.otro)
        resp = self.client.get(f'/api/reportes/grupo/{self.grupo.id}/pdf/')
        self.assertEqual(resp.status_code, 403)

    def test_admin_accede_reportes(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/reportes/analitica/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('desempeno_criterios', resp.data)
        self.assertIn('distribucion_notas', resp.data)
