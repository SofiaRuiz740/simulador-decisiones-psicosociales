"""Serializers de Resultado."""

from rest_framework import serializers

from apps.casos.models import Pregunta
from apps.casos.serializers import RespuestaSerializer
from apps.practicas.services import _grupos_estudiante_docente, _materia_display_practica

from .models import Resultado


class DetalleRespuestaUsuarioSerializer(serializers.Serializer):
    """Para el resumen pregunta-por-pregunta del estudiante (RF38, RN20)."""

    pregunta_id = serializers.IntegerField()
    enunciado = serializers.CharField()
    peso = serializers.IntegerField()
    respondida = serializers.BooleanField()
    respuesta_elegida = RespuestaSerializer(allow_null=True)
    respuestas_correctas = RespuestaSerializer(many=True)


class ResultadoSerializer(serializers.ModelSerializer):
    estudiante_correo = serializers.CharField(source='participacion.estudiante.correo', read_only=True)
    estudiante_nombre = serializers.CharField(source='participacion.estudiante.nombre_completo', read_only=True)
    practica_id = serializers.IntegerField(source='participacion.practica_id', read_only=True)
    practica_nombre = serializers.CharField(source='participacion.practica.nombre', read_only=True)
    caso_nombre = serializers.CharField(source='participacion.practica.caso.nombre', read_only=True)
    materia_display = serializers.SerializerMethodField()
    grupos_display = serializers.SerializerMethodField()
    tiempo_usado_seg = serializers.IntegerField(source='participacion.tiempo_usado_seg', read_only=True)
    participacion_estado = serializers.CharField(source='participacion.estado', read_only=True)
    nota_aprobacion = serializers.SerializerMethodField()
    rubrica_descripcion = serializers.SerializerMethodField()
    escala_maxima = serializers.SerializerMethodField()
    detalle_preguntas = serializers.SerializerMethodField()
    competencias = serializers.SerializerMethodField()

    class Meta:
        model = Resultado
        fields = (
            'id', 'participacion',
            'estudiante_correo', 'estudiante_nombre',
            'practica_id', 'practica_nombre', 'caso_nombre',
            'materia_display', 'grupos_display', 'tiempo_usado_seg', 'participacion_estado',
            'correctas', 'incorrectas', 'no_respondidas',
            'peso_obtenido', 'peso_total', 'nota_final', 'aprobado',
            'nota_aprobacion', 'escala_maxima', 'rubrica_descripcion', 'desglose_criterios',
            'feedback_docente', 'notificado_estudiante',
            'fecha_calculo', 'fecha_actualizacion',
            'detalle_preguntas', 'competencias',
        )
        read_only_fields = (
            'id', 'participacion',
            'estudiante_correo', 'estudiante_nombre',
            'practica_id', 'practica_nombre', 'caso_nombre',
            'materia_display', 'grupos_display', 'tiempo_usado_seg', 'participacion_estado',
            'correctas', 'incorrectas', 'no_respondidas',
            'peso_obtenido', 'peso_total', 'nota_final', 'aprobado',
            'nota_aprobacion', 'escala_maxima', 'rubrica_descripcion', 'desglose_criterios',
            'fecha_calculo', 'fecha_actualizacion',
            'detalle_preguntas', 'competencias', 'notificado_estudiante',
        )

    def get_materia_display(self, obj: Resultado) -> str | None:
        return _materia_display_practica(obj.participacion.practica)

    def get_grupos_display(self, obj: Resultado) -> str | None:
        part = obj.participacion
        return _grupos_estudiante_docente(part.estudiante, part.practica.docente_id)

    def get_nota_aprobacion(self, obj):
        rub = getattr(obj.participacion.practica.caso, 'rubrica', None)
        return float(rub.nota_aprobacion) if rub else 60.0

    def get_escala_maxima(self, obj):
        rub = getattr(obj.participacion.practica.caso, 'rubrica', None)
        return int(rub.escala_maxima) if rub else 100

    def get_rubrica_descripcion(self, obj):
        rub = getattr(obj.participacion.practica.caso, 'rubrica', None)
        return rub.descripcion if rub else ''

    def _criterios_index(self, obj: Resultado) -> dict:
        """Mapa criterio_id -> {nombre, retroalimentacion} desde la rúbrica."""
        rubrica = getattr(obj.participacion.practica.caso, 'rubrica', None)
        if not rubrica:
            return {}
        out = {}
        for c in (rubrica.criterios or []):
            cid = str(c.get('id', '')).strip()
            if not cid:
                continue
            out[cid] = {
                'nombre': c.get('nombre', ''),
                'retroalimentacion': (c.get('retroalimentacion') or '').strip(),
            }
        return out

    def get_detalle_preguntas(self, obj: Resultado):
        """Detalle pregunta-por-pregunta (req. 5 y 6).

        Incluye: enunciado, calificable, competencia, respuesta del estudiante,
        respuesta correcta y retroalimentación formativa por competencia
        cuando la pregunta es calificable y el estudiante falló.
        """
        seleccionadas = {
            rs.pregunta_id: rs.respuesta_elegida
            for rs in obj.participacion.respuestas_seleccionadas.select_related('respuesta_elegida')
        }
        preguntas = Pregunta.objects.filter(
            escenario__caso=obj.participacion.practica.caso,
        ).select_related('escenario').prefetch_related('respuestas').order_by(
            'escenario__orden', 'orden',
        )
        criterios = self._criterios_index(obj)

        out = []
        for p in preguntas:
            sel = seleccionadas.get(p.id)
            es_acertada = bool(sel and sel.es_correcta)
            cid = p.criterio_rubrica_id or ''
            entrada = {
                'pregunta_id': p.id,
                'escenario_orden': p.escenario.orden,
                'pregunta_orden': p.orden,
                'enunciado': p.enunciado,
                'peso': p.peso,
                'calificable': p.calificable,
                'competencia_id': cid,
                'competencia_nombre': criterios.get(cid, {}).get('nombre', ''),
                'respondida': sel is not None,
                'es_acertada': es_acertada,
                'respuesta_elegida': RespuestaSerializer(sel).data if sel else None,
                'respuestas_correctas': RespuestaSerializer(
                    [r for r in p.respuestas.all() if r.es_correcta], many=True,
                ).data,
            }
            # Retroalimentación pedagógica por competencia (req. 4 y 6):
            # solo si la pregunta es calificable y el estudiante no acertó.
            if p.calificable and not es_acertada and cid:
                retro = criterios.get(cid, {}).get('retroalimentacion', '')
                if retro:
                    entrada['retroalimentacion_competencia'] = retro
            out.append(entrada)
        return out

    def get_competencias(self, obj: Resultado):
        """Resumen agregado por competencia para el panel estudiante (req. 6)."""
        seleccionadas = {
            rs.pregunta_id: rs.respuesta_elegida
            for rs in obj.participacion.respuestas_seleccionadas.select_related('respuesta_elegida')
        }
        preguntas = Pregunta.objects.filter(
            escenario__caso=obj.participacion.practica.caso,
            calificable=True,
        ).exclude(criterio_rubrica_id='')
        criterios = self._criterios_index(obj)

        agg: dict[str, dict] = {}
        for p in preguntas:
            cid = p.criterio_rubrica_id
            slot = agg.setdefault(cid, {
                'id': cid,
                'nombre': criterios.get(cid, {}).get('nombre', ''),
                'acertadas': 0,
                'total': 0,
            })
            slot['total'] += 1
            sel = seleccionadas.get(p.id)
            if sel and sel.es_correcta:
                slot['acertadas'] += 1

        out = []
        for c in agg.values():
            pct = round((c['acertadas'] / c['total']) * 100, 2) if c['total'] else 0
            c['porcentaje'] = pct
            retro = criterios.get(c['id'], {}).get('retroalimentacion', '')
            # Incluye retroalimentación solo si la competencia no llegó al 100%
            if retro and pct < 100:
                c['retroalimentacion'] = retro
            out.append(c)
        return out


