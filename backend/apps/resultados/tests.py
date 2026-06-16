from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante, Grupo, InscripcionGrupo
from apps.casos.models import Caso, Escenario, Pregunta, Respuesta, Rubrica
from apps.participaciones.models import Participacion, RespuestaSeleccionada
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


# ---------------------------------------------------------------------------
# Tests para requisitos adicionales 1-7: calificable, cálculo, competencias,
# retroalimentación y endpoint detalle.
# ---------------------------------------------------------------------------


def _construir_caso_psicosocial(docente):
    """Caso con 3 preguntas calificables agrupadas en competencias + 1 no calificable."""
    caso = Caso.objects.create(
        nombre='Violencia intrafamiliar', docente_creador=docente,
        estado=Caso.Estado.VALIDADO,
    )
    Rubrica.objects.create(
        caso=caso,
        escala_maxima=5,
        nota_aprobacion=Decimal('3.0'),
        criterios=[
            {
                'id': 'activacion_rutas',
                'nombre': 'Activación de rutas',
                'peso': 0,
                'retroalimentacion': 'Se recomienda fortalecer los criterios para la activación oportuna de rutas institucionales.',
            },
            {
                'id': 'valoracion_riesgo',
                'nombre': 'Valoración de riesgo',
                'peso': 0,
                'retroalimentacion': 'Se recomienda profundizar en la valoración integral de factores de riesgo.',
            },
            {
                'id': 'medidas_proteccion',
                'nombre': 'Medidas de protección',
                'peso': 0,
                'retroalimentacion': 'Conviene reforzar la identificación y aplicación de medidas de protección.',
            },
        ],
    )
    esc = Escenario.objects.create(caso=caso, orden=1, titulo='Atención', narrativa='...')

    # P1 calificable - activacion_rutas
    p1 = Pregunta.objects.create(
        escenario=esc, orden=1, enunciado='¿Qué ruta activar?',
        peso=1, calificable=True, criterio_rubrica_id='activacion_rutas',
    )
    p1_correcta = Respuesta.objects.create(pregunta=p1, orden=1, texto='Ruta A', es_correcta=True)
    Respuesta.objects.create(pregunta=p1, orden=2, texto='Ninguna', es_correcta=False)

    # P2 calificable - valoracion_riesgo
    p2 = Pregunta.objects.create(
        escenario=esc, orden=2, enunciado='¿Cómo valorar el riesgo?',
        peso=1, calificable=True, criterio_rubrica_id='valoracion_riesgo',
    )
    p2_correcta = Respuesta.objects.create(pregunta=p2, orden=1, texto='Integral', es_correcta=True)
    Respuesta.objects.create(pregunta=p2, orden=2, texto='Solo físico', es_correcta=False)

    # P3 calificable - medidas_proteccion
    p3 = Pregunta.objects.create(
        escenario=esc, orden=3, enunciado='¿Qué medidas aplicar?',
        peso=1, calificable=True, criterio_rubrica_id='medidas_proteccion',
    )
    p3_correcta = Respuesta.objects.create(pregunta=p3, orden=1, texto='Protección integral', es_correcta=True)
    Respuesta.objects.create(pregunta=p3, orden=2, texto='Esperar', es_correcta=False)

    # P4 NO calificable (narrativa de contexto)
    p4 = Pregunta.objects.create(
        escenario=esc, orden=4, enunciado='¿Qué emociones percibes en el escenario?',
        peso=1, calificable=False, criterio_rubrica_id='',
    )
    Respuesta.objects.create(pregunta=p4, orden=1, texto='Miedo')
    Respuesta.objects.create(pregunta=p4, orden=2, texto='Ansiedad')

    return caso, [p1, p2, p3, p4], [p1_correcta, p2_correcta, p3_correcta]


class _BaseParticipacionFixture(TestCase):
    """Fixture compartido: caso, práctica y participación en curso."""

    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='docc', email='docc@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.est = Estudiante.objects.create(
            correo='evi@test.com', first_name='Eva', last_name='M',
            docente_creador=self.docente,
        )
        self.caso, self.preguntas, self.correctas = _construir_caso_psicosocial(self.docente)
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica V', caso=self.caso, docente=self.docente,
            fecha_inicio=now, fecha_fin=now + timedelta(days=1),
        )
        self.auth = AutorizacionEstudiante.objects.create(practica=self.practica, estudiante=self.est)
        self.part = Participacion.objects.create(
            practica=self.practica, estudiante=self.est, autorizacion=self.auth,
            inicio=now, fin=now,
            estado=Participacion.Estado.FINALIZADA,
        )

    def _responder(self, pregunta, respuesta):
        RespuestaSeleccionada.objects.create(
            participacion=self.part, pregunta=pregunta, respuesta_elegida=respuesta,
        )


