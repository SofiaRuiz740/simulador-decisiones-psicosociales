"""Tests RF32, RF47, RF48: tiempo límite y cierre de participaciones."""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import Estudiante
from apps.casos.models import Caso, Escenario, Pregunta, Respuesta
from apps.participaciones.models import Participacion
from apps.participaciones.services import (
    asegurar_tiempo_vigente,
    cerrar_practica,
    finalizar_participacion,
    tiempo_agotado,
)
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.resultados.models import Resultado
from apps.usuarios.models import Usuario


class TiempoParticipacionTests(TestCase):
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
        self.preg = Pregunta.objects.create(escenario=esc, orden=1, enunciado='P1', peso=10)
        self.resp = Respuesta.objects.create(
            pregunta=self.preg, orden=1, texto='R1', es_correcta=True,
        )
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica 1', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
            tiempo_max_min=1,
        )
        self.auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )
        self.part = Participacion.objects.create(
            practica=self.practica,
            estudiante=self.est,
            autorizacion=self.auth,
            inicio=timezone.now() - timedelta(minutes=2),
            estado=Participacion.Estado.EN_CURSO,
        )

    def test_tiempo_agotado_detecta_expiracion(self):
        self.assertTrue(tiempo_agotado(self.part))

    def test_responder_rechaza_si_tiempo_agotado(self):
        est_user = Usuario.objects.create_user(
            username='est1', email='est@test.com', password='pass',
            rol=Usuario.Rol.ESTUDIANTE,
        )
        self.est.usuario = est_user
        self.est.save()
        client = APIClient()
        client.force_authenticate(user=est_user)
        resp = client.post(
            f'/api/participaciones/{self.part.id}/responder/',
            {'pregunta_id': self.preg.id, 'respuesta_id': self.resp.id},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.part.refresh_from_db()
        self.assertEqual(self.part.estado, Participacion.Estado.INCOMPLETA)
        self.assertTrue(Resultado.objects.filter(participacion=self.part).exists())

    def test_finalizar_parcial_marca_incompleta(self):
        from apps.participaciones.models import RespuestaSeleccionada

        RespuestaSeleccionada.objects.create(
            participacion=self.part,
            pregunta=self.preg,
            respuesta_elegida=self.resp,
        )
        self.part.inicio = timezone.now()
        self.part.save(update_fields=['inicio'])
        resultado = finalizar_participacion(self.part)
        self.part.refresh_from_db()
        self.assertEqual(self.part.estado, Participacion.Estado.FINALIZADA)
        self.assertGreater(resultado.nota_final, Decimal('0'))

    def test_finalizar_sin_respuestas_marca_incompleta(self):
        self.part.inicio = timezone.now()
        self.part.save(update_fields=['inicio'])
        resultado = finalizar_participacion(self.part)
        self.part.refresh_from_db()
        self.assertEqual(self.part.estado, Participacion.Estado.INCOMPLETA)
        self.assertEqual(resultado.nota_final, Decimal('0.00'))


class CerrarPracticaTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est1 = Estudiante.objects.create(
            correo='e1@test.com', first_name='A', last_name='Uno',
            docente_creador=self.docente,
        )
        self.est2 = Estudiante.objects.create(
            correo='e2@test.com', first_name='B', last_name='Dos',
            docente_creador=self.docente,
        )
        self.caso = Caso.objects.create(
            nombre='Caso', docente_creador=self.docente, estado=Caso.Estado.VALIDADO,
        )
        esc = Escenario.objects.create(caso=self.caso, orden=1, titulo='E', narrativa='N')
        Pregunta.objects.create(escenario=esc, orden=1, enunciado='P', peso=10)
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='P', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        self.auth1 = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est1,
        )
        self.auth2 = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est2,
        )

    def test_cerrar_practica_nota_cero_sin_participar(self):
        cerrar_practica(self.practica)
        part = Participacion.objects.get(autorizacion=self.auth1)
        self.assertEqual(part.estado, Participacion.Estado.NO_INICIADA)
        self.assertEqual(part.resultado.nota_final, Decimal('0.00'))

    def test_cerrar_practica_finaliza_en_curso(self):
        part = Participacion.objects.create(
            practica=self.practica,
            estudiante=self.est2,
            autorizacion=self.auth2,
            inicio=timezone.now(),
            estado=Participacion.Estado.EN_CURSO,
        )
        cerrar_practica(self.practica)
        part.refresh_from_db()
        self.assertEqual(part.estado, Participacion.Estado.INCOMPLETA)
        self.assertTrue(hasattr(part, 'resultado'))
