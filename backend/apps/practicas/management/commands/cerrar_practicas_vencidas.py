"""Management command: auto-finalizar prácticas cuya fecha_fin ya pasó (RN27).

Uso típico (cron / scheduler / cron de Docker):
    python manage.py cerrar_practicas_vencidas

Idempotente: solo cambia las que están en SIN_INICIAR o EN_CURSO. No toca las
FINALIZADAs o CANCELADAs. Cierra también las participaciones en curso usando
`cerrar_practica()` para que los estudiantes que quedaron a medias obtengan
un resultado consolidado.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.practicas.models import Practica


class Command(BaseCommand):
    help = (
        'Cierra automáticamente las prácticas cuya fecha_fin ya pasó y deja en '
        'estado FINALIZADA. Cierra también las participaciones colgadas. (RN27)'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo lista lo que se haría, sin tocar la BD.',
        )

    def handle(self, *args, **options):
        from apps.participaciones.services import cerrar_practica

        ahora = timezone.now()
        candidatas = Practica.objects.filter(
            fecha_fin__lt=ahora,
            estado__in=[Practica.Estado.SIN_INICIAR, Practica.Estado.EN_CURSO],
        ).select_related('caso')

        total = candidatas.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('Sin prácticas vencidas para cerrar.'))
            return

        accion = 'Se cerrarían' if options['dry_run'] else 'Cerrando'
        self.stdout.write(self.style.NOTICE(f'{accion} {total} práctica(s) vencida(s)…'))

        cerradas = 0
        for practica in candidatas:
            self.stdout.write(
                f'  · #{practica.id} "{practica.nombre}" '
                f'(fecha_fin={practica.fecha_fin:%Y-%m-%d %H:%M}, estado={practica.estado})',
            )
            if options['dry_run']:
                continue
            practica.estado = Practica.Estado.FINALIZADA
            practica.save(update_fields=['estado', 'fecha_actualizacion'])
            try:
                cerrar_practica(practica)
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(self.style.WARNING(
                    f'    aviso: no se pudo cerrar participaciones colgadas: {exc}',
                ))
            cerradas += 1

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f'Dry-run completado: {total} práctica(s) se habrían cerrado.',
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Listo: {cerradas} práctica(s) finalizadas automáticamente.',
            ))
