"""Endpoints de importación masiva académica (estudiantes y grupos)."""

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.academico.importacion import (
    generar_plantilla_estudiantes,
    generar_plantilla_grupos,
    importar_estudiantes,
    importar_grupos,
)
from apps.importacion_documentos.plantillas import (
    generar_caso_ejemplo,
    generar_guia_importacion,
    generar_plantilla_caso,
    generar_plantilla_rubrica,
)
from apps.usuarios.permissions import EsDocenteOAdmin

from .serializers import ResultadoImportacionSerializer


class ImportacionMasivaViewSet(viewsets.ViewSet):
    """
    Importación masiva desde CSV/Excel.

    - POST /api/importacion/masiva/estudiantes/
    - POST /api/importacion/masiva/grupos/
    - GET  /api/importacion/masiva/plantilla-estudiantes/
    - GET  /api/importacion/masiva/plantilla-grupos/
    """

    permission_classes = [EsDocenteOAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def _archivo(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            raise ValidationError({'archivo': 'Adjunta un archivo en el campo "archivo".'})
        return archivo

    @action(detail=False, methods=['post'], url_path='estudiantes')
    def estudiantes(self, request):
        resultado = importar_estudiantes(self._archivo(request), request.user)
        return Response(ResultadoImportacionSerializer(resultado).data)

    @action(detail=False, methods=['post'], url_path='grupos')
    def grupos(self, request):
        resultado = importar_grupos(self._archivo(request), request.user)
        return Response(ResultadoImportacionSerializer(resultado).data)

    @action(detail=False, methods=['get'], url_path='plantilla-estudiantes')
    def plantilla_estudiantes(self, request):
        contenido = generar_plantilla_estudiantes()
        resp = HttpResponse(
            contenido,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = 'attachment; filename="plantilla-estudiantes.xlsx"'
        return resp

    @action(detail=False, methods=['get'], url_path='plantilla-grupos')
    def plantilla_grupos(self, request):
        contenido = generar_plantilla_grupos()
        resp = HttpResponse(
            contenido,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = 'attachment; filename="plantilla-grupos.xlsx"'
        return resp

    @action(detail=False, methods=['get'], url_path='plantilla-caso')
    def plantilla_caso(self, request):
        resp = HttpResponse(
            generar_plantilla_caso(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        resp['Content-Disposition'] = 'attachment; filename="plantilla-caso.docx"'
        return resp

    @action(detail=False, methods=['get'], url_path='plantilla-rubrica')
    def plantilla_rubrica(self, request):
        resp = HttpResponse(
            generar_plantilla_rubrica(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = 'attachment; filename="plantilla-rubrica.xlsx"'
        return resp

    @action(detail=False, methods=['get'], url_path='guia-importacion')
    def guia_importacion(self, request):
        resp = HttpResponse(generar_guia_importacion(), content_type='application/pdf')
        resp['Content-Disposition'] = 'attachment; filename="guia-importacion.pdf"'
        return resp

    @action(detail=False, methods=['get'], url_path='caso-ejemplo')
    def caso_ejemplo(self, request):
        resp = HttpResponse(
            generar_caso_ejemplo(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        resp['Content-Disposition'] = 'attachment; filename="caso-ejemplo.docx"'
        return resp
