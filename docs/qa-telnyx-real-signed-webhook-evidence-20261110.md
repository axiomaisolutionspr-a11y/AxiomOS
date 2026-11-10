# AxiomOS QA — Telnyx signed webhook real-world evidence (2026-11-10)

## Scope
Owner authorized one additional, single-use internal SMS for independent signed webhook certification to internal phone ending 0132. The authorized QA action was executed once by the owner; no customer campaign or production CRM changes.

## Verified evidence
- The user's screenshot shows `qa_telnyx_signed_probe` at `accepted`, attempts `1 of 1`, and the test SMS received at 4:44 p.m. Puerto Rico.
- Neon QA branch `br-lively-band-avj6yz8x`: `qa_telnyx_signed_probe` is `accepted`, `attempts=1`, has providerMessageId, updated at `2026-11-10T20:44:21.625Z`.
- Independent receptor `axiomos-qa-telnyx-webhook.vercel.app/api/telnyx`, Vercel runtime logs:
  - `2026-11-10T20:44:21.978Z`: POST, `message.sent`, `verified:true`, status `sent`.
  - `2026-11-10T20:44:23.036Z`: POST, `message.finalized`, `verified:true`, status `delivered`.
  - Both events reference the SAME provider message ID, `4031a1c7-3461-4290-b492-b46e364315cb`.
- The receptor's source verifies the Ed25519 signature of the exact raw bytes plus timestamp before logging signed receipts.
- The `axiomos_commercial.qa_e2e_delivery_events` table contains `0` rows: **independent QA receptor logs have NOT been reconciled automatically into the CRM QA event table**.

## Exact certification decision
- `TELNYX_SIGNED_WEBHOOK_AT_INDEPENDENT_QA_RECEIVER_PASS`
- `TELNYX_SINGLE_USE_ATTEMPT_CONSUMED_1_OF_1`
- `TELNYX_FINAL_DELIVERED_WEBHOOK_PASS`
- `CRM_QA_SIGNED_EVENT_AUTOMATIC_PERSISTENCE_PENDING`
- `WHATSAPP_REAL_WEBHOOK_PENDING`
- `AUTONOMOUS_COMMERCIAL_DISPATCH_NO_GO`

Do NOT send again, reset attempts, reuse the reservation, change productive credentials, or infer that this independent receiver proves the full CRM production webhook integration. Avoid disclosing live message bodies or tokens.

## Conciliación retrospectiva en Neon QA — 10-nov-2026

Se reconcilió **manualmente, sin reenviar SMS**, la evidencia de dos POST Telnyx autenticados en el receptor QA independiente. Origen: logs de Vercel `AXIOMOS_QA_TELNYX_SIGNED_RECEIPT` donde la verificación Ed25519 terminó `verified:true`.

- Se creó `axiomos_commercial.qa_telnyx_probe_verified_events` en Neon QA `br-lively-band-avj6yz8x` y la función restringida `qa_reconcile_telnyx_signed_probe` según la migración versionada `database/migrations/20261110_qa_telnyx_probe_event_reconciliation.sql`. **Solo QA, no producción**.
- Evento `message.sent`, event ID `55114abf-8953-421e-ad13-75e85e01d2fc`, status `sent`: `VERIFIED_EVENT_RECORDED`.
- Evento `message.finalized`, event ID `0b26b6e1-4f76-42be-be7b-e1d69fddf224`, status `delivered`: `VERIFIED_EVENT_RECORDED`.
- Los dos eventos pertenecen al proveedor ID `4031a1c7-3461-4290-b492-b46e364315cb` y a una sola reserva previamente consumida. El registro de la prueba anterior permanece `delivered`, `attempts=1`.
- Comprobación posterior: 2 eventos en la tabla nueva, 2 event keys distintos, 1 único mensaje y 1 evento final `delivered`.
- Un segundo intento de insertar el mismo evento devuelve `DUPLICATE_EVENT`. Los roles `axiomos_commercial_reader` y `axiomos_autopilot_e2e_worker` **no pueden ejecutar** la función.
- No se tocaron credenciales, webhooks, producción ni se realizó un nuevo envío.

**Alcance:** `TELNYX_SIGNED_QA_EVENTS_RETROSPECTIVELY_RECONCILED_PASS`. Esto es un **backfill manual desde logs de un receptor que había verificado la firma**, y NO demuestra persistencia automática desde el endpoint en tiempo real. Para esa fase se necesita un adaptador de persistencia con una identidad QA restringida, siguiendo la validación criptográfica de cuerpo crudo y deduplicación. No reutilizar tokens de producción ni habilitar el despacho comercial.
