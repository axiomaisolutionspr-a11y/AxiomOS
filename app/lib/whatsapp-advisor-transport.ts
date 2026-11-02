// Server-only transport. The preview QA deployment deliberately has no key.
export type AdvisorDestination = {kind:"phone"|"bsuid"; value:string};
export async function deliverAdvisorWhatsApp(recipient:AdvisorDestination, body:string):Promise<{providerId:string}> {
  if (process.env.AXIRA_ADVISOR_LIVE_SEND_ENABLED !== "true") throw new Error("ADVISOR_SEND_DISABLED");
  if (process.env.VERCEL_ENV !== "preview") throw new Error("ADVISOR_SEND_QA_ONLY");
  const key=process.env.DUALHOOK_API_KEY;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!key || !phoneId) throw new Error("ADVISOR_PROVIDER_UNCONFIGURED");
  const allowed=(process.env.AXIRA_ADVISOR_TEST_RECIPIENTS||"").split(",").map(x=>x.trim()).filter(Boolean);
  if (!allowed.includes(recipient.value)) throw new Error("ADVISOR_RECIPIENT_NOT_ALLOWLISTED");
  const value=recipient.kind==="phone"?recipient.value.replace(/\D/g,""):recipient.value.trim();
  if(!value || !body.trim() || body.length>4000) throw new Error("ADVISOR_MESSAGE_INVALID");
  const response=await fetch(`https://api.dualhook.com/v25.0/${encodeURIComponent(phoneId)}/messages`,{
    method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",
      ...(recipient.kind==="phone"?{to:value}:{recipient:value}),type:"text",
      text:{preview_url:false,body}})
  });
  if (!response.ok) throw new Error(`ADVISOR_PROVIDER_HTTP_${response.status}`);
  const data:unknown=await response.json();
  const id=(data as {messages?:Array<{id?:unknown}>})?.messages?.[0]?.id;
  if(typeof id!=="string"||!id.trim()) throw new Error("ADVISOR_PROVIDER_ID_MISSING");
  return {providerId:id};
}
