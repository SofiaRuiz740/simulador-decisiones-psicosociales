"""Constructor del prompt experto para la generación de casos psicosociales.

Diseñado con instrucciones MUY específicas para evitar contenido genérico.
El prompt obliga a la IA a:
 - Trabajar como experto en psicología social aplicada.
 - Producir narrativa coherente con teorías reconocidas (conformidad, autoridad,
   disonancia cognitiva, identidad grupal, intervención, etc.).
 - Devolver un JSON estricto siguiendo el esquema solicitado.
 - Evitar respuestas obvias y retroalimentación vaga.
"""

from __future__ import annotations

import json

SYSTEM_PROMPT = """Eres un docente experto en psicología social aplicada al ámbito \
universitario y diseñador instruccional senior. Tu tarea es producir CASOS \
DE ESTUDIO INTERACTIVOS de alta calidad académica para un simulador de \
toma de decisiones.

Reglas de calidad obligatorias:
- Los casos deben anclarse en marcos reconocidos de psicología social: \
  conformidad (Asch), obediencia a la autoridad (Milgram), disonancia cognitiva \
  (Festinger), identidad grupal (Tajfel), bystander effect (Latané & Darley), \
  ética del cuidado, prejuicio y estereotipo, intervención comunitaria, etc.
- La narrativa debe ser inmersiva, en segunda persona ("tú"), con personajes \
  concretos, contexto verosímil universitario o comunitario y un conflicto central claro.
- Las decisiones deben ser SIGNIFICATIVAS: cada opción refleja una postura \
  psicosocial distinta. No usar opciones "obvias".
- La retroalimentación pedagógica debe explicar la teoría subyacente que \
  ilumina la decisión, no solo decir "bien/mal".
- La rúbrica debe alinearse con el objetivo de aprendizaje declarado.
- Evita lenguaje sensacionalista, ejemplos morbosos o estereotipos dañinos.
- Evita preguntas obvias y respuestas sin justificación.

Formato de salida:
- SIEMPRE responde con un único objeto JSON válido, sin texto fuera del JSON.
- Sigue EXACTAMENTE el esquema indicado en el mensaje del usuario.
- Todas las claves del esquema son obligatorias (puede haber strings vacíos \
  solo en campos opcionales explícitos).
- Los pesos de los criterios de la rúbrica deben sumar 100.
"""


def construir_user_prompt(payload: dict) -> str:
    """Construye el mensaje de usuario con el payload del docente y el esquema."""
    tema = payload['tema']
    objetivo = payload['objetivo_aprendizaje']
    nivel = payload.get('nivel_dificultad', 'medio')
    n_esc = int(payload.get('numero_escenarios', 3))
    n_preg = int(payload.get('numero_preguntas_por_escenario', 2))
    tono = payload.get('tono', 'académico, narrativo e interactivo')

    esquema = _esquema_json(n_esc, n_preg)

    return f"""Diseña un caso de estudio psicosocial siguiendo estos parámetros:

- Tema central: "{tema}"
- Objetivo de aprendizaje: "{objetivo}"
- Nivel de dificultad: {nivel}
- Número de escenarios: {n_esc}
- Número de preguntas por escenario: {n_preg}
- Tono narrativo: {tono}

Requisitos concretos:
1. Crea un personaje principal con nombre, rol académico/comunitario y motivación.
2. Define un conflicto central que evolucione a lo largo de los {n_esc} escenarios.
3. Cada escenario debe profundizar la tensión o introducir un nuevo dilema.
4. Cada pregunta debe ser una DECISIÓN con {n_preg if n_preg > 1 else 3}+ \
opciones donde solo una sea pedagógicamente "correcta" (o haga mayor honor a la \
teoría psicosocial), las demás reflejan posturas frecuentes pero limitadas. \
Asegura al menos 3 opciones por pregunta.
5. Cada opción debe llevar:
   - justificación teórica
   - retroalimentación pedagógica concreta (no "muy bien" / "incorrecto")
   - impacto_narrativo: qué consecuencia tiene en la historia si el estudiante \
     la elige.
6. Cada escenario debe sugerir un ambiente_visual_sugerido (ej.
   "auditorio universitario en penumbra, una sola luz sobre el panel") y la \
   emocion_principal (tensión, vergüenza, indignación, etc.) para que el cliente \
   web pueda ambientar la escena.
7. La rúbrica debe tener 3-5 criterios con pesos que sumen 100 y 4 niveles \
   de desempeño con descriptor concreto cada uno.
8. Incluye recomendaciones_docente: 2-3 oraciones sobre cómo usar este caso en clase.

Devuelve ÚNICAMENTE este objeto JSON, sin markdown ni texto adicional:

{esquema}
"""


