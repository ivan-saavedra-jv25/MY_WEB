import { test } from 'node:test';
import assert from 'node:assert/strict';
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
