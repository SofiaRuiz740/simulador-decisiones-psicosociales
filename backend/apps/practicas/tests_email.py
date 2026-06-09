"""Tests del envío de invitación por correo (RF28).

SMTP global del sistema — sin clave por docente.
"""

from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante
from apps.casos.models import Caso
from apps.practicas.email import enviar_invitacion_practica
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='Simulador <no-reply@simulador.local>',
    FRONTEND_URL='http://localhost:8080',
)
class InvitacionEmailTests(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.docente = Usuario.objects.create_user(
            username='doc_mail', email='docente@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE, first_name='Ana', last_name='Docente',
        )
        self.caso = Caso.objects.create(nombre='Caso mail', docente_creador=self.docente)
        self.est = Estudiante.objects.create(
            correo='estudiante@test.com', first_name='Pedro', last_name='Est',
            docente_creador=self.docente,
        )
        self.est.docentes.add(self.docente)
        now = timezone.now()
        self.practica = Practica.objects.create(
            nombre='Práctica mail',
            caso=self.caso,
            docente=self.docente,
            fecha_inicio=now,
            fecha_fin=now + timedelta(days=1),
            mensaje_personalizado='Buena suerte',
        )

    def test_invitacion_usa_smtp_global_y_docente_como_reply_to(self):
        auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )
        mail.outbox.clear()
        ok, err = enviar_invitacion_practica(auth, forzar=True)
        self.assertTrue(ok, err)
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.from_email, 'Simulador <no-reply@simulador.local>')
        self.assertEqual(msg.reply_to, ['docente@test.com'])
        self.assertEqual(msg.to, ['estudiante@test.com'])
        self.assertIn(auth.codigo_acceso, msg.body)
        # Asunto profesional según contrato
        self.assertEqual(msg.subject, 'Código de acceso para tu práctica asignada')
        # Versión HTML adjunta
        self.assertEqual(len(msg.alternatives), 1)
        html_body, mime = msg.alternatives[0]
        self.assertEqual(mime, 'text/html')
        self.assertIn(auth.codigo_acceso, html_body)
        self.assertIn('Práctica mail', html_body)
        self.assertIn('Pedro Est', html_body)
        # Marca como notificada
        auth.refresh_from_db()
        self.assertTrue(auth.notificado)

    def test_autorizar_envia_correo_automatico_via_signal(self):
        """Al crear AutorizacionEstudiante el signal dispara el correo (sin pasos extra)."""
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/autorizar-estudiantes/',
            {'estudiante_ids': [self.est.id]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['creadas'], 1)
        self.assertEqual(resp.data['correos_enviados'], 1)
        self.assertEqual(resp.data['correos_fallidos'], 0)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.est.correo, mail.outbox[0].to)

    def test_autorizar_no_requiere_clave_smtp(self):
        """Aunque el docente no tenga clave SMTP, la autorización envía igual."""
        self.docente.correo_smtp_password = ''
        self.docente.save(update_fields=['correo_smtp_password'])
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/autorizar-estudiantes/',
            {'estudiante_ids': [self.est.id]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['correos_enviados'], 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_no_duplica_correo_si_estudiante_ya_autorizado(self):
        """Asignar al mismo estudiante 2 veces no manda 2 correos."""
        self.client.force_authenticate(user=self.docente)
        body = {'estudiante_ids': [self.est.id]}
        url = f'/api/practicas/{self.practica.id}/autorizar-estudiantes/'

        r1 = self.client.post(url, body, format='json')
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post(url, body, format='json')
        self.assertEqual(r2.status_code, 200)
        # Segunda llamada no debió crear nada nuevo
        self.assertEqual(r2.data['creadas'], 0)
        # Solo un correo en total
        self.assertEqual(len(mail.outbox), 1)
        # Solo una autorización existe
        self.assertEqual(
            AutorizacionEstudiante.objects.filter(
                practica=self.practica, estudiante=self.est,
            ).count(),
            1,
        )

    def test_reenviar_invitacion_sin_pasos_extra(self):
        auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )
        mail.outbox.clear()
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/reenviar-invitacion/{auth.id}/',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(resp.data['notificado'])

    def test_estudiante_sin_correo_no_rompe(self):
        sin_correo = Estudiante.objects.create(
            correo='temporal@x.com', first_name='Sin', last_name='Correo',
            docente_creador=self.docente,
        )
        # Forzamos correo vacío saltando la validación normal del flujo.
        Estudiante.objects.filter(pk=sin_correo.pk).update(correo='')
        sin_correo.refresh_from_db()
        auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=sin_correo,
        )
        mail.outbox.clear()
        ok, err = enviar_invitacion_practica(auth, forzar=True)
        self.assertFalse(ok)
        self.assertIn('correo', err.lower())
        self.assertEqual(len(mail.outbox), 0)
