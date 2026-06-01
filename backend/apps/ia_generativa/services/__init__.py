"""Servicios del módulo de IA generativa.

Exporta la interfaz pública:

- ``generar_propuesta_caso(payload, docente)`` → crea una ``PropuestaCasoIA``
  ya validada y persistida en estado ``EN_REVISION``.

Internamente está dividido en:
- ``ai_provider``: wrapper sobre OpenAI / Anthropic / stub.
- ``prompt_builder``: construye el prompt experto para psicología social.
- ``case_generator``: orquesta provider + prompt + validación + persistencia.
"""

from .case_generator import generar_propuesta_caso, convertir_propuesta_en_caso

__all__ = ['generar_propuesta_caso', 'convertir_propuesta_en_caso']
