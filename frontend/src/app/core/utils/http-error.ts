import { HttpErrorResponse } from '@angular/common/http';

/** Extrae el primer mensaje legible de una respuesta de error DRF/Django. */
export function mensajeErrorHttp(
  err: HttpErrorResponse,
  fallback: string,
  offline = 'No pudimos conectar en este momento. Intenta de nuevo en unos minutos.',
): string {
  if (err.status === 0) return offline;

  const body = err.error;

  if (Array.isArray(body) && body.length) {
    return String(body[0]);
  }
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const o = body as Record<string, unknown>;

  const nonField = o['non_field_errors'];
  if (Array.isArray(nonField) && nonField.length) {
    return String(nonField[0]);
  }

  const detail = o['detail'];
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) return String(detail[0]);

  for (const key of ['correo', 'codigo', 'username', 'password']) {
    const field = o[key];
    if (Array.isArray(field) && field.length) return String(field[0]);
  }

  return fallback;
}
