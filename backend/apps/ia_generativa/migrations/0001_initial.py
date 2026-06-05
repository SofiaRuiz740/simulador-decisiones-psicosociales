"""Modelo inicial: PropuestaCasoIA."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('casos', '0002_rubrica_avanzada'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PropuestaCasoIA',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tema', models.CharField(max_length=300, verbose_name='tema')),
                ('objetivo_aprendizaje', models.TextField(verbose_name='objetivo de aprendizaje')),
                ('nivel_dificultad', models.CharField(default='medio', max_length=20, verbose_name='nivel de dificultad')),
                ('numero_escenarios', models.PositiveIntegerField(default=3, verbose_name='número de escenarios')),
                ('numero_preguntas_por_escenario', models.PositiveIntegerField(default=2, verbose_name='preguntas por escenario')),
                ('tono', models.CharField(blank=True, max_length=200, verbose_name='tono narrativo')),
                ('contenido_json', models.JSONField(
                    blank=True, default=dict,
                    help_text='Estructura completa generada por la IA (storytelling + escenarios + rúbrica).',
                    verbose_name='contenido generado',
                )),
                ('generada_con_llm', models.BooleanField(
                    default=False,
                    help_text='False cuando se usó el stub por falta de API key.',
                    verbose_name='generada con LLM real',
                )),
                ('estado', models.CharField(
                    choices=[
                        ('BORRADOR', 'Borrador'),
                        ('EN_REVISION', 'En revisión'),
                        ('APROBADO', 'Aprobado'),
                        ('RECHAZADO', 'Rechazado'),
                        ('CONVERTIDO_EN_CASO', 'Convertido en caso'),
                    ],
                    default='EN_REVISION', max_length=20, verbose_name='estado',
                )),
                ('motivo_rechazo', models.TextField(blank=True, verbose_name='motivo de rechazo')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('fecha_aprobacion', models.DateTimeField(blank=True, null=True, verbose_name='fecha de aprobación')),
                ('caso_resultante', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='propuestas_ia_origen',
                    to='casos.caso',
                    verbose_name='caso resultante',
                )),
                ('docente', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='propuestas_ia',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='docente',
                )),
            ],
            options={
                'verbose_name': 'Propuesta de caso IA',
                'verbose_name_plural': 'Propuestas de caso IA',
                'ordering': ['-fecha_creacion'],
            },
        ),
    ]
