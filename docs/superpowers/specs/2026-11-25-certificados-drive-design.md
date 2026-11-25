# Certificados automáticos desde Google Drive (diseño)

## Intención
Subir un certificado a la carpeta de Drive debe bastar para que aparezca en el sitio, sin editar código.

## Objetivos y límites
- Los certificados nuevos se publican en el siguiente despliegue (diario 06:00 UTC, push a `main` o ejecución manual).
- Sin dependencias nuevas, sin build, sin commits automáticos.
- No se leen datos desde dentro del PDF o la imagen.
- Un fallo de Drive nunca debe impedir publicar el sitio.

## Enfoques considerados
| Enfoque | Ventaja | Costo |
|---|---|---|
| **1. CI + datos en el nombre del archivo (elegido)** | Solo se sube a Drive | Hay que nombrar bien el archivo |
| 2. Script local que crea entradas incompletas | Revisión antes de publicar | Semiautomático |
| 3. CI que extrae datos del PDF | Sin nombrar archivos | Frágil, requiere OCR o IA |

Elegido el 1 por Iván.

## Diseño
**Nombre de archivo:** `Emisor - Título - AAAA-MM-DD - Nh.ext`
Ejemplo: `Platzi - Curso de Git y GitHub - 2026-09-28 - 24h.pdf`
El separador es ` - ` (con espacios). El título puede contenerlo. Las horas son opcionales.

**Script `scripts/fetch-certificates.mjs`:**
1. Toma el ID de carpeta desde `folder` en `data/education.json`.
2. Lista los PDF e imágenes con Google Drive API v3, usando el secret `DRIVE_API_KEY`.
3. Omite los `driveId` que ya están en `education.json`.
4. Interpreta el nombre. Si no cumple el formato, lo omite y deja un aviso en el log.
5. Descarga las miniaturas de a una a `assets/certificados/`.
6. Genera `data/certificates-list.json` (ignorado por git).

**Sitio (`js/main.js`):** une `education.json` con la lista generada, sin duplicar por `driveId`, y ordena por fecha. Sin la lista generada, muestra lo de `education.json`. Sin horas, no muestra horas. Sin miniatura, usa la tarjeta de respaldo existente.

**Workflow:** paso nuevo en `static.yml` antes de publicar, con `continue-on-error: true`.

**README:** formato de nombre y creación de la API key.

## Decisiones propuestas (corregibles)
- Los 9 certificados actuales siguen en `education.json`; no hace falta renombrarlos. `education.json` tiene prioridad.
- Solo hay que renombrar en Drive los 6 nuevos.
- Se usa la API oficial en lugar de la vista embebida de Drive, que puede cambiar sin aviso.
- Borrar en Drive un certificado listado en `education.json` no lo quita del sitio.

## Pasos manuales de Iván
1. Crear en Google Cloud una API key restringida a Drive API.
2. Guardarla en GitHub: Settings, Secrets and variables, Actions, `DRIVE_API_KEY`.
3. Renombrar los 6 certificados nuevos.

## Verificación
Pruebas con `node --test` para el análisis de nombres y la unión de listas; prueba local del script con la key y revisión visual del sitio.

## Queda a criterio del implementador
Formato y dimensiones de las miniaturas, paginación y mensajes de log.
