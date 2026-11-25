// Genera data/certificates-list.json con los certificados de la carpeta de Drive de data/education.json.
// Se ejecuta en el CI antes de publicar; no tiene dependencias (usa fetch de Node 18+).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const THUMB_DIR = 'assets/certificados/';
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function isRealDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso);
}

// Formato: "Emisor - Título - AAAA-MM-DD - Nh.ext" (las horas son opcionales).
export function parseFileName(name) {
  const parts = name.normalize('NFC').replace(/\.[^.]+$/, '').split(' - ').map((part) => part.trim());
  const hoursMatch = /^(\d+)h$/.exec(parts.at(-1));
  if (hoursMatch) parts.pop();
  const date = parts.pop();
  const [issuer, ...rest] = parts;
  const title = rest.join(' - ');
  if (!date || !isRealDate(date) || !issuer || !title) return null;
  return { issuer, title, date, hours: hoursMatch ? Number(hoursMatch[1]) : null };
}

export async function listFiles(folderId, apiKey, fetchFn = fetch) {
  const files = [];
  let pageToken;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.search = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '100',
      ...(pageToken ? { pageToken } : {}),
    });
    const response = await fetchFn(url, { headers: { 'X-goog-api-key': apiKey } });
    if (!response.ok) throw new Error(`Drive respondió ${response.status} al listar la carpeta`);
    const page = await response.json();
    files.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return files;
}

// Devuelve la ruta pública de la miniatura, o null si no se pudo obtener una imagen.
export async function downloadThumbnail(id, dir, fetchFn = fetch) {
  try {
    const response = await fetchFn(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`);
    const type = response.headers.get('content-type')?.split(';')[0];
    const extension = EXTENSIONS[type];
    if (!response.ok || !extension) throw new Error(`respuesta ${response.status} (${type})`);
    const name = `${id}.${extension}`;
    await writeFile(new URL(name, dir), Buffer.from(await response.arrayBuffer()));
    return `${THUMB_DIR}${name}`;
  } catch (error) {
    console.warn(`Sin miniatura para ${id}: ${error.message}`);
    return null;
  }
}

export async function buildList(files, knownIds, download) {
  const certificates = [];
  for (const file of files) {
    const isPdf = file.mimeType === 'application/pdf';
    if (knownIds.has(file.id) || !(isPdf || file.mimeType.startsWith('image/'))) continue;
    const data = parseFileName(file.name);
    if (!data) {
      console.warn(`Omitido, nombre sin el formato "Emisor - Título - AAAA-MM-DD - Nh": ${file.name}`);
      continue;
    }
    // De a una: Drive limita las peticiones seguidas.
    const thumb = await download(file.id);
    certificates.push({ ...data, type: isPdf ? 'PDF' : 'imagen', driveId: file.id, thumb });
  }
  return certificates;
}

async function main() {
  const apiKey = process.env.DRIVE_API_KEY;
  if (!apiKey) throw new Error('Falta la variable de entorno DRIVE_API_KEY');

  const root = new URL('../', import.meta.url);
  const education = JSON.parse(await readFile(new URL('data/education.json', root), 'utf8'));
  const folderId = /\/folders\/([\w-]+)/.exec(education.folder ?? '')?.[1];
  if (!folderId) throw new Error('data/education.json no tiene un enlace "folder" de Drive válido');

  const base = JSON.parse(await readFile(new URL(`${THUMB_DIR}certificados.json`, root), 'utf8'));
  const files = await listFiles(folderId, apiKey);
  const knownIds = new Set(base.map((cert) => cert.driveId));
  const certificates = await buildList(files, knownIds,
    (id) => downloadThumbnail(id, new URL(THUMB_DIR, root)));

  const output = { generatedAt: new Date().toISOString(), certificates };
  await writeFile(new URL('data/certificates-list.json', root), `${JSON.stringify(output, null, 2)}\n`);
  console.log(`${certificates.length} certificados nuevos desde Drive`);
  certificates.forEach((cert) => console.log(`- ${cert.issuer}: ${cert.title} (${cert.date})`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
