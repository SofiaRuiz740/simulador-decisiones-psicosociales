"""ViewSets de prácticas + endpoint público de acceso del estudiante."""

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import AutorizacionEstudiante, Practica
from .serializers import (
    AccesoEstudianteSerializer,
    AutorizacionListSerializer,
    AutorizacionSerializer,
    AutorizarEstudiantesSerializer,
    MisPracticaEstudianteSerializer,
    PracticaDetalleSerializer,
    PracticaListSerializer,
)
from .services import (
    autorizar_estudiantes_en_practica,
    listar_autorizaciones_docente,
    listar_mis_practicas,
    sincronizar_practica_vencida,
)


class PracticaViewSet(viewsets.ModelViewSet):
    permission_classes = [EsDocenteOAdmin]

    def get_permissions(self):
        if self.action == 'mis_practicas':
            return [IsAuthenticated()]
        return [EsDocenteOAdmin()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PracticaDetalleSerializer
        return PracticaListSerializer

    def get_queryset(self):
        qs = Practica.objects.select_related(
            'caso', 'caso__materia', 'materia', 'grupo', 'docente',
        ).prefetch_related(
            'autorizaciones__estudiante',
        )
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(docente=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        practica = serializer.save(docente=self.request.user)
        if practica.grupo_id:
            autorizar_estudiantes_en_practica(
                practica,
                self.request.user,
                grupo_ids=[practica.grupo_id],
            )

    @action(detail=False, methods=['get'], url_path='mis-practicas')
    def mis_practicas(self, request):
        """Prácticas autorizadas para el estudiante autenticado."""
        if request.user.rol != Usuario.Rol.ESTUDIANTE:
            raise PermissionDenied('Solo estudiantes pueden consultar sus prácticas.')
        estudiante = getattr(request.user, 'perfil_estudiante', None)
        if estudiante is None:
            raise ValidationError('No hay perfil de estudiante vinculado a esta cuenta.')
        rows = listar_mis_practicas(estudiante)
        return Response(MisPracticaEstudianteSerializer(rows, many=True).data)

    @action(detail=False, methods=['get'], url_path='autorizaciones')
    def autorizaciones(self, request):
        """Listado global de autorizaciones (docente/admin)."""
        practica_id = request.query_params.get('practica')
        rows = listar_autorizaciones_docente(request.user, practica_id=practica_id)
        return Response(AutorizacionListSerializer(rows, many=True).data)

    @action(detail=True, methods=['post'], url_path='autorizar-estudiantes')
    @transaction.atomic
    def autorizar_estudiantes(self, request, pk=None):
        """Autoriza estudiantes (por IDs y/o por grupos) generando códigos de acceso."""
        practica: Practica = self.get_object()
        ser = AutorizarEstudiantesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        creadas = autorizar_estudiantes_en_practica(
            practica,
            request.user,
            estudiante_ids=ser.validated_data.get('estudiante_ids') or [],
            grupo_ids=ser.validated_data.get('grupo_ids') or [],
        )

        if creadas:
            enviados = AutorizacionEstudiante.objects.filter(
                pk__in=[a.pk for a in creadas], notificado=True,
            ).count()
        else:
            enviados = 0

        return Response({
            'creadas': len(creadas),
            'correos_enviados': enviados,
            'correos_fallidos': len(creadas) - enviados,
            'autorizaciones': AutorizacionSerializer(
                practica.autorizaciones.select_related('estudiante').all(), many=True,
            ).data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='iniciar')
    def iniciar(self, request, pk=None):
        practica: Practica = self.get_object()
        practica.estado = Practica.Estado.EN_CURSO
        practica.save(update_fields=['estado', 'fecha_actualizacion'])
        return Response(PracticaDetalleSerializer(practica).data)

    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        from apps.participaciones.services import cerrar_practica

        practica: Practica = self.get_object()
        practica.estado = Practica.Estado.FINALIZADA
        practica.save(update_fields=['estado', 'fecha_actualizacion'])
        cerrar_practica(practica)
        return Response(PracticaDetalleSerializer(practica).data)

    @action(detail=True, methods=['post'], url_path='autorizar-reintento/(?P<autorizacion_id>[^/.]+)')
    def autorizar_reintento(self, request, pk=None, autorizacion_id=None):
        practica: Practica = self.get_object()
        try:
            auth = practica.autorizaciones.get(pk=autorizacion_id)
        except AutorizacionEstudiante.DoesNotExist:
            raise ValidationError('Autorización no encontrada en esta práctica.')
        auth.reintento_autorizado = True
        auth.save(update_fields=['reintento_autorizado'])
        return Response(AutorizacionSerializer(auth).data)

    @action(
        detail=True,
        methods=['post'],
        url_path='desautorizar-estudiante/(?P<autorizacion_id>[^/.]+)',
    )
    def desautorizar_estudiante(self, request, pk=None, autorizacion_id=None):
        """Revoca la autorización de un estudiante en la práctica (RN26).

        Body opcional: { "motivo": "...", "correo_smtp_password": "..." }
        Envía notificación al estudiante usando el SMTP del docente. Si el
        SMTP no está configurado, la revocación queda guardada igual y se
        devuelve `email_enviado: false` para que la UI lo informe.
        """
        from .email import enviar_revocacion_practica

        practica: Practica = self.get_object()
        try:
            auth = practica.autorizaciones.get(pk=autorizacion_id)
        except AutorizacionEstudiante.DoesNotExist:
            raise ValidationError('Autorización no encontrada en esta práctica.')

        if auth.revocada:
            raise ValidationError('Esta autorización ya estaba revocada.')

        motivo = (request.data.get('motivo') or '').strip()[:300]

        auth.revocada = True
        auth.revocada_en = timezone.now()
        auth.revocada_motivo = motivo
        auth.save(update_fields=['revocada', 'revocada_en', 'revocada_motivo'])

        email_enviado, email_error = enviar_revocacion_practica(auth, motivo=motivo)

        return Response({
            'autorizacion': AutorizacionSerializer(auth).data,
            'email_enviado': email_enviado,
            'email_error': email_error if not email_enviado else None,
        })

    @action(detail=True, methods=['post'], url_path='reenviar-invitacion/(?P<autorizacion_id>[^/.]+)')
    def reenviar_invitacion(self, request, pk=None, autorizacion_id=None):
        """Reenvía el correo de invitación al estudiante."""
        from .email import enviar_invitacion_practica

        practica: Practica = self.get_object()
        try:
            auth = practica.autorizaciones.get(pk=autorizacion_id)
        except AutorizacionEstudiante.DoesNotExist:
            raise ValidationError('Autorización no encontrada en esta práctica.')

        ok, error = enviar_invitacion_practica(auth, forzar=True)
        if not ok:
            raise ValidationError(error or 'No se pudo enviar el correo de invitación.')

        auth.refresh_from_db()
        return Response(AutorizacionSerializer(auth).data)


class AccesoEstudianteView(generics.GenericAPIView):
    """
    Acceso público para estudiantes con correo + código (RF30, RF31).

    Valida:
    - Que el correo esté registrado y tenga autorización para una práctica con
      el código provisto.
    - Que la práctica no esté cancelada ni finalizada (RN15).

    Devuelve datos básicos del estudiante + práctica + un token de acceso
    (JWT efímero limitado al estudiante). El frontend usa el token para
    consumir endpoints de participación.
    """

    permission_classes = [AllowAny]
    serializer_class = AccesoEstudianteSerializer

    def post(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        auth: AutorizacionEstudiante = ser.validated_data['autorizacion']
        practica = auth.practica

        sincronizar_practica_vencida(practica)
        practica.refresh_from_db(fields=['estado', 'fecha_fin', 'fecha_actualizacion'])

        if practica.estado == Practica.Estado.CANCELADA:
            raise ValidationError({
                'non_field_errors': ['La práctica fue cancelada. Contacta a tu docente.'],
            })
        if practica.ya_finalizada:
            raise ValidationError({
                'non_field_errors': [
                    'La práctica ya finalizó. Pide a tu docente que extienda la fecha '
                    'de cierre o te reautorice.',
                ],
            })

        # Crear/garantizar usuario para el estudiante (rol ESTUDIANTE, sin password).
        estudiante = ser.validated_data['estudiante']
        if not estudiante.usuario_id:
            usuario, _ = Usuario.objects.get_or_create(
                username=f'est_{estudiante.id}',
                defaults={
                    'email': estudiante.correo,
                    'first_name': estudiante.first_name,
                    'last_name': estudiante.last_name,
                    'rol': Usuario.Rol.ESTUDIANTE,
                },
            )
            usuario.set_unusable_password()
            usuario.save()
            estudiante.usuario = usuario
            estudiante.save(update_fields=['usuario'])

        # Generar tokens JWT para esa cuenta.
        refresh = RefreshToken.for_user(estudiante.usuario)
        refresh['rol'] = Usuario.Rol.ESTUDIANTE
        refresh['estudiante_id'] = estudiante.id
        refresh['practica_id'] = practica.id
        refresh['autorizacion_id'] = auth.id

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'estudiante': {
                'id': estudiante.id,
                'correo': estudiante.correo,
                'nombre_completo': estudiante.nombre_completo,
            },
            'practica': {
                'id': practica.id,
                'nombre': practica.nombre,
                'caso_id': practica.caso_id,
                'caso_nombre': practica.caso.nombre,
                'tiempo_max_min': practica.tiempo_max_min,
                'fecha_inicio': practica.fecha_inicio,
                'fecha_fin': practica.fecha_fin,
                'mensaje_personalizado': practica.mensaje_personalizado,
                'estado': practica.estado,
            },
            'autorizacion_id': auth.id,
        })
