"""Rutas del módulo de IA generativa."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PropuestaCasoIAViewSet,
    estado_ia_view,
    generar_caso_view,
)

app_name = 'ia_generativa'

router = DefaultRouter()
router.register('propuestas', PropuestaCasoIAViewSet, basename='propuestas')

urlpatterns = [
    path('generar-caso/', generar_caso_view, name='generar_caso'),
    path('estado/', estado_ia_view, name='estado_ia'),
    *router.urls,
]
