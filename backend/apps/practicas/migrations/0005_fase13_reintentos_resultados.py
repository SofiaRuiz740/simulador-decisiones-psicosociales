# Generated manually for Fase 13

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0003_estudiante_identificacion'),
        ('practicas', '0004_autorizacion_revocada'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SolicitudReapertura',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado', models.CharField(
                    choices=[('PENDIENTE', 'Pendiente'), ('APROBADA', 'Aprobada'), ('RECHAZADA', 'Rechazada')],
                    default='PENDIENTE', max_length=20, verbose_name='estado',
                )),
                ('motivo', models.TextField(blank=True, verbose_name='motivo del estudiante')),
                ('mensaje_resolucion', models.TextField(blank=True, verbose_name='mensaje del docente')),
                ('fecha_solicitud', models.DateTimeField(auto_now_add=True)),
                ('fecha_resolucion', models.DateTimeField(blank=True, null=True)),
                ('autorizacion', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='solicitudes_reapertura',
                    to='practicas.autorizacionestudiante',
                )),
                ('docente_resolvio', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='solicitudes_reapertura_resueltas',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('estudiante', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='solicitudes_reapertura',
                    to='academico.estudiante',
                )),
                ('practica', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='solicitudes_reapertura',
                    to='practicas.practica',
                )),
            ],
            options={
                'verbose_name': 'Solicitud de reapertura',
                'verbose_name_plural': 'Solicitudes de reapertura',
                'ordering': ['-fecha_solicitud'],
            },
        ),
        migrations.CreateModel(
            name='RegistroReinicioPractica',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('alcance', models.CharField(
                    choices=[('INDIVIDUAL', 'Individual'), ('GLOBAL', 'Global')],
                    max_length=20, verbose_name='alcance',
                )),
                ('motivo', models.CharField(blank=True, max_length=300, verbose_name='motivo')),
                ('estudiantes_afectados', models.PositiveIntegerField(default=1, verbose_name='estudiantes afectados')),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('autorizacion', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='registros_reinicio',
                    to='practicas.autorizacionestudiante',
                )),
                ('docente', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='registros_reinicio_practica',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('estudiante', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='registros_reinicio',
                    to='academico.estudiante',
                )),
                ('practica', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registros_reinicio',
                    to='practicas.practica',
                )),
            ],
            options={
                'verbose_name': 'Registro de reinicio de práctica',
                'verbose_name_plural': 'Registros de reinicio de práctica',
                'ordering': ['-fecha'],
            },
        ),
        migrations.AddConstraint(
            model_name='solicitudreapertura',
            constraint=models.UniqueConstraint(
                condition=models.Q(('estado', 'PENDIENTE')),
                fields=('autorizacion',),
                name='unique_solicitud_reapertura_pendiente',
            ),
        ),
    ]
