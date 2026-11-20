// Las instrucciones y mensajes de Axira/Brain no deben tener acentos dañados por doble codificación.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app/api/brain/route.ts sin acentos dañados (Ã, Â, â€)", async () => {
  const text = await readFile(new URL("../app/api/brain/route.ts", import.meta.url), "utf8");
  const damaged = text.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /Ã|Â|â€|â†/.test(l));
  assert.deepEqual(damaged.map(([n]) => n), [], "líneas con acentos dañados");
  assert.match(text, /Tu misión es ayudar a dueños/);
  assert.match(text, /\.replace\(\/\^\[-•\]\\s\*\/, ""\)/, "la limpieza de viñetas reconoce el carácter •");
});
