"""Serializers de casos, escenarios, preguntas, respuestas y rúbricas."""

from rest_framework import serializers

from apps.academico.validators import validar_materia_docente

from .models import Caso, Escenario, Pregunta, Respuesta, Rubrica
from .services import completitud_porcentaje


class RespuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Respuesta
        fields = ('id', 'pregunta', 'orden', 'texto', 'es_correcta', 'justificacion', 'retroalimentacion')
        read_only_fields = ('id',)


class PreguntaSerializer(serializers.ModelSerializer):
    respuestas = RespuestaSerializer(many=True, read_only=True)

    class Meta:
        model = Pregunta
        fields = (
            'id', 'escenario', 'orden', 'enunciado', 'peso',
            'criterio_rubrica_id', 'calificable', 'respuestas',
        )
        read_only_fields = ('id', 'respuestas')


class EscenarioSerializer(serializers.ModelSerializer):
    preguntas = PreguntaSerializer(many=True, read_only=True)

    class Meta:
        model = Escenario
        fields = ('id', 'caso', 'orden', 'titulo', 'narrativa', 'recursos_multimedia', 'preguntas')
        read_only_fields = ('id', 'preguntas')


class RubricaSerializer(serializers.ModelSerializer):
    suma_pesos_criterios = serializers.IntegerField(read_only=True)
    es_consistente = serializers.BooleanField(read_only=True)

    class Meta:
        model = Rubrica
        fields = (
            'id', 'caso', 'descripcion', 'escala_maxima', 'nota_aprobacion',
            'criterios', 'niveles_globales',
            'suma_pesos_criterios', 'es_consistente',
            'fecha_creacion', 'fecha_actualizacion',
        )
        read_only_fields = (
            'id', 'suma_pesos_criterios', 'es_consistente',
            'fecha_creacion', 'fecha_actualizacion',
        )

    def validate_criterios(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Debe ser una lista de criterios.')
        ids = set()
        for idx, c in enumerate(value):
            if not isinstance(c, dict):
                raise serializers.ValidationError(f'Criterio #{idx + 1} inválido.')
            cid = str(c.get('id', '')).strip()
            if not cid:
                raise serializers.ValidationError(f'Criterio #{idx + 1} sin id.')
            if cid in ids:
                raise serializers.ValidationError(f'Id de criterio duplicado: "{cid}".')
            ids.add(cid)
            try:
                peso = int(c.get('peso', 0))
            except (TypeError, ValueError):
                raise serializers.ValidationError(f'Peso inválido en criterio "{cid}".')
            if peso < 0 or peso > 100:
                raise serializers.ValidationError(
                    f'El peso de "{cid}" debe estar entre 0 y 100.',
                )
        return value


class CasoListSerializer(serializers.ModelSerializer):
    docente_creador_username = serializers.CharField(source='docente_creador.username', read_only=True)
    escenarios_count = serializers.IntegerField(read_only=True)
    preguntas_count = serializers.IntegerField(read_only=True)
    tiene_rubrica = serializers.BooleanField(read_only=True)
    rubrica_resumen = serializers.SerializerMethodField()
    completitud_pct = serializers.SerializerMethodField()
    materia_display = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Caso
        fields = (
            'id', 'nombre', 'descripcion', 'area_psicosocial',
            'tiempo_estimado_min', 'estado', 'estado_display',
            'docente_creador', 'docente_creador_username', 'materia',
            'escenarios_count', 'preguntas_count', 'tiene_rubrica', 'rubrica_resumen',
            'completitud_pct', 'materia_display',
            'fecha_creacion', 'fecha_actualizacion',
        )
        read_only_fields = (
            'id', 'docente_creador', 'docente_creador_username',
            'escenarios_count', 'preguntas_count', 'tiene_rubrica', 'rubrica_resumen',
            'completitud_pct', 'materia_display', 'estado_display',
            'fecha_creacion', 'fecha_actualizacion',
        )

    def validate_materia(self, value):
        request = self.context.get('request')
        if request:
            validar_materia_docente(value, request.user)
        return value

    def get_rubrica_resumen(self, obj: Caso) -> str | None:
        rub = getattr(obj, 'rubrica', None)
        if rub is None:
            return None
        n = len(rub.criterios or [])
        if n == 0:
            return 'Sin criterios'
        return f'{n} criterio{"s" if n != 1 else ""}'

    def get_completitud_pct(self, obj: Caso) -> int:
        return completitud_porcentaje(obj)

    def get_materia_display(self, obj: Caso) -> str | None:
        if obj.materia_id:
            return obj.materia.nombre
        return (obj.area_psicosocial or '').strip() or None


class CasoDetalleSerializer(CasoListSerializer):
    escenarios = EscenarioSerializer(many=True, read_only=True)
    rubrica = RubricaSerializer(read_only=True)

    class Meta(CasoListSerializer.Meta):
        fields = CasoListSerializer.Meta.fields + (
            'desarrollo_situacional', 'contexto_historia',
            'escenarios', 'rubrica',
        )
