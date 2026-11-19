# AxiomOS Autopilot — simulación CRM + eventos firmados (10 noviembre 2026)

## Permiso y alcance
El propietario autorizó solamente implementación y pruebas **simuladas**. Prohibidos envíos SMS/WhatsApp reales y cambios a producción. Este informe corresponde a código en rama QA draft, no a release.

## Trabajo implementado
- `app/lib/qa-autopilot-simulated-runtime.mjs`: orquesta consulta restringida de CRM mediante `runQaNoSendBatch`, carga exclusivamente recibos inventados marcados `isSynthetic` con identificadores `qa-*`, verifica eventos Telnyx y Meta con firmas sintéticas, evita eventos duplicados, identifica recibos desconocidos y mantiene un modelo de estados de entrega únicamente en memoria.
- No usa `fetch`, conexiones de proveedor, tokens ni escrituras de base de datos. `dispatched=0` y `providerCalls=0` en cada ejecución, independientemente del estado de la cola.
- `tests/qa-autopilot-simulated-runtime.test.mjs`: 16 regresiones adicionales (firma falsa, expiración, evento duplicado, desorden temporal, destino desconocido, fallo terminal, aislamiento QA, falta de permisos, ausencia de datos personales, etc.).
- Es una **simulación de dos segmentos** (CRM y conciliación de recibos inventados): un recibo firmado ficticio **no** corresponde a un envío autorizado por el CRM. El simulador jamás crea una autorización de despacho.

## Evidencia GitHub Actions
Commit `f289cc96f1c7408f2fd29b95091ea456b08368df`, PR #103:
- Run **42893808799**, job **130101503561**: **105 tests / 105 pass / 0 fail**.
- Run **42893808827**, job **130101504019**: `QA_OUTBOX_ATOMIC_NO_SEND_PASS` y `QA_PROVIDER_RECEIPTS_NO_SEND_PASS`.
- Neon QA hija `br-soft-band-av98etp4`, lectura restringida: 2 seguimientos WhatsApp `opt_out`, 6 `unknown`; no hay nuevo consentimiento verificable.
- Reserva del ensayo adicional Telnyx `ready`, `attempts=0`; `qa_e2e_delivery_events` contiene 0 eventos reales.
- No se realizaron envíos ni promociones a producción.

## Estado y limitaciones
**PASS para simulación en QA** con 105 pruebas. Queda **NO-GO para autonomía de envíos a clientes**. Faltan un worker real con comprobaciones transaccionales de consentimiento y frecuencia, revisión de seguridad y autorización de despliegue, más E2E de proveedores reales cuando el propietario cambie explícitamente su restricción de no enviar mensajes. No retirar `followup_queue_no_live_dispatch`, no copiar secretos productivos ni mergear como activación.
