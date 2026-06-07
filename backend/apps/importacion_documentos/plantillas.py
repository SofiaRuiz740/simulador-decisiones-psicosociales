"""Generación de plantillas estáticas para importación (caso, rúbrica, guía)."""

from __future__ import annotations

import io
import zipfile
from xml.sax.saxutils import escape

from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def _generar_docx(paragraphs: list[str]) -> bytes:
    """DOCX mínimo válido (sin dependencia python-docx)."""
    body = ''.join(
        f'<w:p><w:r><w:t xml:space="preserve">{escape(p)}</w:t></w:r></w:p>'
        for p in paragraphs
    )
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{body}<w:sectPr/></w:body>
</w:document>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>'''

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types)
        zf.writestr('_rels/.rels', rels)
        zf.writestr('word/document.xml', document_xml)
    return buffer.getvalue()


def generar_plantilla_caso() -> bytes:
    return _generar_docx([
        'PLANTILLA DE CASO — Simulador de decisiones psicosociales',
        '',
        '=== DATOS GENERALES ===',
        'Nombre: [Nombre del caso]',
        'Área psicosocial: [Ej. Convivencia escolar]',
        'Tiempo estimado (min): [30]',
        '',
        '=== CONTEXTO E HISTORIA ===',
        'Describa la situación, actores y antecedentes del caso…',
        '',
        '=== ESCENARIO 1 ===',
        'Título: [Título del escenario]',
        'Narrativa: [Descripción de la situación que enfrentará el estudiante]',
        '',
        'Pregunta 1: [Enunciado de la pregunta]',
        'A) [Opción A]',
        'B) [Opción B]',
        'C) [Opción C]',
        'Respuesta correcta: [A/B/C]',
        '',
        '=== RÚBRICA (referencia) ===',
        'Criterio 1 — Empatía (peso 30%)',
        'Criterio 2 — Análisis (peso 40%)',
        'Criterio 3 — Propuesta (peso 30%)',
    ])


def generar_caso_ejemplo() -> bytes:
    return _generar_docx([
        'CASO EJEMPLO — Conflicto en el aula',
        '',
        '=== DATOS GENERALES ===',
        'Nombre: Conflicto entre compañeros en clase de psicología',
        'Área psicosocial: Convivencia escolar',
        'Tiempo estimado (min): 25',
        '',
        '=== CONTEXTO E HISTORIA ===',
        'En un curso de psicología social, dos estudiantes han tenido un altercado '
        'durante una exposición. El docente solicita apoyo para mediar la situación '
        'sin escalar el conflicto.',
        '',
        '=== ESCENARIO 1 ===',
        'Título: Primer acercamiento',
        'Narrativa: Llegas al salón y observas tensión entre Ana y Pedro. '
        'Varios estudiantes miran expectantes.',
        '',
        'Pregunta 1: ¿Cuál es la primera acción más adecuada?',
        'A) Separar inmediatamente a ambos sin escuchar',
        'B) Invitar a cada uno a expresar su versión en un espacio calmado',
        'C) Ignorar el conflicto para continuar la clase',
        'Respuesta correcta: B',
    ])


def generar_plantilla_rubrica() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = 'Rubrica'
    ws.append([
        'criterio', 'descripcion', 'peso',
        'nivel_1_nombre', 'nivel_1_descriptor',
        'nivel_2_nombre', 'nivel_2_descriptor',
        'nivel_3_nombre', 'nivel_3_descriptor',
        'nivel_4_nombre', 'nivel_4_descriptor',
    ])
    ws.append([
        'Empatía',
        'Capacidad de identificar emociones del otro',
        30,
        'Incipiente', 'No reconoce emociones ajenas',
        'En desarrollo', 'Reconoce emociones básicas',
        'Logrado', 'Identifica emociones y contexto',
        'Sobresaliente', 'Demuestra comprensión profunda',
    ])
    ws.append([
        'Análisis',
        'Capacidad de analizar la situación psicosocial',
        40,
        'Incipiente', 'Análisis superficial',
        'En desarrollo', 'Identifica algunos factores',
        'Logrado', 'Analiza factores relevantes',
        'Sobresaliente', 'Análisis integral y fundamentado',
    ])
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def generar_guia_importacion() -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title='Guía de importación')
    styles = getSampleStyleSheet()
    elements = [
        Paragraph('<b>Guía de importación</b>', styles['Title']),
        Paragraph('Simulador de decisiones psicosociales', styles['Normal']),
        Spacer(1, 12),
        Paragraph('<b>1. Estudiantes (Excel/CSV)</b>', styles['Heading2']),
        Paragraph(
            'Columnas: nombre, correo, identificacion, materia, grupo. '
            'Descarga la plantilla desde la pestaña Plantillas.',
            styles['Normal'],
        ),
        Spacer(1, 8),
        Paragraph('<b>2. Grupos (Excel/CSV)</b>', styles['Heading2']),
        Paragraph(
            'Columnas: grupo, materia, periodo, estudiantes (correos separados por ;).',
            styles['Normal'],
        ),
        Spacer(1, 8),
        Paragraph('<b>3. Casos (DOCX/PDF/TXT)</b>', styles['Heading2']),
        Paragraph(
            'Sube un documento con datos generales, contexto, escenarios y preguntas. '
            'Usa la plantilla de caso como referencia de estructura.',
            styles['Normal'],
        ),
        Spacer(1, 8),
        Paragraph('<b>4. Rúbrica (Excel)</b>', styles['Heading2']),
        Paragraph(
            'La plantilla de rúbrica define criterios, pesos y niveles de desempeño. '
            'Puedes editarla y usarla como referencia al configurar la rúbrica del caso.',
            styles['Normal'],
        ),
    ]
    doc.build(elements)
    return buffer.getvalue()
