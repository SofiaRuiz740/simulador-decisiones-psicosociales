"""Serializers de la app practicas."""

from django.utils import timezone
from rest_framework import serializers

from apps.academico.models import Estudiante, Grupo
from apps.academico.validators import validar_materia_docente

from .models import AutorizacionEstudiante, Practica


def validar_grupo_docente(grupo: Grupo | None, user) -> Grupo | None:
    if grupo is None:
        return None
    from apps.usuarios.models import Usuario
    if user.rol == Usuario.Rol.DOCENTE and grupo.docente_id != user.id:
        raise serializers.ValidationError('El grupo no pertenece a este docente.')
    return grupo


class AutorizacionSerializer(serializers.ModelSerializer):
    estudiante_correo = serializers.CharField(source='estudiante.correo', read_only=True)
    estudiante_nombre = serializers.CharField(source='estudiante.nombre_completo', read_only=True)

    class Meta:
        model = AutorizacionEstudiante
        fields = (
            'id', 'practica', 'estudiante', 'estudiante_correo', 'estudiante_nombre',
            'codigo_acceso', 'notificado', 'reintento_autorizado',
            'revocada', 'revocada_en', 'revocada_motivo',
            'fecha_creacion',
        )
        read_only_fields = (
            'id', 'codigo_acceso', 'fecha_creacion',
            'revocada', 'revocada_en', 'revocada_motivo',
        )


class PracticaListSerializer(serializers.ModelSerializer):
    caso_nombre = serializers.CharField(source='caso.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    autorizaciones_count = serializers.SerializerMethodField()
    materia_display = serializers.SerializerMethodField()
    grupos_display = serializers.SerializerMethodField()

    class Meta:
        model = Practica
        fields = (
            'id', 'nombre', 'caso', 'caso_nombre', 'docente', 'materia', 'grupo',
            'materia_display', 'grupos_display',
            'fecha_inicio', 'fecha_fin', 'tiempo_max_min',
            'lugar_fisico', 'mensaje_personalizado',
            'estado', 'estado_display', 'autorizaciones_count',
            'fecha_creacion', 'fecha_actualizacion',
        )
        read_only_fields = (
            'id', 'docente', 'caso_nombre', 'estado_display',
            'materia_display', 'grupos_display',
            'autorizaciones_count', 'fecha_creacion', 'fecha_actualizacion',
        )

    def get_autorizaciones_count(self, obj: Practica) -> int:
        return obj.autorizaciones.count()

    def get_materia_display(self, obj: Practica) -> str | None:
        if obj.materia_id:
            return obj.materia.nombre
        if obj.caso.materia_id:
            return obj.caso.materia.nombre
        return None

    def get_grupos_display(self, obj: Practica) -> str | None:
        if obj.grupo_id:
            return obj.grupo.nombre
        estudiante_ids = obj.autorizaciones.values_list('estudiante_id', flat=True)
        if not estudiante_ids:
            return None
        nombres = Grupo.objects.filter(
            docente=obj.docente,
            estudiantes__id__in=estudiante_ids,
        ).distinct().order_by('nombre').values_list('nombre', flat=True)
        lista = list(nombres)
        return ', '.join(lista) if lista else None

    def validate_materia(self, value):
        request = self.context.get('request')
        if request:
            validar_materia_docente(value, request.user)
        return value

    def validate_grupo(self, value):
        request = self.context.get('request')
        if request:
            validar_grupo_docente(value, request.user)
        return value

    def update(self, instance, validated_data):
        """Si el docente extiende fecha_fin al futuro, reabre la práctica auto-cerrada."""
        nueva_fin = validated_data.get('fecha_fin')
        ahora = timezone.now()
        if (
            nueva_fin
            and nueva_fin > ahora
            and instance.estado == Practica.Estado.FINALIZADA
            and 'estado' not in validated_data
        ):
            inicio = validated_data.get('fecha_inicio', instance.fecha_inicio)
            validated_data['estado'] = (
                Practica.Estado.EN_CURSO if ahora >= inicio else Practica.Estado.SIN_INICIAR
            )
        return super().update(instance, validated_data)


class PracticaDetalleSerializer(PracticaListSerializer):
    autorizaciones = AutorizacionSerializer(many=True, read_only=True)

    class Meta(PracticaListSerializer.Meta):
        fields = PracticaListSerializer.Meta.fields + ('autorizaciones',)


class AutorizarEstudiantesSerializer(serializers.Serializer):
    """Para autorizar varios estudiantes/grupos a la vez sobre una práctica."""

    estudiante_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )
    grupo_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, default=list,
    )


class MisPracticaEstudianteSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    autorizacion_id = serializers.IntegerField()
    practica_id = serializers.IntegerField()
    practica_nombre = serializers.CharField()
    caso_nombre = serializers.CharField()
    codigo_acceso = serializers.CharField()
    materia_display = serializers.CharField(allow_null=True)
    fecha_inicio = serializers.DateTimeField()
    fecha_fin = serializers.DateTimeField()
    tiempo_max_min = serializers.IntegerField()
    practica_estado = serializers.CharField()
    practica_estado_display = serializers.CharField()
    estado = serializers.CharField()
    estado_display = serializers.CharField()
    progreso_pct = serializers.IntegerField()
    total_preguntas = serializers.IntegerField()
    respondidas = serializers.IntegerField()
    tiempo_usado_seg = serializers.IntegerField()
    tiempo_restante_seg = serializers.IntegerField()
    nota_final = serializers.FloatField(allow_null=True)


class AutorizacionListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    practica_id = serializers.IntegerField()
    practica_nombre = serializers.CharField()
    practica_estado = serializers.CharField()
    practica_estado_display = serializers.CharField()
    estudiante_id = serializers.IntegerField()
    estudiante_nombre = serializers.CharField()
    estudiante_correo = serializers.EmailField()
    grupos_display = serializers.CharField(allow_null=True)
    codigo_acceso = serializers.CharField()
    asignacion_display = serializers.CharField()
    reintento_autorizado = serializers.BooleanField()
    fecha_creacion = serializers.DateTimeField()


class AccesoEstudianteSerializer(serializers.Serializer):
    """Para el endpoint público /api/auth/estudiante-acceso/."""

    correo = serializers.EmailField()
    codigo = serializers.CharField(max_length=16)

    def validate(self, attrs):
        correo = attrs['correo'].lower().strip()
        codigo = attrs['codigo'].upper().strip()
        try:
            est = Estudiante.objects.get(correo__iexact=correo)
        except Estudiante.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ['Correo no registrado en el sistema.'],
            })
        try:
            auth = AutorizacionEstudiante.objects.select_related('practica').get(
                estudiante=est, codigo_acceso=codigo,
            )
        except AutorizacionEstudiante.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ['Código de acceso inválido para este correo.'],
            })
        if auth.revocada:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Tu autorización para esta práctica fue revocada por el docente. '
                    'Si crees que es un error, contáctalo directamente.',
                ],
            })
        attrs['estudiante'] = est
        attrs['autorizacion'] = auth
        return attrs


class SolicitudReaperturaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    estudiante_id = serializers.IntegerField()
    estudiante_nombre = serializers.CharField()
    estudiante_correo = serializers.EmailField()
    practica_id = serializers.IntegerField()
    practica_nombre = serializers.CharField()
    autorizacion_id = serializers.IntegerField()
    estado = serializers.CharField()
    estado_display = serializers.CharField()
    motivo = serializers.CharField()
    mensaje_resolucion = serializers.CharField()
    fecha_solicitud = serializers.DateTimeField()
    fecha_resolucion = serializers.DateTimeField(allow_null=True)


class CrearSolicitudReaperturaSerializer(serializers.Serializer):
    autorizacion_id = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(required=False, allow_blank=True, default='')


class RechazarSolicitudSerializer(serializers.Serializer):
    mensaje = serializers.CharField(required=False, allow_blank=True, default='')


class ReiniciarEstudianteSerializer(serializers.Serializer):
    autorizacion_id = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(required=False, allow_blank=True, default='')
    confirmacion = serializers.CharField()


class ReiniciarGlobalSerializer(serializers.Serializer):
    confirmacion = serializers.CharField()
    motivo = serializers.CharField(required=False, allow_blank=True, default='')


class RegistroReinicioSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    practica_id = serializers.IntegerField()
    practica_nombre = serializers.CharField()
    docente_nombre = serializers.CharField()
    estudiante_nombre = serializers.CharField(allow_null=True)
    alcance = serializers.CharField()
    alcance_display = serializers.CharField()
    motivo = serializers.CharField()
    estudiantes_afectados = serializers.IntegerField()
    fecha = serializers.DateTimeField()
