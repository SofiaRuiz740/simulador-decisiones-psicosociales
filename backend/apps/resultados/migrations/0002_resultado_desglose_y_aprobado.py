"""Desglose por criterio y campo aprobado en Resultado."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resultados', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='resultado',
            name='aprobado',
            field=models.BooleanField(default=False, verbose_name='aprobado según rúbrica'),
        ),
        migrations.AddField(
            model_name='resultado',
            name='desglose_criterios',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    'Lista de objetos {criterio_id, nombre, peso, peso_obtenido, '
                    'peso_total, porcentaje, nivel_alcanzado} calculados a partir '
                    'de la rúbrica.'
                ),
                verbose_name='desglose por criterio de rúbrica',
            ),
        ),
    ]
