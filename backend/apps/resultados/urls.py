"""Rutas de la app resultados."""

from rest_framework.routers import DefaultRouter

from .narrativo_views import ResultadoNarrativoViewSet
from .views import ResultadoViewSet

app_name = 'resultados'

router = DefaultRouter()
router.register('narrativos', ResultadoNarrativoViewSet, basename='resultados-narrativos')
router.register('', ResultadoViewSet, basename='resultados')

urlpatterns = router.urls
