import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import '../js/certificates.js';

test('ordena por fecha, la más reciente primero, sin modificar la lista', () => {
  const list = [{ date: '2026-01-01' }, { date: '2026-03-01' }];
  assert.deepEqual(globalThis.sortCertificates(list).map((c) => c.date), ['2026-03-01', '2026-01-01']);
  assert.equal(list[0].date, '2026-01-01');
});

test('enlaces: miniatura local codificada y ver', () => {
  assert.deepEqual(globalThis.certificateLinks({ driveId: 'abc', thumbnail: 'A - Introducción (1).webp' }), {
    thumb: 'assets/certificados/A%20-%20Introducci%C3%B3n%20(1).webp',
    view: 'https://drive.google.com/file/d/abc/view',
  });
});

test('enlaces: sin driveId no hay ver; sin miniatura queda null', () => {
  const links = globalThis.certificateLinks({ driveId: '', thumbnail: 'x.webp' });
  assert.equal(links.view, null);
  assert.equal(globalThis.certificateLinks({ driveId: 'abc' }).thumb, null);
});

test('certificados.json: miniaturas existen y no hay duplicados', async () => {
  const dir = new URL('../assets/certificados/', import.meta.url);
  const list = JSON.parse(await readFile(new URL('certificados.json', dir), 'utf8'));
  const files = new Set((await readdir(dir)).map((name) => name.normalize('NFC')));
  for (const cert of list) assert.ok(files.has(cert.thumbnail), cert.thumbnail);
  const ids = list.map((cert) => cert.driveId).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  const keys = list.map((cert) => `${cert.issuer}|${cert.title}|${cert.date}`);
  assert.equal(new Set(keys).size, keys.length);
});
