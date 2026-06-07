"""Servicios de cálculo de Resultado a partir de una Participacion.

El cálculo considera la rúbrica del caso. Si la rúbrica define criterios
con pesos (suma = 100), la nota se obtiene combinando el porcentaje
acertado dentro de cada criterio ponderado por su peso. Si no hay
criterios definidos (o las preguntas no apuntan a ninguno), se usa el
cálculo plano histórico: peso_obtenido / peso_total * escala_maxima.
"""

from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail

from apps.casos.models import Pregunta
from apps.participaciones.models import Participacion, RespuestaSeleccionada

from .models import Resultado


def _nivel_alcanzado(porcentaje: float, niveles: list) -> dict | None:
    """Mapea un porcentaje 0-100 al nivel correspondiente.

    Distribución uniforme entre los niveles definidos (1..N). Si no hay
    niveles configurados, devuelve None.
    """
    if not niveles:
        return None
    ordenados = sorted(niveles, key=lambda n: int(n.get('nivel', 0) or 0))
    n = len(ordenados)
    if n == 0:
        return None
    tramo = 100 / n
    idx = min(int(porcentaje // tramo), n - 1)
    if porcentaje <= 0:
        idx = 0
    return ordenados[idx]


def notificar_resultado_estudiante(resultado: Resultado) -> None:
    """Envía correo con la nota al estudiante (RF42). Marca notificado si el envío sale bien."""
    if resultado.notificado_estudiante:
        return
    estudiante = resultado.participacion.estudiante
    practica = resultado.participacion.practica
    asunto = f'Resultado de la práctica: {practica.nombre}'
    cuerpo = (
        f'Hola {estudiante.nombre_completo},\n\n'
        f'Tu participación en la práctica «{practica.nombre}» fue calificada.\n'
        f'  • Nota final: {resultado.nota_final}\n'
        f'  • Estado: {"Aprobado" if resultado.aprobado else "No aprobado"}\n'
        f'  • Correctas: {resultado.correctas} · Incorrectas: {resultado.incorrectas}\n\n'
        f'Consulta el detalle en el simulador.\n'
    )
    try:
        send_mail(
            asunto,
            cuerpo,
            settings.DEFAULT_FROM_EMAIL,
            [estudiante.correo],
            fail_silently=True,
        )
        resultado.notificado_estudiante = True
        resultado.save(update_fields=['notificado_estudiante'])
    except Exception:
        pass


def calcular_resultado(participacion: Participacion) -> Resultado:
    """Calcula y persiste el Resultado de la participación."""
    caso = participacion.practica.caso
    preguntas = list(Pregunta.objects.filter(escenario__caso=caso))

    seleccionadas = {
        rs.pregunta_id: rs
        for rs in RespuestaSeleccionada.objects.filter(
            participacion=participacion,
        ).select_related('respuesta_elegida')
    }

    correctas = 0
    incorrectas = 0
    no_respondidas = 0
    peso_obtenido = 0
    peso_total = sum(p.peso for p in preguntas)

    # Acumular por criterio cuando las preguntas lo tengan asignado.
    por_criterio: dict[str, dict[str, int]] = {}

    for p in preguntas:
        rs = seleccionadas.get(p.id)
        cid = (p.criterio_rubrica_id or '').strip()
        if cid:
            slot = por_criterio.setdefault(cid, {'peso_total': 0, 'peso_obtenido': 0})
            slot['peso_total'] += p.peso

        if rs is None:
            no_respondidas += 1
            continue
        if rs.respuesta_elegida.es_correcta:
            correctas += 1
            peso_obtenido += p.peso
            if cid:
                por_criterio[cid]['peso_obtenido'] += p.peso
        else:
            incorrectas += 1

    # Rúbrica (puede no existir).
    rubrica = getattr(caso, 'rubrica', None)
    escala = int(rubrica.escala_maxima) if rubrica else 100
    nota_aprobacion = Decimal(rubrica.nota_aprobacion) if rubrica else Decimal('60')

    desglose: list[dict] = []
    nota = Decimal('0.00')

    criterios_def = (rubrica.criterios if rubrica else []) or []
    pesos_validos = (
        criterios_def
        and sum(int(c.get('peso', 0) or 0) for c in criterios_def) == 100
        and any(slot['peso_total'] > 0 for slot in por_criterio.values())
    )

    if pesos_validos:
        nota_pct = Decimal('0')
        for c in criterios_def:
            cid = str(c.get('id', '')).strip()
            peso_criterio = Decimal(int(c.get('peso', 0) or 0))
            slot = por_criterio.get(cid, {'peso_total': 0, 'peso_obtenido': 0})
            pt = slot['peso_total']
            po = slot['peso_obtenido']
            porcentaje = (Decimal(po) / Decimal(pt) * Decimal(100)) if pt > 0 else Decimal(0)
            nota_pct += (porcentaje * peso_criterio / Decimal(100))
            nivel = _nivel_alcanzado(float(porcentaje), c.get('niveles', []))
            desglose.append({
                'criterio_id': cid,
                'nombre': c.get('nombre', ''),
                'peso': int(peso_criterio),
                'peso_total': pt,
                'peso_obtenido': po,
                'porcentaje': float(porcentaje.quantize(Decimal('0.01'))),
                'nivel_alcanzado': nivel,
            })
        nota = (nota_pct * Decimal(escala) / Decimal(100)).quantize(Decimal('0.01'))
    else:
        if peso_total > 0:
            nota = (Decimal(peso_obtenido) / Decimal(peso_total) * Decimal(escala)).quantize(Decimal('0.01'))

    aprobado = nota >= nota_aprobacion

    resultado, _ = Resultado.objects.update_or_create(
        participacion=participacion,
        defaults={
            'correctas': correctas,
            'incorrectas': incorrectas,
            'no_respondidas': no_respondidas,
            'peso_obtenido': peso_obtenido,
            'peso_total': peso_total,
            'nota_final': nota,
            'aprobado': aprobado,
            'desglose_criterios': desglose,
        },
    )
    notificar_resultado_estudiante(resultado)
    return resultado
