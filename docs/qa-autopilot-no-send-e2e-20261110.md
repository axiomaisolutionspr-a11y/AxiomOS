# AxiomOS Autopilot — Certificación de integración NO SEND en QA
Fecha: 10 noviembre 2026. Scope: NO SMS/WhatsApp reales, sin producción.

## Arquitectura aplicada
- Política fail-closed de consentimiento, revocación, frecuencia, horario, tenant, destinatario sintético y ventana WhatsApp.
- Lector `qa-followup-readonly.mjs`: usa **exclusivamente** `axiomos_commercial.qa_followup_preflight_readonly`, no consulta tablas privadas directamente.
- Vista restringida con `security_barrier=true`: SQL versionado en `database/migrations/20261110_qa_followup_preflight_readonly.sql`.
- Batch `qa-autopilot-no-send-batch.mjs`: procesa hasta 100 referencias desde la vista y produce únicamente un resumen de motivos; `sent=0`, `eligibleForDispatch=0` siempre; no tiene adaptador de envío.
- Migraciones sintéticas de outbox, reserva atómica y conciliación por eventos firmados *simulados*, sin claves de proveedor.
- QA CI prueba PGlite real en memoria y dos clientes PostgreSQL concurrentes para outbox.

## Evidencia ejecutada
1. Se creó rama hija Neon exclusivamente QA `br-soft-band-av98etp4`, desde `br-lively-band-avj6yz8x`; la rama original y producción no se tocaron.
2. Se aplicó migración de nueva vista **solo** a esa rama hija. Una consulta real autenticada como `axiomos_commercial_reader` devolvió 2 seguimientos WhatsApp con `opt_out` y 6 sin consentimiento conocido, todos `needs_review`.
3. Privilegios comprobados: `SELECT` sobre la vista nueva para `axiomos_commercial_reader` = true; `SELECT` directo sobre `followup_queue` y `followup_contact_permissions` = false.
4. GitHub Actions (PR #103) `AxiomOS isolated QA policy (NO SEND)`, run `42891592928`, job `130093842763`: **75 tests, 75 PASS, 0 FAIL** (commit `1d052d114a515e50f3145ddb480cb863b03aae4b`).
5. GitHub Actions `AxiomOS QA transactional outbox`, run `42891592827`, job `130093844459`: `QA_OUTBOX_ATOMIC_NO_SEND_PASS` y `QA_PROVIDER_RECEIPTS_NO_SEND_PASS`.
6. Durante esta implementación GitHub Actions detectó fallos por columna de orden inexistente; fueron corregidos y certificados sobre el commit indicado.
7. Ningún SMS/WhatsApp real fue enviado. No se cambió configuración productiva, webhook, credenciales ni claves, no se hizo merge de despliegue.

## Decisión de certificación
- `QA_READ_ONLY_CRM_INTEGRATION_PASS`
- `QA_POSTGRES_DRYRUN_E2E_75_75_PASS`
- `QA_SYNTHETIC_OUTBOX_CONCURRENCY_PASS`
- `REAL_PROVIDER_E2E_NOT_CERTIFIED`
- `AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO`

## Condiciones necesarias antes de declarar Autopilot comercialmente listo
1. Worker productivo con reclamación y decisión atómicas y comprobación autoritativa del estado de consentimiento, bajas y frecuencia *al momento de enviar*; revisión independiente de permisos.
2. Webhooks de Telnyx y WhatsApp con validación de firma sobre cuerpo crudo, reconciliación idempotente con IDs reales de proveedores, protección contra duplicados y desconexiones.
3. Pruebas E2E de los proveedores usando un canal y destinatario internos autorizados explícitamente, más pruebas de reversión, observabilidad, revisión del release y activación controlada.
4. PR #103 queda `draft`; no mergear como si esto habilitara automáticamente envíos. La restricción `followup_queue_no_live_dispatch` permanece intacta.

Las pruebas simuladas son suficientes para certificar este alcance de QA, pero **no** equivalen a certificar ni activar mensajería real.
