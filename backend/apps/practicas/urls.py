"""Rutas de la app practicas."""

from rest_framework.routers import DefaultRouter

from .reintento_views import ReinicioPracticaViewSet, SolicitudReaperturaViewSet
from .views import PracticaViewSet

app_name = 'practicas'

router = DefaultRouter()
router.register('solicitudes-reapertura', SolicitudReaperturaViewSet, basename='solicitudes-reapertura')
router.register('reinicios', ReinicioPracticaViewSet, basename='reinicios-practica')
router.register('', PracticaViewSet, basename='practicas')

urlpatterns = router.urls
