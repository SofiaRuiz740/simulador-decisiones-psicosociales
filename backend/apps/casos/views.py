"""ViewSets de la app casos: Caso, Escenario, Pregunta, Respuesta, Rubrica."""

from django.db.models import Count, Exists, OuterRef, Q

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import Caso, Escenario, Pregunta, Respuesta, Rubrica
from .serializers import (
    CasoDetalleSerializer,
    CasoListSerializer,
    EscenarioSerializer,
    PreguntaSerializer,
    RespuestaSerializer,
    RubricaSerializer,
)


class CasoViewSet(viewsets.ModelViewSet):
    """CRUD de casos. Cada docente solo ve sus casos; admin ve todos."""

    permission_classes = [EsDocenteOAdmin]

    def get_serializer_class(self):
        if self.action in ('retrieve',):
            return CasoDetalleSerializer
        return CasoListSerializer

    def get_queryset(self):
        qs = Caso.objects.select_related('docente_creador', 'materia').prefetch_related(
            'escenarios__preguntas__respuestas', 'rubrica',
        ).annotate(
            escenarios_count=Count('escenarios', distinct=True),
            preguntas_count=Count('escenarios__preguntas', distinct=True),
            tiene_rubrica=Exists(Rubrica.objects.filter(caso_id=OuterRef('pk'))),
        )
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        # El "caso por defecto" (asociado a la simulación narrativa visual
        # "Violencia intrafamiliar") es visible para cualquier docente,
        # además de sus propios casos.
        from .constants import DEFAULT_CASO_NARRATIVO_ID
        return qs.filter(Q(docente_creador=self.request.user) | Q(pk=DEFAULT_CASO_NARRATIVO_ID))

    def perform_create(self, serializer):
        serializer.save(docente_creador=self.request.user)

    @action(detail=True, methods=['get', 'put', 'patch'], url_path='rubrica')
    def rubrica(self, request, pk=None):
        """Obtiene o reemplaza la rúbrica del caso (crea si no existe)."""
        caso = self.get_object()
        rub = getattr(caso, 'rubrica', None)
        if request.method == 'GET':
            if rub is None:
                return Response(None, status=status.HTTP_204_NO_CONTENT)
            return Response(RubricaSerializer(rub).data)

        if rub is None:
            data = {**request.data, 'caso': caso.id}
            ser = RubricaSerializer(data=data)
        else:
            ser = RubricaSerializer(rub, data=request.data, partial=(request.method == 'PATCH'))
        ser.is_valid(raise_exception=True)
        ser.save(caso=caso)
        return Response(ser.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='validar')
    def validar(self, request, pk=None):
        """Revisa la coherencia del caso para poder publicarlo. Devuelve lista de issues."""
        from .services import problemas_de_validacion

        caso = self.get_object()
        problemas = problemas_de_validacion(caso)
        return Response({
            'valido': len(problemas) == 0,
            'problemas': problemas,
        })

    @action(detail=True, methods=['post'], url_path='publicar')
    def publicar(self, request, pk=None):
        """Valida y, si está OK, marca el caso como VALIDADO (listo para prácticas)."""
        from .services import problemas_de_validacion

        caso = self.get_object()
        problemas = problemas_de_validacion(caso)
        if problemas:
            return Response(
                {'detail': 'El caso no puede publicarse aún.', 'problemas': problemas},
                status=status.HTTP_400_BAD_REQUEST,
            )
        caso.estado = Caso.Estado.VALIDADO
        caso.save(update_fields=['estado', 'fecha_actualizacion'])
        return Response(CasoDetalleSerializer(caso).data)

    @action(detail=True, methods=['post'], url_path='archivar')
    def archivar(self, request, pk=None):
        caso = self.get_object()
        caso.estado = Caso.Estado.ARCHIVADO
        caso.save(update_fields=['estado', 'fecha_actualizacion'])
        return Response(CasoDetalleSerializer(caso).data)

    @action(detail=True, methods=['post'], url_path='duplicar')
    def duplicar(self, request, pk=None):
        """Duplica el caso completo (escenarios, preguntas, respuestas, rúbrica)."""
        from .services import duplicar_caso

        caso = self.get_object()
        nuevo = duplicar_caso(caso, docente=request.user)
        return Response(CasoDetalleSerializer(nuevo).data, status=status.HTTP_201_CREATED)


class EscenarioViewSet(viewsets.ModelViewSet):
    serializer_class = EscenarioSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = Escenario.objects.select_related('caso').prefetch_related('preguntas__respuestas')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(caso__docente_creador=self.request.user)


class PreguntaViewSet(viewsets.ModelViewSet):
    serializer_class = PreguntaSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = Pregunta.objects.select_related('escenario__caso').prefetch_related('respuestas')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(escenario__caso__docente_creador=self.request.user)


class RespuestaViewSet(viewsets.ModelViewSet):
    serializer_class = RespuestaSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = Respuesta.objects.select_related('pregunta__escenario__caso')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(pregunta__escenario__caso__docente_creador=self.request.user)


class RubricaViewSet(viewsets.ModelViewSet):
    serializer_class = RubricaSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = Rubrica.objects.select_related('caso')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(caso__docente_creador=self.request.user)
