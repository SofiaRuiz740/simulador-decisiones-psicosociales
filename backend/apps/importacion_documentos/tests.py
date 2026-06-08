from django.test import TestCase
from rest_framework.test import APITestCase

from apps.importacion_documentos.plantillas import (
    generar_caso_ejemplo,
    generar_guia_importacion,
    generar_plantilla_caso,
    generar_plantilla_rubrica,
)
from apps.usuarios.models import Usuario


class PlantillasImportacionTests(TestCase):
    def test_generadores_producen_bytes(self):
        self.assertTrue(generar_plantilla_caso().startswith(b'PK'))
        self.assertTrue(generar_caso_ejemplo().startswith(b'PK'))
        self.assertGreater(len(generar_plantilla_rubrica()), 100)
        self.assertTrue(generar_guia_importacion().startswith(b'%PDF'))


class PlantillasImportacionAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc_imp', email='doc_imp@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )

    def test_descarga_plantilla_caso(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/importacion/masiva/plantilla-caso/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('application/vnd.openxmlformats', resp['Content-Type'])
        self.assertTrue(resp.content.startswith(b'PK'))

    def test_descarga_guia_pdf(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get('/api/importacion/masiva/guia-importacion/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
