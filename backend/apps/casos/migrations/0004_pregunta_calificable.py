"""Agrega Pregunta.calificable (default True para compatibilidad)."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('casos', '0003_caso_materia'),
    ]

    operations = [
        migrations.AddField(
            model_name='pregunta',
            name='calificable',
            field=models.BooleanField(
                default=True,
                help_text=(
                    'Si es False (preguntas narrativas, exploratorias o de '
                    'contexto): no afecta la nota ni el puntaje, pero sigue '
                    'mostrándose en la simulación. Default True para no '
                    'romper preguntas existentes.'
                ),
                verbose_name='calificable',
            ),
        ),
        migrations.AlterField(
            model_name='pregunta',
            name='criterio_rubrica_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text=(
                    'ID del criterio en Rubrica.criterios al que aporta esta '
                    'pregunta. Actúa como la "competencia" asociada (RF + '
                    'req. adicional 4).'
                ),
                max_length=40,
                verbose_name='criterio de rúbrica (competencia)',
            ),
        ),
    ]
