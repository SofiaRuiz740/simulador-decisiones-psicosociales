"""ViewSets de solicitudes de reapertura y reinicio de prácticas."""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import AutorizacionEstudiante, Practica, RegistroReinicioPractica, SolicitudReapertura
from .reintento_services import (
    aprobar_solicitud_reapertura,
    crear_solicitud_reapertura,
    fila_solicitud_reapertura,
    rechazar_solicitud_reapertura,
    reiniciar_practica_estudiante,
    reiniciar_practica_global,
)
from .serializers import (
    CrearSolicitudReaperturaSerializer,
    RechazarSolicitudSerializer,
    RegistroReinicioSerializer,
    ReiniciarEstudianteSerializer,
    ReiniciarGlobalSerializer,
    SolicitudReaperturaSerializer,
)


def _autorizacion_desde_token(request) -> AutorizacionEstudiante | None:
    auth_id = getattr(getattr(request, 'auth', None), 'payload', {}).get('autorizacion_id')
    if not auth_id:
        return None
    return AutorizacionEstudiante.objects.filter(pk=auth_id).select_related(
        'practica', 'estudiante',
    ).first()


def _estudiante_desde_request(request):
    perfil = getattr(request.user, 'perfil_estudiante', None)
    if perfil:
        return perfil
    auth = _autorizacion_desde_token(request)
    return auth.estudiante if auth else None


