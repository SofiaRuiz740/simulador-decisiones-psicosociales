"""Endpoints del módulo de IA generativa.

- POST /api/ia/generar-caso/                       → genera y guarda propuesta
- GET  /api/ia/propuestas/                          → lista propuestas del docente
- GET  /api/ia/propuestas/{id}/                     → detalle de una propuesta
- POST /api/ia/propuestas/{id}/aprobar/             → estado APROBADO
- POST /api/ia/propuestas/{id}/rechazar/            → estado RECHAZADO
- POST /api/ia/propuestas/{id}/convertir-en-caso/   → crea Caso real
"""

import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import PropuestaCasoIA
from .serializers import (
    GenerarCasoRequestSerializer,
    PropuestaCasoIASerializer,
    RechazoSerializer,
)
from .services import (
    ai_provider,
    convertir_propuesta_en_caso,
    generar_propuesta_caso,
)
from .services.case_generator import GenerationError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([EsDocenteOAdmin])
def generar_caso_view(request):
    """Genera una propuesta de caso vía IA y la devuelve."""
    ser = GenerarCasoRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    payload = ser.validated_data

    try:
        propuesta = generar_propuesta_caso(payload, request.user)
    except GenerationError as exc:
        return Response(
            {'detail': str(exc), 'codigo': 'generacion_invalida'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        PropuestaCasoIASerializer(propuesta).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estado_ia_view(request):
    """Devuelve si el proveedor IA está configurado (sin exponer la API key)."""
    return Response({
        'proveedor_activo': ai_provider.hay_proveedor_activo(),
    })


class PropuestaCasoIAViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Lista, detalle, edición y acciones de revisión sobre las propuestas IA."""

    serializer_class = PropuestaCasoIASerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = PropuestaCasoIA.objects.select_related('docente', 'caso_resultante')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(docente=self.request.user)

    def update(self, request, *args, **kwargs):
        """Solo se permite editar mientras la propuesta no haya sido convertida o rechazada."""
        propuesta = self.get_object()
        if propuesta.estado in (
            PropuestaCasoIA.Estado.CONVERTIDO_EN_CASO,
            PropuestaCasoIA.Estado.RECHAZADO,
        ):
            return Response(
                {'detail': 'No puedes editar una propuesta ya convertida o rechazada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        propuesta = self.get_object()
        if propuesta.estado in (
            PropuestaCasoIA.Estado.CONVERTIDO_EN_CASO,
            PropuestaCasoIA.Estado.RECHAZADO,
        ):
            return Response(
                {'detail': 'No puedes editar una propuesta ya convertida o rechazada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='aprobar')
    def aprobar(self, request, pk=None):
        propuesta = get_object_or_404(self.get_queryset(), pk=pk)
        if propuesta.estado == PropuestaCasoIA.Estado.CONVERTIDO_EN_CASO:
            return Response(
                {'detail': 'La propuesta ya fue convertida en caso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        propuesta.estado = PropuestaCasoIA.Estado.APROBADO
        propuesta.motivo_rechazo = ''
        propuesta.fecha_aprobacion = timezone.now()
        propuesta.save(update_fields=['estado', 'motivo_rechazo', 'fecha_aprobacion', 'fecha_actualizacion'])
        return Response(PropuestaCasoIASerializer(propuesta).data)

    @action(detail=True, methods=['post'], url_path='rechazar')
    def rechazar(self, request, pk=None):
        propuesta = get_object_or_404(self.get_queryset(), pk=pk)
        if propuesta.estado == PropuestaCasoIA.Estado.CONVERTIDO_EN_CASO:
            return Response(
                {'detail': 'La propuesta ya fue convertida en caso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = RechazoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        propuesta.estado = PropuestaCasoIA.Estado.RECHAZADO
        propuesta.motivo_rechazo = ser.validated_data['motivo_rechazo']
        propuesta.save(update_fields=['estado', 'motivo_rechazo', 'fecha_actualizacion'])
        return Response(PropuestaCasoIASerializer(propuesta).data)

    @action(detail=True, methods=['post'], url_path='convertir-en-caso')
    def convertir_en_caso(self, request, pk=None):
        propuesta = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            caso = convertir_propuesta_en_caso(propuesta, request.user)
        except GenerationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001 - convertir errores inesperados en respuesta legible
            logger.exception('Error inesperado al convertir propuesta %s en caso', propuesta.pk)
            return Response(
                {'detail': f'Error al convertir la propuesta: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'detail': 'Caso creado en estado EN_REVISION.',
            'caso_id': caso.id,
            'caso_nombre': caso.nombre,
            'propuesta': PropuestaCasoIASerializer(propuesta).data,
        }, status=status.HTTP_201_CREATED)
