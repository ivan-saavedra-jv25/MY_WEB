// Genera data/certificates-list.json con los certificados de la carpeta de Drive de data/education.json.
// Se ejecuta en el CI antes de publicar; no tiene dependencias (usa fetch de Node 18+).

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
