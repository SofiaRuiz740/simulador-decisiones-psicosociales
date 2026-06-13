"""Views de resultados de simulación narrativa."""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.practicas.models import AutorizacionEstudiante
from apps.practicas.reintento_views import _autorizacion_desde_token, _estudiante_desde_request
from apps.usuarios.models import Usuario

from .models import ResultadoNarrativo
from .narrativo_services import fila_resultado_narrativo, guardar_resultado_narrativo
from .serializers import GuardarResultadoNarrativoSerializer, ResultadoNarrativoSerializer


class ResultadoNarrativoViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ResultadoNarrativo.objects.select_related(
            'practica__caso', 'estudiante', 'autorizacion',
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
        rows = [fila_resultado_narrativo(r) for r in self.get_queryset()]
        return Response(ResultadoNarrativoSerializer(rows, many=True).data)

    @action(detail=False, methods=['get'], url_path='mis-resultados')
    def mis_resultados(self, request):
        if request.user.rol != Usuario.Rol.ESTUDIANTE:
            raise PermissionDenied('Solo estudiantes pueden consultar sus resultados narrativos.')
        rows = [fila_resultado_narrativo(r) for r in self.get_queryset()]
        return Response(ResultadoNarrativoSerializer(rows, many=True).data)

    def retrieve(self, request, pk=None):
        res = get_object_or_404(self.get_queryset(), pk=pk)
        return Response(ResultadoNarrativoSerializer(fila_resultado_narrativo(res)).data)

    @action(detail=False, methods=['post'], url_path='guardar')
    def guardar(self, request):
        if request.user.rol != Usuario.Rol.ESTUDIANTE:
            raise PermissionDenied('Solo estudiantes pueden registrar resultados narrativos.')

        ser = GuardarResultadoNarrativoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        auth_id = data.get('autorizacion_id')
        auth = _autorizacion_desde_token(request)
        if auth_id:
            auth = get_object_or_404(
                AutorizacionEstudiante.objects.select_related('practica', 'estudiante'),
                pk=auth_id,
            )
        if not auth:
            raise ValidationError('Indica autorizacion_id o accede con tu código de práctica.')

        estudiante = _estudiante_desde_request(request)
        if estudiante and auth.estudiante_id != estudiante.id:
            raise PermissionDenied('No autorizado.')

        resultado = guardar_resultado_narrativo(
            auth,
            porcentaje=data['porcentaje'],
            entrevistas_realizadas=data['entrevistas_realizadas'],
            entrevistas_totales=data['entrevistas_totales'],
            evidencias_encontradas=data['evidencias_encontradas'],
            contradicciones_detectadas=data['contradicciones_detectadas'],
            hipotesis_formuladas=data['hipotesis_formuladas'],
            estado_final=data.get('estado_final', 'completada'),
            resumen_pedagogico=data.get('resumen_pedagogico') or {},
        )
        return Response(
            ResultadoNarrativoSerializer(fila_resultado_narrativo(resultado)).data,
            status=status.HTTP_201_CREATED,
        )
