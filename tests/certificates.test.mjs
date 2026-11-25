import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import '../js/certificates.js';

const base = [{ driveId: 'a', title: 'base', issuer: 'X', date: '2026-01-01' }];

test('une, prioriza education.json y ordena por fecha', () => {
  const out = globalThis.mergeCertificates(base, { certificates: [
    { driveId: 'a', title: 'otro', issuer: 'X', date: '2026-05-01' },
    { driveId: 'b', title: 'nuevo', issuer: 'Y', date: '2026-03-01' },
  ] });
  assert.deepEqual(out.map((c) => c.title), ['nuevo', 'base']);
});

test('lista ausente o malformada deja la base', () => {
  for (const bad of [null, undefined, {}, { certificates: 'x' }, { certificates: [null, { driveId: 'z' }] }]) {
    assert.deepEqual(globalThis.mergeCertificates(base, bad), base);
  }
});

test('enlaces: miniatura local codificada y ver', () => {
  assert.deepEqual(globalThis.certificateLinks({ driveId: 'abc', thumbnail: 'A - Introducción (1).webp' }), {
    thumb: 'assets/certificados/A%20-%20Introducci%C3%B3n%20(1).webp',
    view: 'https://drive.google.com/file/d/abc/view',
  });
});

test('enlaces: miniatura generada tiene prioridad', () => {
  assert.equal(globalThis.certificateLinks({ driveId: 'abc', thumb: 'assets/certificados/abc.jpg' }).thumb,
    'assets/certificados/abc.jpg');
});

test('enlaces: sin driveId no hay ver; sin miniatura generada queda null', () => {
  const links = globalThis.certificateLinks({ driveId: '', thumbnail: 'x.webp' });
  assert.equal(links.view, null);
  assert.equal(globalThis.certificateLinks({ driveId: 'abc', thumb: null }).thumb, null);
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
