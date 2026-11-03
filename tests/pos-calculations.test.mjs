/**
 * Ejecutar: node --experimental-strip-types --test tests/pos-calculations.test.mjs
 * No toca Neon, CRM, terminales ni servicios de pago.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrder, formatMoney } from "../app/lib/pos/calculations.ts";

const taxable = (price, quantity = 1) => ({
  sku: "T-001",
  description: "Prueba gravada",
  unitPriceCents: price,
  quantity,
  taxRateBasisPoints: 1150,
});

test("orden vacía no genera importe", () => {
  assert.deepEqual(calculateOrder([]), {
    lines: [], subtotalCents: 0, taxCents: 0, totalCents: 0,
  });
});

test("calcula en centavos y redondea IVU por línea", () => {
  const order = calculateOrder([taxable(1999, 2)]);
  assert.equal(order.subtotalCents, 3998);
  assert.equal(order.taxCents, 460);
  assert.equal(order.totalCents, 4458);
  assert.equal(order.lines[0].totalCents, 4458);
});

test("separa artículos de tasa cero y gravados", () => {
  const order = calculateOrder([
    taxable(1000),
    { sku: "X", description: "Prueba exenta", unitPriceCents: 200, quantity: 1, taxRateBasisPoints: 0 },
  ]);
  assert.equal(order.subtotalCents, 1200);
  assert.equal(order.taxCents, 115);
  assert.equal(order.totalCents, 1315);
});

test("rechaza cantidades y precios inválidos", () => {
  assert.throws(() => calculateOrder([taxable(100, 0)]), /Cantidad inválida/);
  assert.throws(() => calculateOrder([taxable(100, 10000)]), /Cantidad inválida/);
  assert.throws(() => calculateOrder([taxable(-1)]), /Precio/);
  assert.throws(() => calculateOrder([taxable(0.4)]), /Precio/);
});

test("rechaza tasas fuera del rango y producto sin código", () => {
  assert.throws(() => calculateOrder([{ ...taxable(100), taxRateBasisPoints: 11000 }]), /Tasa contributiva/);
  assert.throws(() => calculateOrder([{ ...taxable(100), sku: "" }]), /código/);
});

test("rechaza importes inseguros para evitar totales incorrectos", () => {
  assert.throws(() => calculateOrder([taxable(Number.MAX_SAFE_INTEGER, 2)]), /Subtotal/);
});

test("conserva moneda USD para presentación", () => {
  const text = formatMoney(12345);
  assert.match(text, /123/);
  assert.match(text, /45/);
});