class SolicitudReaperturaViewSet(viewsets.GenericViewSet):
    """Solicitudes de reapertura de práctica (estudiante → docente)."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SolicitudReapertura.objects.select_related(
            'estudiante', 'practica', 'autorizacion',
        )
        user = self.request.user
        if user.rol == Usuario.Rol.ADMIN:
            return qs
        if user.rol == Usuario.Rol.DOCENTE:
            return qs.filter(practica__docente=user)
        estudiante = _estudiante_desde_request(self.request)
        if estudiante:
            return qs.filter(estudiante=estudiante)
        return qs.none()

    def list(self, request):
        rows = [fila_solicitud_reapertura(s) for s in self.get_queryset()]
        return Response(SolicitudReaperturaSerializer(rows, many=True).data)

    def create(self, request):
        if request.user.rol != Usuario.Rol.ESTUDIANTE:
            raise PermissionDenied('Solo estudiantes pueden solicitar reapertura.')

        ser = CrearSolicitudReaperturaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        auth_id = ser.validated_data.get('autorizacion_id')
        auth = get_object_or_404(
            AutorizacionEstudiante.objects.select_related('practica', 'estudiante'),
            pk=auth_id,
        )

        token_auth = _autorizacion_desde_token(request)
        estudiante = _estudiante_desde_request(request)
        if token_auth and token_auth.id != auth.id:
            raise PermissionDenied('No puedes solicitar reapertura para otra autorización.')
        if estudiante and auth.estudiante_id != estudiante.id:
            raise PermissionDenied('No puedes solicitar reapertura para otra autorización.')

        solicitud = crear_solicitud_reapertura(auth, ser.validated_data.get('motivo', ''))
        return Response(
            SolicitudReaperturaSerializer(fila_solicitud_reapertura(solicitud)).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        if request.user.rol not in (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN):
            raise PermissionDenied('Solo docentes pueden aprobar solicitudes.')
        solicitud = get_object_or_404(self.get_queryset(), pk=pk)
        if request.user.rol == Usuario.Rol.DOCENTE and solicitud.practica.docente_id != request.user.id:
            raise PermissionDenied('No tienes permiso sobre esta práctica.')
        sol = aprobar_solicitud_reapertura(solicitud, request.user)
        return Response(SolicitudReaperturaSerializer(fila_solicitud_reapertura(sol)).data)

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        if request.user.rol not in (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN):
            raise PermissionDenied('Solo docentes pueden rechazar solicitudes.')
        solicitud = get_object_or_404(self.get_queryset(), pk=pk)
        if request.user.rol == Usuario.Rol.DOCENTE and solicitud.practica.docente_id != request.user.id:
            raise PermissionDenied('No tienes permiso sobre esta práctica.')
        ser = RechazarSolicitudSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sol = rechazar_solicitud_reapertura(
            solicitud, request.user, ser.validated_data.get('mensaje', ''),
        )
        return Response(SolicitudReaperturaSerializer(fila_solicitud_reapertura(sol)).data)


class ReinicioPracticaViewSet(viewsets.GenericViewSet):
    """Reinicio manual de prácticas por docente."""

    def get_permissions(self):
        if self.action == 'estado_autorizacion':
            return [IsAuthenticated()]
        return [EsDocenteOAdmin()]

    def get_queryset(self):
        qs = Practica.objects.select_related('caso', 'docente')
        if self.request.user.rol == Usuario.Rol.DOCENTE:
            qs = qs.filter(docente=self.request.user)
        return qs

    @action(detail=True, methods=['post'], url_path='reiniciar-estudiante')
    def reiniciar_estudiante(self, request, pk=None):
        practica = self.get_object()
        ser = ReiniciarEstudianteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data['confirmacion'].strip().upper() != 'REINICIAR':
            raise ValidationError({'confirmacion': 'Escribe REINICIAR para confirmar.'})

        auth = get_object_or_404(
            practica.autorizaciones.select_related('estudiante'),
            pk=ser.validated_data['autorizacion_id'],
        )
        registro = reiniciar_practica_estudiante(
            auth, request.user, motivo=ser.validated_data.get('motivo', ''),
        )
        return Response({
            'detail': 'Práctica reiniciada para el estudiante.',
            'registro_id': registro.id,
            'reintento_autorizado': True,
        })

    @action(detail=True, methods=['post'], url_path='reiniciar-todos')
    def reiniciar_todos(self, request, pk=None):
        practica = self.get_object()
        ser = ReiniciarGlobalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data['confirmacion'].strip().upper() != 'REINICIAR TODOS':
            raise ValidationError({'confirmacion': 'Escribe REINICIAR TODOS para confirmar.'})

        registro = reiniciar_practica_global(
            practica, request.user, motivo=ser.validated_data.get('motivo', ''),
        )
        return Response({
            'detail': f'Práctica reiniciada para {registro.estudiantes_afectados} estudiantes.',
            'registro_id': registro.id,
            'estudiantes_afectados': registro.estudiantes_afectados,
        })

    @action(detail=False, methods=['get'], url_path='registros')
    def registros(self, request):
        qs = RegistroReinicioPractica.objects.select_related(
            'practica', 'docente', 'estudiante',
        )
        if request.user.rol == Usuario.Rol.DOCENTE:
            qs = qs.filter(practica__docente=request.user)
        practica_id = request.query_params.get('practica')
        if practica_id:
            qs = qs.filter(practica_id=practica_id)

        rows = [{
            'id': r.id,
            'practica_id': r.practica_id,
            'practica_nombre': r.practica.nombre,
            'docente_nombre': r.docente.get_full_name() or r.docente.username,
            'estudiante_nombre': r.estudiante.nombre_completo if r.estudiante_id else None,
            'alcance': r.alcance,
            'alcance_display': r.get_alcance_display(),
            'motivo': r.motivo,
            'estudiantes_afectados': r.estudiantes_afectados,
            'fecha': r.fecha,
        } for r in qs.order_by('-fecha')[:100]]

        return Response(RegistroReinicioSerializer(rows, many=True).data)

    @action(detail=False, methods=['get'], url_path='estado-autorizacion')
    def estado_autorizacion(self, request):
        """Estado de reintento para el estudiante autenticado (código o cuenta)."""
        auth = _autorizacion_desde_token(request)
        if not auth:
            auth_id = request.query_params.get('autorizacion_id')
            if auth_id:
                auth = AutorizacionEstudiante.objects.filter(pk=auth_id).first()
        if not auth:
            raise ValidationError('No se encontró autorización activa.')

        estudiante = _estudiante_desde_request(request)
        if estudiante and auth.estudiante_id != estudiante.id:
            raise PermissionDenied('No autorizado.')

        return Response({
            'autorizacion_id': auth.id,
            'practica_id': auth.practica_id,
            'reintento_autorizado': auth.reintento_autorizado,
        })
