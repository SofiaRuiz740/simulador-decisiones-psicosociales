"""Servicios de extracción de texto y parseo estructurado de casos."""

from __future__ import annotations

import re
from pathlib import Path

from pypdf import PdfReader


def extraer_texto(ruta: str | Path, tipo: str) -> str:
    """Extrae texto plano de un archivo. Soporta PDF, DOCX y TXT."""
    p = Path(ruta)
    if tipo == 'PDF':
        try:
            reader = PdfReader(str(p))
            return '\n\n'.join((page.extract_text() or '') for page in reader.pages).strip()
        except Exception as exc:  # noqa: BLE001
            return f'[Error al extraer PDF: {exc}]'
    if tipo == 'TXT':
        return p.read_text(encoding='utf-8', errors='replace')
    if tipo == 'DOCX':
        try:
            import docx  # python-docx
        except ImportError:
            return '[DOCX no soportado: falta python-docx en requirements.]'
        try:
            doc = docx.Document(str(p))
            parrafos = [par.text for par in doc.paragraphs]
            return '\n'.join(parrafos).strip()
        except Exception as exc:  # noqa: BLE001
            return f'[Error al extraer DOCX: {exc}]'
    return ''


# =============================================================================
# Parser de estructura de caso (P2 — RF14 / mejora sobre texto plano)
# =============================================================================

_RE_SECCION_DATOS = re.compile(r'^=+\s*DATOS\s+GENERALES\s*=+\s*$', re.I)
_RE_SECCION_CONTEXTO = re.compile(r'^=+\s*CONTEXTO(\s+E\s+HISTORIA)?\s*=+\s*$', re.I)
_RE_SECCION_RUBRICA = re.compile(r'^=+\s*R[ÚU]BRICA(\s+\(.+\))?\s*=+\s*$', re.I)
_RE_SECCION_ESCENARIO = re.compile(r'^=+\s*ESCENARIO\s+(\d+)\s*=+\s*$', re.I)
_RE_TITULO = re.compile(r'^\s*T[íi]tulo\s*:\s*(.+)$', re.I)
_RE_NARRATIVA = re.compile(r'^\s*Narrativa\s*:\s*(.+)$', re.I)
_RE_NOMBRE_DG = re.compile(r'^\s*Nombre\s*:\s*(.+)$', re.I)
_RE_AREA_DG = re.compile(r'^\s*[ÁA]rea(\s+psicosocial)?\s*:\s*(.+)$', re.I)
_RE_TIEMPO_DG = re.compile(r'^\s*Tiempo(\s+estimado)?\s*\(?min\)?\s*:\s*(\d+)', re.I)
_RE_PREGUNTA = re.compile(r'^\s*Pregunta\s+(\d+)\s*:\s*(.+)$', re.I)
_RE_OPCION = re.compile(r'^\s*([A-Z])\s*[\.\)]\s*(.+)$')
_RE_CORRECTA = re.compile(r'^\s*Respuesta\s+correcta\s*:\s*([A-Z](?:\s*[,/y]\s*[A-Z])*)\s*$', re.I)


def _placeholder(texto: str) -> bool:
    """`[foo]` y similares no se consideran contenido real."""
    t = texto.strip()
    return bool(t) and t.startswith('[') and t.endswith(']')


