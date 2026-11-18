# AxiomOS WhatsApp QA — E2E synthetic certification evidence
Date: 2026-11-17 (UTC). Branch: audit/whatsapp-inbound-outbound-20261116.

## Isolation
- Vercel preview project: axiomai-solutions; deployment dpl_AFqiaEpPFTjueFXB4xBf7QXFhbwY, commit 72b752c1ad4aaf30dac57536f2f3d1211fa71daf.
- Neon project icy-field-92690259; isolated branch br-steep-violet-av0c6t3v (qa-whatsapp-delivery-cert-20261116).
- DATABASE_URL and feature flags scoped to the audit Git branch Preview.
- QA mode requires exact Preview/Git ref, QA feature flags, DB host, QA signing secret; rejects non-synthetic events.
- WhatsApp provider send stub returns synthetic accepted ID without contacting Dualhook. Brain stub returns AXIRA_QA_REPLY_SIMULATED. In QA, CRM contact notifications are skipped; branch-scoped EMAIL_ENABLED=false and WHATSAPP_SMS_ALERTS_ENABLED=false.
- No real WhatsApp, email, or SMS was sent in these tests.

## Deployed application test results
Endpoint: GET /api/whatsapp/qa-cert (signed synthetic POST internally); no credentials reproduced in this document.
- accepted first invocation: HTTP 200; acceptedByWebhook=true; repliesSent=1; processingErrorCount=0.
- retry first invocation: HTTP 200; acceptedByWebhook=true; repliesSent=0; processingErrorCount=1 (expected synthetic 503).
- retry second invocation (same event id): HTTP 200; acceptedByWebhook=true; repliesSent=0; processingErrorCount=0; Vercel runtime log WHATSAPP_QA_RECOVERY_SENT qa-e2e-retry-20261117.
- retry third invocation: HTTP 200; 0 processing errors; no additional send.
- unknown first invocation: HTTP 200; acceptedByWebhook=true; 1 expected processing error (simulated timeout).
- unknown second invocation: HTTP 200; no re-send.
- accepted duplicate invocation: HTTP 200; no duplicate send.

## Neon QA post-test verification
SELECT inbound_message_id,state,attempts,reply_text,last_error_code FROM public.whatsapp_delivery_qa WHERE inbound_message_id LIKE 'qa-e2e-%';

Expected observed rows:
- qa-e2e-accepted-20261117 state=sent, attempts=1, cached reply AXIRA_QA_REPLY_SIMULATED.
- qa-e2e-retry-20261117 state=sent, attempts=2, cached reply AXIRA_QA_REPLY_SIMULATED.
- qa-e2e-unknown-20261117 state=unknown, attempts=1, cached reply AXIRA_QA_REPLY_SIMULATED.

## What this DOES NOT certify
- Actual delivery to a real WhatsApp number by Meta/Dualhook.
- Actual AI model response generation; this scenario intentionally stubs Brain.
- Correct processing of real Meta signed messages (signature verified using distinct QA test secret).
- Automatic background retry without event redelivery: current recovery occurs on duplicate inbound webhook.
- Producer acknowledgement vs delivered/read status or outbound provider message ID.
- Cross-service isolation beyond the QA-specific code guards (do not promote to production).
- Robustness of replies split into multiple chunks or concurrent mixed events.
- Production readiness.

## Known follow-up defects before release
1. Duplicate retry success does not increment repliesSent (observability mismatch), although DB state becomes sent.
2. The primary webhook returns HTTP 200 even for processing errors. Provider redelivery is not guaranteed, and no background worker exists.
3. The recovery classifier only allows explicitly rejected 429/503 one-part responses; ambiguous outcomes remain quarantined.
4. QA production-style branch-scoped secrets must never be merged or carried to main.
5. The QA-cert route is guarded and synthetic only, but should be removed before any promotion to production.

Verdict: PASS — isolated deployed-app E2E recovery simulation. NOT CERTIFIED for live provider E2E or production.
