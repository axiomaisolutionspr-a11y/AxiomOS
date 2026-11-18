import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Regresión: con @neondatabase/serverless los parámetros viajan sin tipo.
// CONCAT_WS/CONCAT son variádicos ("any"), así que Postgres no puede inferir
// el tipo de ${valor} y la consulta falla con 42P18 ("could not determine data
// type of parameter"). Eso impedía guardar el recibo del correo y bloqueaba el
// SMS de aviso de WhatsApp. Todo parámetro dentro de CONCAT/CONCAT_WS debe
// llevar un cast explícito (p. ej. ${valor}::text).

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : [];
  });
}

/** Devuelve, para cada ${...} dentro de CONCAT(...)/CONCAT_WS(...), si va seguido de ::tipo. */
export function concatParams(source) {
  const results = [];
  for (const start of source.matchAll(/CONCAT(?:_WS)?\(/g)) {
    let i = start.index + start[0].length;
    let parens = 1;
    while (i < source.length && parens > 0) {
      if (source.startsWith("${", i)) {
        // Saltar la interpolación completa respetando llaves anidadas.
        let depth = 1;
        i += 2;
        while (i < source.length && depth > 0) {
          if (source.startsWith("${", i)) { depth += 1; i += 2; continue; }
          if (source[i] === "{") depth += 1;
          else if (source[i] === "}") depth -= 1;
          i += 1;
        }
        const line = source.slice(0, i).split("\n").length;
        results.push({ line, typed: /^::\w+/.test(source.slice(i)) });
        continue;
      }
      if (source[i] === "(") parens += 1;
      else if (source[i] === ")") parens -= 1;
      i += 1;
    }
  }
  return results;
}

test("detector flags untyped params and accepts typed / nested ones", () => {
  assert.deepEqual(concatParams("CONCAT_WS(E'\\n', crm_notes, ${marker})").map((p) => p.typed), [false]);
  assert.deepEqual(concatParams("CONCAT_WS(E'\\n', crm_notes, ${marker}::text)").map((p) => p.typed), [true]);
  assert.deepEqual(concatParams("CONCAT_WS(E'\\n\\n',crm_notes,${`Nota: ${note}`}::text)").map((p) => p.typed), [true]);
});

test("SQL CONCAT/CONCAT_WS parameters always carry an explicit type cast", () => {
  const offenders = [];
  for (const file of sourceFiles("app")) {
    for (const param of concatParams(readFileSync(file, "utf8"))) {
      if (!param.typed) offenders.push(`${file}:${param.line}`);
    }
  }
  assert.deepEqual(offenders, []);
});
