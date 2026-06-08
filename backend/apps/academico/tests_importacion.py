import io

from django.test import TestCase
from openpyxl import Workbook
from rest_framework.test import APITestCase

from apps.academico.importacion import importar_estudiantes, importar_grupos
from apps.academico.models import Estudiante, Grupo, InscripcionGrupo
from apps.usuarios.models import Usuario


def _xlsx_bytes(filas: list[list]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    for fila in filas:
        ws.append(fila)
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    buffer.name = 'datos.xlsx'
    return buffer


class ImportacionEstudiantesTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )

    def test_importar_estudiantes_crea_grupo_y_materia(self):
        archivo = _xlsx_bytes([
            ['nombre', 'correo', 'identificacion', 'materia', 'grupo'],
            ['Ana López', 'ana@test.com', '123', 'Psicología social', 'Grupo A'],
        ])
        stats = importar_estudiantes(archivo, self.docente)
        self.assertEqual(stats['filas_exitosas'], 1)
        self.assertEqual(stats['estudiantes_creados'], 1)
        self.assertEqual(stats['grupos_creados'], 1)
        self.assertEqual(stats['materias_creadas'], 1)
        self.assertEqual(InscripcionGrupo.objects.count(), 1)
        est = Estudiante.objects.get(correo='ana@test.com')
        self.assertEqual(est.identificacion, '123')
        self.assertTrue(self.docente.estudiantes.filter(pk=est.pk).exists())


class ImportacionGruposTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )

    def test_importar_grupos_con_estudiantes_por_correo(self):
        archivo = _xlsx_bytes([
            ['grupo', 'materia', 'periodo', 'estudiantes'],
            ['Grupo B', 'Ética profesional', '2026-1', 'luis@test.com; maria@test.com'],
        ])
        stats = importar_grupos(archivo, self.docente)
        self.assertEqual(stats['filas_exitosas'], 1)
        self.assertEqual(stats['grupos_creados'], 1)
        self.assertEqual(stats['estudiantes_creados'], 2)
        self.assertEqual(InscripcionGrupo.objects.count(), 2)
        grupo = Grupo.objects.get(nombre='Grupo B')
        self.assertEqual(grupo.periodo, '2026-1')
        self.assertEqual(grupo.materia.nombre, 'Ética profesional')


class ImportacionMasivaAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc3', email='doc3@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.client.force_authenticate(user=self.docente)

    def test_api_estudiantes_y_plantilla(self):
        archivo = _xlsx_bytes([
            ['nombre', 'correo', 'identificacion', 'materia', 'grupo'],
            ['Pedro Ruiz', 'pedro@test.com', '', 'Taller', 'G1'],
        ])
        resp = self.client.post(
            '/api/importacion/masiva/estudiantes/',
            {'archivo': archivo},
            format='multipart',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['estudiantes_creados'], 1)

        plantilla = self.client.get('/api/importacion/masiva/plantilla-estudiantes/')
        self.assertEqual(plantilla.status_code, 200)
        self.assertIn('spreadsheetml', plantilla['Content-Type'])
