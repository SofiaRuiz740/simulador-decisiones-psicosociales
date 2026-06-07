from django.urls import path

from .views import (
    admin_actividad,
    admin_docentes,
    admin_metricas,
    docente_actividad,
    docente_metricas,
    reporte_estudiante_excel,
    reporte_estudiante_pdf,
    reporte_grupo_excel,
    reporte_grupo_pdf,
    reporte_materia_excel,
    reporte_materia_pdf,
    reporte_practica_excel,
    reporte_practica_pdf,
    reportes_analitica,
    reportes_resumen,
)

app_name = 'reportes'

urlpatterns = [
    path('admin/metricas/', admin_metricas, name='admin_metricas'),
    path('admin/docentes/', admin_docentes, name='admin_docentes'),
    path('admin/actividad/', admin_actividad, name='admin_actividad'),
    path('docente/metricas/', docente_metricas, name='docente_metricas'),
    path('docente/actividad/', docente_actividad, name='docente_actividad'),
    path('resumen/', reportes_resumen, name='reportes_resumen'),
    path('analitica/', reportes_analitica, name='reportes_analitica'),
    path('practica/<int:practica_id>/pdf/', reporte_practica_pdf, name='reporte_practica_pdf'),
    path('practica/<int:practica_id>/excel/', reporte_practica_excel, name='reporte_practica_excel'),
    path('grupo/<int:grupo_id>/pdf/', reporte_grupo_pdf, name='reporte_grupo_pdf'),
    path('grupo/<int:grupo_id>/excel/', reporte_grupo_excel, name='reporte_grupo_excel'),
    path('materia/<int:materia_id>/pdf/', reporte_materia_pdf, name='reporte_materia_pdf'),
    path('materia/<int:materia_id>/excel/', reporte_materia_excel, name='reporte_materia_excel'),
    path('estudiante/<int:estudiante_id>/pdf/', reporte_estudiante_pdf, name='reporte_estudiante_pdf'),
    path('estudiante/<int:estudiante_id>/excel/', reporte_estudiante_excel, name='reporte_estudiante_excel'),
]
