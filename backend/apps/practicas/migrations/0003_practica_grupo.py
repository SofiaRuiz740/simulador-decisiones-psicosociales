import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0003_estudiante_identificacion'),
        ('practicas', '0002_practica_materia'),
    ]

    operations = [
        migrations.AddField(
            model_name='practica',
            name='grupo',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='practicas',
                to='academico.grupo',
                verbose_name='grupo',
            ),
        ),
    ]
