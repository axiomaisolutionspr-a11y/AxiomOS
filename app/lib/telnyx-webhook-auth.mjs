import { createPublicKey, verify } from "node:crypto";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const WINDOW_SECONDS = 300;

export function verifyTelnyxWebhook(rawBody, headers, publicKeyBase64, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof rawBody !== "string" || typeof publicKeyBase64 !== "string" ||
      !/^[A-Za-z0-9+/]{43}=$/.test(publicKeyBase64)) return false;
  const timestamp = headers.get("telnyx-timestamp");
  const signature = headers.get("telnyx-signature-ed25519");
  if (!timestamp || !/^[1-9]\d{9,12}$/.test(timestamp) ||
      !Number.isSafeInteger(Number(timestamp)) ||
      Math.abs(nowSeconds - Number(timestamp)) > WINDOW_SECONDS ||
      !signature || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) return false;
  try {
    const keyBytes = Buffer.from(publicKeyBase64, "base64");
    const signatureBytes = Buffer.from(signature, "base64");
    if (keyBytes.length !== 32 || signatureBytes.length !== 64) return false;
    const key = createPublicKey({key:Buffer.concat([ED25519_SPKI_PREFIX,keyBytes]),format:"der",type:"spki"});
    return verify(null, Buffer.from(`${timestamp}|${rawBody}`, "utf8"), key, signatureBytes);
  } catch { return false; }
}

export function telnyxVerificationQaEnabled(env = process.env) {
  return env.VERCEL_ENV === "preview" && env.AXIOMOS_TELNYX_VERIFY_QA === "true";
}
