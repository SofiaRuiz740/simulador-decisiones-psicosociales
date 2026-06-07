from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0002_grupo_periodo_materia_grupo_materia_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='estudiante',
            name='identificacion',
            field=models.CharField(blank=True, max_length=50, verbose_name='identificación'),
        ),
    ]
