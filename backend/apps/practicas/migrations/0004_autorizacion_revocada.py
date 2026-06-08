from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('practicas', '0003_practica_grupo'),
    ]

    operations = [
        migrations.AddField(
            model_name='autorizacionestudiante',
            name='revocada',
            field=models.BooleanField(default=False, verbose_name='autorización revocada'),
        ),
        migrations.AddField(
            model_name='autorizacionestudiante',
            name='revocada_en',
            field=models.DateTimeField(blank=True, null=True, verbose_name='fecha de revocación'),
        ),
        migrations.AddField(
            model_name='autorizacionestudiante',
            name='revocada_motivo',
            field=models.CharField(blank=True, max_length=300, verbose_name='motivo de revocación'),
        ),
    ]