class CalculoNotaTests(_BaseParticipacionFixture):
    """Req. 2 y 3: la fórmula es centralizada y excluye no calificables."""

    def test_100_aciertos_da_nota_maxima(self):
        # Responde las 3 calificables correctas + la no calificable cualquier cosa
        for preg, correcta in zip(self.preguntas[:3], self.correctas):
            self._responder(preg, correcta)
        # P4 no calificable: respondida pero su valor no afecta nota
        self._responder(self.preguntas[3], self.preguntas[3].respuestas.first())

        resultado = calcular_resultado(self.part)
        self.assertEqual(resultado.correctas, 3)
        self.assertEqual(resultado.incorrectas, 0)
        self.assertEqual(resultado.no_respondidas, 0)
        # 3 correctas / 3 calificables × escala_maxima 5 = 5.00
        self.assertEqual(resultado.nota_final, Decimal('5.00'))
        self.assertTrue(resultado.aprobado)

    def test_parcial_2_de_3_da_nota_proporcional(self):
        # 2 correctas, 1 incorrecta
        self._responder(self.preguntas[0], self.correctas[0])  # correcta
        self._responder(self.preguntas[1], self.correctas[1])  # correcta
        self._responder(self.preguntas[2], self.preguntas[2].respuestas.last())  # incorrecta

        resultado = calcular_resultado(self.part)
        self.assertEqual(resultado.correctas, 2)
        self.assertEqual(resultado.incorrectas, 1)
        # 2/3 × 5 = 3.333... -> 3.33
        self.assertEqual(resultado.nota_final, Decimal('3.33'))

    def test_todas_incorrectas_da_cero(self):
        for preg in self.preguntas[:3]:
            self._responder(preg, preg.respuestas.last())  # todas incorrectas

        resultado = calcular_resultado(self.part)
        self.assertEqual(resultado.correctas, 0)
        self.assertEqual(resultado.incorrectas, 3)
        self.assertEqual(resultado.nota_final, Decimal('0.00'))
        self.assertFalse(resultado.aprobado)

    def test_no_calificables_no_afectan_nota(self):
        """Si solo respondo 2 calificables + la no calificable (cualquiera),
        la nota debe basarse SOLO en las 3 calificables (1 sin responder)."""
        self._responder(self.preguntas[0], self.correctas[0])  # correcta
        self._responder(self.preguntas[1], self.correctas[1])  # correcta
        # No respondo la P3 (calificable)
        self._responder(self.preguntas[3], self.preguntas[3].respuestas.last())  # no calificable

        resultado = calcular_resultado(self.part)
        self.assertEqual(resultado.correctas, 2)
        self.assertEqual(resultado.incorrectas, 0)
        self.assertEqual(resultado.no_respondidas, 1)  # solo cuenta la calificable sin responder
        # 2/3 × 5 = 3.33
        self.assertEqual(resultado.nota_final, Decimal('3.33'))

    def test_caso_sin_calificables_no_rompe(self):
        # Marca todas como no calificables
        for p in self.preguntas:
            p.calificable = False
            p.save(update_fields=['calificable'])

        resultado = calcular_resultado(self.part)
        # No hay peso_total > 0 -> nota queda en 0 sin error
        self.assertEqual(resultado.nota_final, Decimal('0.00'))


class DetalleEndpointTests(APITestCase, _BaseParticipacionFixture):
    """Req. 5 y 6: panel docente y estudiante ven el detalle correcto."""

    def setUp(self):
        super().setUp()
        # Respondo: 2 correctas, 1 incorrecta, no respondo la 4 (no calificable)
        self._responder(self.preguntas[0], self.correctas[0])
        self._responder(self.preguntas[1], self.preguntas[1].respuestas.last())  # incorrecta
        self._responder(self.preguntas[2], self.correctas[2])
        self.resultado = calcular_resultado(self.part)
        # Usuario estudiante vinculado
        self.est.usuario = Usuario.objects.create_user(
            username='ev_usr', email=self.est.correo, password='pass',
            rol=Usuario.Rol.ESTUDIANTE,
        )
        self.est.save(update_fields=['usuario'])

    def test_docente_ve_detalle_completo_con_competencia(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.get(f'/api/resultados/{self.resultado.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        # Las 4 preguntas (3 calificables + 1 narrativa) aparecen
        self.assertEqual(len(data['detalle_preguntas']), 4)
        # Pregunta 2 (incorrecta): debe traer respuesta correcta + competencia +
        # retroalimentación pedagógica
        p2 = data['detalle_preguntas'][1]
        self.assertFalse(p2['es_acertada'])
        self.assertTrue(p2['calificable'])
        self.assertEqual(p2['competencia_id'], 'valoracion_riesgo')
        self.assertEqual(p2['competencia_nombre'], 'Valoración de riesgo')
        # Respuesta correcta visible para docente
        self.assertEqual(len(p2['respuestas_correctas']), 1)
        self.assertEqual(p2['respuestas_correctas'][0]['texto'], 'Integral')
        # Retroalimentación por competencia presente porque falló
        self.assertIn('retroalimentacion_competencia', p2)
        self.assertIn('valoración integral', p2['retroalimentacion_competencia'])
        # Pregunta 4 (no calificable) NO tiene retroalimentación por competencia
        p4 = data['detalle_preguntas'][3]
        self.assertFalse(p4['calificable'])
        self.assertNotIn('retroalimentacion_competencia', p4)
        # Resumen agregado de competencias: 3 (una por criterio rúbrica)
        self.assertEqual(len(data['competencias']), 3)

    def test_estudiante_ve_competencias_a_fortalecer(self):
        self.client.force_authenticate(user=self.est.usuario)
        resp = self.client.get(f'/api/resultados/{self.resultado.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        # Competencia donde acertó (activacion_rutas: 1/1) NO debe traer retroalimentación
        comps = {c['id']: c for c in data['competencias']}
        self.assertEqual(comps['activacion_rutas']['porcentaje'], 100.0)
        self.assertNotIn('retroalimentacion', comps['activacion_rutas'])
        # Competencia donde falló (valoracion_riesgo: 0/1) SI debe traer retroalimentación
        self.assertEqual(comps['valoracion_riesgo']['porcentaje'], 0.0)
        self.assertIn('retroalimentacion', comps['valoracion_riesgo'])
        self.assertIn(
            'valoración integral de factores de riesgo',
            comps['valoracion_riesgo']['retroalimentacion'],
        )
