from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante, Grupo
from apps.casos.models import Caso
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


class PracticaGrupoAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc_prac', email='doc_prac@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.caso = Caso.objects.create(nombre='Caso G', docente_creador=self.docente)
        self.grupo = Grupo.objects.create(nombre='Grupo X', docente=self.docente)
        self.est = Estudiante.objects.create(
            correo='est_g@test.com', first_name='Est', last_name='G',
            docente_creador=self.docente,
        )
        self.est.docentes.add(self.docente)
        self.grupo.estudiantes.add(self.est)
        self.now = timezone.now()

    def test_crear_practica_con_grupo_autoriza_estudiantes(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post('/api/practicas/', {
            'nombre': 'Práctica grupo',
            'caso': self.caso.id,
            'grupo': self.grupo.id,
            'fecha_inicio': self.now.isoformat(),
            'fecha_fin': (self.now + timedelta(days=1)).isoformat(),
            'tiempo_max_min': 30,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['grupos_display'], 'Grupo X')
        practica = Practica.objects.get(pk=resp.data['id'])
        self.assertEqual(practica.grupo_id, self.grupo.id)
        self.assertEqual(
            AutorizacionEstudiante.objects.filter(practica=practica).count(),
            1,
        )
