import { neon } from "@neondatabase/serverless";

type QaStatus = "sent" | "delivered" | "read" | "failed";
type QaSql = ReturnType<typeof neon>;

function qaId(value: string) {
  return value.startsWith("qa-provider-ack-qa-e2e-") ||
    value.startsWith("qa-provider-mock-qa-e2e-");
}

export async function reconcileQaProviderStatus(sql: QaSql, outboundId: string) {
  if (!qaId(outboundId)) return { matched: false };
  const rows = (await sql`
    WITH latest AS (
      SELECT provider_status, provider_timestamp, error_code
      FROM public.whatsapp_status_events_qa
      WHERE outbound_message_id = ${outboundId}
      ORDER BY CASE provider_status
        WHEN 'read' THEN 5 WHEN 'delivered' THEN 4
        WHEN 'failed' THEN 3 WHEN 'sent' THEN 2 ELSE 0 END DESC,
        provider_timestamp DESC
      LIMIT 1
    )
    UPDATE public.whatsapp_delivery_qa AS d
    SET provider_status = latest.provider_status,
        provider_status_at = to_timestamp(latest.provider_timestamp),
        provider_error_code = latest.error_code,
        updated_at = now()
    FROM latest
    WHERE d.outbound_message_id = ${outboundId}
      AND d.inbound_message_id LIKE 'qa-e2e-%'
    RETURNING d.inbound_message_id, d.provider_status
  `) as Array<{ inbound_message_id: string; provider_status: string }>;
  return { matched: rows.length > 0, status: rows[0]?.provider_status ?? null };
}

export async function recordQaProviderStatus(
  sql: QaSql,
  input: {
    outboundId: string;
    status: string;
    timestamp: number;
    errorCode?: string | null;
  }
) {
  if (!qaId(input.outboundId) ||
    !["sent","delivered","read","failed"].includes(input.status) ||
    !Number.isSafeInteger(input.timestamp) ||
    input.timestamp < 1600000000 || input.timestamp > 2200000000) {
    return { stored: false, matched: false };
  }
  const status = input.status as QaStatus;
  const errorCode = typeof input.errorCode === "string" ?
    input.errorCode.slice(0,50) : null;
  const rows = (await sql`
    INSERT INTO public.whatsapp_status_events_qa
      (outbound_message_id,provider_status,provider_timestamp,error_code)
    VALUES (${input.outboundId}, ${status}, ${input.timestamp}, ${errorCode})
    ON CONFLICT DO NOTHING
    RETURNING outbound_message_id
  `) as Array<{ outbound_message_id: string }>;
  const reconciled = await reconcileQaProviderStatus(sql,input.outboundId);
  return { stored: rows.length === 1, matched: reconciled.matched,
    status: reconciled.status };
}
