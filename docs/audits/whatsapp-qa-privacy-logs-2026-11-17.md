# WhatsApp QA — privacy-safe runtime logs verification (2026-11-17)

## Scope
- Audit branch: `audit/whatsapp-inbound-outbound-20261116`, NOT merged into main.
- Vercel Preview deployment: `dpl_7S6X9a9bxua2aWDVziZqnoFu3nSQ`, commit `7166b98b7e2650609d9bd6529abbd3d885bc1252`, READY.
- Synthetic event ID `qa-e2e-privacy-logs-20261117` with marker `QA_PRIVATE_SENTINEL_DO_NOT_LOG`.
- QA route accepts synthetic signed messages only; no WhatsApp, SMS or emails sent to real contacts.

## Change
- Removed unconditional raw Dualhook provider response logging, replaced with HTTP status and response byte length.
- Removed incoming message text from application diagnostic logs.
- Removed raw recipient phone, BSUID and conversation context from incoming identity diagnostics.
- Removed actual Brain reply text from diagnostic logs, replaced with response length and simulation flag.
- Removed raw status error objects and recipient identities from the status error log, retaining only numeric error codes and technical status metadata.
- **Not yet fully redacted:** other paths can log IDs, conversation keys or arbitrary exception strings; production log privacy is therefore NOT yet certified.

## Runtime evidence
- GET to protected QA certification route with case `privacy_logs` returned HTTP 200, `ok=true`, `acceptedByWebhook=true`, `repliesSent=1`, `processingErrorCount=0`.
- Vercel log query restricted to this deployment returned no log records containing the synthetic marker `QA_PRIVATE_SENTINEL_DO_NOT_LOG`.
- Same deployment logs contained `WHATSAPP_INCOMING_METADATA` with `recipientKind='bsuid'`, `hasPhone=false`, `hasBsuid=true`, `textLength=30`, `hasMessageId=true`.
- Same deployment logs contained `WHATSAPP_BRAIN_REPLY_METADATA` with `replyLength=24`, `simulated=true`.
- This proves the inspected log paths do not emit the incoming message text; it does not prove all logs or external tools are PII-free.

## Release gate
**NO-GO.** Outstanding: real Meta QA provider acceptance/delivery, provider-compatible webhook security, actual production DB branch identification, suitable frequent scheduled worker, true Brain response regeneration, full dead-letter handling and human escalation, production-safe auth, PII logging sweep, backup and rollback signoff.

## Safety
No commercial DNS, tokens, webhooks, Vercel production settings, Neon main schema, customer messages, or production deployments changed.
