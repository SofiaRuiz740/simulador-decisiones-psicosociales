from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Estudiante, Grupo
from apps.casos.models import Caso
from apps.practicas.email import enviar_invitacion_practica
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    EMAIL_USE_DOCENTE_FROM=True,
    FRONTEND_URL='http://localhost:4200',
)
class InvitacionEmailTests(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.docente = Usuario.objects.create_user(
            username='doc_mail', email='docente@test.com', password='pass',
            rol=Usuario.Rol.DOCENTE, first_name='Ana', last_name='Docente',
        )
        self.docente.correo_smtp_password = 'app-password-test'
        self.docente.save(update_fields=['correo_smtp_password'])
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

    def test_enviar_invitacion_desde_correo_docente(self):
        auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )
        mail.outbox.clear()
        ok, err = enviar_invitacion_practica(auth, forzar=True)
        self.assertTrue(ok, err)
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertIn('docente@test.com', msg.from_email)
        self.assertEqual(msg.to, ['estudiante@test.com'])
        self.assertIn(auth.codigo_acceso, msg.body)
        auth.refresh_from_db()
        self.assertTrue(auth.notificado)

    def test_autorizar_envia_correo_via_signal(self):
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/autorizar-estudiantes/',
            {'estudiante_ids': [self.est.id]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['correos_enviados'], 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_autorizar_sin_clave_smtp_falla(self):
        self.docente.correo_smtp_password = ''
        self.docente.save(update_fields=['correo_smtp_password'])
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/autorizar-estudiantes/',
            {'estudiante_ids': [self.est.id]},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('correo_smtp_password', resp.data)

    def test_autorizar_con_clave_en_peticion(self):
        self.docente.correo_smtp_password = ''
        self.docente.save(update_fields=['correo_smtp_password'])
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/autorizar-estudiantes/',
            {'estudiante_ids': [self.est.id], 'correo_smtp_password': 'app-password-test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['correos_enviados'], 1)
        self.docente.refresh_from_db()
        self.assertTrue(self.docente.correo_smtp_configurado)

    def test_reenviar_invitacion(self):
        auth = AutorizacionEstudiante.objects.create(
            practica=self.practica, estudiante=self.est,
        )
        mail.outbox.clear()
        self.client.force_authenticate(user=self.docente)
        resp = self.client.post(
            f'/api/practicas/{self.practica.id}/reenviar-invitacion/{auth.id}/',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(resp.data['notificado'])
