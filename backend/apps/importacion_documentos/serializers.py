from rest_framework import serializers

from .models import ArchivoFuente


class ArchivoFuenteSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = ArchivoFuente
        fields = (
            'id', 'archivo', 'nombre_original', 'tipo', 'texto_extraido',
            'estado', 'estado_display', 'docente', 'caso',
            'fecha_subida', 'fecha_actualizacion',
        )
        read_only_fields = (
            'id', 'nombre_original', 'tipo', 'texto_extraido',
            'estado', 'estado_display', 'docente', 'caso',
            'fecha_subida', 'fecha_actualizacion',
        )


class CrearCasoDesdeArchivoSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    area_psicosocial = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')


class ErrorImportacionSerializer(serializers.Serializer):
    fila = serializers.IntegerField(allow_null=True)
    mensaje = serializers.CharField()


class ResultadoImportacionSerializer(serializers.Serializer):
    filas_procesadas = serializers.IntegerField()
    filas_exitosas = serializers.IntegerField()
    estudiantes_creados = serializers.IntegerField()
    estudiantes_vinculados = serializers.IntegerField()
    grupos_creados = serializers.IntegerField()
    inscripciones = serializers.IntegerField()
    materias_creadas = serializers.IntegerField()
    errores = ErrorImportacionSerializer(many=True)
    advertencias = ErrorImportacionSerializer(many=True)
