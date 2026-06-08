from django.db.models import Count
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory, APITestCase

from apps.academico.models import Estudiante, Grupo, InscripcionGrupo, Materia
from apps.academico.serializers import EstudianteListSerializer, MateriaSerializer
from apps.casos.models import Caso, Escenario, Pregunta
from apps.participaciones.models import Participacion
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.resultados.models import Resultado
from apps.usuarios.models import Usuario


class MateriaAPITests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.client.force_authenticate(user=self.docente)

    def test_crear_y_listar_materia(self):
        resp = self.client.post('/api/materias/', {
            'nombre': 'Psicología social',
            'programa': 'Lic. Psicología',
            'periodo': '2026-1',
            'activo': True,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['nombre'], 'Psicología social')

        lista = self.client.get('/api/materias/')
        self.assertEqual(lista.status_code, 200)
        self.assertEqual(lista.data['count'], 1)
        self.assertEqual(lista.data['results'][0]['grupos_count'], 0)


class EstudianteListSerializerTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est = Estudiante.objects.create(
            correo='est@test.com', first_name='Ana', last_name='López',
            docente_creador=self.docente,
        )
        self.est.docentes.add(self.docente)
        self.materia = Materia.objects.create(
            nombre='Psicología social', docente=self.docente, periodo='2026-1',
        )
        self.grupo = Grupo.objects.create(
            nombre='Grupo A', docente=self.docente, materia=self.materia,
        )
        InscripcionGrupo.objects.create(grupo=self.grupo, estudiante=self.est)

        caso = Caso.objects.create(
            nombre='Caso', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        esc = Escenario.objects.create(caso=caso, orden=1, titulo='E1', narrativa='N')
        Pregunta.objects.create(escenario=esc, orden=1, enunciado='P1')
        now = timezone.now()
        practica = Practica.objects.create(
            nombre='Práctica 1', caso=caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        auth = AutorizacionEstudiante.objects.create(practica=practica, estudiante=self.est)
        part = Participacion.objects.create(
            practica=practica, estudiante=self.est, autorizacion=auth,
            estado=Participacion.Estado.FINALIZADA,
        )
        Resultado.objects.create(
            participacion=part,
            correctas=1, incorrectas=0, no_respondidas=0,
            peso_obtenido=10, peso_total=10, nota_final=85.0, aprobado=True,
        )

    def _serialize(self, estudiante):
        request = self.factory.get('/api/estudiantes/')
        request.user = self.docente
        return EstudianteListSerializer(
            estudiante, context={'request': request},
        ).data

    def test_list_serializer_grupos_y_nota(self):
        data = self._serialize(self.est)
        self.assertEqual(data['grupos_display'], 'Grupo A')
        self.assertEqual(data['materia_display'], 'Psicología social')
        self.assertFalse(data['sin_grupo'])
        self.assertEqual(data['ultima_practica']['nombre'], 'Práctica 1')
        self.assertEqual(data['ultima_nota'], 85.0)

    def test_materia_serializer_cuenta_grupos(self):
        materia = Materia.objects.annotate(
            grupos_count=Count('grupos', distinct=True),
            estudiantes_count=Count('grupos__estudiantes', distinct=True),
        ).get(pk=self.materia.pk)
        data = MateriaSerializer(materia).data
        self.assertEqual(data['grupos_count'], 1)
        self.assertEqual(data['estudiantes_count'], 1)

    def test_sin_grupo_cuando_no_inscrito(self):
        otro = Estudiante.objects.create(
            correo='solo@test.com', first_name='Luis', last_name='Pérez',
            docente_creador=self.docente,
        )
        otro.docentes.add(self.docente)
        data = self._serialize(otro)
        self.assertTrue(data['sin_grupo'])
        self.assertIsNone(data['grupos_display'])
