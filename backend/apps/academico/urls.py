"""Rutas de la app academico (estudiantes y grupos)."""

from rest_framework.routers import DefaultRouter

from .views import EstudianteViewSet, GrupoViewSet, MateriaViewSet

app_name = 'academico'

router = DefaultRouter()
router.register('estudiantes', EstudianteViewSet, basename='estudiantes')
router.register('grupos', GrupoViewSet, basename='grupos')
router.register('materias', MateriaViewSet, basename='materias')

urlpatterns = router.urls
