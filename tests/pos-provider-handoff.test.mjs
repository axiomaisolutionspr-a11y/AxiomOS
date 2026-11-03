import test from "node:test";
import assert from "node:assert/strict";
import {
  providerRegistry, validatePaymentHandoff, webhookIsSufficientProofOfPayment,
  submitPaymentToProcessor,
} from "../app/lib/pos/provider-handoff.ts";

const base = {
  provider: "ath_business",
  orderId: "0e972d94-7c29-4b4b-b167-333333333333",
  merchantId: "ee972d94-7c29-4b4b-b167-444444444444",
  amountCents: 500,
  currency: "USD",
  idempotencyKey: "checkout-unique-key-0001",
};
test("ATH: referencia válida para integración, no pago autorizado", () => {
  assert.deepEqual(validatePaymentHandoff(base), {
    ok: true, reason: "estructura_valida_sin_autorizacion_de_pago",
  });
});
test("ATH: rechaza cargos inferiores a $1 y mayores a $1,500", () => {
  assert.equal(validatePaymentHandoff({...base, amountCents: 99}).ok, false);
  assert.equal(validatePaymentHandoff({...base, amountCents: 150001}).ok, false);
  assert.equal(validatePaymentHandoff({...base, amountCents: 100}).ok, true);
  assert.equal(validatePaymentHandoff({...base, amountCents: 150000}).ok, true);
});
test("rechaza proveedor, moneda, importe, identificación o clave inválidos", () => {
  assert.equal(validatePaymentHandoff({...base, provider: "fakebank"}).ok, false);
  assert.equal(validatePaymentHandoff({...base, currency: "EUR"}).ok, false);
  assert.equal(validatePaymentHandoff({...base, amountCents: -1}).ok, false);
  assert.equal(validatePaymentHandoff({...base, amountCents: 1.4}).ok, false);
  assert.equal(validatePaymentHandoff({...base, merchantId: "merchant-a"}).ok, false);
  assert.equal(validatePaymentHandoff({...base, idempotencyKey: "abc"}).ok, false);
});
test("Evertec solo admite estructura: no se presupone SDK aprobado", () => {
  assert.equal(providerRegistry.evertec_link.supportsPublicSandbox, false);
  assert.equal(validatePaymentHandoff({...base, provider: "evertec_link", amountCents: 150001}).ok, true);
});
test("una notificación webhook no prueba pago confirmado", () => {
  assert.equal(webhookIsSufficientProofOfPayment(), false);
});
test("sin contrato y credenciales rechaza todo cobro externo", async () => {
  await assert.rejects(submitPaymentToProcessor(base), /POS_PROVIDER_NOT_CONNECTED/);
});
