# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='correo_smtp_password',
            field=models.CharField(
                blank=True,
                help_text='Contraseña de aplicación Gmail del docente (misma cuenta que email).',
                max_length=128,
                verbose_name='clave SMTP del correo',
            ),
        ),
    ]
