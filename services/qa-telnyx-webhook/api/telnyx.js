import { createPublicKey, verify } from "node:crypto";

export const config = {api:{bodyParser:false}};
const spkiPrefix=Buffer.from("302a300506032b6570032100","hex");
export function verifyTelnyxWebhook(raw,timestamp,signature,publicKey,now=Date.now()) {
  try {
    if(!Buffer.isBuffer(raw) || raw.length<1 || raw.length>262144 ||
       !/^\d{10}$/.test(timestamp) || Math.abs(now-Number(timestamp)*1000)>300000 ||
       typeof signature!=="string" || signature.length>150 ||
       !/^[A-Za-z0-9+/]{43}=$/.test(publicKey??"")) return false;
    const sig=Buffer.from(signature,"base64"),key=Buffer.from(publicKey,"base64");
    if(sig.length!==64 || key.length!==32) return false;
    const spki=createPublicKey({key:Buffer.concat([spkiPrefix,key]),format:"der",type:"spki"});
    return verify(null,Buffer.concat([Buffer.from(timestamp+"|"),raw]),spki,sig);
  } catch {return false;}
}
export default async function handler(req,res) {
  if(req.method==="GET"){
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({ok:true,service:"axiomos-qa-telnyx-webhook",mode:"verify-only"});
  }
  if(req.method!=="POST") return res.status(405).json({ok:false});
  let parts=[],size=0;
  try {
    for await(const chunk of req) {
      size+=chunk.length;
      if(size>262144) return res.status(413).json({ok:false});
      parts.push(chunk);
    }
    const raw=Buffer.concat(parts);
    const ts=String(req.headers["telnyx-timestamp"]??"");
    const signature=String(req.headers["telnyx-signature-ed25519"]??"");
    if(!verifyTelnyxWebhook(raw,ts,signature,process.env.TELNYX_SIGNING_PUBLIC_KEY)){
      console.warn("AXIOMOS_QA_TELNYX_REJECTED_UNVERIFIED");
      return res.status(401).json({ok:false});
    }
    let event;
    try {event=JSON.parse(raw.toString("utf8"));}catch{return res.status(400).json({ok:false});}
    const type=event?.data?.event_type;
    const id=event?.data?.payload?.id;
    const eventId=event?.data?.id;
    const status=event?.data?.payload?.to?.[0]?.status??event?.data?.payload?.status??null;
    if(!["message.sent","message.finalized"].includes(type) ||
      typeof id!=="string" || !/^[a-zA-Z0-9-]{8,100}$/.test(id))
      return res.status(202).json({ok:true,processed:false});
    // No phone numbers, message bodies, tokens or raw payloads are logged.
    console.info("AXIOMOS_QA_TELNYX_SIGNED_RECEIPT",JSON.stringify({
      eventType:type,providerMessageId:id,
      eventId:typeof eventId==="string"?eventId.slice(0,100):null,
      deliveryStatus:typeof status==="string"?status.slice(0,30):null,verified:true
    }));
    return res.status(200).json({ok:true,verified:true,processed:true});
  } catch {
    console.error("AXIOMOS_QA_TELNYX_PROCESSING_ERROR");
    return res.status(500).json({ok:false});
  }
}
