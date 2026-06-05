"""Rúbrica avanzada: niveles, nota aprobación y criterio en preguntas."""

from django.db import migrations, models

import apps.casos.models


class Migration(migrations.Migration):

    dependencies = [
        ('casos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pregunta',
            name='criterio_rubrica_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='ID del criterio (en Rubrica.criterios) al que aporta esta pregunta.',
                max_length=40,
                verbose_name='criterio de rúbrica',
            ),
        ),
        migrations.AddField(
            model_name='rubrica',
            name='nota_aprobacion',
            field=models.DecimalField(
                decimal_places=2, default=60, max_digits=6,
                verbose_name='nota mínima de aprobación',
            ),
        ),
        migrations.AddField(
            model_name='rubrica',
            name='niveles_globales',
            field=models.JSONField(
                blank=True,
                default=apps.casos.models._niveles_default,
                help_text='Plantilla de niveles que se aplica a nuevos criterios.',
                verbose_name='plantilla de niveles',
            ),
        ),
        migrations.AlterField(
            model_name='rubrica',
            name='criterios',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista de criterios con niveles de desempeño. Ver docstring.',
                verbose_name='criterios',
            ),
        ),
    ]
