# 10 — Roadmap de integración con Unity

> Documento para futuras fases. Ahora mismo el simulador es 100% web (Angular).
> Este documento describe cómo se integrará un cliente Unity al backend ya existente
> sin romper la web y reutilizando la misma API.

## Objetivo

Permitir que un cliente desarrollado en **Unity** (PC o WebGL) ejecute las mismas
simulaciones que la web, leyendo casos, registrando decisiones y enviando los
resultados al mismo backend Django + DRF.

## Por qué integrar Unity

- **Inmersión narrativa**: escenas 3D, ambientación sonora, personajes animados.
- **Roleplay reforzado**: cada escenario puede vivir en una escena con cámara,
  ambiente y guiones de diálogo, no solo texto.
- **Replanteo del aprendizaje**: gamificación con feedback inmediato visual.
- **Reutilizable**: el contenido pedagógico (casos, rúbricas) se sigue creando
  desde el panel web del docente — Unity es solo un cliente más.

## Arquitectura propuesta

```
   ┌────────────────────────┐
   │  Cliente Unity         │ ← juega el caso, registra decisiones
   │  (PC / WebGL)          │
   └──────────┬─────────────┘
              │  HTTPS + JWT
              ▼
   ┌────────────────────────┐         ┌──────────────────────┐
   │  Backend Django + DRF  │ ◄────► │ PostgreSQL           │
   │  (mismas API actuales) │         └──────────────────────┘
   └──────────┬─────────────┘
              │
              ▼
   ┌────────────────────────┐
   │  Panel web docente     │ ← gestiona casos y rúbricas
   │  (Angular)             │
   └────────────────────────┘
```

El backend NO se duplica. Unity consume los mismos endpoints que la web. Solo
añadimos un endpoint específico de "bootstrap" que devuelve el caso completo
con todas las relaciones en un único payload optimizado para clientes nativos.

## Endpoint específico para Unity

Ya existe en esta entrega:

```
GET /api/unity/caso-completo/?practica_codigo=<codigo>
```

- Permisos: `AllowAny` (el código de acceso ya es el secreto).
- Devuelve: caso + escenarios + preguntas + respuestas + rúbrica con criterios
  y niveles, en un único objeto. Esto evita 30+ requests desde Unity.
- Pensado para ejecutarse una sola vez al iniciar la escena de Unity.

Las decisiones del estudiante se siguen registrando vía:

```
POST /api/participaciones/{id}/responder/
POST /api/participaciones/{id}/finalizar/
```

Los mismos que usa el frontend Angular.

## Pasos del roadmap

### Fase U1 — Cliente prototipo (escena única)

1. Crear proyecto Unity (LTS) con paquete `UnityWebRequest`.
2. Hardcodear un código de práctica de prueba.
3. Llamar a `GET /api/unity/caso-completo/?practica_codigo=...` y deserializar
   en clases C# (`Caso`, `Escenario`, `Pregunta`, etc.) con `JsonUtility`
   (o `Newtonsoft.Json` si los modelos lo requieren).
4. Renderizar el caso en una escena con un canvas simple (texto + botones).
5. Al terminar, llamar a `finalizar` y mostrar la nota.

**Salida esperada:** un cliente Unity desktop que vive el mismo flujo que la web,
sin animaciones todavía.

### Fase U2 — Escenas narrativas

1. Una escena Unity por escenario narrativo del caso.
2. Personajes 2D/3D + diálogo locutado o subtitulado.
3. Ambiente sonoro distinto por escenario (`AudioSource`).
4. Transiciones cinemáticas entre escenas (`Cinemachine`).
5. Las decisiones siguen mandándose por POST al backend.

### Fase U3 — WebGL embebible

1. Build de Unity → WebGL.
2. Embeber el build dentro del propio frontend Angular como una vista alternativa
   al `Simulacion` actual: `/estudiante/simulacion-unity`.
3. El estudiante puede elegir entre experiencia web o experiencia inmersiva.
4. La autenticación se comparte vía mensaje `postMessage` entre Angular y el
   iframe de Unity.

### Fase U4 — Multimedia subido por el docente

1. Añadir un endpoint para que el docente suba assets (imágenes de personajes,
   audios de ambientación, sprites) y los asocie al `Escenario`.
2. Unity descarga esos assets al iniciar el caso y los aplica en la escena.
3. Esto cierra el círculo: el docente puede crear casos con personalidad propia
   sin tocar Unity.

## Modelo de datos a añadir cuando entremos a U4

Sobre el modelo existente, agregar:

```python
class RecursoEscenario(models.Model):
    escenario = ForeignKey(Escenario, related_name='recursos')
    tipo = CharField(choices=['IMAGEN', 'AUDIO', 'VIDEO', 'MODELO_3D'])
    archivo = FileField(upload_to='escenarios/')
    nombre = CharField(max_length=120)
    descripcion = TextField(blank=True)
    orden = PositiveIntegerField(default=0)
```

Sin tocar la web (Angular puede ignorar este campo y seguir usando solo el texto
narrativo).

## Riesgos / preguntas abiertas

- **Tamaño del WebGL**: builds Unity WebGL pueden pesar 30-80 MB. Hay que
  cachear bien y mostrar progreso de carga en Angular.
- **Autenticación**: el JWT actual funciona, pero si el WebGL corre embebido
  hay que validar que el token se pasa sin que sea visible para terceros.
- **Costo de mantenimiento**: cada caso en Unity requiere más trabajo
  (personajes, audios) que un caso solo de texto. La web sigue siendo el camino
  rápido para casos nuevos; Unity para casos "joya".
- **Pipeline de assets**: si el docente sube assets pesados, validar tamaños
  y formatos para no romper la carga.

## Estado actual de la implementación

- ✅ Endpoint `/api/unity/caso-completo/` creado y disponible.
- ⏳ Cliente Unity (fase U1) → pendiente, sin trabajo iniciado.
- ⏳ Storage de assets multimedia → pendiente.
- ⏳ Embebido WebGL en Angular → pendiente.

Esto es un roadmap, no un compromiso de entrega. Cuando lleguemos al tema
"experiencia inmersiva" en la planificación del producto, este documento será
la base para decidir si entramos a U1 o no.
