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

  for (const key of ['archivo', 'caso', 'correo', 'codigo', 'username', 'password']) {
    const field = o[key];
    if (Array.isArray(field) && field.length) return String(field[0]);
    if (typeof field === 'string' && field.trim()) return field;
  }

  return fallback;
}

/** Parsea errores DRF cuando la petición usó `responseType: 'blob'`. */
export async function mensajeErrorHttpBlob(
  err: HttpErrorResponse,
  fallback: string,
  offline = 'No pudimos conectar en este momento. Intenta de nuevo en unos minutos.',
): Promise<string> {
  const body = err.error;
  if (body instanceof Blob) {
    try {
      const text = await body.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const parsed = JSON.parse(text) as unknown;
        return mensajeErrorHttp({ ...err, error: parsed } as HttpErrorResponse, fallback, offline);
      }
      if (text.trim()) return text.trim().slice(0, 240);
    } catch {
      /* usar fallback */
    }
  }
  return mensajeErrorHttp(err, fallback, offline);
}
