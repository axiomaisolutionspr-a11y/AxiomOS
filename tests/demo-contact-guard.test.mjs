// Filtro de datos reales del DEMO (node --test tests/demo-contact-guard.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { hasRealContactData } from "../app/lib/demo-contact-guard.ts";

test("acepta teléfonos del rango ficticio 787-555-0100 a 0199", () => {
  for (const t of ["mi número es 787-555-0101", "(787) 555-0199", "+1 787 555 0150", "sin datos de contacto"]) assert.equal(hasRealContactData(t), false, t);
});
test("rechaza teléfonos reales y fuera de rango", () => {
  for (const t of ["llámame al 787-450-3679", "939 555 1234", "787-555-0200", "+1 (212) 555-0101"]) assert.equal(hasRealContactData(t), true, t);
});
test("rechaza cualquier correo", () => {
  assert.equal(hasRealContactData("escríbeme a ana@ejemplo.com"), true);
});
