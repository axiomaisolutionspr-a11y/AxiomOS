# WhatsApp inbound/outbound audit — 2026-11-16

Scope: read-only Vercel/Neon review; isolated GitHub audit branch only. Do not deploy to production or rotate tokens.

## Confirmed
- Production Vercel runtime error clusters on /api/whatsapp: WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN (14), WHATSAPP_CONTACT_EMAIL_FAILED (13), WHATSAPP_CONTACT_EMAIL_RECEIPT_SAVE_FAILED (1). These are contact-notification failures, NOT proof of missing inbound delivery.
- public.whatsapp_messages columns: id, conversation_key, phone, role, message, whatsapp_message_id, created_at. Unique partial index on whatsapp_message_id; no delivery/processing state, outbound ID, attempt counter, or last_error.
- app/api/whatsapp/route.ts saves inbound before outbound. Redelivery of an existing inbound ID is skipped, without verifying whether an outbound reply was sent. A crash after send and before storing assistant row also creates ambiguous delivery.
- POST can return HTTP 200 despite processing errors; change only after designing idempotent retry semantics.
- META_APP_SECRET signature check uses AXIOMOS_WHATSAPP_SIGNATURE_ENFORCE; do not turn on until provider signature forwarding is verified.
- QA Vercel project exists with branch-scoped Meta test credentials; presence does not establish webhook subscription/delivery.
- Detailed Vercel logs beyond Hobby retention cannot be retrieved from that API; runtime error clusters are available.

## Safe implementation design (not yet implemented)
1. On isolated Neon QA branch, create whatsapp_message_delivery table with unique inbound_message_id, conversation_key, status (received|processing|sent|failed|unknown), attempts, lease_until, outbound_message_ids, last_error_code, last_error_subcode, last_error_details, last_fbtrace_id, timestamps.
2. In one transaction claim an inbound ID atomically with lease and attempt limit. Separate received/delivery state from conversation history. Concurrent redeliveries must not send duplicate replies.
3. Persist outbound result ID after provider acknowledgement; use status webhooks to reconcile sent/delivered/failed. If provider timed out after accepting a send, mark unknown and reconcile before retry to avoid duplicates.
4. Return 2xx for durably accepted events, with asynchronous durable worker; use non-2xx for transient intake failure only if provider retry semantics and idempotency have been verified.
5. Log event IDs, WABA/phone-number IDs, source, error code/subcode/details/fbtrace_id and correlation IDs, with personal data redacted. Do not log raw message bodies or tokens.
6. Test signed/unsigned inbound payload, BSUID-only identity, phone identity, duplicate delivery, concurrent deliveries, DB failure, provider #100, timeout-after-send, retry limit, and status-webhook reconciliation in isolated QA.
7. Only after evidence and rollback plan, consider production deployment.

## External verification required
- Meta app WABA subscribed fields and exact webhook callback (including phone-level overrides), conversation routing and app permissions.
- Dualhook Health Report and actual webhook delivery attempts/statuses.
- A real #100 response's error_data.details, error_subcode, fbtrace_id (redacted).
- Cross-check last known inbound message ID in provider vs Vercel/Neon.

No production changes or outbound messages authorized by this audit.