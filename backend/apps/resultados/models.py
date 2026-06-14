"""Modelos del dominio Resultados (RF37-RF42, RF47-RF48)."""

from django.db import models

from apps.participaciones.models import Participacion


class Resultado(models.Model):
    """Calificación y retroalimentación final de una participación."""

    participacion = models.OneToOneField(
        Participacion, on_delete=models.CASCADE, related_name='resultado',
    )
    correctas = models.PositiveIntegerField('respuestas correctas', default=0)
    incorrectas = models.PositiveIntegerField('respuestas incorrectas', default=0)
    no_respondidas = models.PositiveIntegerField('preguntas sin responder', default=0)
    peso_obtenido = models.PositiveIntegerField('peso obtenido', default=0)
    peso_total = models.PositiveIntegerField('peso total del caso', default=0)
    nota_final = models.DecimalField('nota final', max_digits=6, decimal_places=2, default=0)
    aprobado = models.BooleanField('aprobado según rúbrica', default=False)
    desglose_criterios = models.JSONField(
        'desglose por criterio de rúbrica',
        blank=True,
        default=list,
        help_text=(
            'Lista de objetos {criterio_id, nombre, peso, peso_obtenido, peso_total, '
            'porcentaje, nivel_alcanzado} calculados a partir de la rúbrica.'
        ),
    )
    feedback_docente = models.TextField('feedback general del docente', blank=True)
    notificado_estudiante = models.BooleanField('notificado al estudiante', default=False)
    fecha_calculo = models.DateTimeField('fecha del cálculo', auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Resultado'
        verbose_name_plural = 'Resultados'
        ordering = ['-fecha_calculo']

    def __str__(self) -> str:
        return f'Resultado de {self.participacion.estudiante.correo}: {self.nota_final}'


class ResultadoNarrativo(models.Model):
    """Resultado académico de una simulación narrativa (persistente en servidor)."""

    autorizacion = models.OneToOneField(
        'practicas.AutorizacionEstudiante',
        on_delete=models.CASCADE,
        related_name='resultado_narrativo',
    )
    practica = models.ForeignKey(
        'practicas.Practica',
        on_delete=models.CASCADE,
        related_name='resultados_narrativos',
    )
    estudiante = models.ForeignKey(
        'academico.Estudiante',
        on_delete=models.CASCADE,
        related_name='resultados_narrativos',
    )
    porcentaje = models.PositiveIntegerField('porcentaje de avance', default=0)
    entrevistas_realizadas = models.PositiveIntegerField(default=0)
    entrevistas_totales = models.PositiveIntegerField(default=0)
    evidencias_encontradas = models.PositiveIntegerField(default=0)
    contradicciones_detectadas = models.PositiveIntegerField(default=0)
    hipotesis_formuladas = models.PositiveIntegerField(default=0)
    estado_final = models.CharField('estado final', max_length=40, default='completada')
    fortalezas = models.JSONField('fortalezas', default=list, blank=True)
    aspectos_mejorar = models.JSONField('aspectos por mejorar', default=list, blank=True)
    resumen_pedagogico = models.JSONField('resumen pedagógico', default=dict, blank=True)
    fecha_finalizacion = models.DateTimeField('fecha de finalización')

    class Meta:
        verbose_name = 'Resultado narrativo'
        verbose_name_plural = 'Resultados narrativos'
        ordering = ['-fecha_finalizacion']

    def __str__(self) -> str:
        return f'Resultado narrativo {self.estudiante.correo} — {self.practica.nombre}'
