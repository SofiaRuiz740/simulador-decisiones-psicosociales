"""Views de Importación de Documentos: subir, procesar y convertir a Caso."""

from pathlib import Path

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.casos.models import Caso
from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import ArchivoFuente
from .serializers import ArchivoFuenteSerializer, CrearCasoDesdeArchivoSerializer
from .services import aplicar_estructura_a_caso, extraer_texto, parsear_estructura_caso

TIPOS_PERMITIDOS = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
}
MAX_BYTES_ARCHIVO = 10 * 1024 * 1024


class ArchivoFuenteViewSet(viewsets.ModelViewSet):
    """
    Endpoints:
    - POST /api/importacion/        (multipart con campo `archivo`)
    - GET  /api/importacion/        (listado)
    - GET  /api/importacion/{id}/
    - POST /api/importacion/{id}/procesar/   → extrae texto
    - POST /api/importacion/{id}/crear-caso/ → crea Caso EN_REVISION con contexto = texto
    """

    serializer_class = ArchivoFuenteSerializer
    permission_classes = [EsDocenteOAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        qs = ArchivoFuente.objects.select_related('docente', 'caso')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(docente=self.request.user)

    def create(self, request, *args, **kwargs):
        f = request.FILES.get('archivo')
        if not f:
            raise ValidationError({'archivo': 'Adjunta un archivo en el campo "archivo".'})
        if f.size > MAX_BYTES_ARCHIVO:
            raise ValidationError({'archivo': 'El archivo supera el límite de 10 MB.'})
        tipo = TIPOS_PERMITIDOS.get(f.content_type)
        if not tipo:
            # Fallback por extensión.
            ext = Path(f.name).suffix.lower()
            tipo = {'.pdf': 'PDF', '.txt': 'TXT', '.docx': 'DOCX'}.get(ext)
        if not tipo:
            raise ValidationError({'archivo': 'Tipo no soportado. Solo PDF, DOCX, TXT.'})

        af = ArchivoFuente.objects.create(
            archivo=f, nombre_original=f.name, tipo=tipo,
            docente=request.user,
        )
        return Response(ArchivoFuenteSerializer(af).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='procesar')
    def procesar(self, request, pk=None):
        af: ArchivoFuente = self.get_object()
        texto = extraer_texto(af.archivo.path, af.tipo)
        if not texto.strip() or texto.startswith('[Error al extraer') or texto.startswith('[DOCX no soportado'):
            raise ValidationError({
                'archivo': texto.strip('[]') or 'No se pudo extraer texto del documento.',
            })
        af.texto_extraido = texto
        af.estado = ArchivoFuente.Estado.PROCESADO
        af.save(update_fields=['texto_extraido', 'estado', 'fecha_actualizacion'])
        return Response(ArchivoFuenteSerializer(af).data)

    @action(detail=True, methods=['post'], url_path='crear-caso')
    def crear_caso(self, request, pk=None):
        af: ArchivoFuente = self.get_object()
        if not af.texto_extraido:
            raise ValidationError('Debes procesar el archivo primero.')
        ser = CrearCasoDesdeArchivoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # 1) Parsear estructura (escenarios/preguntas/respuestas/contexto).
        estructura = parsear_estructura_caso(af.texto_extraido)
        nombre_detectado = estructura['datos'].get('nombre') or ''
        area_detectada = estructura['datos'].get('area') or ''
        tiempo_detectado = estructura['datos'].get('tiempo_min')

        nombre_final = (ser.validated_data.get('nombre') or '').strip() or nombre_detectado or af.nombre_original
        area_final = (ser.validated_data.get('area_psicosocial') or '').strip() or area_detectada

        # 2) Crear el caso (contexto inicial: texto plano; el parser lo
        # sobreescribirá si detecta la sección CONTEXTO).
        caso = Caso.objects.create(
            nombre=nombre_final,
            descripcion=f'Caso importado desde {af.nombre_original}.',
            contexto_historia=af.texto_extraido[:8000],
            desarrollo_situacional=af.texto_extraido[8000:16000] if len(af.texto_extraido) > 8000 else '',
            area_psicosocial=area_final,
            estado=Caso.Estado.EN_REVISION,
            docente_creador=request.user,
            tiempo_estimado_min=tiempo_detectado if tiempo_detectado else 30,
        )

        # 3) Aplicar escenarios/preguntas/respuestas detectadas.
        resumen_parser = aplicar_estructura_a_caso(caso, estructura)

        af.caso = caso
        af.estado = ArchivoFuente.Estado.CONVERTIDO_A_CASO
        af.save(update_fields=['caso', 'estado', 'fecha_actualizacion'])

        return Response({
            'caso_id': caso.id,
            'archivo': ArchivoFuenteSerializer(af).data,
            'estructura_detectada': {
                'escenarios': resumen_parser['escenarios_creados'],
                'preguntas': resumen_parser['preguntas_creadas'],
                'respuestas': resumen_parser['respuestas_creadas'],
                'contexto_detectado': bool(estructura.get('contexto')),
                'nombre_detectado': nombre_detectado,
                'area_detectada': area_detectada,
                'tiempo_min_detectado': tiempo_detectado,
            },
        })
