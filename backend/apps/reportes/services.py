"""Servicios de reportes: actividad, métricas docente y analítica agregada."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime

from django.db.models import Q
from django.utils import timezone

from apps.academico.models import Estudiante, Grupo, Materia
from apps.casos.models import Caso
from apps.practicas.models import Practica
from apps.resultados.models import Resultado
from apps.usuarios.models import Usuario


def _actor_nombre(usuario: Usuario | None) -> str:
    if usuario is None:
        return 'Sistema'
    return usuario.get_full_name() or usuario.username


def _evento(
    *,
    tipo: str,
    tipo_display: str,
    titulo: str,
    actor: Usuario | None,
    fecha: datetime,
    referencia_tipo: str,
    referencia_id: int,
) -> dict:
    if timezone.is_naive(fecha):
        fecha = timezone.make_aware(fecha, timezone.get_current_timezone())
    return {
        'tipo': tipo,
        'tipo_display': tipo_display,
        'titulo': titulo,
        'actor_id': actor.id if actor else None,
        'actor_nombre': _actor_nombre(actor),
        'fecha': fecha,
        'referencia_tipo': referencia_tipo,
        'referencia_id': referencia_id,
    }


def eventos_actividad(limit: int = 50) -> list[dict]:
    """Agrega eventos recientes a partir de timestamps existentes en el dominio."""
    por_fuente = max(limit, 10)

    eventos: list[dict] = []

    for docente in Usuario.objects.filter(rol=Usuario.Rol.DOCENTE).order_by('-date_joined')[:por_fuente]:
        eventos.append(_evento(
            tipo='DOCENTE_REGISTRO',
            tipo_display='Docente registrado',
            titulo=docente.get_full_name() or docente.username,
            actor=docente,
            fecha=docente.date_joined,
            referencia_tipo='usuario',
            referencia_id=docente.id,
        ))

    for caso in Caso.objects.select_related('docente_creador').order_by('-fecha_creacion')[:por_fuente]:
        eventos.append(_evento(
            tipo='CASO_CREADO',
            tipo_display='Caso creado',
            titulo=caso.nombre,
            actor=caso.docente_creador,
            fecha=caso.fecha_creacion,
            referencia_tipo='caso',
            referencia_id=caso.id,
        ))

    for practica in Practica.objects.select_related('docente', 'caso').order_by('-fecha_creacion')[:por_fuente]:
        eventos.append(_evento(
            tipo='PRACTICA_CREADA',
            tipo_display='Práctica agendada',
            titulo=f'{practica.nombre} · {practica.caso.nombre}',
            actor=practica.docente,
            fecha=practica.fecha_creacion,
            referencia_tipo='practica',
            referencia_id=practica.id,
        ))

    for resultado in Resultado.objects.select_related(
        'participacion__estudiante',
        'participacion__practica__docente',
        'participacion__practica',
    ).order_by('-fecha_calculo')[:por_fuente]:
        part = resultado.participacion
        eventos.append(_evento(
            tipo='RESULTADO_CALCULADO',
            tipo_display='Resultado calculado',
            titulo=(
                f'{part.estudiante.nombre_completo} · {part.practica.nombre} '
                f'(nota {resultado.nota_final})'
            ),
            actor=part.practica.docente,
            fecha=resultado.fecha_calculo,
            referencia_tipo='resultado',
            referencia_id=resultado.id,
        ))

    for estudiante in Estudiante.objects.select_related('docente_creador').order_by('-fecha_creacion')[:por_fuente]:
        eventos.append(_evento(
            tipo='ESTUDIANTE_CREADO',
            tipo_display='Estudiante registrado',
            titulo=f'{estudiante.nombre_completo} <{estudiante.correo}>',
            actor=estudiante.docente_creador,
            fecha=estudiante.fecha_creacion,
            referencia_tipo='estudiante',
            referencia_id=estudiante.id,
        ))

    for grupo in Grupo.objects.select_related('docente').order_by('-fecha_creacion')[:por_fuente]:
        eventos.append(_evento(
            tipo='GRUPO_CREADO',
            tipo_display='Grupo creado',
            titulo=grupo.nombre,
            actor=grupo.docente,
            fecha=grupo.fecha_creacion,
            referencia_tipo='grupo',
            referencia_id=grupo.id,
        ))

    for materia in Materia.objects.select_related('docente').order_by('-fecha_creacion')[:por_fuente]:
        eventos.append(_evento(
            tipo='MATERIA_CREADA',
            tipo_display='Materia creada',
            titulo=materia.nombre,
            actor=materia.docente,
            fecha=materia.fecha_creacion,
            referencia_tipo='materia',
            referencia_id=materia.id,
        ))

    eventos.sort(key=lambda e: e['fecha'], reverse=True)
    return eventos[:limit]


def _practicas_qs(user: Usuario):
    qs = Practica.objects.all()
    if user.rol == Usuario.Rol.DOCENTE:
        qs = qs.filter(docente=user)
    elif user.rol != Usuario.Rol.ADMIN:
        return Practica.objects.none()
    return qs


def _sin_feedback_qs(qs):
    return qs.filter(Q(feedback_docente='') | Q(feedback_docente__isnull=True))


def filtrar_resultados(
    user: Usuario,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    materia_id: int | None = None,
    grupo_id: int | None = None,
    estudiante_id: int | None = None,
):
    qs = Resultado.objects.select_related(
        'participacion__estudiante',
        'participacion__practica__caso',
        'participacion__practica__docente',
        'participacion__practica__materia',
        'participacion__practica__caso__materia',
    )
    if user.rol == Usuario.Rol.DOCENTE:
        qs = qs.filter(participacion__practica__docente=user)
    elif user.rol != Usuario.Rol.ADMIN:
        return Resultado.objects.none()

    if desde:
        qs = qs.filter(fecha_calculo__date__gte=desde)
    if hasta:
        qs = qs.filter(fecha_calculo__date__lte=hasta)
    if materia_id:
        qs = qs.filter(
            Q(participacion__practica__materia_id=materia_id)
            | Q(participacion__practica__caso__materia_id=materia_id),
        )
    if grupo_id:
        filt_grupo = Q(participacion__estudiante__grupos__id=grupo_id)
        if user.rol == Usuario.Rol.DOCENTE:
            filt_grupo &= Q(participacion__estudiante__grupos__docente=user)
        qs = qs.filter(filt_grupo)
    if estudiante_id:
        qs = qs.filter(participacion__estudiante_id=estudiante_id)
        if user.rol == Usuario.Rol.DOCENTE:
            qs = qs.filter(participacion__estudiante__docentes=user)
    return qs.distinct()


def metricas_docente(user: Usuario) -> dict:
    practicas = _practicas_qs(user)
    resultados = filtrar_resultados(user)
    activas = practicas.filter(
        estado__in=[Practica.Estado.SIN_INICIAR, Practica.Estado.EN_CURSO],
    ).count()
    casos_qs = Caso.objects.all()
    estudiantes_qs = Estudiante.objects.all()
    if user.rol == Usuario.Rol.DOCENTE:
        casos_qs = casos_qs.filter(docente_creador=user)
        estudiantes_qs = estudiantes_qs.filter(docentes=user)
    return {
        'casos': casos_qs.count(),
        'estudiantes': estudiantes_qs.count(),
        'practicas_activas': activas,
        'feedback_pendiente': _sin_feedback_qs(resultados).count(),
    }


def resumen_reportes(
    user: Usuario,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    materia_id: int | None = None,
    grupo_id: int | None = None,
) -> dict:
    practicas = _practicas_qs(user)
    resultados = filtrar_resultados(
        user, desde=desde, hasta=hasta, materia_id=materia_id, grupo_id=grupo_id,
    )

    practicas_filtradas = practicas
    if materia_id:
        practicas_filtradas = practicas_filtradas.filter(
            Q(materia_id=materia_id) | Q(caso__materia_id=materia_id),
        )
    if grupo_id:
        filt_grupo = Q(autorizaciones__estudiante__grupos__id=grupo_id)
        if user.rol == Usuario.Rol.DOCENTE:
            filt_grupo &= Q(autorizaciones__estudiante__grupos__docente=user)
        practicas_filtradas = practicas_filtradas.filter(filt_grupo).distinct()
    if desde:
        practicas_filtradas = practicas_filtradas.filter(fecha_inicio__date__gte=desde)
    if hasta:
        practicas_filtradas = practicas_filtradas.filter(fecha_inicio__date__lte=hasta)

    con_participantes = practicas_filtradas.filter(autorizaciones__isnull=False).distinct().count()
    finalizadas = practicas_filtradas.filter(estado=Practica.Estado.FINALIZADA).count()
    exportaciones = practicas_filtradas.filter(
        participaciones__resultado__isnull=False,
    ).distinct().count()

    return {
        'practicas': practicas_filtradas.count(),
        'con_participantes': con_participantes,
        'finalizadas': finalizadas,
        'exportaciones': exportaciones,
        'sin_feedback': _sin_feedback_qs(resultados).count(),
    }


def _desempeno_por_criterio(resultados) -> list[dict]:
    acc: dict[int, dict] = defaultdict(lambda: {'nombre': '', 'sum_pct': 0.0, 'count': 0})
    for resultado in resultados:
        for item in resultado.desglose_criterios or []:
            cid = item.get('criterio_id')
            if cid is None:
                continue
            acc[cid]['nombre'] = item.get('nombre') or f'Criterio {cid}'
            acc[cid]['sum_pct'] += float(item.get('porcentaje') or 0)
            acc[cid]['count'] += 1
    out = []
    for cid, data in sorted(acc.items(), key=lambda x: x[1]['nombre']):
        prom = round(data['sum_pct'] / data['count'], 2) if data['count'] else 0
        out.append({
            'criterio_id': cid,
            'nombre': data['nombre'],
            'porcentaje_promedio': prom,
        })
    return out


def _distribucion_notas(resultados) -> list[dict]:
    buckets = {'0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0}
    for resultado in resultados:
        nota = float(resultado.nota_final)
        if nota < 60:
            buckets['0-59'] += 1
        elif nota < 70:
            buckets['60-69'] += 1
        elif nota < 80:
            buckets['70-79'] += 1
        elif nota < 90:
            buckets['80-89'] += 1
        else:
            buckets['90-100'] += 1
    return [{'rango': rango, 'cantidad': cantidad} for rango, cantidad in buckets.items()]


def _feedback_pendiente_items(resultados_qs, limit: int = 20) -> list[dict]:
    qs = _sin_feedback_qs(resultados_qs).order_by('-fecha_calculo')[:limit]
    items = []
    for r in qs:
        part = r.participacion
        items.append({
            'resultado_id': r.id,
            'estudiante_nombre': part.estudiante.nombre_completo,
            'practica_nombre': part.practica.nombre,
            'nota_final': float(r.nota_final),
            'fecha_calculo': r.fecha_calculo,
        })
    return items


def analitica_reportes(
    user: Usuario,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    materia_id: int | None = None,
    grupo_id: int | None = None,
) -> dict:
    resultados_qs = filtrar_resultados(
        user, desde=desde, hasta=hasta, materia_id=materia_id, grupo_id=grupo_id,
    )
    resultados = list(resultados_qs)
    return {
        'desempeno_criterios': _desempeno_por_criterio(resultados),
        'distribucion_notas': _distribucion_notas(resultados),
        'feedback_pendiente': _feedback_pendiente_items(resultados_qs),
        'total_resultados': len(resultados),
    }


def eventos_actividad_docente(user: Usuario, limit: int = 10) -> list[dict]:
    """Eventos recientes del ámbito del docente (o todo si es admin)."""
    por_fuente = max(limit, 10)
    eventos: list[dict] = []

    casos = Caso.objects.select_related('docente_creador').order_by('-fecha_creacion')
    practicas = Practica.objects.select_related('docente', 'caso').order_by('-fecha_creacion')
    resultados = Resultado.objects.select_related(
        'participacion__estudiante',
        'participacion__practica__docente',
        'participacion__practica',
    ).order_by('-fecha_calculo')
    estudiantes = Estudiante.objects.select_related('docente_creador').order_by('-fecha_creacion')
    grupos = Grupo.objects.select_related('docente').order_by('-fecha_creacion')
    materias = Materia.objects.select_related('docente').order_by('-fecha_creacion')

    if user.rol == Usuario.Rol.DOCENTE:
        casos = casos.filter(docente_creador=user)
        practicas = practicas.filter(docente=user)
        resultados = resultados.filter(participacion__practica__docente=user)
        estudiantes = estudiantes.filter(docentes=user)
        grupos = grupos.filter(docente=user)
        materias = materias.filter(docente=user)

    for caso in casos[:por_fuente]:
        eventos.append(_evento(
            tipo='CASO_CREADO',
            tipo_display='Caso creado',
            titulo=caso.nombre,
            actor=caso.docente_creador,
            fecha=caso.fecha_creacion,
            referencia_tipo='caso',
            referencia_id=caso.id,
        ))

    for practica in practicas[:por_fuente]:
        eventos.append(_evento(
            tipo='PRACTICA_CREADA',
            tipo_display='Práctica agendada',
            titulo=f'{practica.nombre} · {practica.caso.nombre}',
            actor=practica.docente,
            fecha=practica.fecha_creacion,
            referencia_tipo='practica',
            referencia_id=practica.id,
        ))

    for resultado in resultados[:por_fuente]:
        part = resultado.participacion
        eventos.append(_evento(
            tipo='RESULTADO_CALCULADO',
            tipo_display='Resultado calculado',
            titulo=(
                f'{part.estudiante.nombre_completo} · {part.practica.nombre} '
                f'(nota {resultado.nota_final})'
            ),
            actor=part.practica.docente,
            fecha=resultado.fecha_calculo,
            referencia_tipo='resultado',
            referencia_id=resultado.id,
        ))

    for estudiante in estudiantes[:por_fuente]:
        eventos.append(_evento(
            tipo='ESTUDIANTE_CREADO',
            tipo_display='Estudiante registrado',
            titulo=f'{estudiante.nombre_completo} <{estudiante.correo}>',
            actor=estudiante.docente_creador,
            fecha=estudiante.fecha_creacion,
            referencia_tipo='estudiante',
            referencia_id=estudiante.id,
        ))

    for grupo in grupos[:por_fuente]:
        eventos.append(_evento(
            tipo='GRUPO_CREADO',
            tipo_display='Grupo creado',
            titulo=grupo.nombre,
            actor=grupo.docente,
            fecha=grupo.fecha_creacion,
            referencia_tipo='grupo',
            referencia_id=grupo.id,
        ))

    for materia in materias[:por_fuente]:
        eventos.append(_evento(
            tipo='MATERIA_CREADA',
            tipo_display='Materia creada',
            titulo=materia.nombre,
            actor=materia.docente,
            fecha=materia.fecha_creacion,
            referencia_tipo='materia',
            referencia_id=materia.id,
        ))

    eventos.sort(key=lambda e: e['fecha'], reverse=True)
    return eventos[:limit]


# =============================================================================
# Reportes temáticos (P1) — vista parametrizada para 7 informes
# =============================================================================

REPORTES_TEMATICOS = {
    'participacion': 'Participación',
    'desempeno': 'Desempeño',
    'respuestas': 'Respuestas',
    'tiempos': 'Tiempos',
    'notas': 'Notas',
    'retroalimentaciones': 'Retroalimentaciones',
    'feedback': 'Feedback pendiente',
}


def _format_tiempo(segundos: int) -> str:
    if not segundos:
        return '—'
    m, s = divmod(int(segundos), 60)
    h, m = divmod(m, 60)
    if h:
        return f'{h}h {m}m'
    return f'{m}m {s}s'


def _data_participacion(resultados_qs) -> dict:
    filas = []
    for r in resultados_qs:
        part = r.participacion
        practica = part.practica
        total_preg = sum(
            len(p.respuestas.all())
            for esc in practica.caso.escenarios.all()
            for p in esc.preguntas.all()
        ) or (r.correctas + r.incorrectas + r.no_respondidas)
        respondidas = r.correctas + r.incorrectas
        pct = round((respondidas / total_preg) * 100, 1) if total_preg else 0
        filas.append([
            part.estudiante.nombre_completo,
            part.estudiante.correo,
            practica.nombre,
            part.get_estado_display(),
            respondidas,
            r.no_respondidas,
            f'{pct}%',
        ])
    return {
        'titulo': 'Reporte de Participación',
        'subtitulo': 'Cobertura de respuestas por estudiante y práctica.',
        'columnas': ['Estudiante', 'Correo', 'Práctica', 'Estado', 'Respondidas',
                     'Sin responder', '% Cobertura'],
        'filas': filas,
    }


def _data_desempeno(resultados_qs) -> dict:
    resultados = list(resultados_qs)
    por_criterio = _desempeno_por_criterio(resultados)
    filas = []
    for c in por_criterio:
        prom = c['porcentaje_promedio']
        cualitativo = (
            'Sobresaliente' if prom >= 90
            else 'Logrado' if prom >= 70
            else 'En desarrollo' if prom >= 50
            else 'Incipiente'
        )
        filas.append([c['nombre'], f'{prom}%', cualitativo])
    return {
        'titulo': 'Reporte de Desempeño',
        'subtitulo': f'Promedio por criterio de rúbrica sobre {len(resultados)} resultado(s).',
        'columnas': ['Criterio', '% Promedio', 'Calificación cualitativa'],
        'filas': filas,
    }


def _data_respuestas(resultados_qs) -> dict:
    filas = []
    for r in resultados_qs:
        total = r.correctas + r.incorrectas + r.no_respondidas
        filas.append([
            r.participacion.estudiante.nombre_completo,
            r.participacion.practica.nombre,
            r.correctas, r.incorrectas, r.no_respondidas, total,
        ])
    return {
        'titulo': 'Reporte de Respuestas',
        'subtitulo': 'Conteo de respuestas correctas, incorrectas y sin responder.',
        'columnas': ['Estudiante', 'Práctica', 'Correctas', 'Incorrectas', 'Sin resp.', 'Total'],
        'filas': filas,
    }


def _data_tiempos(resultados_qs) -> dict:
    filas = []
    for r in resultados_qs:
        part = r.participacion
        max_min = part.practica.tiempo_max_min or 0
        max_seg = max_min * 60
        aprov = f'{round((part.tiempo_usado_seg / max_seg) * 100, 1)}%' if max_seg else '—'
        filas.append([
            part.estudiante.nombre_completo,
            part.practica.nombre,
            _format_tiempo(part.tiempo_usado_seg),
            max_min or '—',
            aprov,
        ])
    return {
        'titulo': 'Reporte de Tiempos',
        'subtitulo': 'Duración de la participación frente al tiempo máximo permitido.',
        'columnas': ['Estudiante', 'Práctica', 'Tiempo usado', 'Tiempo máx (min)', 'Aprovechamiento'],
        'filas': filas,
    }


def _data_notas(resultados_qs) -> dict:
    resultados = list(resultados_qs)
    filas = []
    for r in resultados:
        filas.append([
            r.participacion.estudiante.nombre_completo,
            r.participacion.practica.nombre,
            float(r.nota_final),
            'Sí' if r.aprobado else 'No',
            r.fecha_calculo.strftime('%Y-%m-%d %H:%M'),
        ])
    dist = _distribucion_notas(resultados)
    notas = [float(r.nota_final) for r in resultados]
    promedio = round(sum(notas) / len(notas), 2) if notas else 0
    return {
        'titulo': 'Reporte de Notas',
        'subtitulo': (
            f'{len(resultados)} resultado(s) · promedio {promedio} · '
            + ' · '.join(f'{b["rango"]}: {b["cantidad"]}' for b in dist)
        ),
        'columnas': ['Estudiante', 'Práctica', 'Nota final', 'Aprobado', 'Fecha'],
        'filas': filas,
    }


def _data_retroalimentaciones(resultados_qs) -> dict:
    qs = resultados_qs.exclude(feedback_docente='').exclude(feedback_docente__isnull=True)
    filas = []
    for r in qs:
        filas.append([
            r.participacion.estudiante.nombre_completo,
            r.participacion.practica.nombre,
            float(r.nota_final),
            (r.feedback_docente or '')[:600],
        ])
    return {
        'titulo': 'Reporte de Retroalimentaciones',
        'subtitulo': f'{qs.count()} resultado(s) con feedback entregado por el docente.',
        'columnas': ['Estudiante', 'Práctica', 'Nota', 'Feedback del docente'],
        'filas': filas,
    }


def _data_feedback(resultados_qs) -> dict:
    qs = _sin_feedback_qs(resultados_qs).order_by('-fecha_calculo')
    filas = []
    for r in qs:
        filas.append([
            r.participacion.estudiante.nombre_completo,
            r.participacion.estudiante.correo,
            r.participacion.practica.nombre,
            float(r.nota_final),
            r.fecha_calculo.strftime('%Y-%m-%d %H:%M'),
        ])
    return {
        'titulo': 'Reporte de Feedback pendiente',
        'subtitulo': f'{qs.count()} resultado(s) sin feedback del docente.',
        'columnas': ['Estudiante', 'Correo', 'Práctica', 'Nota', 'Fecha de cálculo'],
        'filas': filas,
    }


_TEMATICO_BUILDERS = {
    'participacion': _data_participacion,
    'desempeno': _data_desempeno,
    'respuestas': _data_respuestas,
    'tiempos': _data_tiempos,
    'notas': _data_notas,
    'retroalimentaciones': _data_retroalimentaciones,
    'feedback': _data_feedback,
}


def datos_reporte_tematico(
    tipo: str,
    user: Usuario,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    materia_id: int | None = None,
    grupo_id: int | None = None,
    estudiante_id: int | None = None,
) -> dict | None:
    """Devuelve `{titulo, subtitulo, columnas, filas}` o `None` si el tipo no existe."""
    builder = _TEMATICO_BUILDERS.get(tipo)
    if builder is None:
        return None
    qs = filtrar_resultados(
        user, desde=desde, hasta=hasta,
        materia_id=materia_id, grupo_id=grupo_id, estudiante_id=estudiante_id,
    ).prefetch_related(
        'participacion__practica__caso__escenarios__preguntas__respuestas',
    )
    return builder(qs)