def parsear_estructura_caso(texto: str) -> dict:
    """Devuelve la estructura detectada en el texto siguiendo el formato de la
    plantilla DOCX. Si una sección no aparece, su valor queda vacío. Es
    *defensivo*: si el parser no detecta nada útil, devuelve `escenarios=[]` y
    deja el comportamiento de texto plano sin tocar.

    Estructura:
        {
          'datos': {'nombre': str, 'area': str, 'tiempo_min': int|None},
          'contexto': str,
          'escenarios': [
            {
              'orden': 1,
              'titulo': str,
              'narrativa': str,
              'preguntas': [
                {
                  'orden': 1,
                  'enunciado': str,
                  'opciones': [{'letra': 'A', 'texto': str, 'correcta': bool}, ...]
                }
              ]
            }
          ]
        }
    """
    out: dict = {
        'datos': {'nombre': '', 'area': '', 'tiempo_min': None},
        'contexto': '',
        'escenarios': [],
    }

    if not texto or not isinstance(texto, str):
        return out

    lineas = [ln.rstrip() for ln in texto.replace('\r\n', '\n').split('\n')]

    seccion = None          # 'datos' | 'contexto' | 'escenario' | 'rubrica' | None
    escenario_actual = None
    pregunta_actual = None
    buffer_contexto: list[str] = []

    def cerrar_pregunta():
        nonlocal pregunta_actual
        if pregunta_actual is not None and escenario_actual is not None:
            escenario_actual['preguntas'].append(pregunta_actual)
            pregunta_actual = None

    def cerrar_escenario():
        nonlocal escenario_actual
        cerrar_pregunta()
        if escenario_actual is not None:
            out['escenarios'].append(escenario_actual)
            escenario_actual = None

    for raw in lineas:
        ln = raw.strip()

        # Marcadores de sección.
        if _RE_SECCION_DATOS.match(raw):
            cerrar_escenario()
            seccion = 'datos'
            continue
        if _RE_SECCION_CONTEXTO.match(raw):
            cerrar_escenario()
            seccion = 'contexto'
            continue
        if _RE_SECCION_RUBRICA.match(raw):
            cerrar_escenario()
            seccion = 'rubrica'
            continue
        m_esc = _RE_SECCION_ESCENARIO.match(raw)
        if m_esc:
            cerrar_escenario()
            escenario_actual = {
                'orden': int(m_esc.group(1)),
                'titulo': '',
                'narrativa': '',
                'preguntas': [],
            }
            seccion = 'escenario'
            continue

        if not ln:
            continue

        # Dentro de DATOS GENERALES.
        if seccion == 'datos':
            if m := _RE_NOMBRE_DG.match(ln):
                v = m.group(1).strip()
                if not _placeholder(v):
                    out['datos']['nombre'] = v
            elif m := _RE_AREA_DG.match(ln):
                v = m.group(2).strip()
                if not _placeholder(v):
                    out['datos']['area'] = v
            elif m := _RE_TIEMPO_DG.match(ln):
                try:
                    out['datos']['tiempo_min'] = int(m.group(2))
                except (ValueError, IndexError):
                    pass

        # Contexto: todo lo que no sea placeholder se acumula.
        elif seccion == 'contexto':
            if not _placeholder(ln):
                buffer_contexto.append(ln)

        # Dentro de un ESCENARIO.
        elif seccion == 'escenario' and escenario_actual is not None:
            if m := _RE_TITULO.match(ln):
                v = m.group(1).strip()
                if not _placeholder(v):
                    escenario_actual['titulo'] = v
                continue
            if m := _RE_NARRATIVA.match(ln):
                v = m.group(1).strip()
                if not _placeholder(v):
                    escenario_actual['narrativa'] = v
                continue
            if m := _RE_PREGUNTA.match(ln):
                cerrar_pregunta()
                texto_preg = m.group(2).strip()
                pregunta_actual = {
                    'orden': int(m.group(1)),
                    'enunciado': texto_preg if not _placeholder(texto_preg) else '',
                    'opciones': [],
                }
                continue
            if pregunta_actual is not None:
                if m := _RE_CORRECTA.match(ln):
                    correctas = {c.strip().upper() for c in re.split(r'[,/y\s]+', m.group(1)) if c.strip()}
                    for op in pregunta_actual['opciones']:
                        if op['letra'] in correctas:
                            op['correcta'] = True
                    continue
                if m := _RE_OPCION.match(ln):
                    letra = m.group(1).upper()
                    texto_op = m.group(2).strip()
                    if not _placeholder(texto_op):
                        pregunta_actual['opciones'].append({
                            'letra': letra,
                            'texto': texto_op,
                            'correcta': False,
                        })
                    continue

    cerrar_escenario()
    out['contexto'] = '\n'.join(buffer_contexto).strip()
    return out


def aplicar_estructura_a_caso(caso, estructura: dict) -> dict:
    """Persiste los escenarios/preguntas/respuestas detectados sobre un Caso
    recién creado. Si la estructura no detectó escenarios, no toca nada
    (deja el contexto que ya escribió la view). Devuelve un resumen.
    """
    from apps.casos.models import Escenario, Pregunta, Respuesta

    resumen = {
        'escenarios_creados': 0,
        'preguntas_creadas': 0,
        'respuestas_creadas': 0,
    }

    # Si el parser encontró un contexto rico, lo usamos en vez del texto plano truncado.
    if estructura.get('contexto'):
        caso.contexto_historia = estructura['contexto'][:8000]
        caso.save(update_fields=['contexto_historia'])

    for esc_data in estructura.get('escenarios', []):
        escenario = Escenario.objects.create(
            caso=caso,
            orden=esc_data.get('orden') or (resumen['escenarios_creados'] + 1),
            titulo=esc_data.get('titulo') or f'Escenario {esc_data.get("orden", "")}'.strip(),
            narrativa=esc_data.get('narrativa') or '',
        )
        resumen['escenarios_creados'] += 1

        for preg_data in esc_data.get('preguntas', []):
            enunciado = preg_data.get('enunciado') or ''
            if not enunciado:
                continue
            pregunta = Pregunta.objects.create(
                escenario=escenario,
                orden=preg_data.get('orden') or 1,
                enunciado=enunciado,
            )
            resumen['preguntas_creadas'] += 1

            for idx, op in enumerate(preg_data.get('opciones', []), start=1):
                Respuesta.objects.create(
                    pregunta=pregunta,
                    orden=idx,
                    texto=op.get('texto', ''),
                    es_correcta=bool(op.get('correcta')),
                )
                resumen['respuestas_creadas'] += 1

    return resumen
