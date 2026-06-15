"""Crea (si no existe) el "Caso por defecto" asociado a la simulación narrativa
visual "Violencia intrafamiliar".

Este caso tiene un PK fijo (DEFAULT_CASO_NARRATIVO_ID) para que el frontend pueda
mapearlo de forma estable a la narrativa con `MAPEO_CASO_BACKEND` en
`caso-narrativo.util.ts`. Se ejecuta en cada despliegue (idempotente) desde
`start.sh`, igual que `seed_admin`.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.casos.constants import DEFAULT_CASO_NARRATIVO_ID
from apps.casos.models import Caso, Escenario, Pregunta, Respuesta, Rubrica


class Command(BaseCommand):
    help = 'Crea el caso por defecto asociado a la simulación narrativa "Violencia intrafamiliar".'

    @transaction.atomic
    def handle(self, *args, **options):
        Usuario = get_user_model()

        if Caso.objects.filter(pk=DEFAULT_CASO_NARRATIVO_ID).exists():
            self.stdout.write(self.style.SUCCESS(
                f'El caso por defecto (id={DEFAULT_CASO_NARRATIVO_ID}) ya existe. Nada que hacer.',
            ))
            return

        # Docente "propietario" del caso compartido: el admin sembrado por seed_admin,
        # o el primer admin/docente que exista.
        docente = (
            Usuario.objects.filter(username='admin').first()
            or Usuario.objects.filter(is_superuser=True).first()
            or Usuario.objects.filter(rol='DOCENTE').first()
        )
        if docente is None:
            self.stdout.write(self.style.WARNING(
                'No hay ningún usuario admin/docente todavía; se omite la siembra del '
                'caso por defecto (se reintentará en el próximo despliegue).',
            ))
            return

        caso = Caso.objects.create(
            id=DEFAULT_CASO_NARRATIVO_ID,
            nombre='Violencia intrafamiliar (caso por defecto)',
            descripcion=(
                'Caso por defecto asociado a la simulación narrativa visual '
                '"Violencia intrafamiliar". Disponible para cualquier docente.'
            ),
            desarrollo_situacional=(
                'Un/a estudiante de psicología social realiza su práctica en el área de '
                'urgencias del Hospital San Juan de Dios, donde debe atender un caso de '
                'violencia intrafamiliar siguiendo el protocolo de atención en crisis.'
            ),
            contexto_historia=(
                'Simulación narrativa visual: Hospital San Juan De Dios — urgencias. '
                'El/la estudiante recorre escenas, conversaciones con personajes y toma '
                'decisiones que afectan el desarrollo del caso.'
            ),
            area_psicosocial='Crisis y protección',
            tiempo_estimado_min=30,
            estado=Caso.Estado.VALIDADO,
            docente_creador=docente,
        )

        escenario = Escenario.objects.create(
            caso=caso,
            orden=1,
            titulo='Atención inicial en urgencias',
            narrativa=(
                'La simulación narrativa visual completa (escenas, personajes, diálogos '
                'y decisiones) se reproduce desde el contenido de '
                '"violencia-intrafamiliar".'
            ),
        )

        pregunta = Pregunta.objects.create(
            escenario=escenario,
            orden=1,
            enunciado='¿Cuál es la primera acción recomendada al recibir el caso?',
            peso=1,
        )

        Respuesta.objects.create(
            pregunta=pregunta,
            orden=1,
            texto='Garantizar la seguridad e integridad de la persona afectada.',
            es_correcta=True,
            justificacion='La protección inmediata es prioritaria en cualquier protocolo de crisis.',
            retroalimentacion='Correcto: la seguridad de la persona siempre es lo primero.',
        )
        Respuesta.objects.create(
            pregunta=pregunta,
            orden=2,
            texto='Pedir a la persona que vuelva en otro momento.',
            es_correcta=False,
            justificacion='Postergar la atención puede agravar el riesgo.',
            retroalimentacion='Incorrecto: nunca se debe postergar la atención en un caso de riesgo.',
        )

        Rubrica.objects.create(
            caso=caso,
            descripcion='Rúbrica del caso por defecto (simulación narrativa visual).',
            criterios=[
                {
                    'id': 'c1',
                    'nombre': 'Toma de decisiones',
                    'descripcion': 'Calidad de las decisiones tomadas durante la simulación.',
                    'peso': 100,
                    'niveles': [
                        {'nivel': 1, 'nombre': 'Incipiente', 'descriptor': ''},
                        {'nivel': 2, 'nombre': 'En desarrollo', 'descriptor': ''},
                        {'nivel': 3, 'nombre': 'Logrado', 'descriptor': ''},
                        {'nivel': 4, 'nombre': 'Sobresaliente', 'descriptor': ''},
                    ],
                },
            ],
        )

        self.stdout.write(self.style.SUCCESS(
            f'Caso por defecto creado (id={caso.id}) y asociado a la simulación '
            'narrativa "violencia-intrafamiliar".',
        ))
