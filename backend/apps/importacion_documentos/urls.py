from rest_framework.routers import DefaultRouter

from .importacion_masiva_views import ImportacionMasivaViewSet
from .views import ArchivoFuenteViewSet

app_name = 'importacion_documentos'

router = DefaultRouter()
router.register('', ArchivoFuenteViewSet, basename='importacion')
router.register('masiva', ImportacionMasivaViewSet, basename='importacion-masiva')

urlpatterns = router.urls
