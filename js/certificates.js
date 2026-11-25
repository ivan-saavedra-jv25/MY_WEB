// Orden y enlaces de los certificados de assets/certificados/certificados.json.
globalThis.sortCertificates = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date));

// Miniatura y enlace de un certificado; sin driveId no hay PDF que ver.
globalThis.certificateLinks = ({ driveId, thumbnail }) => ({
  thumb: thumbnail ? `assets/certificados/${encodeURIComponent(thumbnail)}` : null,
  view: driveId ? `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/view` : null,
});
