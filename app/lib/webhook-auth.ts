import { createHmac, timingSafeEqual, createPublicKey, verify } from "node:crypto";

export function verifyMetaWebhook(raw: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header || !/^sha256=[a-f0-9]{64}$/i.test(header)) return false;
  const expected=createHmac("sha256",secret).update(raw).digest();
  const received=Buffer.from(header.slice(7),"hex");
  return received.length===expected.length && timingSafeEqual(received,expected);
}
export function verifyTelnyxWebhook(raw: string, headers: Headers, publicKeyBase64: string | undefined, at = Date.now()): boolean {
  const stamp=headers.get("telnyx-timestamp");
  const signature=headers.get("telnyx-signature-ed25519");
  if (!publicKeyBase64 || !stamp || !/^\d{10}$/.test(stamp) || !signature) return false;
  const seconds=Number(stamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(at-seconds*1000)>300000) return false;
  if (!/^[A-Za-z0-9+/]{86}==?$/.test(signature)) return false;
  try {
    const rawKey=Buffer.from(publicKeyBase64,"base64");
    const signed=Buffer.from(signature,"base64");
    if (rawKey.length!==32 || signed.length!==64) return false;
    const spki=Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),rawKey]);
    const key=createPublicKey({key:spki,format:"der",type:"spki"});
    return verify(null,Buffer.from(stamp+"|"+raw),key,signed);
  } catch { return false; }
}
export function isExpectedDualhookWhatsAppPayload(body: unknown, wabaId: string | undefined, phoneId: string | undefined): boolean {
  // IMPORTANT: identity/shape validation is NOT cryptographic authentication.
  // Dualhook Embedded Signup signs with its own Meta app secret.
  if (!wabaId || !phoneId || !body || typeof body!=="object") return false;
  const value=body as {object?:unknown;entry?:unknown};
  if (value.object!=="whatsapp_business_account" || !Array.isArray(value.entry) || value.entry.length===0 || value.entry.length>20) return false;
  return value.entry.every((entry:unknown)=>{
    if (!entry || typeof entry!=="object") return false;
    const e=entry as {id?:unknown;changes?:unknown};
    if (e.id!==wabaId || !Array.isArray(e.changes) || e.changes.length===0 || e.changes.length>30) return false;
    return e.changes.every((change:unknown)=>{
      if (!change || typeof change!=="object") return false;
      const c=change as {field?:unknown;value?:{metadata?:{phone_number_id?:unknown}}};
      return c.field==="messages" && c.value?.metadata?.phone_number_id===phoneId;
    });
  });
}
