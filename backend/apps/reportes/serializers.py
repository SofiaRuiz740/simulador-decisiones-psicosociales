"""Serializers para endpoints admin de reportes."""

from rest_framework import serializers


class DocenteAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    nombre_completo = serializers.CharField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()
    casos_count = serializers.IntegerField()
    practicas_count = serializers.IntegerField()
    estudiantes_count = serializers.IntegerField()
    grupos_count = serializers.IntegerField()
    materias_count = serializers.IntegerField()


class EventoActividadSerializer(serializers.Serializer):
    tipo = serializers.CharField()
    tipo_display = serializers.CharField()
    titulo = serializers.CharField()
    actor_id = serializers.IntegerField(allow_null=True)
    actor_nombre = serializers.CharField()
    fecha = serializers.DateTimeField()
    referencia_tipo = serializers.CharField()
    referencia_id = serializers.IntegerField()
