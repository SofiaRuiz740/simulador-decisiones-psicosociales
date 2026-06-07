from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.academico.models import Estudiante, Grupo, InscripcionGrupo
from apps.casos.models import Caso, Escenario, Pregunta
from apps.participaciones.models import Participacion
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.resultados.models import Resultado
from apps.resultados.serializers import ResultadoSerializer
from apps.resultados.services import calcular_resultado, notificar_resultado_estudiante
from apps.usuarios.models import Usuario


class ResultadoSerializerExtraFieldsTests(TestCase):
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
        self.grupo = Grupo.objects.create(nombre='G1', docente=self.docente)
        InscripcionGrupo.objects.create(grupo=self.grupo, estudiante=self.est)
        self.caso = Caso.objects.create(
            nombre='Caso', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        esc = Escenario.objects.create(caso=self.caso, orden=1, titulo='E', narrativa='N')
        Pregunta.objects.create(escenario=esc, orden=1, enunciado='P', peso=10)
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        auth = AutorizacionEstudiante.objects.create(practica=self.practica, estudiante=self.est)
        self.part = Participacion.objects.create(
            practica=self.practica,
            estudiante=self.est,
            autorizacion=auth,
            inicio=now,
            fin=now,
            tiempo_usado_seg=125,
            estado=Participacion.Estado.FINALIZADA,
        )
        self.resultado = calcular_resultado(self.part)

    def test_serializer_incluye_materia_grupo_tiempo(self):
        data = ResultadoSerializer(self.resultado).data
        self.assertEqual(data['grupos_display'], 'G1')
        self.assertEqual(data['tiempo_usado_seg'], 125)
        self.assertEqual(data['participacion_estado'], 'FINALIZADA')


class NotificarResultadoTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est = Estudiante.objects.create(
            correo='e2@test.com', first_name='B', last_name='Dos',
            docente_creador=self.docente,
        )
        caso = Caso.objects.create(
            nombre='C', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        now = timezone.now()
        practica = Practica.objects.create(
            nombre='P', caso=caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        auth = AutorizacionEstudiante.objects.create(practica=practica, estudiante=self.est)
        part = Participacion.objects.create(
            practica=practica, estudiante=self.est, autorizacion=auth,
            estado=Participacion.Estado.FINALIZADA,
        )
        self.resultado = Resultado.objects.create(
            participacion=part, nota_final=Decimal('80.00'), aprobado=True,
        )

    def test_notificar_marca_flag(self):
        from django.core import mail

        notificar_resultado_estudiante(self.resultado)
        self.resultado.refresh_from_db()
        self.assertTrue(self.resultado.notificado_estudiante)
        self.assertGreaterEqual(len(mail.outbox), 1)
