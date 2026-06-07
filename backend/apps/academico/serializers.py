"""Serializers para Estudiante, Grupo e InscripcionGrupo."""

from rest_framework import serializers

from apps.resultados.models import Resultado
from apps.usuarios.models import Usuario

from .models import Estudiante, Grupo, InscripcionGrupo, Materia
from .validators import validar_materia_docente


class EstudianteSerializer(serializers.ModelSerializer):
    """Serializer de lectura/escritura para Estudiante."""

    nombre_completo = serializers.ReadOnlyField()
    docente_creador_username = serializers.CharField(
        source='docente_creador.username',
        read_only=True,
    )

    class Meta:
        model = Estudiante
        fields = (
            'id',
            'correo',
            'identificacion',
            'first_name',
            'last_name',
            'nombre_completo',
            'activo',
            'docente_creador',
            'docente_creador_username',
            'fecha_creacion',
            'fecha_actualizacion',
        )
        read_only_fields = (
            'id',
            'docente_creador',
            'docente_creador_username',
            'fecha_creacion',
            'fecha_actualizacion',
        )

    def validate_correo(self, value: str) -> str:
        return value.lower().strip()


class EstudianteListSerializer(EstudianteSerializer):
    """Campos agregados para el listado docente (grupos, última práctica, nota)."""

    grupos_display = serializers.SerializerMethodField()
    materia_display = serializers.SerializerMethodField()
    ultima_practica = serializers.SerializerMethodField()
    ultima_nota = serializers.SerializerMethodField()
    sin_grupo = serializers.SerializerMethodField()

    class Meta(EstudianteSerializer.Meta):
        fields = EstudianteSerializer.Meta.fields + (
            'grupos_display',
            'materia_display',
            'ultima_practica',
            'ultima_nota',
            'sin_grupo',
        )

    def _docente_scope(self):
        request = self.context.get('request')
        if request and request.user.rol != Usuario.Rol.ADMIN:
            return request.user
        return None

    def _grupos_docente(self, obj: Estudiante):
        qs = obj.grupos.all()
        docente = self._docente_scope()
        if docente:
            qs = qs.filter(docente=docente)
        return qs.order_by('nombre')

    def get_grupos_display(self, obj: Estudiante) -> str | None:
        nombres = list(self._grupos_docente(obj).values_list('nombre', flat=True))
        return ', '.join(nombres) if nombres else None

    def get_sin_grupo(self, obj: Estudiante) -> bool:
        return not self._grupos_docente(obj).exists()

    def get_materia_display(self, obj: Estudiante) -> str | None:
        nombres: list[str] = []
        vistos: set[str] = set()
        for grupo in self._grupos_docente(obj).select_related('materia'):
            if grupo.materia_id and grupo.materia.nombre not in vistos:
                nombres.append(grupo.materia.nombre)
                vistos.add(grupo.materia.nombre)
        return ', '.join(nombres) if nombres else None

    def _ultimo_resultado(self, obj: Estudiante) -> Resultado | None:
        qs = Resultado.objects.filter(
            participacion__estudiante=obj,
        ).select_related('participacion__practica')
        docente = self._docente_scope()
        if docente:
            qs = qs.filter(participacion__practica__docente=docente)
        return qs.order_by('-fecha_calculo').first()

    def get_ultima_practica(self, obj: Estudiante) -> dict | None:
        resultado = self._ultimo_resultado(obj)
        if resultado is None:
            return None
        return {
            'nombre': resultado.participacion.practica.nombre,
            'fecha': resultado.fecha_calculo.isoformat(),
        }

    def get_ultima_nota(self, obj: Estudiante) -> float | None:
        resultado = self._ultimo_resultado(obj)
        if resultado is None:
            return None
        return float(resultado.nota_final)


class AgregarEstudiantePorCorreoSerializer(serializers.Serializer):
    """
    Crea o vincula un estudiante usando su correo electrónico (RF06, RF07).

    Comportamiento:
    - Si el correo ya existe en el sistema: lo vincula al docente actual
      (idempotente, no duplica).
    - Si no existe: lo crea con `first_name`/`last_name` si vienen, y lo
      vincula al docente actual como creador.
    """

    correo = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')

    def validate_correo(self, value: str) -> str:
        return value.lower().strip()


class MateriaSerializer(serializers.ModelSerializer):
    grupos_count = serializers.IntegerField(read_only=True)
    estudiantes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Materia
        fields = (
            'id',
            'nombre',
            'programa',
            'periodo',
            'activo',
            'docente',
            'grupos_count',
            'estudiantes_count',
            'fecha_creacion',
            'fecha_actualizacion',
        )
        read_only_fields = (
            'id',
            'docente',
            'grupos_count',
            'estudiantes_count',
            'fecha_creacion',
            'fecha_actualizacion',
        )


class GrupoSerializer(serializers.ModelSerializer):
    """Serializer básico de Grupo (sin lista expandida de estudiantes)."""

    estudiantes_count = serializers.SerializerMethodField()
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True, allow_null=True)
    materia_display = serializers.CharField(source='materia.nombre', read_only=True, allow_null=True)
    periodo_display = serializers.SerializerMethodField()

    class Meta:
        model = Grupo
        fields = (
            'id',
            'nombre',
            'descripcion',
            'periodo',
            'materia',
            'materia_nombre',
            'materia_display',
            'periodo_display',
            'docente',
            'estudiantes_count',
            'fecha_creacion',
            'fecha_actualizacion',
        )
        read_only_fields = (
            'id',
            'docente',
            'materia_nombre',
            'materia_display',
            'periodo_display',
            'estudiantes_count',
            'fecha_creacion',
            'fecha_actualizacion',
        )

    def get_estudiantes_count(self, obj: Grupo) -> int:
        return obj.estudiantes.count()

    def get_periodo_display(self, obj: Grupo) -> str | None:
        propio = (obj.periodo or '').strip()
        if propio:
            return propio
        if obj.materia_id and (obj.materia.periodo or '').strip():
            return obj.materia.periodo.strip()
        return None

    def validate_materia(self, value):
        request = self.context.get('request')
        if request:
            validar_materia_docente(value, request.user)
        return value


class GrupoDetalleSerializer(GrupoSerializer):
    """Grupo con la lista expandida de estudiantes (para vista de detalle)."""

    estudiantes = EstudianteSerializer(many=True, read_only=True)

    class Meta(GrupoSerializer.Meta):
        fields = GrupoSerializer.Meta.fields + ('estudiantes',)


class GrupoEstudiantesSerializer(serializers.Serializer):
    """Para añadir o remover estudiantes de un grupo en lote."""

    estudiante_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


class InscripcionGrupoSerializer(serializers.ModelSerializer):
    estudiante_correo = serializers.CharField(source='estudiante.correo', read_only=True)
    estudiante_nombre = serializers.CharField(source='estudiante.nombre_completo', read_only=True)
    grupo_nombre = serializers.CharField(source='grupo.nombre', read_only=True)

    class Meta:
        model = InscripcionGrupo
        fields = (
            'id',
            'grupo',
            'grupo_nombre',
            'estudiante',
            'estudiante_correo',
            'estudiante_nombre',
            'fecha_inscripcion',
        )
        read_only_fields = ('id', 'fecha_inscripcion')