class FeedbackDocenteSerializer(serializers.Serializer):
    feedback_docente = serializers.CharField()


class ResultadoNarrativoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    practica_id = serializers.IntegerField()
    practica_nombre = serializers.CharField()
    caso_nombre = serializers.CharField()
    estudiante_id = serializers.IntegerField(required=False)
    estudiante_nombre = serializers.CharField(required=False)
    estudiante_correo = serializers.EmailField(required=False)
    porcentaje = serializers.IntegerField()
    entrevistas_realizadas = serializers.IntegerField()
    entrevistas_totales = serializers.IntegerField()
    evidencias_encontradas = serializers.IntegerField()
    contradicciones_detectadas = serializers.IntegerField()
    hipotesis_formuladas = serializers.IntegerField()
    estado_final = serializers.CharField()
    fortalezas = serializers.ListField(child=serializers.CharField())
    aspectos_mejorar = serializers.ListField(child=serializers.CharField())
    fecha_finalizacion = serializers.DateTimeField()


class GuardarResultadoNarrativoSerializer(serializers.Serializer):
    autorizacion_id = serializers.IntegerField(min_value=1, required=False)
    porcentaje = serializers.IntegerField(min_value=0, max_value=100)
    entrevistas_realizadas = serializers.IntegerField(min_value=0)
    entrevistas_totales = serializers.IntegerField(min_value=0)
    evidencias_encontradas = serializers.IntegerField(min_value=0)
    contradicciones_detectadas = serializers.IntegerField(min_value=0)
    hipotesis_formuladas = serializers.IntegerField(min_value=0)
    estado_final = serializers.CharField(max_length=40, default='completada')
    resumen_pedagogico = serializers.JSONField(default=dict)
