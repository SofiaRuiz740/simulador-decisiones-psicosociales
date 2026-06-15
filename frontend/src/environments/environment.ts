/**
 * Configuración para PRODUCCIÓN.
 * Con reverse proxy (nginx): el backend se expone en /api del mismo origen.
 * Si frontend y API están en hosts distintos, reemplaza apiUrl por la URL pública.
 */
export const environment = {
  production: true,
  apiUrl: 'https://simulador-decisiones-psicosociales.onrender.com/api',
  appName: 'Simulador de Decisiones Psicosociales',
  /** Ruta pública a los datos JSON de la simulación narrativa. */
  simulacionNarrativaDataUrl: '/simulacion-narrativa',
};
