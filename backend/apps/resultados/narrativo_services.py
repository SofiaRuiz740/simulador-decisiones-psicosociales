"""Persistencia y retroalimentación de resultados de simulación narrativa."""

from __future__ import annotations

from django.utils import timezone

from apps.practicas.models import AutorizacionEstudiante

from .models import ResultadoNarrativo


def generar_retroalimentacion(resumen: dict) -> tuple[list[str], list[str]]:
    """Genera fortalezas y aspectos por mejorar a partir del resumen pedagógico."""
    fortalezas: list[str] = []
    aspectos: list[str] = []

    total_entrevistas = int(resumen.get('totalConversaciones') or 0)
    total_evidencias = int(resumen.get('totalEvidencias') or 0)
    total_contradicciones = int(resumen.get('totalContradicciones') or 0)
    total_hipotesis = int(resumen.get('totalHipotesis') or 0)

    trazabilidad = resumen.get('trazabilidad') or {}
    conversaciones = trazabilidad.get('conversaciones') or []
    entrevistas_utiles = sum(1 for c in conversaciones if c.get('cuentaComoUtil'))

    if total_contradicciones >= 1:
        fortalezas.append('Identificó inconsistencias relevantes en el caso.')
    else:
        aspectos.append('No detectó contradicciones clave entre las fuentes.')

    if total_evidencias >= 3:
        fortalezas.append('Exploró evidencias de forma sistemática.')
    elif total_evidencias > 0:
        aspectos.append('No revisó todas las evidencias disponibles.')
    else:
        aspectos.append('No registró evidencias durante la exploración.')

    if entrevistas_utiles >= 3:
        fortalezas.append('Profundizó en testimonios clínicos relevantes.')
    elif total_entrevistas >= 2:
        aspectos.append('Faltó profundizar en testimonios clave.')
    else:
        aspectos.append('Realizó pocas entrevistas respecto al caso.')

    if total_hipotesis >= 1:
        fortalezas.append('Formuló hipótesis psicosociales fundamentadas.')
    else:
        aspectos.append('No formuló hipótesis explícitas sobre el caso.')

    if total_contradicciones >= 2 and total_evidencias >= 2:
        fortalezas.append('Contrastó fuentes correctamente.')

    if not fortalezas:
        fortalezas.append('Completó la simulación y registró su recorrido clínico.')

    if not aspectos:
        aspectos.append('Continúe integrando entrevistas, evidencias e hipótesis en futuras prácticas.')

    return fortalezas, aspectos


def guardar_resultado_narrativo(
    auth: AutorizacionEstudiante,
    *,
    porcentaje: int,
    entrevistas_realizadas: int,
    entrevistas_totales: int,
    evidencias_encontradas: int,
    contradicciones_detectadas: int,
    hipotesis_formuladas: int,
    estado_final: str,
    resumen_pedagogico: dict,
) -> ResultadoNarrativo:
    fortalezas, aspectos = generar_retroalimentacion(resumen_pedagogico)

    resultado, _ = ResultadoNarrativo.objects.update_or_create(
        autorizacion=auth,
        defaults={
            'practica': auth.practica,
            'estudiante': auth.estudiante,
            'porcentaje': min(100, max(0, porcentaje)),
            'entrevistas_realizadas': entrevistas_realizadas,
            'entrevistas_totales': entrevistas_totales,
            'evidencias_encontradas': evidencias_encontradas,
            'contradicciones_detectadas': contradicciones_detectadas,
            'hipotesis_formuladas': hipotesis_formuladas,
            'estado_final': estado_final,
            'fortalezas': fortalezas,
            'aspectos_mejorar': aspectos,
            'resumen_pedagogico': resumen_pedagogico,
            'fecha_finalizacion': timezone.now(),
        },
    )
    return resultado


def fila_resultado_narrativo(res: ResultadoNarrativo) -> dict:
    return {
        'id': res.id,
        'practica_id': res.practica_id,
        'practica_nombre': res.practica.nombre,
        'caso_nombre': res.practica.caso.nombre,
        'estudiante_id': res.estudiante_id,
        'estudiante_nombre': res.estudiante.nombre_completo,
        'estudiante_correo': res.estudiante.correo,
        'porcentaje': res.porcentaje,
        'entrevistas_realizadas': res.entrevistas_realizadas,
        'entrevistas_totales': res.entrevistas_totales,
        'evidencias_encontradas': res.evidencias_encontradas,
        'contradicciones_detectadas': res.contradicciones_detectadas,
        'hipotesis_formuladas': res.hipotesis_formuladas,
        'estado_final': res.estado_final,
        'fortalezas': res.fortalezas,
        'aspectos_mejorar': res.aspectos_mejorar,
        'fecha_finalizacion': res.fecha_finalizacion,
    }
