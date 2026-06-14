import json

from .biblioteca_service import (
    cargar_personajes,
    cargar_escenarios
)

from .master_prompt import MASTER_PROMPT
personajes = cargar_personajes()
escenarios = cargar_escenarios()

personajes_json = json.dumps(
    personajes,
    ensure_ascii=False,
    indent=2
)

escenarios_json = json.dumps(
    escenarios,
    ensure_ascii=False,
    indent=2
)