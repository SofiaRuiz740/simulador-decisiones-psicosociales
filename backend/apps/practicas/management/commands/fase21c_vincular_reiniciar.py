"""Fase 21C — Vincular docente Carla Morrison con estudiante y reiniciar progreso."""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.academico.models import Estudiante
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.practicas.reintento_services import reiniciar_practica_estudiante
from apps.usuarios.models import Usuario

ESTUDIANTE_CORREO = 'sofiayuliana30052007@gmail.com'
DOCENTE_CORREO = 'Carla@unihumboldt.edu.co'
DOCENTE_CORREO_LEGACY = 'carla1@unihumboldt.edu.co'
PRACTICA_ID = 3


class Command(BaseCommand):
    help = (
        'Vincula la práctica del estudiante con Carla Morrison y reinicia '
        'el progreso backend de simulación (participación + resultado narrativo).'
    )

    @transaction.atomic
    def handle(self, *args, **options):
        docente = (
            Usuario.objects.filter(rol=Usuario.Rol.DOCENTE, email__iexact=DOCENTE_CORREO).first()
            or Usuario.objects.filter(
                rol=Usuario.Rol.DOCENTE, email__iexact=DOCENTE_CORREO_LEGACY
            ).first()
        )
        if not docente:
            self.stderr.write(self.style.ERROR('No se encontró docente Carla Morrison.'))
            return

        if docente.email.lower() != DOCENTE_CORREO.lower():
            docente.email = DOCENTE_CORREO
            docente.save(update_fields=['email'])
            self.stdout.write(f'Correo docente actualizado → {DOCENTE_CORREO}')

        estudiante = Estudiante.objects.filter(correo__iexact=ESTUDIANTE_CORREO).first()
        if not estudiante:
            self.stderr.write(self.style.ERROR(f'Estudiante no encontrado: {ESTUDIANTE_CORREO}'))
            return

        practica = Practica.objects.select_related('docente').filter(pk=PRACTICA_ID).first()
        if not practica:
            self.stderr.write(self.style.ERROR(f'Práctica id={PRACTICA_ID} no encontrada.'))
            return

        docente_anterior_id = practica.docente_id
        practica.docente = docente
        practica.save(update_fields=['docente'])

        estudiante.docente_creador = docente
        estudiante.save(update_fields=['docente_creador'])
        estudiante.docentes.add(docente)

        auth = AutorizacionEstudiante.objects.filter(
            practica=practica, estudiante=estudiante
        ).first()
        if not auth:
            self.stderr.write(self.style.ERROR('Autorización estudiante-práctica no encontrada.'))
            return

        registro = reiniciar_practica_estudiante(
            auth,
            docente,
            motivo='Fase 21C — reinicio controlado Sofía Juliana',
        )

        self.stdout.write(self.style.SUCCESS('=== Fase 21C completada ==='))
        self.stdout.write(f'Docente: {docente.get_full_name()} ({docente.email}) id={docente.id}')
        self.stdout.write(f'Estudiante: {estudiante.nombre_completo} ({estudiante.correo}) id={estudiante.id}')
        self.stdout.write(f'Práctica {practica.id} "{practica.nombre}": docente {docente_anterior_id} → {docente.id}')
        self.stdout.write(f'Autorización id={auth.id} código={auth.codigo_acceso}')
        self.stdout.write(f'Reinicio registro id={registro.id} fecha={registro.fecha.isoformat()}')
        self.stdout.write(
            'LocalStorage del navegador: se limpiará al abrir la práctica '
            '(sincronización ultimo_reinicio_en).'
        )
