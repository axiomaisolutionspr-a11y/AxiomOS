# QA Telnyx receiver — preview only

**Never deploy this variant over the current public receiver.** Only a separate, protected Preview deployment is allowed until independent QA ingress authorization is reviewed.

This receiver:
1. Accepts raw Telnyx POST bytes, verifies Ed25519 and freshness.
2. Validates event type, event ID, provider ID, and status.
3. Uses a separate least-privilege QA role to invoke one deduplicating PostgreSQL function, which accepts only provider-message IDs already associated with one consumed QA reservation.
4. Replies 200 for recorded or duplicate events, 202 for unregistered events, and 503 for temporary storage failures; 401 for invalid signatures.
5. Never sends SMS, alters Telnyx configuration, logs bodies or phone numbers, or touches the CRM production branch.

Preview-only environment variables:
- `VERCEL_ENV=preview` supplied by Vercel
- `AXIOMOS_QA_TELNYX_AUTOSTORE=true` (false until stage reviewed)
- `TELNYX_SIGNING_PUBLIC_KEY` (public Ed25519 verification key; unchanged provider key)
- `AXIOMOS_QA_TELNYX_INGRESS_DATABASE_URL` (new isolated QA-only role)
- `AXIOMOS_QA_TELNYX_DB_HOST` (fixed Neon QA branch hostname)

No database credentials or authentication tokens in Git. The current production-tagged standalone QA receiver is unchanged.
