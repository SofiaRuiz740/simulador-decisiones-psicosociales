import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

PERSONAJES_DIR = BASE_DIR / "biblioteca" / "personajes"
ESCENARIOS_DIR = BASE_DIR / "biblioteca" / "escenarios"


def cargar_personajes():
    personajes = []

    for archivo in PERSONAJES_DIR.glob("*.json"):
        with open(archivo, encoding="utf-8") as f:
            personajes.append(json.load(f))

    return personajes


def cargar_escenarios():
    escenarios = []

    for archivo in ESCENARIOS_DIR.glob("*.json"):
        with open(archivo, encoding="utf-8") as f:
            escenarios.append(json.load(f))

    return escenarios