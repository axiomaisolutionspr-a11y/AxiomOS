const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const brainRoute = fs.readFileSync('app/api/brain/route.ts', 'utf8');

test('Axira does not offer an unapproved free demo', () => {
  assert.doesNotMatch(brainRoute, /ofrece coordinar una cita sin compromiso y un demo gratuito/i);
  assert.match(brainRoute, /No ofrezcas demos gratuitos, pruebas gratis, descuentos ni promociones/);
});

test('Axira does not quote the expired October promotion', () => {
  assert.doesNotMatch(brainRoute, /Tarifas promocionales de octubre de 2026/);
  assert.doesNotMatch(brainRoute, /WhatsApp Inicio, \$39 al mes/);
  assert.match(brainRoute, /No ofrezcas ni cotices tarifas promocionales vencidas/);
});

test('Axira distinguishes CRM processing from confirmed human transfer', () => {
  assert.match(brainRoute, /El canal puede registrar mensajes en CRM fuera de esta respuesta/);
  assert.match(brainRoute, /no recibes confirmación verificable de alertas, reservas o transferencias/);
});

test('Axira has a commercial recovery rule without improvised concessions', () => {
  assert.match(brainRoute, /Si expresa frustración o dice que se irá con otra opción/);
  assert.match(brainRoute, /No improvises descuentos, garantías ni disponibilidad/);
});
