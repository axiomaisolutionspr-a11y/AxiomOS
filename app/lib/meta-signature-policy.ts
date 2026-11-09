import {createHmac,timingSafeEqual} from "node:crypto";

// Read-only signature assessment, used before WhatsApp processes any message.
// In shadow mode the existing traffic is unaffected; enforce only after
// observing legitimate signed provider requests with the correct app secret.
export function assessMetaWebhookSignature(rawBody: string, signature: string | null, appSecret: string | undefined) {
  if(!appSecret || appSecret.length<8) return {valid:false,reason:"missing_secret"} as const;
  if(!/^sha256=[a-f0-9]{64}$/i.test(signature ?? "")) return {valid:false,reason:"missing_or_malformed_signature"} as const;
  try {
    const raw=Buffer.from(rawBody,"utf8");
    if(!raw.length || raw.length>3*1024*1024) return {valid:false,reason:"invalid_body_size"} as const;
    const digest=createHmac("sha256",appSecret).update(raw).digest();
    const provided=Buffer.from(signature!.slice(7),"hex");
    return provided.length===digest.length && timingSafeEqual(provided,digest)
      ? {valid:true,reason:"verified"} as const
      : {valid:false,reason:"signature_mismatch"} as const;
  } catch {
    return {valid:false,reason:"verification_error"} as const;
  }
}
