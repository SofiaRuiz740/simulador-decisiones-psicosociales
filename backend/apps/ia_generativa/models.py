"""Modelos del módulo de IA generativa.

``PropuestaCasoIA`` guarda cada generación que hace el docente para que pueda
revisarla, aprobarla o rechazarla antes de convertirla en un ``Caso`` real.

El JSON completo devuelto por la IA queda en ``contenido_json`` (JSONField),
preservando estructura narrativa que el frontend usa para mostrar el preview
tipo juego.
"""

from django.conf import settings
from django.db import models


class PropuestaCasoIA(models.Model):
    """Una propuesta de caso generada por IA pendiente de revisión humana."""

    class Estado(models.TextChoices):
        BORRADOR = 'BORRADOR', 'Borrador'
        EN_REVISION = 'EN_REVISION', 'En revisión'
        APROBADO = 'APROBADO', 'Aprobado'
        RECHAZADO = 'RECHAZADO', 'Rechazado'
        CONVERTIDO_EN_CASO = 'CONVERTIDO_EN_CASO', 'Convertido en caso'

    docente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name='docente',
        on_delete=models.PROTECT,
        related_name='propuestas_ia',
    )

    tema = models.CharField('tema', max_length=300)
    objetivo_aprendizaje = models.TextField('objetivo de aprendizaje')
    nivel_dificultad = models.CharField('nivel de dificultad', max_length=20, default='medio')
    numero_escenarios = models.PositiveIntegerField('número de escenarios', default=3)
    numero_preguntas_por_escenario = models.PositiveIntegerField(
        'preguntas por escenario', default=2,
    )
    tono = models.CharField('tono narrativo', max_length=200, blank=True)

    contenido_json = models.JSONField(
        'contenido generado',
        blank=True,
        default=dict,
        help_text='Estructura completa generada por la IA (storytelling + escenarios + rúbrica).',
    )
    generada_con_llm = models.BooleanField(
        'generada con LLM real',
        default=False,
        help_text='False cuando se usó el stub por falta de API key.',
    )

    estado = models.CharField('estado', max_length=20, choices=Estado.choices, default=Estado.EN_REVISION)
    motivo_rechazo = models.TextField('motivo de rechazo', blank=True)

    caso_resultante = models.ForeignKey(
        'casos.Caso',
        verbose_name='caso resultante',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='propuestas_ia_origen',
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_aprobacion = models.DateTimeField('fecha de aprobación', null=True, blank=True)

    class Meta:
        verbose_name = 'Propuesta de caso IA'
        verbose_name_plural = 'Propuestas de caso IA'
        ordering = ['-fecha_creacion']

    def __str__(self) -> str:
        titulo = (self.contenido_json or {}).get('titulo') or self.tema
        return f'{titulo} ({self.estado})'
