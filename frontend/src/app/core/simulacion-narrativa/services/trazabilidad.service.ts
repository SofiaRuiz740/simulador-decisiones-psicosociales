import { Injectable } from '@angular/core';

import {
  CasoNarrativoCompleto,
  ContradiccionInstancia,
  esContradiccionIdentificadaPorEstudiante,
  EstadoContradiccionInstancia,
  EstadoPartida,
  EstrategiaClinica,
  InformePedagogicoDocente,
  ResumenPedagogico,
  RegistroConversacion,
  SoporteHipotesis,
  TrazabilidadDocente,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TrazabilidadService {
  registrarConversacionIniciada(
    estado: EstadoPartida,
    conversacionId: string,
    datos: {
      personajeId?: string;
      titulo?: string;
      cuentaComoUtil: boolean;
    },
  ): void {
    const existente = estado.trazabilidad.conversaciones.find(
      (c) => c.conversacionId === conversacionId && !c.completadaEn,
    );
    if (existente) return;

    estado.trazabilidad.conversaciones.push({
      conversacionId,
      personajeId: datos.personajeId,
      titulo: datos.titulo,
      iniciadaEn: new Date().toISOString(),
      cuentaComoUtil: datos.cuentaComoUtil,
      nodosVisitados: [],
      opcionesSeleccionadas: [],
    });
  }

  registrarNodoVisitado(
    estado: EstadoPartida,
    conversacionId: string,
    nodoId: string,
  ): void {
    const registro = this.obtenerConversacionActiva(estado, conversacionId);
    if (!registro) return;

    if (!registro.nodosVisitados.includes(nodoId)) {
      registro.nodosVisitados.push(nodoId);
    }
  }

  registrarOpcionSeleccionada(
    estado: EstadoPartida,
    conversacionId: string,
    opcionId: string,
  ): void {
    const registro = this.obtenerConversacionActiva(estado, conversacionId);
    if (!registro) return;
    registro.opcionesSeleccionadas.push(opcionId);
  }

  registrarConversacionCompletada(estado: EstadoPartida, conversacionId: string): void {
    const registro = this.obtenerConversacionActiva(estado, conversacionId);
    if (!registro) return;
    registro.completadaEn = new Date().toISOString();
  }

  registrarIntervencionClinica(
    estado: EstadoPartida,
    datos: {
      estrategia: EstrategiaClinica;
      origen: 'dialogo' | 'intervencion_estructurada';
      conversacionId?: string;
      opcionId?: string;
      intervencionId?: string;
      personajeId?: string;
    },
  ): void {
    estado.trazabilidad.intervencionesClinicas.push({
      id: crypto.randomUUID(),
      ...datos,
      timestamp: new Date().toISOString(),
    });
  }

  registrarEvidenciaDescubierta(
    estado: EstadoPartida,
    evidenciaId: string,
    titulo?: string,
    escenarioId?: string,
  ): void {
    if (estado.trazabilidad.evidencias.some((e) => e.evidenciaId === evidenciaId)) return;

    estado.trazabilidad.evidencias.push({
      evidenciaId,
      titulo,
      descubiertaEn: new Date().toISOString(),
      escenarioId,
    });
  }

  registrarContradiccionInstancia(
    estado: EstadoPartida,
    instancia: ContradiccionInstancia,
  ): void {
    if (!esContradiccionIdentificadaPorEstudiante(instancia)) return;

    const existente = estado.trazabilidad.contradicciones.find(
      (c) => c.contradiccionInstanciaId === instancia.id,
    );
    if (existente) {
      existente.estado = instancia.estado;
      existente.detectadaEn = instancia.detectadaEn;
      existente.actualizadaEn = instancia.actualizadaEn;
      return;
    }

    estado.trazabilidad.contradicciones.push({
      contradiccionInstanciaId: instancia.id,
      plantillaId: instancia.plantillaId,
      titulo: instancia.titulo,
      estado: instancia.estado,
      creadaEn: instancia.creadaEn,
      detectadaEn: instancia.detectadaEn,
      actualizadaEn: instancia.actualizadaEn,
    });
  }

  registrarHipotesisFormulada(
    estado: EstadoPartida,
    hipotesisId: string,
    titulo?: string,
    soportes: SoporteHipotesis[] = [],
  ): void {
    if (estado.trazabilidad.hipotesis.some((h) => h.hipotesisId === hipotesisId)) return;

    estado.trazabilidad.hipotesis.push({
      hipotesisId,
      titulo,
      formuladaEn: new Date().toISOString(),
      soportes,
    });
  }

  sincronizarContradicciones(estado: EstadoPartida): void {
    for (const instancia of estado.instanciasContradiccion) {
      if (esContradiccionIdentificadaPorEstudiante(instancia)) {
        this.registrarContradiccionInstancia(estado, instancia);
      }
    }
  }

  sincronizarEventos(estado: EstadoPartida, caso?: CasoNarrativoCompleto | null): void {
    for (const evento of estado.eventosActivados) {
      if (estado.trazabilidad.eventos.some((e) => e.eventoId === evento.eventoId)) continue;
      estado.trazabilidad.eventos.push({ ...evento });
    }
  }

  sincronizarObjetivos(estado: EstadoPartida, caso?: CasoNarrativoCompleto | null): void {
    for (const cumplido of estado.objetivosCumplidos) {
      if (estado.trazabilidad.objetivos.some((o) => o.objetivoId === cumplido.objetivoId)) {
        continue;
      }
      const objetivo = caso?.objetivos[cumplido.objetivoId];
      estado.trazabilidad.objetivos.push({
        objetivoId: cumplido.objetivoId,
        titulo: objetivo?.titulo,
        categoria: objetivo?.categoria,
        cumplidoEn: cumplido.cumplidoEn,
      });
    }
  }

  generarInformePedagogicoDocente(
    estado: EstadoPartida,
    caso?: CasoNarrativoCompleto | null,
  ): InformePedagogicoDocente {
    this.sincronizarEventos(estado, caso);
    this.sincronizarObjetivos(estado, caso);

    return {
      ...this.generarResumenPedagogico(estado, caso),
      competencias: structuredClone(estado.competencias),
      metricasFinalesPersonajes: structuredClone(estado.metricasPersonajes),
      conversacionesUtilesConsumidas: structuredClone(estado.conversacionesUtilesPorPersonaje),
      tiempoNarrativoFinal: structuredClone(estado.tiempoNarrativo),
      eventosActivados: structuredClone(estado.eventosActivados),
      objetivosCumplidos: structuredClone(estado.objetivosCumplidos),
    };
  }

  generarResumenPedagogico(
    estado: EstadoPartida,
    _caso?: CasoNarrativoCompleto | null,
  ): ResumenPedagogico {
    const estrategiasUtilizadas: Partial<Record<EstrategiaClinica, number>> = {};

    for (const intervencion of estado.trazabilidad.intervencionesClinicas) {
      estrategiasUtilizadas[intervencion.estrategia] =
        (estrategiasUtilizadas[intervencion.estrategia] ?? 0) + 1;
    }

    return {
      casoId: estado.casoId,
      inicioSesion: estado.inicioSesion,
      totalConversaciones: estado.trazabilidad.conversaciones.length,
      totalIntervencionesClinicas: estado.trazabilidad.intervencionesClinicas.length,
      totalEvidencias: estado.trazabilidad.evidencias.length,
      totalContradicciones: estado.trazabilidad.contradicciones.length,
      totalHipotesis: estado.trazabilidad.hipotesis.length,
      estrategiasUtilizadas,
      trazabilidad: structuredClone(estado.trazabilidad),
    };
  }

  obtenerTrazabilidad(estado: EstadoPartida): TrazabilidadDocente {
    return estado.trazabilidad;
  }

  private obtenerConversacionActiva(
    estado: EstadoPartida,
    conversacionId: string,
  ): RegistroConversacion | undefined {
    return [...estado.trazabilidad.conversaciones]
      .reverse()
      .find((c) => c.conversacionId === conversacionId && !c.completadaEn);
  }
}

export function actualizarEstadoContradiccion(
  estado: EstadoPartida,
  instanciaId: string,
  nuevoEstado: EstadoContradiccionInstancia,
): boolean {
  const instancia = estado.instanciasContradiccion.find((c) => c.id === instanciaId);
  if (!instancia) return false;

  instancia.estado = nuevoEstado;
  instancia.actualizadaEn = new Date().toISOString();

  if (nuevoEstado === 'descartada') {
    estado.contradiccionesIdentificadas = estado.contradiccionesIdentificadas.filter(
      (id) => id !== instanciaId,
    );
  } else if (
    nuevoEstado !== 'posible' &&
    !estado.contradiccionesIdentificadas.includes(instanciaId)
  ) {
    estado.contradiccionesIdentificadas.push(instanciaId);
    if (!instancia.detectadaEn) {
      instancia.detectadaEn = new Date().toISOString();
    }
  }

  return true;
}
