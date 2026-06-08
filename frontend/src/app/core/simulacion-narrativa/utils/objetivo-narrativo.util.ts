import { CasoNarrativoCompleto, EstadoPartida, ObjetivoNarrativoEstado } from '../models';
import { evaluarCondiciones } from './condicion-evaluator';

export function evaluarObjetivosNarrativos(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): ObjetivoNarrativoEstado[] {
  const nuevos: ObjetivoNarrativoEstado[] = [];

  for (const objetivo of Object.values(caso.objetivos)) {
    const yaCumplido = estado.objetivosCumplidos.some((o) => o.objetivoId === objetivo.id);
    if (yaCumplido) continue;
    if (!evaluarCondiciones(objetivo.requisitosCumplimiento, estado, caso)) continue;

    const registro: ObjetivoNarrativoEstado = {
      objetivoId: objetivo.id,
      cumplidoEn: new Date().toISOString(),
    };
    estado.objetivosCumplidos.push(registro);
    nuevos.push(registro);

    estado.historial.push({
      tipo: 'objetivo_cumplido',
      entidadId: objetivo.id,
      descripcion: objetivo.titulo,
      timestamp: registro.cumplidoEn,
    });
  }

  return nuevos;
}

export function objetivoCumplido(estado: EstadoPartida, objetivoId: string): boolean {
  return estado.objetivosCumplidos.some((o) => o.objetivoId === objetivoId);
}
