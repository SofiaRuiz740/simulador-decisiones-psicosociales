"""Seed completo del entorno UNIVERSITARIO de demostración.

Ejecutar:
    docker compose exec backend python manage.py seed_demo
    docker compose exec backend python manage.py seed_demo --reset

`--reset` borra los datos demo creados por este script (no toca al admin
de plataforma ni datos de usuarios reales fuera de la "Universidad Demo").

Crea:
- 1 administrador académico de la Universidad Demo
- 4 docentes universitarios (Psicología Social, Ética Profesional,
  Bienestar Universitario, Intervención Psicosocial)
- 8 programas académicos representados en Materia.programa
- 10 asignaturas
- 5 grupos académicos
- 20 estudiantes universitarios con correos institucionales
- 8 casos completos (cada uno con 3-5 escenarios, preguntas, respuestas,
  rúbrica con competencias y retroalimentación por competencia)
- 10 prácticas en estados variados (Programada, En curso, Finalizada, Vencida)
- Autorizaciones con códigos personalizados UNI-XXX-NNN
- Algunas participaciones simuladas con resultados ya calculados

Todo el lenguaje es de educación superior — sin referencias a colegio,
grado noveno/décimo/once, aulas escolares, acudientes, etc.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models.signals import post_save
from django.utils import timezone

from apps.academico.models import Estudiante, Grupo, InscripcionGrupo, Materia
from apps.casos.models import Caso, Escenario, Pregunta, Respuesta, Rubrica
from apps.participaciones.models import Participacion, RespuestaSeleccionada
from apps.practicas.models import AutorizacionEstudiante, Practica
from apps.practicas.signals import notificar_estudiante
from apps.resultados.services import calcular_resultado
from apps.usuarios.models import Usuario

UNIVERSIDAD = 'Universidad Demo de Ciencias Humanas y Tecnología'
DOMINIO = 'universidaddemo.edu.co'
PASSWORD_DEMO = 'Demo123!'
PERIODO = '2026-1'


# ---------------------------------------------------------------------------
# DATOS DEMO
# ---------------------------------------------------------------------------

PROGRAMAS = [
    'Psicología',
    'Trabajo Social',
    'Ingeniería de Software',
    'Administración de Empresas',
    'Derecho',
    'Comunicación Social',
    'Licenciatura en Educación',
    'Enfermería',
]

DOCENTES = [
    {
        'username': 'marcela.gutierrez',
        'email': 'marcela.gutierrez@universidaddemo.edu.co',
        'first_name': 'Marcela',
        'last_name': 'Gutiérrez',
        'asignatura_principal': 'Psicología Social',
        'programa_principal': 'Psicología',
        'titulo': 'Dra.',
    },
    {
        'username': 'carlos.molina',
        'email': 'carlos.molina@universidaddemo.edu.co',
        'first_name': 'Carlos Andrés',
        'last_name': 'Molina',
        'asignatura_principal': 'Ética Profesional',
        'programa_principal': 'Administración de Empresas',
        'titulo': 'Prof.',
    },
    {
        'username': 'paola.salazar',
        'email': 'paola.salazar@universidaddemo.edu.co',
        'first_name': 'Paola Andrea',
        'last_name': 'Salazar',
        'asignatura_principal': 'Bienestar Universitario',
        'programa_principal': 'Trabajo Social',
        'titulo': 'Mg.',
    },
    {
        'username': 'hernan.ramirez',
        'email': 'hernan.ramirez@universidaddemo.edu.co',
        'first_name': 'Hernán',
        'last_name': 'Ramírez',
        'asignatura_principal': 'Intervención Psicosocial',
        'programa_principal': 'Psicología',
        'titulo': 'Dr.',
    },
]

# (nombre_asignatura, programa, docente_username)
ASIGNATURAS = [
    ('Psicología Social', 'Psicología', 'marcela.gutierrez'),
    ('Ética Profesional', 'Administración de Empresas', 'carlos.molina'),
    ('Convivencia Universitaria', 'Licenciatura en Educación', 'paola.salazar'),
    ('Proyecto de Vida Universitario', 'Psicología', 'marcela.gutierrez'),
    ('Habilidades Socioemocionales', 'Trabajo Social', 'paola.salazar'),
    ('Resolución de Conflictos', 'Derecho', 'carlos.molina'),
    ('Intervención Psicosocial', 'Psicología', 'hernan.ramirez'),
    ('Responsabilidad Social Universitaria', 'Comunicación Social', 'hernan.ramirez'),
    ('Bienestar Universitario', 'Trabajo Social', 'paola.salazar'),
    ('Toma de Decisiones Éticas', 'Administración de Empresas', 'carlos.molina'),
]

# (nombre_grupo, descripcion, asignatura, docente_username)
GRUPOS = [
    ('Psicología Social - Grupo A', 'Sexto semestre, jornada diurna', 'Psicología Social', 'marcela.gutierrez'),
    ('Ética Profesional - Grupo B', 'Quinto semestre, jornada vespertina', 'Ética Profesional', 'carlos.molina'),
    ('Bienestar Universitario - Grupo C', 'Tercer semestre, formación transversal', 'Bienestar Universitario', 'paola.salazar'),
    ('Intervención Psicosocial - Grupo A', 'Séptimo semestre, énfasis en prácticas', 'Intervención Psicosocial', 'hernan.ramirez'),
    ('Proyecto de Vida Universitario - Grupo D', 'Segundo semestre, curso introductorio', 'Proyecto de Vida Universitario', 'marcela.gutierrez'),
]

# Lista exacta solicitada por el contexto. (first, last, semestre, programa)
ESTUDIANTES = [
    ('Laura Valentina', 'Mejía',     5, 'Psicología'),
    ('Juan Sebastián',  'Ríos',      4, 'Ingeniería de Software'),
    ('Mariana',         'López Castaño', 6, 'Trabajo Social'),
    ('Andrés Felipe',   'Muñoz',     3, 'Derecho'),
    ('Camila',          'Torres Ramírez', 7, 'Psicología'),
    ('Santiago',        'Gómez Quintero', 5, 'Administración de Empresas'),
    ('Daniela',         'Ramírez Soto', 4, 'Comunicación Social'),
    ('Nicolás',         'Castaño Arias', 6, 'Enfermería'),
    ('Isabella',        'Morales Peña', 5, 'Psicología'),
    ('Mateo',           'Quintero Salazar', 8, 'Licenciatura en Educación'),
    ('Sofía',           'Restrepo Vargas', 3, 'Trabajo Social'),
    ('Alejandro',       'Ospina Giraldo', 7, 'Ingeniería de Software'),
    ('Valeria',         'Gómez Díaz', 4, 'Comunicación Social'),
    ('David',           'Hernández Ruiz', 6, 'Derecho'),
    ('Juliana',         'Cardona Vélez', 5, 'Enfermería'),
    ('Samuel',          'Arango López', 3, 'Administración de Empresas'),
    ('Manuela',         'Ortiz Patiño', 8, 'Psicología'),
    ('Esteban',         'Duque Marín', 6, 'Trabajo Social'),
    ('Natalia',         'Herrera Cano', 4, 'Licenciatura en Educación'),
    ('Felipe',          'Valencia Rojas', 5, 'Ingeniería de Software'),
]


def _correo_estudiante(first: str, last: str) -> str:
    """laura.mejia@universidaddemo.edu.co"""
    n1 = first.split()[0].lower()
    n2 = last.split()[0].lower()
    # Quita tildes básicas
    tabla = str.maketrans('áéíóúñü', 'aeiounu')
    return f'{n1.translate(tabla)}.{n2.translate(tabla)}@{DOMINIO}'


# ---------------------------------------------------------------------------
# CASOS UNIVERSITARIOS COMPLETOS
# ---------------------------------------------------------------------------
# Cada caso tiene una estructura común que el método _crear_caso entiende.

CASOS = [
    {
        'nombre': 'Presión académica y toma de decisiones éticas',
        'descripcion': (
            'Un estudiante universitario de últimos semestres enfrenta entregas '
            'acumuladas y considera comprar un trabajo ya elaborado para no '
            'perder la asignatura.'
        ),
        'contexto_historia': (
            'Camila cursa octavo semestre en la Universidad Demo. La semana '
            'previa a la entrega del proyecto integrador acumula dos parciales '
            'pendientes y un compromiso laboral en su práctica profesional. '
            'Un compañero le ofrece comprar un trabajo elaborado por un tercero '
            'para garantizar su nota mínima de aprobación.'
        ),
        'area': 'Ética académica · educación superior',
        'programa': 'Administración de Empresas',
        'asignatura': 'Toma de Decisiones Éticas',
        'tiempo_min': 30,
        'docente': 'carlos.molina',
        'criterios': [
            ('valoracion_etica', 'Valoración ética del dilema',
             'Conviene reforzar el análisis de las implicaciones éticas y los '
             'principios institucionales antes de tomar decisiones bajo presión.'),
            ('responsabilidad_academica', 'Responsabilidad académica',
             'Se recomienda fortalecer la planificación, la comunicación con '
             'docentes y el uso de los apoyos académicos disponibles en la '
             'universidad.'),
            ('alternativas_institucionales', 'Uso de canales institucionales',
             'Es importante identificar las rutas oficiales (coordinación '
             'académica, bienestar universitario, tutorías) como respuesta '
             'sostenible al problema.'),
        ],
        'escenarios': [
            {
                'titulo': 'El ofrecimiento del compañero',
                'narrativa': (
                    'Camila revisa el cronograma y siente que no llega. '
                    'En la cafetería, su compañero le insiste: «por el costo '
                    'de un almuerzo te aseguras la nota».'
                ),
                'preguntas': [
                    {
                        'enunciado': '¿Cómo describirías el dilema que enfrenta Camila?',
                        'calificable': False,
                        'competencia': '',
                        'respuestas': [
                            ('Una decisión meramente económica sin más implicaciones', False),
                            ('Un dilema ético entre presión académica y honestidad', False),
                            ('Una situación cotidiana que no merece reflexión', False),
                        ],
                    },
                    {
                        'enunciado': '¿Qué decisión es la más coherente con los principios académicos universitarios?',
                        'calificable': True,
                        'competencia': 'valoracion_etica',
                        'respuestas': [
                            ('Aceptar la oferta, ya nadie revisa esos trabajos', False),
                            ('Rechazar la oferta y hablar con el docente para acordar una entrega alterna', True),
                            ('Aceptar parcialmente: copiar solo algunos apartados', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'La ruta institucional',
                'narrativa': (
                    'Camila recuerda que la facultad ofrece tutorías académicas '
                    'y que bienestar universitario tiene un programa de manejo '
                    'de carga académica para estudiantes en práctica.'
                ),
                'preguntas': [
                    {
                        'enunciado': '¿Cuál sería el primer canal institucional apropiado?',
                        'calificable': True,
                        'competencia': 'alternativas_institucionales',
                        'respuestas': [
                            ('Esperar a que el docente se entere por sí mismo', False),
                            ('Solicitar una asesoría con la coordinación académica del programa', True),
                            ('Renunciar a la asignatura sin notificar a nadie', False),
                        ],
                    },
                    {
                        'enunciado': '¿Qué acción demuestra responsabilidad académica?',
                        'calificable': True,
                        'competencia': 'responsabilidad_academica',
                        'respuestas': [
                            ('Planificar entregas parciales y negociar fechas con el docente', True),
                            ('Pasar la noche en vela copiando contenido sin citarlo', False),
                            ('Inventar una incapacidad médica', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'Decisión y consecuencias',
                'narrativa': (
                    'Camila debe escoger entre comprar el trabajo, entregar lo '
                    'que tiene asumiendo la nota, o solicitar formalmente una '
                    'prórroga argumentada.'
                ),
                'preguntas': [
                    {
                        'enunciado': '¿Cuál es la consecuencia esperable de comprar el trabajo si el reglamento lo detecta?',
                        'calificable': True,
                        'competencia': 'valoracion_etica',
                        'respuestas': [
                            ('Una felicitación por la creatividad', False),
                            ('Apertura de proceso disciplinario por fraude académico', True),
                            ('Nada, esos procesos no se aplican', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Conflicto en trabajo colaborativo',
        'descripcion': (
            'Un equipo universitario debe entregar un proyecto final pero dos '
            'integrantes no han cumplido sus responsabilidades.'
        ),
        'contexto_historia': (
            'En la asignatura Resolución de Conflictos, un equipo de cinco '
            'estudiantes debe entregar el proyecto final. A tres días del cierre, '
            'dos integrantes no han enviado sus avances ni responden el chat. '
            'El líder del equipo plantea presentar el trabajo sin ellos.'
        ),
        'area': 'Convivencia y trabajo en equipo',
        'programa': 'Derecho',
        'asignatura': 'Resolución de Conflictos',
        'tiempo_min': 25,
        'docente': 'carlos.molina',
        'criterios': [
            ('comunicacion_asertiva', 'Comunicación asertiva',
             'Se recomienda fortalecer la apertura del diálogo formal con los '
             'integrantes antes de tomar decisiones unilaterales.'),
            ('corresponsabilidad', 'Corresponsabilidad académica',
             'Conviene reconocer el aporte individual dentro del trabajo '
             'colaborativo y documentar evidencias del proceso.'),
            ('mediacion_conflictos', 'Mediación de conflictos',
             'Se sugiere acudir a la coordinación del programa o a un tutor '
             'cuando el conflicto compromete la entrega.'),
        ],
        'escenarios': [
            {
                'titulo': 'El silencio del equipo',
                'narrativa': 'Faltan tres días para entregar y dos integrantes no responden.',
                'preguntas': [
                    {
                        'enunciado': '¿Cuál es la primera acción asertiva?',
                        'calificable': True,
                        'competencia': 'comunicacion_asertiva',
                        'respuestas': [
                            ('Convocar una reunión virtual obligatoria con fecha y agenda', True),
                            ('Subir el trabajo sin ellos y avisar al docente al final', False),
                            ('Publicar quejas en redes sobre sus compañeros', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'La mediación',
                'narrativa': 'Tras la convocatoria, uno responde con disculpas, el otro no aparece.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué decisión es coherente con la corresponsabilidad?',
                        'calificable': True,
                        'competencia': 'corresponsabilidad',
                        'respuestas': [
                            ('Reasignar tareas, documentar el proceso y comunicar al docente', True),
                            ('Cubrir el trabajo del ausente sin avisar', False),
                            ('No hacer nada y aceptar una mala calificación grupal', False),
                        ],
                    },
                    {
                        'enunciado': '¿Cuándo conviene escalar el caso a la coordinación académica?',
                        'calificable': True,
                        'competencia': 'mediacion_conflictos',
                        'respuestas': [
                            ('Cuando el conflicto compromete la entrega y se agotaron las vías internas', True),
                            ('Nunca: estos asuntos son privados', False),
                            ('Solo cuando alguien renuncia a la materia', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Ciberacoso en comunidad universitaria',
        'descripcion': (
            'En el grupo de mensajería de una asignatura se difunden '
            'comentarios ofensivos sobre una estudiante.'
        ),
        'contexto_historia': (
            'En el chat de la asignatura Convivencia Universitaria comienzan '
            'a aparecer memes y comentarios despectivos sobre Laura, '
            'compañera de clase. Algunos integrantes ríen, otros guardan '
            'silencio. Laura pide al moderador que pare; el moderador dice '
            '«es solo humor».'
        ),
        'area': 'Convivencia digital',
        'programa': 'Licenciatura en Educación',
        'asignatura': 'Convivencia Universitaria',
        'tiempo_min': 25,
        'docente': 'paola.salazar',
        'criterios': [
            ('identificacion_violencia', 'Identificación de violencia digital',
             'Conviene reforzar el reconocimiento temprano de signos de '
             'violencia digital en espacios académicos.'),
            ('activacion_rutas', 'Activación de rutas institucionales',
             'Se recomienda fortalecer la activación oportuna de rutas de '
             'apoyo institucional ante situaciones de violencia.'),
            ('rol_observador', 'Rol del observador',
             'Se sugiere profundizar en la responsabilidad del observador '
             'frente a situaciones de violencia.'),
        ],
        'escenarios': [
            {
                'titulo': 'El chat se calienta',
                'narrativa': 'Los memes aumentan y se mencionan rasgos físicos de Laura.',
                'preguntas': [
                    {
                        'enunciado': '¿Cómo categorizarías la situación?',
                        'calificable': True,
                        'competencia': 'identificacion_violencia',
                        'respuestas': [
                            ('Humor inofensivo entre amigos', False),
                            ('Una forma de violencia digital y acoso entre pares', True),
                            ('Un asunto personal de Laura', False),
                        ],
                    },
                    {
                        'enunciado': '¿Cómo describirías tu reacción inmediata como observador?',
                        'calificable': False,
                        'competencia': '',
                        'respuestas': [
                            ('Reír y seguir', False),
                            ('Sentir incomodidad y dudar qué hacer', False),
                            ('Salir del chat sin más', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'Las rutas institucionales',
                'narrativa': 'Laura te pregunta a quién acudir.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué ruta institucional sugieres?',
                        'calificable': True,
                        'competencia': 'activacion_rutas',
                        'respuestas': [
                            ('Bienestar universitario y el comité de convivencia académica', True),
                            ('No hacer nada y esperar que pase', False),
                            ('Resolverlo confrontando al agresor a solas', False),
                        ],
                    },
                    {
                        'enunciado': '¿Qué actitud refleja un rol responsable como observador?',
                        'calificable': True,
                        'competencia': 'rol_observador',
                        'respuestas': [
                            ('Acompañar a Laura, documentar evidencias y reportar a bienestar', True),
                            ('Pretender que no vi nada', False),
                            ('Publicar la situación en redes sin consentimiento', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Consumo de sustancias y presión de grupo',
        'descripcion': (
            'Durante una integración universitaria, un estudiante recibe '
            'presión para consumir sustancias antes de una actividad académica.'
        ),
        'contexto_historia': (
            'Andrés, estudiante de cuarto semestre, asiste a una integración '
            'organizada por su programa. Al día siguiente tiene una '
            'sustentación oral. Varios compañeros insisten en que consuma '
            'sustancias para «relajarse» esa noche.'
        ),
        'area': 'Bienestar y autocuidado',
        'programa': 'Trabajo Social',
        'asignatura': 'Bienestar Universitario',
        'tiempo_min': 25,
        'docente': 'paola.salazar',
        'criterios': [
            ('autocuidado', 'Autocuidado universitario',
             'Conviene fortalecer las estrategias personales de autocuidado '
             'y de regulación frente a la presión del grupo.'),
            ('toma_decisiones', 'Toma de decisiones responsables',
             'Se recomienda profundizar en la valoración integral de '
             'consecuencias antes de tomar decisiones de riesgo.'),
        ],
        'escenarios': [
            {
                'titulo': 'La presión empieza',
                'narrativa': 'Los compañeros insisten: «todos lo van a hacer».',
                'preguntas': [
                    {
                        'enunciado': '¿Cuál es la respuesta más coherente con el autocuidado?',
                        'calificable': True,
                        'competencia': 'autocuidado',
                        'respuestas': [
                            ('Aceptar para no quedar mal con el grupo', False),
                            ('Decir que no de forma firme y retirarse del espacio si es necesario', True),
                            ('Aceptar y «aguantar» la sustentación como pueda', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'La sustentación',
                'narrativa': 'Faltan ocho horas para la sustentación.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué decisión protege mejor el desempeño académico?',
                        'calificable': True,
                        'competencia': 'toma_decisiones',
                        'respuestas': [
                            ('Descansar, hidratarse y revisar la presentación', True),
                            ('Trasnochar consumiendo sustancias para «relajarse»', False),
                            ('Faltar a la sustentación sin avisar', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Dilema ético en práctica profesional',
        'descripcion': (
            'Un estudiante en práctica observa una conducta inadecuada y duda '
            'si reportarla por temor a consecuencias.'
        ),
        'contexto_historia': (
            'Daniela realiza su práctica profesional en una entidad. Observa '
            'que su jefe directo solicita pagos en efectivo no reportados y '
            'le pide que omita esa información en los informes.'
        ),
        'area': 'Ética profesional',
        'programa': 'Comunicación Social',
        'asignatura': 'Ética Profesional',
        'tiempo_min': 30,
        'docente': 'carlos.molina',
        'criterios': [
            ('responsabilidad_profesional', 'Responsabilidad profesional',
             'Se recomienda fortalecer la postura ética independiente '
             'frente a presiones del entorno laboral.'),
            ('canales_reporte', 'Conocimiento de canales de reporte',
             'Conviene profundizar en los mecanismos institucionales y '
             'legales para reportar conductas indebidas.'),
        ],
        'escenarios': [
            {
                'titulo': 'La solicitud incómoda',
                'narrativa': 'El jefe pide omitir información en el reporte semanal.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué hacer ante la solicitud?',
                        'calificable': True,
                        'competencia': 'responsabilidad_profesional',
                        'respuestas': [
                            ('Cumplir para no perder la práctica', False),
                            ('Negarse, documentar la situación y consultar con el tutor académico', True),
                            ('Hacer lo que pide a medias', False),
                        ],
                    },
                ],
            },
            {
                'titulo': 'La denuncia',
                'narrativa': 'Daniela decide reportar.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué canal es el más apropiado en primer lugar?',
                        'calificable': True,
                        'competencia': 'canales_reporte',
                        'respuestas': [
                            ('Tutor académico y coordinación de prácticas del programa', True),
                            ('Publicar la denuncia en redes sociales', False),
                            ('Quedarse callada para protegerse', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Manejo de ansiedad antes de una exposición',
        'descripcion': 'Una estudiante presenta ansiedad intensa antes de una sustentación final.',
        'contexto_historia': (
            'Isabella va a sustentar su trabajo de grado. Treinta minutos '
            'antes empieza a hiperventilar y plantea abandonar la sala.'
        ),
        'area': 'Salud mental universitaria',
        'programa': 'Psicología',
        'asignatura': 'Habilidades Socioemocionales',
        'tiempo_min': 20,
        'docente': 'paola.salazar',
        'criterios': [
            ('regulacion_emocional', 'Regulación emocional',
             'Se recomienda practicar estrategias de respiración, anclaje y '
             'autoinstrucción ante situaciones de alta exigencia.'),
            ('busqueda_apoyo', 'Búsqueda de apoyo',
             'Conviene reforzar el uso de los servicios de bienestar y de '
             'tutoría para situaciones académicas críticas.'),
        ],
        'escenarios': [
            {
                'titulo': 'El minuto de crisis',
                'narrativa': 'Isabella respira mal y dice que se va.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué estrategia es más útil en el momento?',
                        'calificable': True,
                        'competencia': 'regulacion_emocional',
                        'respuestas': [
                            ('Respiración pausada 4-7-8 y un anclaje breve', True),
                            ('Tomar tres cafés seguidos', False),
                            ('Salir corriendo del edificio', False),
                        ],
                    },
                    {
                        'enunciado': '¿A quién conviene acudir esa misma semana?',
                        'calificable': True,
                        'competencia': 'busqueda_apoyo',
                        'respuestas': [
                            ('Servicio de bienestar universitario para acompañamiento psicológico', True),
                            ('A nadie, ya pasará', False),
                            ('Pedir prestados ansiolíticos a un compañero', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Inclusión de un compañero con discapacidad',
        'descripcion': (
            'Un grupo debe adaptar una actividad académica para incluir a un '
            'compañero con discapacidad.'
        ),
        'contexto_historia': (
            'Mateo, estudiante con discapacidad visual, se vincula al equipo '
            'para un proyecto de aula. Dos integrantes opinan que «retrasa» '
            'el trabajo y que prefieren hacerlo sin él.'
        ),
        'area': 'Inclusión y diversidad',
        'programa': 'Licenciatura en Educación',
        'asignatura': 'Responsabilidad Social Universitaria',
        'tiempo_min': 25,
        'docente': 'hernan.ramirez',
        'criterios': [
            ('empatia', 'Empatía y reconocimiento del otro',
             'Conviene reforzar el reconocimiento de la diversidad como una '
             'oportunidad y no como un obstáculo.'),
            ('adaptacion_colaborativa', 'Adaptación colaborativa',
             'Se recomienda fortalecer el diseño de actividades accesibles '
             'y los acuerdos compartidos del equipo.'),
        ],
        'escenarios': [
            {
                'titulo': 'La discusión del equipo',
                'narrativa': 'Algunos quieren excluir a Mateo.',
                'preguntas': [
                    {
                        'enunciado': '¿Qué respuesta refleja empatía y corresponsabilidad?',
                        'calificable': True,
                        'competencia': 'empatia',
                        'respuestas': [
                            ('Plantear roles según fortalezas y hacer accesibles los materiales', True),
                            ('Hacer el trabajo sin Mateo y reportar su no participación', False),
                            ('Aceptar la exclusión sin opinar', False),
                        ],
                    },
                    {
                        'enunciado': '¿Cuál es una adaptación colaborativa razonable?',
                        'calificable': True,
                        'competencia': 'adaptacion_colaborativa',
                        'respuestas': [
                            ('Usar lectores de pantalla y descripciones en audio para los materiales', True),
                            ('Asumir que Mateo se las arregla', False),
                            ('Asignarle solo tareas decorativas', False),
                        ],
                    },
                ],
            },
        ],
    },
    {
        'nombre': 'Uso responsable de inteligencia artificial',
        'descripcion': (
            'Un estudiante usa una herramienta de IA para desarrollar un '
            'ensayo completo sin citar ni revisar críticamente el contenido.'
        ),
        'contexto_historia': (
            'David, estudiante de Comunicación Social, debe escribir un '
            'ensayo crítico sobre opinión pública. Usa un asistente de IA '
            'para generar el texto completo, no verifica las fuentes ni '
            'cita el uso de la herramienta.'
        ),
        'area': 'Ética digital y académica',
        'programa': 'Comunicación Social',
        'asignatura': 'Toma de Decisiones Éticas',
        'tiempo_min': 25,
        'docente': 'carlos.molina',
        'criterios': [
            ('uso_etico_ia', 'Uso ético de herramientas de IA',
             'Se recomienda distinguir entre asistencia legítima y '
             'sustitución del propio razonamiento crítico.'),
            ('pensamiento_critico', 'Pensamiento crítico',
             'Conviene reforzar el contraste de fuentes y la verificación '
             'de información generada por IA.'),
            ('integridad_academica', 'Integridad académica',
             'Se sugiere conocer y aplicar la política institucional de '
             'integridad académica frente al uso de IA.'),
        ],
        'escenarios': [
            {
                'titulo': 'La entrega',
                'narrativa': 'David entrega el ensayo sin citar la IA.',
                'preguntas': [
                    {
                        'enunciado': '¿Cuál es la práctica más adecuada?',
                        'calificable': True,
                        'competencia': 'uso_etico_ia',
                        'respuestas': [
                            ('Usar la IA como apoyo, citar su uso y revisar críticamente cada afirmación', True),
                            ('Copiar literalmente y entregar', False),
                            ('No usar IA por temor', False),
                        ],
                    },
                    {
                        'enunciado': '¿Cómo verificar las afirmaciones generadas?',
                        'calificable': True,
                        'competencia': 'pensamiento_critico',
                        'respuestas': [
                            ('Contrastar con fuentes académicas confiables', True),
                            ('Asumir que la IA siempre acierta', False),
                            ('Buscar la primera entrada de Google', False),
                        ],
                    },
                    {
                        'enunciado': '¿Qué sanción podría aplicar la universidad?',
                        'calificable': True,
                        'competencia': 'integridad_academica',
                        'respuestas': [
                            ('Apertura de proceso disciplinario según el reglamento académico', True),
                            ('Una felicitación pública', False),
                            ('Nada, es algo común', False),
                        ],
                    },
                ],
            },
        ],
    },
]


# (nombre_practica, nombre_caso, dias_inicio_relativos, duracion_dias, estado_logico, asignatura_pref)
# estado_logico: 'programada' | 'en_curso' | 'finalizada' | 'vencida'
PRACTICAS = [
    ('Práctica: Ética profesional y toma de decisiones',
     'Presión académica y toma de decisiones éticas', 5, 14, 'programada',
     'Toma de Decisiones Éticas'),
    ('Práctica: Resolución de conflictos en equipos universitarios',
     'Conflicto en trabajo colaborativo', 0, 7, 'en_curso',
     'Resolución de Conflictos'),
    ('Práctica: Bienestar emocional y autocuidado',
     'Manejo de ansiedad antes de una exposición', 0, 10, 'en_curso',
     'Bienestar Universitario'),
    ('Práctica: Ciberconvivencia universitaria',
     'Ciberacoso en comunidad universitaria', -10, 7, 'finalizada',
     'Convivencia Universitaria'),
    ('Práctica: Responsabilidad social y vida universitaria',
     'Inclusión de un compañero con discapacidad', 14, 21, 'programada',
     'Responsabilidad Social Universitaria'),
    ('Práctica: Decisiones en práctica profesional',
     'Dilema ético en práctica profesional', -7, 14, 'vencida',
     'Ética Profesional'),
    ('Práctica: Inclusión y diversidad en educación superior',
     'Inclusión de un compañero con discapacidad', 3, 10, 'programada',
     'Responsabilidad Social Universitaria'),
    ('Práctica: Uso responsable de IA en contextos académicos',
     'Uso responsable de inteligencia artificial', 0, 14, 'en_curso',
     'Toma de Decisiones Éticas'),
    ('Práctica: Manejo de presión académica',
     'Consumo de sustancias y presión de grupo', -20, 10, 'finalizada',
     'Habilidades Socioemocionales'),
    ('Práctica: Comunicación asertiva en grupos de trabajo',
     'Conflicto en trabajo colaborativo', -3, 30, 'en_curso',
     'Habilidades Socioemocionales'),
]


# ---------------------------------------------------------------------------
# COMANDO
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = (
        'Crea el conjunto de datos demo orientado al contexto UNIVERSITARIO '
        '(Universidad Demo de Ciencias Humanas y Tecnología). '
        'Idempotente. Usa --reset para borrar todo lo creado por este script.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Borra primero todos los datos demo (Universidad Demo).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            self._reset()

        # Desconecta el signal que envía correo al crear AutorizacionEstudiante
        # para evitar 40+ correos durante el seed.
        post_save.disconnect(notificar_estudiante, sender=AutorizacionEstudiante)
        try:
            self.stdout.write(self.style.NOTICE(f'>>> Sembrando datos demo: {UNIVERSIDAD}'))
            admin = self._admin_universidad()
            docentes = self._docentes()
            materias = self._materias(docentes)
            estudiantes = self._estudiantes(list(docentes.values())[0])
            grupos = self._grupos(docentes, materias, estudiantes)
            casos = self._casos(docentes, materias)
            autorizaciones = self._practicas_y_autorizaciones(
                docentes, materias, estudiantes, casos,
            )
            self._simular_participaciones(autorizaciones)
        finally:
            # Reactiva el signal pase lo que pase.
            post_save.connect(notificar_estudiante, sender=AutorizacionEstudiante)

        self.stdout.write(self.style.SUCCESS('Listo. Resumen:'))
        self.stdout.write(f'  Administrador: {admin.email}')
        self.stdout.write(f'  Docentes:      {len(docentes)}')
        self.stdout.write(f'  Materias:      {len(materias)}')
        self.stdout.write(f'  Grupos:        {len(grupos)}')
        self.stdout.write(f'  Estudiantes:   {len(estudiantes)}')
        self.stdout.write(f'  Casos:         {len(casos)}')
        self.stdout.write(f'  Autorizaciones (códigos UNI-XXX): {len(autorizaciones)}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING(
            f'Credenciales de docentes y admin: password={PASSWORD_DEMO}',
        ))

    # -- pasos -------------------------------------------------------------

    def _reset(self):
        self.stdout.write(self.style.WARNING('>>> --reset: limpiando datos demo previos'))
        # Borra solo objetos relacionados con docentes demo.
        docente_emails = [d['email'] for d in DOCENTES]
        docentes_qs = Usuario.objects.filter(email__in=docente_emails)
        # Casos del demo: por nombre exacto.
        nombres_casos = [c['nombre'] for c in CASOS]
        Caso.objects.filter(nombre__in=nombres_casos).delete()
        # Prácticas del demo.
        nombres_practicas = [p[0] for p in PRACTICAS]
        Practica.objects.filter(nombre__in=nombres_practicas).delete()
        # Grupos.
        nombres_grupos = [g[0] for g in GRUPOS]
        Grupo.objects.filter(nombre__in=nombres_grupos).delete()
        # Materias y estudiantes (por dominio del correo).
        Materia.objects.filter(docente__in=docentes_qs).delete()
        Estudiante.objects.filter(correo__iendswith=DOMINIO).delete()
        # Por último los docentes demo.
        docentes_qs.delete()
        # Admin universidad demo (NO el admin de la plataforma).
        Usuario.objects.filter(email=f'admin.universidad@{DOMINIO}').delete()

    def _admin_universidad(self) -> Usuario:
        user, _ = Usuario.objects.update_or_create(
            email=f'admin.universidad@{DOMINIO}',
            defaults={
                'username': 'admin.universidad',
                'first_name': 'Administrador',
                'last_name': 'Universidad Demo',
                'rol': Usuario.Rol.ADMIN,
                'is_staff': True,
                'is_active': True,
            },
        )
        user.set_password(PASSWORD_DEMO)
        user.save()
        return user

    def _docentes(self) -> dict[str, Usuario]:
        out: dict[str, Usuario] = {}
        for d in DOCENTES:
            user, _ = Usuario.objects.update_or_create(
                email=d['email'],
                defaults={
                    'username': d['username'],
                    'first_name': d['first_name'],
                    'last_name': d['last_name'],
                    'rol': Usuario.Rol.DOCENTE,
                    'is_active': True,
                },
            )
            user.set_password(PASSWORD_DEMO)
            user.save()
            out[d['username']] = user
        return out

    def _materias(self, docentes: dict[str, Usuario]) -> dict[str, Materia]:
        out: dict[str, Materia] = {}
        for nombre, programa, doc_user in ASIGNATURAS:
            docente = docentes[doc_user]
            materia, _ = Materia.objects.update_or_create(
                docente=docente, nombre=nombre,
                defaults={
                    'programa': programa,
                    'periodo': PERIODO,
                    'activo': True,
                },
            )
            out[nombre] = materia
        return out

    def _estudiantes(self, docente_default: Usuario) -> list[Estudiante]:
        out: list[Estudiante] = []
        for first, last, semestre, programa in ESTUDIANTES:
            correo = _correo_estudiante(first, last)
            est, _ = Estudiante.objects.update_or_create(
                correo=correo,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'identificacion': f'UNI-{abs(hash(correo)) % 999999:06d}',
                    'docente_creador': docente_default,
                    'activo': True,
                },
            )
            out.append(est)
        return out

    def _grupos(
        self,
        docentes: dict[str, Usuario],
        materias: dict[str, Materia],
        estudiantes: list[Estudiante],
    ) -> list[Grupo]:
        out: list[Grupo] = []
        for i, (nombre, descripcion, asignatura, doc_user) in enumerate(GRUPOS):
            docente = docentes[doc_user]
            materia = materias.get(asignatura)
            grupo, _ = Grupo.objects.update_or_create(
                docente=docente, nombre=nombre,
                defaults={
                    'descripcion': descripcion,
                    'periodo': PERIODO,
                    'materia': materia,
                },
            )
            # Vincula estudiantes al docente y al grupo (4 por grupo, intercalados).
            seleccion = estudiantes[i::5][:5] or estudiantes[:5]
            for est in seleccion:
                est.docentes.add(docente)
                InscripcionGrupo.objects.get_or_create(grupo=grupo, estudiante=est)
            out.append(grupo)
        return out

    def _casos(
        self,
        docentes: dict[str, Usuario],
        materias: dict[str, Materia],
    ) -> list[Caso]:
        out: list[Caso] = []
        for c in CASOS:
            docente = docentes[c['docente']]
            materia = materias.get(c['asignatura'])
            caso, _ = Caso.objects.update_or_create(
                nombre=c['nombre'],
                defaults={
                    'descripcion': c['descripcion'],
                    'contexto_historia': c['contexto_historia'],
                    'area_psicosocial': c['area'],
                    'tiempo_estimado_min': c['tiempo_min'],
                    'estado': Caso.Estado.VALIDADO,
                    'docente_creador': docente,
                    'materia': materia,
                },
            )
            # Rúbrica con criterios y retroalimentación por competencia.
            criterios = [
                {
                    'id': cid,
                    'nombre': nombre,
                    'descripcion': '',
                    'peso': round(100 / len(c['criterios'])),
                    'retroalimentacion': retro,
                    'niveles': [
                        {'nivel': 1, 'nombre': 'Incipiente', 'descriptor': ''},
                        {'nivel': 2, 'nombre': 'En desarrollo', 'descriptor': ''},
                        {'nivel': 3, 'nombre': 'Logrado', 'descriptor': ''},
                        {'nivel': 4, 'nombre': 'Sobresaliente', 'descriptor': ''},
                    ],
                }
                for cid, nombre, retro in c['criterios']
            ]
            # Ajusta los pesos para sumar 100 exactos.
            if criterios:
                total = sum(cr['peso'] for cr in criterios)
                if total != 100:
                    criterios[-1]['peso'] += 100 - total
            Rubrica.objects.update_or_create(
                caso=caso,
                defaults={
                    'descripcion': (
                        'Rúbrica con foco en competencias universitarias '
                        'de toma de decisiones éticas y psicosociales.'
                    ),
                    'escala_maxima': 5,
                    'nota_aprobacion': 3,
                    'criterios': criterios,
                },
            )
            # Escenarios + preguntas + respuestas.
            # Limpia escenarios previos para idempotencia.
            caso.escenarios.all().delete()
            for orden_esc, esc_data in enumerate(c['escenarios'], start=1):
                esc = Escenario.objects.create(
                    caso=caso,
                    orden=orden_esc,
                    titulo=esc_data['titulo'],
                    narrativa=esc_data['narrativa'],
                )
                for orden_p, p in enumerate(esc_data['preguntas'], start=1):
                    pregunta = Pregunta.objects.create(
                        escenario=esc,
                        orden=orden_p,
                        enunciado=p['enunciado'],
                        peso=1,
                        criterio_rubrica_id=p['competencia'],
                        calificable=p['calificable'],
                    )
                    for orden_r, (texto, correcta) in enumerate(p['respuestas'], start=1):
                        Respuesta.objects.create(
                            pregunta=pregunta,
                            orden=orden_r,
                            texto=texto,
                            es_correcta=correcta,
                            retroalimentacion='',
                        )
            out.append(caso)
        return out

    def _practicas_y_autorizaciones(
        self,
        docentes: dict[str, Usuario],
        materias: dict[str, Materia],
        estudiantes: list[Estudiante],
        casos: list[Caso],
    ) -> list[AutorizacionEstudiante]:
        """Crea prácticas en estados variados y autorizaciones con códigos UNI-XXX-NNN."""
        casos_por_nombre = {c.nombre: c for c in casos}
        now = timezone.now()
        out: list[AutorizacionEstudiante] = []

        for idx, (
            nombre_practica, nombre_caso, dias_inicio_rel, duracion_dias,
            estado_logico, asignatura_pref,
        ) in enumerate(PRACTICAS, start=1):
            caso = casos_por_nombre.get(nombre_caso)
            if not caso:
                continue
            docente = caso.docente_creador
            materia = materias.get(asignatura_pref) or caso.materia

            inicio = now + timedelta(days=dias_inicio_rel)
            fin = inicio + timedelta(days=duracion_dias)
            estado = {
                'programada': Practica.Estado.SIN_INICIAR,
                'en_curso': Practica.Estado.EN_CURSO,
                'finalizada': Practica.Estado.FINALIZADA,
                'vencida': Practica.Estado.SIN_INICIAR,  # ya pasó pero nadie la cerró
            }[estado_logico]

            practica, _ = Practica.objects.update_or_create(
                nombre=nombre_practica,
                defaults={
                    'caso': caso,
                    'docente': docente,
                    'materia': materia,
                    'fecha_inicio': inicio,
                    'fecha_fin': fin,
                    'tiempo_max_min': 30,
                    'lugar_fisico': 'Aula virtual',
                    'mensaje_personalizado': (
                        'Bienvenido. Lee con atención la situación, '
                        'analiza desde tu rol como estudiante universitario '
                        'y elige la respuesta que mejor refleje una decisión '
                        'ética y responsable.'
                    ),
                    'estado': estado,
                },
            )
            # Borrar autorizaciones viejas idempotentemente y recrear con
            # códigos UNI-XXX-NNN. Borramos en lote, no por instancia (más rápido).
            practica.autorizaciones.all().delete()

            # Asigna 4 estudiantes por práctica, rotando.
            seleccion = estudiantes[(idx - 1) * 2 % len(estudiantes):][:4] or estudiantes[:4]
            sufijo_uni = _sufijo_codigo(asignatura_pref)
            for j, est in enumerate(seleccion, start=1):
                est.docentes.add(docente)
                codigo = f'UNI-{sufijo_uni}-{idx:02d}{j:01d}'
                # bulk_create evita el signal de envío de correo.
                auth = AutorizacionEstudiante(
                    practica=practica,
                    estudiante=est,
                    codigo_acceso=codigo,
                    notificado=True,
                )
                auth.save()
                # Evitamos el signal: forzamos notificado=True después.
                AutorizacionEstudiante.objects.filter(pk=auth.pk).update(notificado=True)
                out.append(auth)
        return out

    def _simular_participaciones(
        self,
        autorizaciones: list[AutorizacionEstudiante],
    ) -> None:
        """Crea participaciones finalizadas con respuestas y resultados ya calculados.

        Solo lo hace para las primeras 6 autorizaciones (para no inflar la BD)
        y para prácticas que ya estén en curso o finalizadas.
        """
        elegidas = [
            a for a in autorizaciones
            if a.practica.estado in (
                Practica.Estado.EN_CURSO, Practica.Estado.FINALIZADA,
            )
        ][:6]
        if not elegidas:
            return
        now = timezone.now()
        for i, auth in enumerate(elegidas):
            part, _ = Participacion.objects.get_or_create(
                practica=auth.practica,
                estudiante=auth.estudiante,
                autorizacion=auth,
                defaults={
                    'inicio': now - timedelta(hours=2),
                    'fin': now - timedelta(hours=1),
                    'tiempo_usado_seg': 60 * 15,
                    'estado': Participacion.Estado.FINALIZADA,
                },
            )
            # Genera respuestas: las 2 primeras correctas, una incorrecta para
            # variedad. Esto provoca diversidad de notas en los resultados.
            preguntas = list(
                auth.practica.caso.escenarios.all().order_by('orden').values_list('id', flat=True)
            )
            from apps.casos.models import Pregunta as PreguntaM, Respuesta as RespuestaM
            preg_ids = list(PreguntaM.objects.filter(
                escenario__caso=auth.practica.caso, calificable=True,
            ).values_list('id', flat=True))
            for k, pid in enumerate(preg_ids):
                respuestas = list(RespuestaM.objects.filter(pregunta_id=pid))
                if not respuestas:
                    continue
                # Lógica: el estudiante i acierta en (i%3 + 1) de las primeras preguntas.
                acierta = (k <= i % len(preg_ids))
                escogida = next((r for r in respuestas if r.es_correcta), respuestas[0]) if acierta else respuestas[-1]
                RespuestaSeleccionada.objects.get_or_create(
                    participacion=part,
                    pregunta_id=pid,
                    defaults={'respuesta_elegida': escogida},
                )
            calcular_resultado(part)


def _sufijo_codigo(asignatura: str) -> str:
    """Mapea asignatura a 3 letras para el código UNI-XXX-NNN."""
    palabras = asignatura.upper().split()
    if not palabras:
        return 'GEN'
    if len(palabras) == 1:
        return palabras[0][:3]
    return (palabras[0][:1] + palabras[1][:1] + (palabras[2][:1] if len(palabras) > 2 else 'I')).ljust(3, 'X')
