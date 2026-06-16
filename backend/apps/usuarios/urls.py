"""Rutas de la app usuarios."""

from django.urls import path

from apps.practicas.views import AccesoEstudianteView

from .views import (
    LogoutView,
    PerfilView,
    RegistroDocenteView,
    admin_cambiar_rol,
    admin_listar_usuarios,
)

app_name = 'usuarios'

urlpatterns = [
    path('registro-docente/', RegistroDocenteView.as_view(), name='registro_docente'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('estudiante-acceso/', AccesoEstudianteView.as_view(), name='estudiante_acceso'),
    # Admin only: corregir roles cuando un usuario quedó mal registrado.
    path('admin/usuarios/', admin_listar_usuarios, name='admin_listar_usuarios'),
    path('admin/usuarios/<int:user_id>/rol/', admin_cambiar_rol, name='admin_cambiar_rol'),
]
