from django.contrib import admin

from .models import PropuestaCasoIA


@admin.register(PropuestaCasoIA)
class PropuestaCasoIAAdmin(admin.ModelAdmin):
    list_display = ('id', 'tema', 'docente', 'estado', 'generada_con_llm', 'fecha_creacion')
    list_filter = ('estado', 'generada_con_llm', 'nivel_dificultad')
    search_fields = ('tema', 'objetivo_aprendizaje', 'docente__username')
    readonly_fields = ('contenido_json', 'fecha_creacion', 'fecha_actualizacion')
