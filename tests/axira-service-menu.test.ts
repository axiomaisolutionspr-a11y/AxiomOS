import { strict as assert } from "node:assert";
import { test } from "node:test";
import { classifyAxiraServiceSelection } from "../app/lib/axira-service-menu";

test("Axira recognizes all six menu numbers", () => {
  for (let index = 1; index <= 6; index += 1) {
    const choice = classifyAxiraServiceSelection(String(index));
    assert.ok(choice);
    assert.ok(choice.label.length > 0);
    assert.ok(choice.reply.includes("¿"));
  }
});

test("Axira recognizes keycap emoji", () => {
  assert.equal(classifyAxiraServiceSelection("4️⃣")?.key, "administration");
});

test("Axira does not hijack free text or reset commands", () => {
  for (const message of ["Hola", "Tengo 1 negocio", "17.95", "#reset", "7", "1. Necesito ayuda"]) {
    assert.equal(classifyAxiraServiceSelection(message), null);
  }
});
