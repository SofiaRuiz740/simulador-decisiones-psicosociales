"""Serializers del módulo de IA generativa."""

from rest_framework import serializers

from .models import PropuestaCasoIA


NIVELES_DIFICULTAD = ('bajo', 'medio', 'alto')


class GenerarCasoRequestSerializer(serializers.Serializer):
    """Valida el payload del docente para ``POST /api/ia/generar-caso/``."""

    tema = serializers.CharField(min_length=4, max_length=300)
    objetivo_aprendizaje = serializers.CharField(min_length=10, max_length=600)
    nivel_dificultad = serializers.ChoiceField(choices=NIVELES_DIFICULTAD, default='medio')
    numero_escenarios = serializers.IntegerField(min_value=1, max_value=8, default=3)
    numero_preguntas_por_escenario = serializers.IntegerField(min_value=1, max_value=6, default=2)
    tono = serializers.CharField(max_length=200, default='académico, narrativo e interactivo')


class PropuestaCasoIASerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    titulo = serializers.SerializerMethodField()
    caso_resultante_id = serializers.IntegerField(source='caso_resultante.id', read_only=True, default=None)

    class Meta:
        model = PropuestaCasoIA
        fields = (
            'id', 'titulo',
            'tema', 'objetivo_aprendizaje',
            'nivel_dificultad', 'numero_escenarios',
            'numero_preguntas_por_escenario', 'tono',
            'estado', 'estado_display',
            'motivo_rechazo',
            'generada_con_llm',
            'caso_resultante_id',
            'contenido_json',
            'fecha_creacion', 'fecha_actualizacion', 'fecha_aprobacion',
        )
        read_only_fields = (
            'id', 'titulo', 'estado_display', 'generada_con_llm',
            'caso_resultante_id', 'contenido_json',
            'fecha_creacion', 'fecha_actualizacion', 'fecha_aprobacion',
        )

    def get_titulo(self, obj):
        return (obj.contenido_json or {}).get('titulo') or obj.tema


class RechazoSerializer(serializers.Serializer):
    motivo_rechazo = serializers.CharField(max_length=600, allow_blank=True, default='')
