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
