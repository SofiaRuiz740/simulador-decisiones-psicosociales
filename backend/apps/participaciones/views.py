"""Views de Participacion: iniciar, responder, finalizar, progreso."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.casos.models import Pregunta, Respuesta
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import Participacion, RespuestaSeleccionada
from .serializers import (
    ParticipacionConCasoSerializer,
    ParticipacionSeguimientoSerializer,
    ParticipacionSerializer,
    ResponderSerializer,
)
from .services import (
    asegurar_tiempo_vigente,
    finalizar_participacion,
    listar_seguimiento,
    metricas_seguimiento,
    tiempo_agotado,
    tiempo_restante_seg,
    tiempo_usado_seg,
)


def _es_estudiante(request) -> bool:
    return request.user.is_authenticated and request.user.rol == Usuario.Rol.ESTUDIANTE


class ParticipacionViewSet(viewsets.GenericViewSet):
    """
    Endpoints:
    - GET  /api/participaciones/              (docente/admin — seguimiento)
    - GET  /api/participaciones/metricas/     (docente/admin — KPIs)
    - POST /api/participaciones/iniciar/      (estudiante)
    - GET  /api/participaciones/{id}/         (caso anidado para el simulador)
    - POST /api/participaciones/{id}/responder/
    - POST /api/participaciones/{id}/finalizar/
    - GET  /api/participaciones/{id}/progreso/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ParticipacionSerializer

    def get_permissions(self):
        if self.action in ('list', 'metricas'):
            return [EsDocenteOAdmin()]
        return [IsAuthenticated()]

    def list(self, request):
        rows = listar_seguimiento(
            request.user,
            practica_id=request.query_params.get('practica'),
            estado=request.query_params.get('estado'),
        )
        return Response(ParticipacionSeguimientoSerializer(rows, many=True).data)

    @action(detail=False, methods=['get'], url_path='metricas')
    def metricas(self, request):
        return Response(metricas_seguimiento(request.user))

    def get_queryset(self):
        # Estudiante: solo sus participaciones. Docente/Admin: las de sus prácticas/todas.
        u = self.request.user
        qs = Participacion.objects.select_related(
            'practica__caso', 'estudiante', 'autorizacion',
        ).prefetch_related('respuestas_seleccionadas')
        if u.rol == Usuario.Rol.ADMIN:
            return qs
        if u.rol == Usuario.Rol.DOCENTE:
            return qs.filter(practica__docente=u)
        # Estudiante
        return qs.filter(estudiante__usuario=u)

    @action(detail=False, methods=['post'], url_path='iniciar')
    @transaction.atomic
    def iniciar(self, request):
        """
        Inicia (o reanuda) la participación del estudiante en su práctica.
        El estudiante ya viene autenticado con un JWT que contiene
        `autorizacion_id` (emitido por /api/auth/estudiante-acceso/).
        """
        if not _es_estudiante(request):
            raise PermissionDenied('Solo estudiantes pueden iniciar participaciones.')

        payload = getattr(request.auth, 'payload', None) or {}
        autorizacion_id = request.data.get('autorizacion_id') or payload.get('autorizacion_id')
        if not autorizacion_id:
            raise ValidationError(
                'Indica la autorización de la práctica o vuelve a acceder con tu código.',
            )

        autorizacion: AutorizacionEstudiante = get_object_or_404(
            AutorizacionEstudiante.objects.select_related('practica__caso', 'estudiante'),
            pk=autorizacion_id,
            estudiante__usuario=request.user,
        )
        practica = autorizacion.practica

        # Validaciones (RN15, RN16, RN13, RN17, RN26).
        if autorizacion.revocada:
            raise ValidationError(
                'Tu autorización para esta práctica fue revocada por el docente.',
            )
        if practica.estado == Practica.Estado.CANCELADA:
            raise ValidationError('La práctica fue cancelada.')
        if practica.estado == Practica.Estado.FINALIZADA or timezone.now() > practica.fecha_fin:
            raise ValidationError('La práctica ya finalizó.')

        # RN17 — no permitir iniciar una práctica nueva si ya pasó más de la
        # mitad de la ventana fecha_inicio→fecha_fin. Si ya hay participación
        # previa (creada antes del punto medio), la deja continuar.
        ya_existe = Participacion.objects.filter(autorizacion=autorizacion).exists()
        if not ya_existe and practica.fecha_inicio and practica.fecha_fin:
            mitad_ventana = practica.fecha_inicio + (practica.fecha_fin - practica.fecha_inicio) / 2
            if timezone.now() > mitad_ventana:
                raise ValidationError(
                    'Ya pasó más de la mitad del tiempo de la práctica. '
                    'Por reglamento ya no es posible iniciarla. '
                    'Si necesitas un nuevo intento, pide a tu docente que lo habilite.',
                )

        part, creada = Participacion.objects.get_or_create(
            autorizacion=autorizacion,
            defaults={
                'practica': practica,
                'estudiante': autorizacion.estudiante,
                'inicio': timezone.now(),
                'estado': Participacion.Estado.EN_CURSO,
            },
        )

        # Si ya estaba cerrada y no hay reintento autorizado → bloquear (RN16).
        if (
            not creada
            and part.estado in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA)
            and not autorizacion.reintento_autorizado
        ):
            raise ValidationError('Ya finalizaste esta práctica.')

        # Si hay reintento autorizado y estaba cerrada, resetear.
        if (
            not creada
            and part.estado in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA)
            and autorizacion.reintento_autorizado
        ):
            part.estado = Participacion.Estado.EN_CURSO
            part.inicio = timezone.now()
            part.fin = None
            part.tiempo_usado_seg = 0
            part.save()
            part.respuestas_seleccionadas.all().delete()
            # Consumir la autorización de reintento.
            autorizacion.reintento_autorizado = False
            autorizacion.save(update_fields=['reintento_autorizado'])

        if not creada and part.estado == Participacion.Estado.NO_INICIADA:
            part.estado = Participacion.Estado.EN_CURSO
            if not part.inicio:
                part.inicio = timezone.now()
            part.save(update_fields=['estado', 'inicio'])

        if not creada and part.estado == Participacion.Estado.EN_CURSO:
            if tiempo_agotado(part):
                finalizar_participacion(part, por_tiempo=True)
                return Response(
                    {'detail': 'El tiempo de participación se agotó.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(ParticipacionConCasoSerializer(part).data)

    def retrieve(self, request, pk=None):
        part = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            asegurar_tiempo_vigente(part)
        except ValidationError:
            part.refresh_from_db()
            return Response(
                {'detail': 'El tiempo de participación se agotó.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ParticipacionConCasoSerializer(part).data)

    @action(detail=True, methods=['post'], url_path='responder')
    @transaction.atomic
    def responder(self, request, pk=None):
        part: Participacion = get_object_or_404(self.get_queryset(), pk=pk)

        if part.estado != Participacion.Estado.EN_CURSO:
            raise ValidationError('La participación ya está finalizada.')

        try:
            asegurar_tiempo_vigente(part)
        except ValidationError:
            return Response(
                {'detail': 'El tiempo de participación se agotó.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = ResponderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pid = ser.validated_data['pregunta_id']
        rid = ser.validated_data['respuesta_id']

        # Validar que la pregunta pertenezca al caso de la práctica.
        pregunta = get_object_or_404(
            Pregunta.objects.filter(escenario__caso=part.practica.caso), pk=pid,
        )
        respuesta = get_object_or_404(
            Respuesta.objects.filter(pregunta=pregunta), pk=rid,
        )

        RespuestaSeleccionada.objects.update_or_create(
            participacion=part, pregunta=pregunta,
            defaults={'respuesta_elegida': respuesta},
        )

        return Response({'detail': 'guardado'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='finalizar')
    @transaction.atomic
    def finalizar(self, request, pk=None):
        part: Participacion = get_object_or_404(self.get_queryset(), pk=pk)

        if part.estado in (Participacion.Estado.FINALIZADA, Participacion.Estado.INCOMPLETA):
            return Response(
                {'detail': 'Ya estaba finalizada.', 'resultado_id': part.resultado.id},
                status=status.HTTP_200_OK,
            )

        por_tiempo = tiempo_agotado(part)
        resultado = finalizar_participacion(part, por_tiempo=por_tiempo)
        return Response({
            'detail': 'Participación finalizada.',
            'resultado_id': resultado.id,
            'estado': part.estado,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='progreso')
    def progreso(self, request, pk=None):
        part: Participacion = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            asegurar_tiempo_vigente(part)
        except ValidationError:
            part.refresh_from_db()
        total_preg = Pregunta.objects.filter(escenario__caso=part.practica.caso).count()
        respondidas = part.respuestas_seleccionadas.count()
        return Response({
            'participacion_id': part.id,
            'estado': part.estado,
            'total_preguntas': total_preg,
            'respondidas': respondidas,
            'tiempo_usado_seg': tiempo_usado_seg(part),
            'tiempo_restante_seg': tiempo_restante_seg(part),
        })
