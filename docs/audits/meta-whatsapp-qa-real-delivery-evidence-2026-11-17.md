# Meta WhatsApp QA — historical real provider delivery evidence
Date of evidence review: 2026-11-17 UTC. Provider events originally recorded: 2026-11-11 UTC.

## Scope
Dedicated isolated Meta QA route `app/api/whatsapp-qa/route.ts` and sender `app/api/whatsapp-qa/delivery.ts` on Git branch `feature/axiomos-whatsapp-meta-qa-20261110`, using Neon QA branch `br-ancient-silence-avta0kyo`. Phone-number ID `1489013234286695`, WABA `1462452756074965`, and database host `ep-polished-fire-avorljs7.c-11.us-east-1.aws.neon.tech` match hard-coded strict QA safeguards and the existing non-secret Vercel configuration.

The webhook source requires a valid HMAC signature; sender is constrained to a single Vercel Preview branch, expected QA WABA and phone, approved test recipient, and dedicated Neon QA database. The outbound sender posts to Meta Graph `/v27.0/<QA_PHONE_ID>/messages`, accepts only Meta `wamid.` IDs, stores a SHA-256 hash, and correlates `delivered` and `failed` webhook statuses to that hash.

## Direct historical Neon QA evidence (read-only)
Tables `axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery` and `meta_whatsapp_qa_followup_status`:
- Reply 1 accepted 2026-11-11 05:51:09.197826 UTC, delivery recorded 05:51:11.751051 UTC. Provider ID hash present. No delivery failure.
- Reply 2 accepted 2026-11-11 06:02:05.696049 UTC, delivery recorded 06:02:06.995403 UTC. Provider ID hash present. No delivery failure.
- Follow-up accepted 2026-11-11 15:25:33.591691 UTC, delivered 15:25:35.427546 UTC. Provider ID hash present. No delivery failure.
- Additional QA webhook evidence: 15 webhook event rows, 8 inbound messages, 7 status events; last webhook event 2026-11-11 15:25:35 UTC.
- All values obtained via metadata/aggregate/booleans only. Recipient, message content, access token, HMAC secret and unredacted provider message IDs were not displayed.

## Verdict
**PASS — historical real Meta QA acceptance + delivery evidence for three specific messages (Nov 11).** These records can be used to avoid re-sending the same certification messages. Not a fresh provider test on Nov 17 and not a production delivery certification.

## Production readiness still blocked
- Main AxiomOS production WhatsApp webhook/CRM is a different route with Dualhook override; no proof that it uses the same signing, number, provider and data branch as the isolated Meta QA route.
- Production notification receipt saving errors (Resend/Telnyx) are unresolved; current logs do not preserve SQLSTATE.
- Autonomous follow-up worker from draft PR #107 is not merged nor activated and lacks verified live history/opt-out coverage source.
- Owner-only production CRM Autopilot login could not be exercised without a real authenticated owner session and active individual-auth commercial flag.
- The exact effective production Neon branch has strong correlation to `br-proud-frog-avxt19iu` but still needs a secret-free production runtime fingerprint.
- QA-only fixes must be reviewed; no production credentials, webhooks, tokens, sends or deployments were modified during this evidence review.
