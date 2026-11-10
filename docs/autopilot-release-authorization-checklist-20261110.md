# AxiomOS Autopilot — release checklist / permisos necesarios
Fecha: 2026-11-10. Las instrucciones de no enviar mensajes reales permanecen vigentes.

## Evidencia efectivamente aprobada
- QA de consentimiento en Neon `br-soft-band-av98etp4`: 8 seguimientos WhatsApp, 2 opt-out y 6 sin opt-in confirmado; ninguno elegible para envío. `followup_queue_no_live_dispatch` conserva prohibición de aprobación.
- PR #103: GitHub Actions run **42892825567**, commit `1ce5cabbe8644c655690e37268f6b2fd69e1a0c5`: **89 tests PASS, 0 FAIL**. Incluye comprobación Ed25519 Telnyx y HMAC Meta de datos sintéticos. No prueba recepción real.
- Outbox PostgreSQL, run **42892825440**: `QA_OUTBOX_ATOMIC_NO_SEND_PASS` y `QA_PROVIDER_RECEIPTS_NO_SEND_PASS`.
- No merge ni promoción a producción; sin modificación de tokens, webhooks o secretos; sin SMS/WhatsApp reales.

## Para certificar proveedores (requiere nueva autorización expresa)
1. Telnyx: autorizar **un SMS adicional** solo al número propio `+17872320132`, enviado desde QA separado con `webhook_url` por mensaje dirigido al receptor público verificable de QA y con firma Ed25519. No modificar perfil, webhook ni token de producción. Confirmar evento real firmado e ID correlacionado. La reserva anterior permanece sin consumir.
2. WhatsApp: autorizar **un mensaje de prueba** a `+17872320132` solo con conexión QA independiente, consentimiento vigente y plantilla aprobada o conversación vigente. Debe existir un identificador QA/token independiente y un webhook QA verificable; no copiar clave productiva ni cambiar Webhook Override.
3. Si no hay cuenta/teléfono/plantilla aprobada en QA, esta prueba seguirá pendiente sin utilizar producción. Si falla el preflight, detener, no enviar.
4. No publicar listas ni datos de prospectos; no incluir OTP, API keys ni mensajes reales en logs/documentos.

## Para activar autonomía comercial (autorización independiente y posterior)
1. Desarrollar/revisar el worker real con verificación de consentimiento, baja, frecuencia y políticas en el mismo paso transaccional que reserva el envío; idempotencia, estados inciertos sin reintento automático y webhook firmado.
2. Reconciliar clientes reales y su consentimiento por canal/propósito; los 8 seguimientos actuales permanecen bloqueados. Definir ruta de cancelación y auditoría.
3. Probar despliegue aislado, control de acceso, rate limits, rollback, protección de dominio y monitoreo de errores.
4. Tras revisión del commit exacto, requerir **autorización explícita de merge y activación progresiva de producción**. No basta la aprobación genérica de pruebas.
5. Mantener `followup_queue_no_live_dispatch` hasta aprobar control de despliegue y sustitución por reglas equivalentes verificadas. No eliminarla durante QA.

## Estado
`QA_POLICY_AND_WEBHOOK_SYNTHETIC_PASS`; `REAL_TELNYX_WEBHOOK_NOT_CERTIFIED`; `REAL_WHATSAPP_NOT_CERTIFIED`; `PRODUCTION_WORKER_NOT_RELEASED`; `AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO`.
