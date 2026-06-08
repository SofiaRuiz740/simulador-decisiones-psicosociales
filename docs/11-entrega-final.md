# Entrega final — Guía de operación

Este documento resume **cómo levantar, usar y operar** el simulador para la
entrega final, qué hacer si algo falla y qué quedó pendiente. Léelo antes de
ejecutar la demo.

---

## 1. Requisitos mínimos

| Componente | Versión |
|---|---|
| Docker Desktop | 4.x+ corriendo |
| Node.js | 22+ |
| npm | 10+ |
| Angular CLI | la del repo (lazy, no requiere instalación global) |

> No necesitas Python instalado localmente — el backend corre dentro del
> contenedor `backend`.

---

## 2. Primera ejecución (clonando el repo)

```powershell
# 1. Variables de entorno
Copy-Item .env.example .env
# Edita .env si quieres cambiar credenciales, SMTP o IA. La copia tal cual
# funciona en desarrollo (PostgreSQL en Docker, SMTP en consola).

# 2. Backend + base de datos
docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_admin
# Por defecto crea admin/Admin123! (configurable en .env).

# 3. Frontend
cd frontend
npm install
ng serve --open
```

- Backend: <http://localhost:8000>
- Frontend: <http://localhost:4200>
- Django Admin: <http://localhost:8000/admin/>
- Healthcheck API: <http://localhost:8000/api/health/>

---

## 3. Tareas operativas periódicas

### 3.1 Cerrar prácticas vencidas (RN27)

Programa este comando en cron / Tarea programada cada 5–10 min:

```bash
docker compose exec backend python manage.py cerrar_practicas_vencidas
```

- Cambia `Practica.estado` a `FINALIZADA` cuando `fecha_fin < now`.
- Cierra participaciones colgadas (calcula resultado por las que estaban
  `EN_CURSO`).
- Idempotente: nunca reabre una práctica `FINALIZADA` ni `CANCELADA`.
- Soporta `--dry-run` para verificar sin tocar la BD.

### 3.2 Test del envío de correo (manual)

```bash
docker compose exec backend python manage.py test_email --email-docente
```

---

## 4. Configuración de correo (Gmail)

El proyecto envía 3 flujos de correo:

| Flujo | Remitente |
|---|---|
| Invitación a práctica (con código de acceso) | SMTP del docente |
| Revocación de autorización (RN26) | SMTP del docente |
| Notificación de nota final (RF42) | SMTP del docente, fallback `DEFAULT_FROM_EMAIL` |

### 4.1 Servidor SMTP global (en `.env`)

```ini
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=no-reply@simulador.local
```

Si prefieres no enviar correos reales en desarrollo, cámbialo a:

