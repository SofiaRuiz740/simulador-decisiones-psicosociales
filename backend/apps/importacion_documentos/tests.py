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

    def test_flujo_caso_docx_procesar_y_crear(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.importacion_documentos.plantillas import generar_caso_ejemplo

        self.client.force_authenticate(user=self.docente)
        docx = generar_caso_ejemplo()
        archivo = SimpleUploadedFile(
            'caso.docx',
            docx,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        subida = self.client.post('/api/importacion/', {'archivo': archivo}, format='multipart')
        self.assertEqual(subida.status_code, 201)
        af_id = subida.data['id']

        procesado = self.client.post(f'/api/importacion/{af_id}/procesar/', {})
        self.assertEqual(procesado.status_code, 200)
        self.assertIn('DATOS GENERALES', procesado.data['texto_extraido'])

        creado = self.client.post(
            f'/api/importacion/{af_id}/crear-caso/',
            {'nombre': 'Caso importado test', 'area_psicosocial': 'Convivencia'},
            format='json',
        )
        self.assertEqual(creado.status_code, 200)
        self.assertTrue(creado.data['estructura_detectada']['escenarios'] >= 1)
