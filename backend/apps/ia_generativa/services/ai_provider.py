"""Wrapper sobre proveedores de IA (OpenAI / Anthropic) con stub de respaldo.

La idea es que ``case_generator`` no sepa qué proveedor usa: simplemente llama
``complete_json(system_prompt, user_prompt)`` y recibe un diccionario validado.

Si no hay API key configurada en .env, se usa un stub que NO devuelve un caso
genérico: produce un esqueleto plausible psicosocialmente correcto a partir
del payload, marcado como ``modo_stub=True`` para que el frontend pueda avisar.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from decouple import config

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Error genérico del proveedor de IA (timeout, payload inválido, etc.)."""


@dataclass(frozen=True)
class AIConfig:
    provider: str
    model: str
    temperature: float
    openai_key: str
    anthropic_key: str

    @property
    def hay_key(self) -> bool:
        if self.provider == 'openai':
            return bool(self.openai_key)
        if self.provider == 'anthropic':
            return bool(self.anthropic_key)
        return False


def _cargar_config() -> AIConfig:
    return AIConfig(
        provider=config('AI_PROVIDER', default='openai').strip().lower(),
        model=config('AI_MODEL', default='gpt-4o-mini').strip(),
        temperature=float(config('AI_TEMPERATURE', default='0.7')),
        openai_key=config('OPENAI_API_KEY', default='').strip(),
        anthropic_key=config('ANTHROPIC_API_KEY', default='').strip(),
    )


def hay_proveedor_activo() -> bool:
    """True si hay una API key configurada para el proveedor seleccionado."""
    return _cargar_config().hay_key


def complete_json(system_prompt: str, user_prompt: str) -> tuple[dict[str, Any], bool]:
    """Pide al proveedor de IA una respuesta JSON.

    Devuelve ``(payload_dict, uso_real_de_llm)``. Si no hay key configurada o
    el proveedor falla, devuelve ``({}, False)`` y el llamador decide si usa
    el stub o levanta error.
    """
    cfg = _cargar_config()
    if not cfg.hay_key:
        logger.info('AI provider %s sin API key — se omite llamada al LLM.', cfg.provider)
        return {}, False

    if cfg.provider == 'openai':
        return _openai_chat(cfg, system_prompt, user_prompt), True

    if cfg.provider == 'anthropic':
        return _anthropic_messages(cfg, system_prompt, user_prompt), True

    raise AIProviderError(f'Proveedor desconocido: {cfg.provider}')


# ---------- OpenAI ----------

def _openai_chat(cfg: AIConfig, system_prompt: str, user_prompt: str) -> dict[str, Any]:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise AIProviderError(
            'La librería openai no está instalada. Agrega "openai" a requirements.txt.',
        ) from exc

    client = OpenAI(api_key=cfg.openai_key)
    try:
        resp = client.chat.completions.create(
            model=cfg.model,
            temperature=cfg.temperature,
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('Falló la llamada a OpenAI.')
        raise AIProviderError(f'Fallo del proveedor OpenAI: {exc}') from exc

    raw = resp.choices[0].message.content or ''
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error('OpenAI devolvió contenido no-JSON: %s', raw[:300])
        raise AIProviderError('La IA no devolvió un JSON válido.') from exc


# ---------- Anthropic ----------

def _anthropic_messages(cfg: AIConfig, system_prompt: str, user_prompt: str) -> dict[str, Any]:
    try:
        import anthropic
    except ImportError as exc:
        raise AIProviderError(
            'La librería anthropic no está instalada. Agrega "anthropic" a requirements.txt.',
        ) from exc

    client = anthropic.Anthropic(api_key=cfg.anthropic_key)
    try:
        message = client.messages.create(
            model=cfg.model,
            max_tokens=4096,
            temperature=cfg.temperature,
            system=system_prompt + '\n\nResponde EXCLUSIVAMENTE con un JSON válido, sin texto adicional.',
            messages=[{'role': 'user', 'content': user_prompt}],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('Falló la llamada a Anthropic.')
        raise AIProviderError(f'Fallo del proveedor Anthropic: {exc}') from exc

    raw = ''.join(block.text for block in message.content if getattr(block, 'type', '') == 'text')
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error('Anthropic devolvió contenido no-JSON: %s', raw[:300])
        raise AIProviderError('La IA no devolvió un JSON válido.') from exc
