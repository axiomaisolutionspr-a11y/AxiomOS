// Pruebas aisladas: no se conecta a Neon, Resend ni Telnyx.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createHash } = require('node:crypto');

function harness({ email = true, sms = true, failSave = false,
  failEmailReceipt = false, failSmsReceipt = false } = {}) {
  let notes = '';
  const queries = [];
  const sent = [];
  const logs = [];
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    queries.push({ query, values });
    const concatMarker = values.find(value => typeof value === 'string' && /^\[WA_(?:EMAIL|SMS)_/.test(value));
    if (concatMarker && query.includes('CONCAT_WS') && !query.includes('?::text')) {
      throw new Error('simulated PostgreSQL: could not determine data type of marker parameter');
    }
    if (failEmailReceipt && concatMarker?.startsWith('[WA_EMAIL_ACCEPTED:')) {
      throw new Error('simulated email receipt persistence failure');
    }
    if (failSmsReceipt && concatMarker?.startsWith('[WA_SMS_ACCEPTED:')) {
      throw new Error('simulated SMS receipt persistence failure');
    }
    if (query.includes('INSERT INTO prospects')) {
      if (failSave) throw new Error('simulated DB failure');
      const newNotes = values.find(value => typeof value === 'string' && value.includes('WHATSAPP —'));
      const marker = newNotes.split('\n')[0];
      if (!notes.includes(marker)) notes += '\n' + newNotes;
      return [{ id: '42', crm_notes: notes }];
    }
    const marker = values.find(value => typeof value === 'string' && /^\[WA_/.test(value));
    if (query.includes('RETURNING id')) {
      if (notes.includes(marker)) return [];
      notes += '\n' + marker;
      return [{ id: '42' }];
    }
    if (marker && !notes.includes(marker)) notes += '\n' + marker;
    return [];
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('app/lib/whatsapp-contact-request.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => name === '@neondatabase/serverless' ? { neon: () => sql } : require(name),
    process: { env: { DATABASE_URL: 'mock', EMAIL_ENABLED: email ? ' true ' : 'false',
      RESEND_API_KEY: 'mock', EMAIL_ALERT_FROM: 'alerts@example.test', EMAIL_ALERT_TO: 'owner@example.test',
      WHATSAPP_SMS_ALERTS_ENABLED: sms ? 'true' : 'false',
      TELNYX_API_KEY: 'mock', TELNYX_SMS_FROM: '+15550000000' } },
    console: {
      log(label) { logs.push(label); },
      error(label) { logs.push(label); },
    }, AbortSignal,
    fetch: async (url, options) => {
      sent.push({ url, body: JSON.parse(options.body) });
      return { ok: true, status: 200, json: async () => url.includes('resend') ? { id: 'email-1' } : { data: { id: 'sms-1' } } };
    },
  });
  return { ...module.exports, sent, queries, logs };
}

async function main() {
  const normal = { phone: '+17875550199', text: 'Buenas, tengo oficina médica', messageId: 'wa-1', history: [] };
  const test = harness();
  assert.equal(await test.registerWhatsAppContact(normal), null, 'Brain debe responder normalmente');
  assert.equal(test.sent.length, 2, 'Un texto normal debe generar correo y SMS');
  assert.match(test.sent[0].body.subject, /nuevo mensaje/);
  assert.match(test.sent[1].body.text, /Nuevo mensaje/);
  assert.equal(test.sent[1].body.to, '+17872320132', 'Conservar destino autorizado');
  assert.equal(test.queries.filter(({ query }) => query.includes('?::text')).length, 3,
    'Correo, reserva SMS y recibo SMS deben tipar sus marcadores como texto');
  assert.ok(test.queries[0].values.includes('phone:7875550199'));
  assert.ok(test.queries[0].values.includes('Nuevo'));
  assert.ok(test.queries[0].values.includes(null), 'Sin cita ni seguimiento forzado para un saludo');
  await test.registerWhatsAppContact(normal);
  assert.equal(test.sent.length, 2, 'Una entrega duplicada no debe repetir avisos aceptados');
  const evaluation = await test.registerWhatsAppContact({ ...normal, text: 'Quiero una evaluación gratuita', messageId: 'wa-2' });
  assert.match(evaluation, /todavía no hay una cita reservada/);
  assert.equal(test.sent.length, 4);
  const media = harness();
  assert.equal(await media.registerWhatsAppContact({ ...normal, text: '[Nota de voz recibida]', messageId: 'wa-media' }), null);
  assert.equal(media.sent.length, 2, 'Los archivos también notifican');
  const disabled = harness({ email: false, sms: false });
  await disabled.registerWhatsAppContact(normal);
  assert.equal(disabled.sent.length, 0);
  assert.ok(disabled.queries.length > 0, 'CRM debe guardar aunque los avisos estén desactivados');
  const receiptFailure = harness({ failEmailReceipt: true, failSmsReceipt: true });
  await receiptFailure.registerWhatsAppContact({ ...normal, messageId: 'wa-receipt-failure' });
  assert.equal(receiptFailure.sent.length, 2, 'Los proveedores aceptaron ambos avisos');
  assert.ok(receiptFailure.logs.includes('WHATSAPP_CONTACT_EMAIL_ACCEPTED'));
  assert.ok(receiptFailure.logs.includes('WHATSAPP_CONTACT_EMAIL_RECEIPT_SAVE_FAILED'));
  assert.ok(receiptFailure.logs.includes('WHATSAPP_CONTACT_SMS_ACCEPTED'));
  assert.ok(receiptFailure.logs.includes('WHATSAPP_CONTACT_SMS_RECEIPT_SAVE_FAILED'));
  assert.ok(!receiptFailure.logs.includes('WHATSAPP_CONTACT_EMAIL_FAILED'));
  assert.ok(!receiptFailure.logs.includes('WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN'));
  const failed = harness({ failSave: true });
  assert.equal(await failed.registerWhatsAppContact(normal), null);
  assert.equal(failed.sent.length, 0);
  assert.match(await failed.registerWhatsAppContact({ ...normal, text: 'Quiero hablar con un asesor' }), /No pudimos registrar/);
  assert.equal(test.contactRequestKind('No quiero una evaluación'), null);
  assert.equal(createHash('sha256').update(normal.messageId).digest('hex').length, 64);
  console.log('OK: mensajes normales, solicitudes, archivos, duplicados, destinos y errores sin llamadas externas.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
