import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { parseFileName, listFiles, downloadThumbnail, buildList } from '../scripts/fetch-certificates.mjs';

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
