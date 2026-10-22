# Portafolio de Iván Saavedra

Sitio estático (HTML5, CSS3 y JavaScript vanilla). Sin frameworks, sin build, sin dependencias remotas.

## Ejecutar
El contenido se lee desde archivos JSON con `fetch`, por lo que **no funciona abriendo `index.html` con doble clic** (el navegador bloquea `file://`). Sirve la carpeta con cualquier servidor estático:

```
python -m http.server 8765
```
y abre http://localhost:8765. También sirve cualquier hosting estático (GitHub Pages, Netlify, etc.).

## Contenido (carpeta `data/`)
Cada área tiene su propio JSON; para cambiar un listado, edita solo ese archivo:

| Archivo | Alimenta |
|---|---|
| `about.json` | Datos de "Sobre mí" (ubicación, correo, idiomas, experiencia) |
| `areas.json` | Áreas de trabajo |
| `stack.json` | Stack tecnológico por grupos |
| `projects.json` | Proyectos destacados y secundarios |
| `experience.json` | Línea de tiempo de experiencia |
| `education.json` | Título y certificados (se ordenan por `date`; cada uno referencia su archivo de Google Drive con `driveId`) |
| `contact.json` | Lista de contacto y enlaces del hero |
| `repos.json` | Cuentas de GitHub, tamaño de página y exclusión de forks |

Los iconos se indican por id del sprite en `index.html` (por ejemplo `i-mail`).

## Estructura
```
index.html              Estructura y contenido
css/styles.css          Tokens (:root), componentes, responsive, reduced-motion
js/main.js              Tema claro/oscuro, menú móvil, enlace activo, reveal, volver arriba
assets/images/logo.svg  Logo / favicon
assets/IvanSaavedra-CV.pdf  CV descargable
```

## Personalizar
- Colores, radios, espaciados y tipografía: variables en `:root` de `css/styles.css` (tema claro en `:root[data-theme="light"]`).
- Contenido: editar las secciones en `index.html`. Todo el texto proviene del CV.
- Para actualizar el CV descargable, reemplaza `assets/IvanSaavedra-CV.pdf` manteniendo el nombre.

## Certificados en Google Drive
Los certificados no están en el repo: el enlace abre `drive.google.com/file/d/<driveId>/view` y la miniatura usa `drive.google.com/thumbnail?id=<driveId>`. Los archivos deben estar compartidos como "cualquier persona con el enlace". Drive limita las miniaturas (error 429) si se piden muchas seguidas; en ese caso se muestra una tarjeta de respaldo con el enlace al certificado. Para agregar uno, copia el ID de su enlace de Drive a `education.json`.

## Repositorios de GitHub
La lista en Proyectos se carga en el navegador desde la API pública de GitHub (sin token, límite de 60 consultas/hora por IP; se guarda en caché de sesión 1 h). Las cuentas se definen en `data/repos.json`. Se excluyen los forks. Si la API falla, se muestra un mensaje con los perfiles enlazados. Las descripciones y lenguajes son los de GitHub: agregar una descripción al repo la mejora en el sitio.

## Datos pendientes (no figuran en el CV, por eso no se incluyeron)
- Foto profesional (el hero usa una composición gráfica en CSS).
- Perfil de LinkedIn u otras redes.
- Capturas reales o demos de los proyectos (se usan iconos ilustrativos).
- Nombre del banco del LMS (el CV solo indica "importante banco de Chile").
- Testimonios, métricas de clientes o porcentajes de habilidad.
- Formulario de contacto: no hay backend, por lo que se usan enlaces `mailto:` y `tel:`.
