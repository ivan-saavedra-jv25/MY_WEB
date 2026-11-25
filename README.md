# Portafolio de Iván Saavedra

Sitio estático (HTML5, CSS3 y JavaScript vanilla). Sin frameworks ni build. La única dependencia remota es Google Tag Manager (`GTM-MP4WDPLJ`, en el `<head>` de `index.html`), usado para analítica.

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
| `experience.json` | Línea de tiempo (cada trabajo con `start` y `end` en formato `AAAA-MM`; `end: null` = actual). De aquí se **calculan** los años de experiencia y la cantidad de empresas |
| `education.json` | Título y enlace a la carpeta de certificados en Drive (la lista de certificados está en `assets/certificados/certificados.json`) |
| `contact.json` | Lista de contacto y enlaces del hero |
| `repos.json` | Cuentas de GitHub, tamaño de página y exclusión de forks |

Las cifras calculadas (años = meses desde el inicio más antiguo hasta hoy, en años completos; empresas = nombres distintos) se insertan donde el HTML tiene `data-stat="years"` o `data-stat="companies"`, y en los textos de los JSON con `{years}` / `{companies}`.

Los iconos se indican por id del sprite en `index.html` (por ejemplo `i-mail`).

## Estructura
```
index.html              Estructura y contenido
css/styles.css          Tokens (:root), componentes, responsive, reduced-motion
scripts/fetch-repos.mjs  Genera data/repos-list.json en el CI
tests/                   Pruebas (node --test)
.github/workflows/      Despliegue a GitHub Pages
js/certificates.js      Ordena los certificados y arma sus enlaces
js/main.js              Tema claro/oscuro, menú móvil, enlace activo, reveal, volver arriba
assets/images/logo.svg  Logo / favicon
assets/certificados/    certificados.json y miniaturas .webp (el PDF está en Drive)
```

## Personalizar
- Colores, radios, espaciados y tipografía: variables en `:root` de `css/styles.css` (tema claro en `:root[data-theme="light"]`).
- Contenido: editar las secciones en `index.html`. Todo el texto proviene del CV.
- El CV está en Canva (botón "Ver CV" del encabezado). Para cambiar el enlace, edita el `href` de `.cv-btn` en `index.html`.

## Certificados en Google Drive
### Agregar un certificado
1. Sube el PDF a la carpeta de Drive y copia su ID desde el enlace.
2. Guarda la miniatura en `assets/certificados/` en formato `.webp` (`cwebp -q 85 imagen.png -o imagen.webp`).
3. Agrega la entrada en `assets/certificados/certificados.json` con `title`, `issuer`, `date`, `hours`, `type`, `thumbnail` (nombre del `.webp`) y `driveId`. Sin `driveId` se muestra solo la imagen, sin enlace.

Pruebas: `node --test tests/*.test.mjs`.

Al hacer clic, el certificado se abre en un visor modal (iframe de `drive.google.com/file/d/<driveId>/preview`, cierra con Esc, la X o clic fuera) con un botón "Abrir en Drive"; Ctrl/Cmd+clic lo abre directo en Drive.

## Repositorios de GitHub
Las cuentas se definen en `data/repos.json` (también `excludeForks` y `pageSize`).

- **En producción (CI/CD):** el workflow `.github/workflows/static.yml` ejecuta `scripts/fetch-repos.mjs` antes de publicar y genera `data/repos-list.json` (archivo ignorado por git). Corre en cada push a `main`, a diario a las 06:00 UTC y a mano desde la pestaña Actions. Usa el `GITHUB_TOKEN` del propio workflow, así que no hay límite práctico de consultas ni secretos que configurar.
- **Respaldo:** si ese archivo no existe (por ejemplo, al servir en local) o el paso falla, el navegador consulta la API pública de GitHub (60 consultas/hora por IP, caché de sesión de 1 h).
- **Local:** `node scripts/fetch-repos.mjs` genera el archivo para probar.
- Se excluyen los forks. Las descripciones y lenguajes son los de GitHub: agregar una descripción al repo la mejora en el sitio.

## Datos pendientes (no figuran en el CV, por eso no se incluyeron)
- Foto profesional (el hero usa una composición gráfica en CSS).
- Perfil de LinkedIn u otras redes.
- Capturas reales o demos de los proyectos (se usan iconos ilustrativos).
- Nombre del banco del LMS (el CV solo indica "importante banco de Chile").
- Testimonios, métricas de clientes o porcentajes de habilidad.
- Formulario de contacto: no hay backend, por lo que se usan enlaces `mailto:` y `tel:`.