def _esquema_json(n_esc: int, n_preg: int) -> str:
    """Devuelve un esquema-ejemplo del JSON esperado, en formato pretty para el prompt."""
    esquema = {
        'titulo': '<string corto y evocador>',
        'descripcion': '<string 2-3 oraciones>',
        'objetivo_aprendizaje': '<string>',
        'area_psicologia_social': '<string ej. "Conformidad y presión grupal">',
        'nivel_dificultad': '<bajo|medio|alto>',
        'tiempo_estimado': '<int minutos>',
        'storytelling': {
            'introduccion': '<párrafo de apertura en 2da persona>',
            'personaje_principal': '<nombre + rol + motivación>',
            'contexto_general': '<dónde y cuándo ocurre>',
            'conflicto_central': '<una oración>',
            'tono_narrativo': '<adjetivos>',
            'objetivo_del_estudiante': '<qué se espera que decida/aprenda>',
        },
        'escenarios': [
            {
                'titulo': '<string>',
                'contexto': '<situación inmediata>',
                'narrativa': '<3-5 oraciones en 2da persona>',
                'ambiente_visual_sugerido': '<descripción para arte>',
                'emocion_principal': '<una palabra>',
                'decision_clave': '<qué se decide aquí>',
                'preguntas': [
                    {
                        'enunciado': '<pregunta significativa>',
                        'tipo': 'seleccion_unica',
                        'opciones': [
                            {
                                'texto': '<opción 1>',
                                'es_correcta': True,
                                'justificacion': '<teoría>',
                                'retroalimentacion': '<pedagógica>',
                                'impacto_narrativo': '<consecuencia>',
                            },
                            {
                                'texto': '<opción 2>',
                                'es_correcta': False,
                                'justificacion': '<teoría>',
                                'retroalimentacion': '<pedagógica>',
                                'impacto_narrativo': '<consecuencia>',
                            },
                            {
                                'texto': '<opción 3>',
                                'es_correcta': False,
                                'justificacion': '<teoría>',
                                'retroalimentacion': '<pedagógica>',
                                'impacto_narrativo': '<consecuencia>',
                            },
                        ],
                    }
                    for _ in range(max(1, n_preg))
                ],
            }
            for _ in range(max(1, n_esc))
        ],
        'rubrica': {
            'criterios': [
                {
                    'nombre': '<criterio>',
                    'descripcion': '<qué evalúa>',
                    'puntaje_maximo': '<0-100, los pesos suman 100>',
                    'niveles': [
                        {'nivel': 'Incipiente', 'descripcion': '<descriptor>', 'puntaje': 25},
                        {'nivel': 'En desarrollo', 'descripcion': '<descriptor>', 'puntaje': 50},
                        {'nivel': 'Logrado', 'descripcion': '<descriptor>', 'puntaje': 75},
                        {'nivel': 'Sobresaliente', 'descripcion': '<descriptor>', 'puntaje': 100},
                    ],
                },
            ],
        },
        'retroalimentacion_general': '<cierre pedagógico>',
        'recomendaciones_docente': '<cómo usar en clase>',
    }
    return json.dumps(esquema, ensure_ascii=False, indent=2)
