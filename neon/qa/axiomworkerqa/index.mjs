// AxiomOS: branch-isolated synthetic WhatsApp QA recovery scheduler.
// No Brain, Dualhook, Meta, SMS, email or commercial customer API calls.
const QA_HOST = 'ep-gentle-bird-avjgh225.c-11.us-east-1.aws.neon.tech';
const PREFIX = 'qa-e2e-worker-%';

async function query(sql) {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error('QA_DATABASE_MISSING');
  const u = new URL(connection);
  if (u.hostname.replace('-pooler.', '.') !== QA_HOST ||
      !['postgres:', 'postgresql:'].includes(u.protocol)) {
    throw new Error('QA_DATABASE_BRANCH_MISMATCH');
  }
  const res = await fetch(`https://${u.hostname}/sql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Neon-Connection-String': connection,
      'Neon-Raw-Text-Output': 'true',
      'Neon-Array-Mode': 'false'
    },
    body: JSON.stringify({query: sql, params: []}),
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error('QA_SQL_REQUEST_FAILED');
  const payload = await res.json();
  if (!Array.isArray(payload?.rows)) throw new Error('QA_SQL_SHAPE_INVALID');
  return payload.rows;
}

export default async function handle(request) {
  if (request.method !== 'POST' || !request.headers.get('x-neon-trigger-invocation-id')) {
    return new Response('trigger required', {status: 403});
  }
  let event;
  try { event = await request.json(); } catch { return new Response('invalid event', {status:400}); }
  if (event?.version !== 1 || event?.trigger?.type !== 'schedule' ||
      event?.invocation_id !== request.headers.get('x-neon-trigger-invocation-id') ||
      typeof event?.data?.scheduled_at !== 'string' ||
      Number.isNaN(Date.parse(event.data.scheduled_at))) {
    return new Response('invalid trigger', {status: 403});
  }
  const scheduled = event.data.scheduled_at;
  let counts = [0,0,0,0];
  try {
    const q = await query(`UPDATE public.whatsapp_delivery_qa SET state='unknown',
      last_error_code='EXPIRED_PROCESSING_LEASE', lease_until=NULL,
      next_retry_at=NULL, updated_at=now()
      WHERE inbound_message_id LIKE '${PREFIX}' AND state='processing'
      AND lease_until IS NOT NULL AND lease_until < now() RETURNING inbound_message_id`);
    counts[0] = q.length;
    const s = await query(`UPDATE public.whatsapp_delivery_qa SET state='failed',
      intake_error='STALE_INTAKE_WITHOUT_REPLY',next_retry_at=now(),updated_at=now()
      WHERE inbound_message_id LIKE '${PREFIX}' AND state='received'
      AND reply_text IS NULL AND updated_at < now()-interval '2 minutes'
      RETURNING inbound_message_id`);
    counts[1] = s.length;
    const p = await query(`UPDATE public.whatsapp_delivery_qa SET
      reply_text='AXIRA_QA_REPLY_RECOVERED_FROM_INTAKE', intake_error=NULL,
      updated_at=now()
      WHERE inbound_message_id LIKE '${PREFIX}' AND state='failed'
      AND reply_text IS NULL AND inbound_text IS NOT NULL
      AND recipient_kind='bsuid' AND recipient_value LIKE 'qa-e2e-%'
      AND attempts=0 AND (next_retry_at IS NULL OR next_retry_at<=now())
      RETURNING inbound_message_id`);
    counts[2] = p.length;
    const d = await query(`WITH queued AS (
      SELECT inbound_message_id FROM public.whatsapp_delivery_qa
      WHERE inbound_message_id LIKE '${PREFIX}' AND state='failed'
      AND attempts<3 AND reply_text IS NOT NULL
      AND recipient_kind='bsuid' AND recipient_value LIKE 'qa-e2e-%'
      AND (next_retry_at IS NULL OR next_retry_at<=now())
      ORDER BY updated_at LIMIT 5 FOR UPDATE SKIP LOCKED
    ) UPDATE public.whatsapp_delivery_qa AS d SET
      state='sent',attempts=d.attempts+1, lease_until=NULL,next_retry_at=NULL,
      outbound_message_id='qa-provider-mock-'||d.inbound_message_id||'-'||(d.attempts+1)::text,
      last_error_code=NULL,last_error_details=NULL,updated_at=now()
      FROM queued WHERE d.inbound_message_id=queued.inbound_message_id
      RETURNING d.inbound_message_id`);
    counts[3] = d.length;
    const n = new Date(scheduled).toISOString();
    await query(`INSERT INTO public.whatsapp_worker_runs_qa
      (scheduled_at,quarantined,stale_intake,replies_reconstructed,mocked_sent,status)
      VALUES ('${n}',${counts[0]},${counts[1]},${counts[2]},${counts[3]},'ok')
      ON CONFLICT(scheduled_at) DO NOTHING RETURNING scheduled_at`);
    return Response.json({ok:true,mode:'synthetic_qa_only',quarantined:counts[0],
      stale_intake:counts[1],reconstructed:counts[2],mocked_sent:counts[3]});
  } catch(e) {
    console.error('AXIOM_QA_CRON_FAILED', String(e?.message || 'unknown').slice(0,80));
    return Response.json({ok:false,error:'qa_worker_failed'}, {status:503});
  }
}
