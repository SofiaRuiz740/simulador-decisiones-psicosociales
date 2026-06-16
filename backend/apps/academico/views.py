"""Views de la app academico: ViewSets para Estudiante y Grupo."""

from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsDocenteOAdmin

from .models import Estudiante, Grupo, InscripcionGrupo, Materia
from .serializers import (
    AgregarEstudiantePorCorreoSerializer,
    EstudianteListSerializer,
    EstudianteSerializer,
    GrupoDetalleSerializer,
    GrupoEstudiantesSerializer,
    GrupoSerializer,
    MateriaSerializer,
)


class EstudianteViewSet(viewsets.ModelViewSet):
    """
    CRUD de estudiantes.

    Scoping: un docente solo ve y modifica los estudiantes que tiene asociados
    (RN04). El administrador ve todos.

    Endpoints adicionales:
    - POST /estudiantes/agregar-por-correo/   → crea o vincula por correo (RF06, RF07)
    - POST /estudiantes/{id}/vincular/        → vincula al docente actual
    - DELETE /estudiantes/{id}/desvincular/   → desvincula del docente actual (sin borrar)
    """

    serializer_class = EstudianteSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return EstudianteListSerializer
        return EstudianteSerializer

    def get_queryset(self):
        user = self.request.user
        if user.rol == Usuario.Rol.ADMIN:
            return Estudiante.objects.all().select_related('docente_creador').prefetch_related(
                'grupos__materia',
            )
        return user.estudiantes.all().select_related('docente_creador').prefetch_related(
            'grupos__materia',
        )

    @transaction.atomic
    def perform_create(self, serializer: EstudianteSerializer) -> None:
        """Crear estudiante: lo asocia automáticamente al docente actual como creador."""
        estudiante = serializer.save(docente_creador=self.request.user)
        # Si el creador es un docente, también lo agregamos a su lista de estudiantes.
        if self.request.user.rol == Usuario.Rol.DOCENTE:
            estudiante.docentes.add(self.request.user)

    @action(detail=False, methods=['post'], url_path='agregar-por-correo')
    @transaction.atomic
    def agregar_por_correo(self, request):
        """
        Crea o vincula un estudiante usando su correo (RF06 + RF07).

        - Si el correo ya existe → vincula al docente actual (idempotente).
        - Si no existe → crea con los datos provistos y lo vincula.
        """
        ser = AgregarEstudiantePorCorreoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        roles_permitidos = (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN)
        if request.user.rol not in roles_permitidos:
            raise ValidationError(
                'Solo los docentes y administradores pueden agregar estudiantes.',
            )

        estudiante, creado = Estudiante.objects.get_or_create(
            correo=data['correo'],
            defaults={
                'first_name': data.get('first_name', '') or '',
                'last_name': data.get('last_name', '') or '',
                'docente_creador': request.user,
            },
        )

        # Vincula al usuario actual solo si es docente (el admin no necesita la relación M2N).
        if request.user.rol == Usuario.Rol.DOCENTE:
            estudiante.docentes.add(request.user)

        salida = EstudianteSerializer(estudiante).data
        salida['_creado'] = creado  # marker informativo: true=nuevo, false=ya existía
        return Response(salida, status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='vincular')
    def vincular(self, request, pk=None):
        """Vincula este estudiante al docente actual (no requiere desvinculación previa)."""
        if request.user.rol not in (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN):
            raise ValidationError('Solo los docentes y administradores pueden vincular estudiantes.')
        estudiante = get_object_or_404(Estudiante, pk=pk)
        if request.user.rol == Usuario.Rol.DOCENTE:
            estudiante.docentes.add(request.user)
        return Response(EstudianteSerializer(estudiante).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='desvincular')
    def desvincular(self, request, pk=None):
        """Desvincula este estudiante del docente actual (no borra el estudiante)."""
        if request.user.rol not in (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN):
            raise ValidationError('Solo los docentes y administradores pueden desvincular estudiantes.')
        estudiante = get_object_or_404(Estudiante, pk=pk)
        estudiante.docentes.remove(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GrupoViewSet(viewsets.ModelViewSet):
    """
    CRUD de grupos.

    Cada grupo pertenece a un único docente. Scoping: el docente solo ve sus
    propios grupos; el admin ve todos.

    Endpoints adicionales:
    - POST /grupos/{id}/agregar-estudiantes/  → asocia varios estudiantes al grupo
    - POST /grupos/{id}/remover-estudiantes/  → remueve varios estudiantes del grupo
    """

    permission_classes = [EsDocenteOAdmin]

    def get_serializer_class(self):
        if self.action in ('retrieve', 'agregar_estudiantes', 'remover_estudiantes'):
            return GrupoDetalleSerializer
        return GrupoSerializer

    def get_queryset(self):
        user = self.request.user
        if user.rol == Usuario.Rol.ADMIN:
            return Grupo.objects.all().select_related('docente', 'materia').prefetch_related('estudiantes')
        return user.grupos.all().select_related('docente', 'materia').prefetch_related('estudiantes')

    def perform_create(self, serializer: GrupoSerializer) -> None:
        serializer.save(docente=self.request.user)

    @action(detail=True, methods=['post'], url_path='agregar-estudiantes')
    @transaction.atomic
    def agregar_estudiantes(self, request, pk=None):
        grupo: Grupo = self.get_object()
        ser = GrupoEstudiantesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        ids = ser.validated_data['estudiante_ids']

        # Solo se pueden agregar estudiantes que el docente tenga asociados
        # (evita que un docente meta estudiantes de otro docente en su grupo).
        if request.user.rol == Usuario.Rol.DOCENTE:
            permitidos = request.user.estudiantes.filter(pk__in=ids).values_list('pk', flat=True)
        else:
            permitidos = Estudiante.objects.filter(pk__in=ids).values_list('pk', flat=True)

        ids_no_permitidos = set(ids) - set(permitidos)
        if ids_no_permitidos:
            raise ValidationError(
                {
                    'estudiante_ids': [
                        f'Los siguientes IDs no están en tu lista de estudiantes: '
                        f'{sorted(ids_no_permitidos)}'
                    ],
                },
            )

        # bulk_create con ignore_conflicts para evitar duplicados (idempotente).
        InscripcionGrupo.objects.bulk_create(
            [InscripcionGrupo(grupo=grupo, estudiante_id=pid) for pid in permitidos],
            ignore_conflicts=True,
        )

        # Re-fetch para que el serializer vea los estudiantes recién agregados
        # (el prefetch_related original ya estaba cacheado).
        grupo = Grupo.objects.prefetch_related('estudiantes').select_related('materia').get(pk=grupo.pk)
        return Response(GrupoDetalleSerializer(grupo).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='remover-estudiantes')
    def remover_estudiantes(self, request, pk=None):
        grupo: Grupo = self.get_object()
        ser = GrupoEstudiantesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        InscripcionGrupo.objects.filter(
            grupo=grupo,
            estudiante_id__in=ser.validated_data['estudiante_ids'],
        ).delete()

        grupo = Grupo.objects.prefetch_related('estudiantes').select_related('materia').get(pk=grupo.pk)
        return Response(GrupoDetalleSerializer(grupo).data, status=status.HTTP_200_OK)


class MateriaViewSet(viewsets.ModelViewSet):
    """CRUD de materias académicas del docente."""

    serializer_class = MateriaSerializer
    permission_classes = [EsDocenteOAdmin]

    def get_queryset(self):
        qs = Materia.objects.annotate(
            grupos_count=Count('grupos', distinct=True),
            estudiantes_count=Count('grupos__estudiantes', distinct=True),
        ).select_related('docente').order_by('nombre')
        if self.request.user.rol == Usuario.Rol.ADMIN:
            return qs
        return qs.filter(docente=self.request.user)

    def perform_create(self, serializer: MateriaSerializer) -> None:
        serializer.save(docente=self.request.user)
