/** Configuración de introducción narrativa por práctica/caso (JSON en public/). */

export interface AdvertenciaIntroduccion {
  titulo: string;
  texto: string;
  botonAceptar: string;
}

export interface EscenaIntroduccionConfig {
  /** Ruta relativa bajo /assets/simulacion-narrativa/ */
  imagen: string;
  texto: string;
}

export interface TransicionFinalIntroduccion {
  lineas: string[];
}

export interface ConfigIntroduccionNarrativa {
  id: string;
  casoId: string;
  version: string;
  duracionEscenaMs: number;
  duracionTransicionFinalMs: number;
  advertencia: AdvertenciaIntroduccion;
  escenas: EscenaIntroduccionConfig[];
  transicionFinal: TransicionFinalIntroduccion;
}
