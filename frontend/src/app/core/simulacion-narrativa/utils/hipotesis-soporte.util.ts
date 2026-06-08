import { CasoNarrativoCompleto, EstadoPartida, SoporteHipotesis } from '../models';
import { esContradiccionIdentificadaPorEstudiante } from '../models/contradiccion-instancia.model';

export function validarSoportesHipotesis(
  soportes: SoporteHipotesis[],
  estado: EstadoPartida,
): string | null {
  if (!soportes.length) {
    return 'Debe asociar al menos una evidencia, testimonio o contradicción.';
  }

  for (const soporte of soportes) {
    const error = validarSoporteIndividual(soporte, estado);
    if (error) return error;
  }

  return null;
}

function validarSoporteIndividual(
  soporte: SoporteHipotesis,
  estado: EstadoPartida,
): string | null {
  switch (soporte.tipo) {
    case 'evidencia':
      if (!estado.evidenciasDescubiertas.includes(soporte.entidadId)) {
        return `La evidencia "${soporte.entidadId}" no ha sido descubierta.`;
      }
      return null;

    case 'testimonio':
      if (
        !estado.afirmacionesActivas.some(
          (a) => a.origen === 'testimonio' && a.afirmacion.id === soporte.entidadId,
        )
      ) {
        return `El testimonio "${soporte.entidadId}" no está registrado.`;
      }
      return null;

    case 'contradiccion': {
      const instancia = estado.instanciasContradiccion.find(
        (c) => c.id === soporte.entidadId || c.plantillaId === soporte.entidadId,
      );
      if (!instancia) {
        return `La contradicción "${soporte.entidadId}" no existe.`;
      }
      if (!esContradiccionIdentificadaPorEstudiante(instancia)) {
        return `La contradicción "${soporte.entidadId}" debe ser analizada antes de usarla como soporte.`;
      }
      return null;
    }

    default:
      return 'Tipo de soporte no válido.';
  }
}

export function resolverSoportesParaPlantilla(
  caso: CasoNarrativoCompleto,
  evidenciaIds: string[] | undefined,
): SoporteHipotesis[] {
  if (!evidenciaIds?.length) return [];
  return evidenciaIds.map((evidenciaId) => ({ tipo: 'evidencia', entidadId: evidenciaId }));
}