```ini
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

…y los correos aparecerán impresos en la consola del backend.

### 4.2 Clave Gmail por docente (no en `.env`, sino en la UI)

Cada docente debe generar **una clave de aplicación de 16 caracteres** en
<https://myaccount.google.com/apppasswords> y pegarla en su perfil
(Perfil → "Correo para invitaciones"). Esa clave se guarda en
`Usuario.correo_smtp_password` y se usa para todos los envíos del docente.

> ⚠️ La clave se guarda en texto plano en BD. Mejora futura: cifrar con
> `cryptography.fernet` usando una llave en `.env`. No comprometedor para el
> entregable (acceso a BD requiere también acceso al servidor), pero queda
> como pendiente documentado.

---

## 5. Reportes disponibles

| Reporte | URL backend | UI | PDF | Excel |
|---|---|---|---|---|
| Por práctica | `/api/reportes/practica/{id}/{pdf|excel}/` | desde `/practicas` y `/reportes` | ✅ | ✅ |
| Por grupo | `/api/reportes/grupo/{id}/{pdf|excel}/` | `/reportes` | ✅ | ✅ |
| Por materia | `/api/reportes/materia/{id}/{pdf|excel}/` | `/reportes` | ✅ | ✅ |
| Por estudiante | `/api/reportes/estudiante/{id}/{pdf|excel}/` | `/reportes` | ✅ | ✅ |
| **Temáticos (7)** | `/api/reportes/tematico/{tipo}/{pdf|excel}/` | `/reportes` | ✅ | ✅ |

Reportes temáticos (`tipo`): `participacion`, `desempeno`, `respuestas`,
`tiempos`, `notas`, `retroalimentaciones`, `feedback`.

Todos aceptan filtros opcionales por query string: `desde=YYYY-MM-DD`,
`hasta=YYYY-MM-DD`, `materia_id`, `grupo_id`, `estudiante_id`.

---

## 6. Importación

| Recurso | Endpoint | Plantilla descargable |
|---|---|---|
| Estudiantes | POST `/api/importacion/masiva/estudiantes/` | XLSX |
| Grupos | POST `/api/importacion/masiva/grupos/` | XLSX |
| Caso (PDF/DOCX/TXT) | POST `/api/importacion/` → `procesar` → `crear-caso` | DOCX |
| Rúbrica (P2 nueva) | POST `/api/importacion/masiva/importar-rubrica/{caso_id}/` | XLSX |

El parser DOCX entiende secciones tipo:

```
=== DATOS GENERALES ===
Nombre: ...
=== CONTEXTO E HISTORIA ===
...
=== ESCENARIO 1 ===
Título: ...
Narrativa: ...
Pregunta 1: ...
A) ...
B) ...
Respuesta correcta: B
```

Y crea automáticamente escenarios/preguntas/respuestas con la opción correcta.
Si el documento no respeta estos marcadores, queda como texto plano en
`contexto_historia` (no falla).

---

## 7. Reglas de negocio activas

| Regla | Implementada en |
|---|---|
| RF32 — Tiempo límite de participación | `participaciones/services.py` (`tiempo_agotado`, `asegurar_tiempo_vigente`) |
| **RN17** — Bloquear inicio si pasó la mitad de la ventana | `participaciones/views.py iniciar()` |
| RN15/RN16 — Validaciones de estado y reintento | `participaciones/views.py iniciar()` |
| **RN26** — Desautorizar estudiante + notificación | `practicas/views.py desautorizar_estudiante`, `practicas/email.py enviar_revocacion_practica` |
| **RN27** — Auto-finalizar prácticas vencidas | `practicas/management/commands/cerrar_practicas_vencidas.py` |
| RF42 — Notificación de nota final | `resultados/services.py notificar_resultado_estudiante` (SMTP docente con fallback) |

---

## 8. UI / experiencia

- **Cero alerts nativos del navegador.** Todo confirm/prompt usa `UxService`
  (`core/services/ux.service.ts`) con dialogs Material variant
  `danger | warn | info`.
- **Cero placeholders "Próximamente".** Los 7 reportes que estaban como
  marcador ahora son reportes reales con PDF/Excel.
- **Multimedia por URL** en escenarios: el docente añade
  imagen/audio/video por URL desde el editor del caso; el estudiante ve los
  recursos renderizados (img, audio, video, embed seguro YouTube/Vimeo/Loom).

---

## 9. Limitaciones conocidas / pendientes

- **SMTP password en plano**: ver §4.2. Mejora: cifrado simétrico con clave
  en `.env`.
- **Sin storage de archivos multimedia**: solo URLs externas. Para alojar
  imágenes/audios propios habría que añadir `FileField` + endpoint upload +
  volumen Docker o S3.
- **Sin auto-iniciar prácticas** al llegar `fecha_inicio` (queda manual o
  vía el botón del docente). Estructura lista para añadir comando análogo a
  `cerrar_practicas_vencidas`.
- **Búsqueda global del topbar**: se removió el input falso. Si quieres
  añadirla, requiere endpoint backend de búsqueda multi-recurso.
- **Tests E2E automatizados**: no incluidos. La validación es manual
  según §10.
- **Cifrado en reposo de la BD**: PostgreSQL en desarrollo no usa cifrado.
  En producción debe encriptarse el volumen o usar un servicio gestionado.

---

## 10. Checklist manual de pre-entrega

- [ ] `docker compose ps` → ambos servicios `running`/`healthy`.
- [ ] `curl http://localhost:8000/api/health/` → 200.
- [ ] Login docente y admin funciona.
- [ ] Crear caso manual, añadirle multimedia URL y un escenario, publicarlo.
- [ ] Importar caso desde DOCX (caso ejemplo descargado de la UI).
- [ ] Importar rúbrica desde XLSX (plantilla descargada de la UI).
- [ ] Agendar práctica, autorizar 1 estudiante, recibir correo (revisar
      consola si EMAIL_BACKEND=console).
- [ ] Estudiante entra con código, ve multimedia, responde, entrega.
- [ ] Docente desautoriza al estudiante, llega correo de revocación.
- [ ] Esperar a `fecha_fin` y ejecutar `cerrar_practicas_vencidas`.
- [ ] Descargar 1 reporte por práctica + 1 reporte temático (notas, p.ej.)
      en PDF y en Excel.
- [ ] No aparece ningún confirm/alert nativo del navegador.
- [ ] No aparece la palabra "Próximamente" en ningún lado.

---

## 11. Apoyos

- Convención de commits: `tipo(scope): descripción` (`feat`, `fix`,
  `chore`, `docs`, `refactor`, etc.).
- Convención de ramas: `feature/<modulo>` → PR → `develop` → PR → `main`.
- Issues / bugs: dejarlos en el repo GitHub con label adecuado.
