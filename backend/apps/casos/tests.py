from django.test import TestCase

from apps.casos.models import Caso, Escenario, Pregunta, Rubrica
from apps.casos.serializers import CasoListSerializer
from apps.casos.services import completitud_porcentaje
from apps.usuarios.models import Usuario


class CasoListSerializerTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc1', email='doc1@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )
        self.caso = Caso.objects.create(
            nombre='Caso A',
            area_psicosocial='Psicología clínica',
            docente_creador=self.docente,
        )
        esc = Escenario.objects.create(caso=self.caso, orden=1, titulo='E1', narrativa='N')
        Pregunta.objects.create(escenario=esc, orden=1, enunciado='P1')
        Rubrica.objects.create(
            caso=self.caso,
            criterios=[{'id': 'c1', 'nombre': 'C1', 'peso': 100, 'niveles': []}],
        )

    def test_list_serializer_incluye_agregados(self):
        from django.db.models import Count, Exists, OuterRef

        caso = Caso.objects.annotate(
            escenarios_count=Count('escenarios', distinct=True),
            preguntas_count=Count('escenarios__preguntas', distinct=True),
            tiene_rubrica=Exists(Rubrica.objects.filter(caso_id=OuterRef('pk'))),
        ).prefetch_related('rubrica').get(pk=self.caso.pk)

        data = CasoListSerializer(caso).data
        self.assertEqual(data['escenarios_count'], 1)
        self.assertEqual(data['preguntas_count'], 1)
        self.assertTrue(data['tiene_rubrica'])
        self.assertEqual(data['rubrica_resumen'], '1 criterio')
        self.assertEqual(data['materia_display'], 'Psicología clínica')
        self.assertGreaterEqual(data['completitud_pct'], 50)


class CompletitudPorcentajeTests(TestCase):
    def setUp(self):
        self.docente = Usuario.objects.create_user(
            username='doc2', email='doc2@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE,
        )

    def test_caso_vacio_tiene_baja_completitud(self):
        caso = Caso.objects.create(nombre='Vacío', docente_creador=self.docente)
        self.assertLess(completitud_porcentaje(caso), 30)
