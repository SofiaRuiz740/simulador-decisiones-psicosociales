# Generated manually for Fase 13

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0003_estudiante_identificacion'),
        ('practicas', '0005_fase13_reintentos_resultados'),
        ('resultados', '0002_resultado_desglose_y_aprobado'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResultadoNarrativo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('porcentaje', models.PositiveIntegerField(default=0, verbose_name='porcentaje de avance')),
                ('entrevistas_realizadas', models.PositiveIntegerField(default=0)),
                ('entrevistas_totales', models.PositiveIntegerField(default=0)),
                ('evidencias_encontradas', models.PositiveIntegerField(default=0)),
                ('contradicciones_detectadas', models.PositiveIntegerField(default=0)),
                ('hipotesis_formuladas', models.PositiveIntegerField(default=0)),
                ('estado_final', models.CharField(default='completada', max_length=40, verbose_name='estado final')),
                ('fortalezas', models.JSONField(blank=True, default=list, verbose_name='fortalezas')),
                ('aspectos_mejorar', models.JSONField(blank=True, default=list, verbose_name='aspectos por mejorar')),
                ('resumen_pedagogico', models.JSONField(blank=True, default=dict, verbose_name='resumen pedagógico')),
                ('fecha_finalizacion', models.DateTimeField(verbose_name='fecha de finalización')),
                ('autorizacion', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resultado_narrativo',
                    to='practicas.autorizacionestudiante',
                )),
                ('estudiante', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resultados_narrativos',
                    to='academico.estudiante',
                )),
                ('practica', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resultados_narrativos',
                    to='practicas.practica',
                )),
            ],
            options={
                'verbose_name': 'Resultado narrativo',
                'verbose_name_plural': 'Resultados narrativos',
                'ordering': ['-fecha_finalizacion'],
            },
        ),
    ]
