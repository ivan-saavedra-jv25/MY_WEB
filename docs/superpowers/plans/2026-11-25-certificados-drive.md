# Certificados automáticos desde Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir un certificado a la carpeta de Drive basta para que aparezca en el sitio en el siguiente despliegue.

**Architecture:** Un script de CI lista la carpeta con Drive API v3, interpreta el nombre de cada archivo, descarga miniaturas y genera `data/certificates-list.json`. El navegador une esa lista con `data/education.json`.

**Tech Stack:** HTML, CSS y JavaScript vanilla; Node 18+ (`fetch`, `node:test`); GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-25-certificados-drive-design.md`

## Global Constraints

- Sin dependencias nuevas, sin build, sin `package.json`, sin commits automáticos del CI.
- Formato de nombre: `Emisor - Título - AAAA-MM-DD - Nh.ext`; horas opcionales; el título puede contener ` - `.
- `education.json` tiene prioridad por `driveId`.
- Un fallo de Drive nunca impide publicar (`continue-on-error: true`).
- Secret: `DRIVE_API_KEY`. La key va en el header `X-goog-api-key`, nunca en la URL ni en logs.
- Textos y comentarios en español.
- Trabajar en la rama `feat/certificados-drive`, no en `main`.

## Review Focus

- Nombre con fecha imposible (`2026-13-40`) o formato libre: se omite con aviso, el resto se publica.
- Nombre con acentos en forma NFD (subido desde macOS): se muestra normalizado en NFC.
- Miniatura que responde HTML o error: no se guarda archivo, el certificado sale con tarjeta de respaldo.
- Carpeta con más de una página de resultados: se listan todos.
- Lista generada ausente o malformada: el sitio muestra los certificados de `education.json`.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `scripts/fetch-certificates.mjs` (nuevo) | Listar, interpretar, descargar, generar lista |
| `js/certificates.js` (nuevo) | Unión y orden de listas (función pura) |
| `js/main.js`, `index.html` | Cargar la lista generada y pintar |
| `tests/fetch-certificates.test.mjs`, `tests/certificates.test.mjs` (nuevos) | Pruebas |
| `.github/workflows/static.yml`, `.gitignore`, `README.md` | Despliegue y documentación |

---

### Task 1: Interpretar nombres de archivo

**Files:**
- Create: `scripts/fetch-certificates.mjs`
- Test: `tests/fetch-certificates.test.mjs`

**Interfaces:**
- Produces: `parseFileName(name: string): { issuer: string, title: string, date: string, hours: number | null } | null`

- [ ] **Step 1: Crear la rama**

Run: `git switch -c feat/certificados-drive`

- [ ] **Step 2: Escribir las pruebas**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFileName } from '../scripts/fetch-certificates.mjs';

test('formato completo', () => {
  assert.deepEqual(parseFileName('Platzi - Curso de Git y GitHub - 2026-09-28 - 24h.pdf'),
    { issuer: 'Platzi', title: 'Curso de Git y GitHub', date: '2026-09-28', hours: 24 });
});
test('sin horas', () => {
  assert.equal(parseFileName('EDteam - React - 2025-09-04.png').hours, null);
});
test('título con separador', () => {
  assert.equal(parseFileName('Platzi - Angular - Servicios - 2026-09-29 - 13h.pdf').title, 'Angular - Servicios');
});
test('NFD se normaliza a NFC', () => {
  const name = 'EDteam - Introducción - 2025-08-19.png'.normalize('NFD');
  assert.equal(parseFileName(name).title, 'Introducción'.normalize('NFC'));
});
test('nombres inválidos', () => {
  for (const name of ['diploma-jev.pdf', 'Platzi - 2026-09-28.pdf',
    'Platzi - Curso - 2026-13-40 - 3h.pdf', 'Platzi - Curso - 2026-02-30.pdf',
    'Platzi - Curso - 28-09-2026.pdf']) {
    assert.equal(parseFileName(name), null, name);
  }
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `node --test tests/fetch-certificates.test.mjs`
Expected: FAIL (módulo inexistente)

- [ ] **Step 4: Implementar y exportar `parseFileName`**

Quitar la extensión, normalizar NFC, separar por ` - `, leer desde el final (horas `^\d+h$`, luego fecha real de calendario). El primer trozo es el emisor y el resto el título.

- [ ] **Step 5: Verificar que pasan**

Run: `node --test tests/fetch-certificates.test.mjs`
Expected: PASS, 5 pruebas

- [ ] **Step 6: Commit** (incluye spec y plan)

```bash
git add docs/superpowers scripts/fetch-certificates.mjs tests/fetch-certificates.test.mjs
git commit -m "feat: interpretar nombres de certificados"
```

### Task 2: Listar Drive, descargar miniaturas y generar la lista

**Files:**
- Modify: `scripts/fetch-certificates.mjs`, `tests/fetch-certificates.test.mjs`, `.gitignore`

**Interfaces:**
- Consumes: `parseFileName`
- Produces:
  - `listFiles(folderId: string, apiKey: string, fetchFn = fetch): Promise<{id, name, mimeType}[]>`
  - `downloadThumbnail(id: string, dir: URL, fetchFn = fetch): Promise<string | null>` (devuelve `assets/certificados/<id>.<jpg|png|webp>`)
  - `buildList(files, knownIds: Set<string>, download: (id) => Promise<string|null>): Promise<Certificate[]>`
  - `Certificate = { title, issuer, date, hours: number|null, type: 'PDF'|'imagen', driveId, thumb: string|null }`
  - Salida `data/certificates-list.json`: `{ "generatedAt": ISO, "certificates": Certificate[] }`

- [ ] **Step 1: Escribir las pruebas** (agregar `listFiles`, `downloadThumbnail`, `buildList` al import)

```js
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

