from django.contrib import admin

from .models import Estudiante, Grupo, InscripcionGrupo, Materia


class InscripcionInline(admin.TabularInline):
    model = InscripcionGrupo
    extra = 0
    raw_id_fields = ('estudiante',)


@admin.register(Estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ('correo', 'first_name', 'last_name', 'docente_creador', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'docente_creador')
    search_fields = ('correo', 'first_name', 'last_name')
    autocomplete_fields = ('usuario', 'docente_creador')
    filter_horizontal = ('docentes',)


@admin.register(Materia)
class MateriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'programa', 'periodo', 'docente', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'docente')
    search_fields = ('nombre', 'programa')


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'docente', 'materia', 'periodo', 'fecha_creacion')
    list_filter = ('docente',)
    search_fields = ('nombre',)
    inlines = [InscripcionInline]
