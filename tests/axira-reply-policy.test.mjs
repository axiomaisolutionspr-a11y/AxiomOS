import test from "node:test";
import assert from "node:assert/strict";
import { conciseWhatsAppReply } from "../app/lib/axira-reply-policy.js";

test("keeps a clear short customer response intact", () => {
  const response = "José, entiendo que quieres vender una aplicación, no tus apartamentos.";
  assert.equal(conciseWhatsAppReply(response, "Quiero una aplicación para vender"), response);
});

test("limits ordinary WhatsApp responses", () => {
  const response = "Podemos diseñar el sistema y evaluar las integraciones. ".repeat(50);
  const result = conciseWhatsAppReply(response, "Hola");
  assert.ok(result.length <= 700);
  assert.ok(result.length >= 420);
});

test("allows extra detail only when explicitly requested", () => {
  const response = "Primero revisamos tu proceso actual. ".repeat(60);
  const short = conciseWhatsAppReply(response, "Hola");
  const detailed = conciseWhatsAppReply(response, "Explícame con más detalles");
  assert.ok(short.length <= 700);
  assert.ok(detailed.length > short.length);
  assert.ok(detailed.length <= 1300);
});

test("keeps clear punctuation and paragraph spacing", () => {
  assert.equal(
    conciseWhatsAppReply("  Hola  José.\n\n\n¿Te ayudo con tu proyecto?  ", "Hola"),
    "Hola José.\n\n¿Te ayudo con tu proyecto?"
  );
});

test("never returns an empty answer for non-empty long text", () => {
  const result = conciseWhatsAppReply("Información ".repeat(200), "Información");
  assert.ok(result.length > 0 && result.length <= 700);
});