test('listFiles recorre las páginas y no pone la key en la URL', async () => {
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(calls.length === 1
      ? { files: [{ id: 'a' }], nextPageToken: 't2' }
      : { files: [{ id: 'b' }] });
  };
  const files = await listFiles('folder', 'secreta', fetchFn);
  assert.deepEqual(files.map((f) => f.id), ['a', 'b']);
  assert.ok(calls[1].url.includes('pageToken=t2'));
  assert.ok(calls.every((c) => !c.url.includes('secreta')));
  assert.equal(calls[0].options.headers['X-goog-api-key'], 'secreta');
});

test('listFiles falla si la API responde error', async () => {
  await assert.rejects(listFiles('folder', 'k', async () => new Response('', { status: 403 })), /403/);
});

test('miniatura que no es imagen no se guarda', async () => {
  const dir = pathToFileURL(`${await mkdtemp(`${tmpdir()}/cert-`)}/`);
  const html = async () => new Response('<html>', { headers: { 'content-type': 'text/html' } });
  assert.equal(await downloadThumbnail('abc', dir, html), null);
  assert.deepEqual(await readdir(dir), []);
});

test('miniatura válida se guarda con su extensión', async () => {
  const dir = pathToFileURL(`${await mkdtemp(`${tmpdir()}/cert-`)}/`);
  const jpg = async () => new Response('x', { headers: { 'content-type': 'image/jpeg' } });
  assert.equal(await downloadThumbnail('abc', dir, jpg), 'assets/certificados/abc.jpg');
  assert.deepEqual(await readdir(dir), ['abc.jpg']);
});

