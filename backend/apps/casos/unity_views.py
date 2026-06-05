"""Endpoint dedicado al cliente Unity (ver docs/10-unity-roadmap.md).

Devuelve el caso completo en un único payload optimizado para reducir
viajes desde un cliente nativo. Autenticado por código de práctica.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.practicas.models import AutorizacionEstudiante

from .serializers import CasoDetalleSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def caso_completo_unity(request):
    """GET /api/unity/caso-completo/?practica_codigo=<codigo>.

    El código de acceso es el secreto que ya emite el docente para que el
    estudiante entre. El cliente Unity lo usa igual que el frontend web.
    """
    codigo = (request.query_params.get('practica_codigo') or '').strip()
    if not codigo:
        return Response({'detail': 'Falta practica_codigo.'}, status=400)

    autorizacion = (
        AutorizacionEstudiante.objects
        .select_related(
            'practica__caso',
            'estudiante',
        )
        .filter(codigo_acceso=codigo)
        .first()
    )
    if autorizacion is None:
        return Response({'detail': 'Código no válido.'}, status=404)

    caso = autorizacion.practica.caso
    data = CasoDetalleSerializer(caso).data
    data['_unity'] = {
        'practica_id': autorizacion.practica_id,
        'practica_nombre': autorizacion.practica.nombre,
        'autorizacion_id': autorizacion.id,
        'estudiante': {
            'id': autorizacion.estudiante_id,
            'nombre': autorizacion.estudiante.nombre_completo,
            'correo': autorizacion.estudiante.correo,
        },
        'tiempo_max_min': autorizacion.practica.tiempo_max_min,
    }
    return Response(data)
