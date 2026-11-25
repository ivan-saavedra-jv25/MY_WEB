// Une los certificados de data/education.json con los generados desde Drive en el CI.
globalThis.mergeCertificates = (base, generated) => {
  const known = new Set(base.map((cert) => cert.driveId));
  const list = Array.isArray(generated?.certificates) ? generated.certificates : [];
  const extra = list.filter((cert) => cert
    && ['driveId', 'title', 'issuer', 'date'].every((key) => typeof cert[key] === 'string')
    && !known.has(cert.driveId));
  return [...base, ...extra].sort((a, b) => b.date.localeCompare(a.date));
};