test('buildList omite conocidos, inválidos y otros tipos', async () => {
  const pdf = 'application/pdf';
  const files = [
    { id: 'conocido', name: 'A - B - 2026-01-01.pdf', mimeType: pdf },
    { id: 'malo', name: 'diploma-jev.pdf', mimeType: pdf },
    { id: 'doc', name: 'A - B - 2026-01-01.docx', mimeType: 'application/msword' },
    { id: 'nuevo', name: 'A - B - 2026-01-01 - 2h.png', mimeType: 'image/png' },
  ];
  assert.deepEqual(await buildList(files, new Set(['conocido']), async () => null), [
    { title: 'B', issuer: 'A', date: '2026-01-01', hours: 2, type: 'imagen', driveId: 'nuevo', thumb: null },
  ]);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `node --test tests/fetch-certificates.test.mjs`
Expected: FAIL (exportaciones inexistentes)

- [ ] **Step 3: Implementar las tres funciones y el programa principal**

- Listado: `https://www.googleapis.com/drive/v3/files`, `q='<id>' in parents and trashed=false`, `fields=nextPageToken,files(id,name,mimeType)`, `pageSize=100`.
- Miniatura: `https://drive.google.com/thumbnail?id=<id>&sz=w1000`. Un error de red también devuelve `null`.
- `buildList` descarga de a una (Drive limita peticiones seguidas) y avisa en el log por cada nombre omitido.
- El principal corre solo si el archivo se ejecuta directo (comparar `process.argv[1]` con `fileURLToPath(import.meta.url)`). Lee `data/education.json`, saca el ID tras `/folders/` en `folder`, usa `process.env.DRIVE_API_KEY` y termina con error si falta, sin escribir la lista.
- Agregar a `.gitignore`: `data/certificates-list.json`, `assets/certificados/*.jpg`, `assets/certificados/*.png`.

- [ ] **Step 4: Verificar que pasan y que sin key falla limpio**

Run: `node --test tests/fetch-certificates.test.mjs`
Expected: PASS, 10 pruebas

Run: `env -u DRIVE_API_KEY node scripts/fetch-certificates.mjs`
Expected: mensaje que nombra `DRIVE_API_KEY`, código distinto de 0, sin `data/certificates-list.json`

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-certificates.mjs tests/fetch-certificates.test.mjs .gitignore
git commit -m "feat: generar lista de certificados desde Drive"
```

### Task 3: Mostrar la lista en el sitio

**Files:**
- Create: `js/certificates.js`, `tests/certificates.test.mjs`
- Modify: `js/main.js` (`renderEducation`, `initContent`), `index.html` (script antes de `js/main.js`)

**Interfaces:**
- Consumes: `data/certificates-list.json` (Task 2)
- Produces: `globalThis.mergeCertificates(base: Certificate[], generated: unknown): Certificate[]`, script clásico sin `export`

- [ ] **Step 1: Escribir las pruebas**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../js/certificates.js';

const { mergeCertificates } = globalThis;
const base = [{ driveId: 'a', title: 'base', issuer: 'X', date: '2026-01-01' }];

test('une, prioriza education.json y ordena por fecha', () => {
  const out = mergeCertificates(base, { certificates: [
    { driveId: 'a', title: 'otro', issuer: 'X', date: '2026-05-01' },
    { driveId: 'b', title: 'nuevo', issuer: 'Y', date: '2026-03-01' },
  ] });
  assert.deepEqual(out.map((c) => c.title), ['nuevo', 'base']);
});

test('lista ausente o malformada deja la base', () => {
  for (const bad of [null, undefined, {}, { certificates: 'x' }, { certificates: [null, { driveId: 'z' }] }]) {
    assert.deepEqual(mergeCertificates(base, bad), base);
  }
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `node --test tests/certificates.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implementar y conectar**

- `mergeCertificates` descarta entradas generadas sin `driveId`, `title`, `issuer` y `date` de tipo texto.
- `renderEducation` pasa a `async`: pide `data/certificates-list.json` y ante cualquier fallo usa `null`. En `initContent`, `await render(...)`.
- Miniatura: `cert.thumb` si existe, si no `assets/certificados/<id>.webp`. `width`/`height` por defecto 1000 y 758.
- Sin `hours`, el texto es `Emisor · fecha`, sin ` h`.

- [ ] **Step 4: Verificar pruebas y sitio**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 12 pruebas

Servir con `python3 -m http.server 8765`. Sin lista generada: 9 certificados. Con una lista temporal que tenga una entrada nueva sin `hours` ni `thumb`: 10, con tarjeta de respaldo, sin errores de JavaScript en consola. Borrar la lista temporal.

- [ ] **Step 5: Commit**

```bash
git add js/certificates.js js/main.js index.html tests/certificates.test.mjs
git commit -m "feat: mostrar certificados generados"
```

### Task 4: Despliegue y documentación

**Files:**
- Modify: `.github/workflows/static.yml`, `README.md`

**Interfaces:**
- Consumes: `scripts/fetch-certificates.mjs`

- [ ] **Step 1: Agregar el paso al workflow**, después de "Fetch GitHub repositories"

```yaml
      - name: Fetch Drive certificates
        # Si falla, el sitio publica con los certificados de data/education.json
        continue-on-error: true
        env:
          DRIVE_API_KEY: ${{ secrets.DRIVE_API_KEY }}
        run: node scripts/fetch-certificates.mjs
```

- [ ] **Step 2: Actualizar README**

Reemplazar las instrucciones manuales de "Certificados en Google Drive" por: formato de nombre con ejemplo, cuándo se publica (incluye Run workflow en Actions), creación de la API key (Google Cloud, habilitar Drive API, restringir la key a esa API), alta del secret, prueba local `DRIVE_API_KEY=... node scripts/fetch-certificates.mjs`, y que `education.json` tiene prioridad. Actualizar el árbol de Estructura.

- [ ] **Step 3: Verificar**

Run: `node --test tests/*.test.mjs && git diff --stat`
Expected: 12 pruebas PASS; cambian solo `static.yml` y `README.md`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/static.yml README.md
git commit -m "ci: publicar certificados desde Drive"
```

- [ ] **Step 5: Pasos manuales de Iván (tras integrar a `main`)**

Crear la API key, guardar el secret `DRIVE_API_KEY`, renombrar los 6 certificados nuevos y ejecutar el workflow. Esperado: el log lista 6 certificados y el sitio muestra 15.
