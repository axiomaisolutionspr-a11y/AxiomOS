# Evidencia AxiomOS outbox transaccional — QA solamente
Fecha: 2026-11-09. Neon: `icy-field-92690259`, rama **no productiva** `br-raspy-boat-aveu0gky`.

## Cambios ejecutados
- `database/migrations/20261109_qa_delivery_outbox_no_provider.sql` se aplicó en Neon QA, sin modificar `public.prospects` ni `axiomos_commercial.followup_queue`.
- Tabla `axiomos_commercial.qa_delivery_outbox` independiente; sin datos de contacto ni cuerpos de mensaje; `CHECK(is_synthetic)`.
- `qa_claim_next_delivery(timestamptz)` realiza reserva `FOR UPDATE SKIP LOCKED` y una transición atómica `pending -> claimed` con `attempts=1`.
- El estado `uncertain` es terminal en este QA: no hay renovación automática de lease ni reintento ciego; requiere reconciliación manual previa a cualquier futuro reenvío.
- Funciones/tables sin privilegios para `axiomos_commercial_reader` y `axiomos_commercial_writer`; solo propietario de base en QA.
- **NINGUNA función invoca Telnyx, WhatsApp, Meta, Resend o una URL. No hubo mensajes enviados.**

## Evidencias observadas directamente en Neon
1. Se insertaron cinco registros estrictamente sintéticos: elegible, baja, sin opt-in, sin autorización, programado en el futuro.
2. Primera llamada a `qa_claim_next_delivery('2026-11-09T16:00:00Z')`: exactamente un resultado, `QA-ELIGIBLE-0911`, `SIMULATED_NO_SEND`.
3. Segunda llamada con misma hora: **cero** resultados; el primero quedó `claimed`, `attempts=1`.
4. Los otros cuatro registros quedaron `pending` y `attempts=0`.
5. Consulta en horario nocturno de Puerto Rico `2026-11-10T02:00:00Z`: cero resultados.
6. Roles reader y writer: intento `qa_claim_next_delivery` denegado con SQLSTATE `42501`; comprobación `has_function_privilege` ambos false.
7. El estado del primero se registró como `uncertain` con resultado `RECORDED_NO_PROVIDER`. Una segunda transición hacia `accepted` fue rechazada `REJECTED_NOT_CLAIMED`.
8. Cola comercial original: **0** registros `approved`. La restricción `followup_queue_no_live_dispatch` permanece sin cambios.

## Alcance y riesgos no resueltos
La prueba es funcional y de permisos en QA; **no es un ensayo de simultaneidad con dos transacciones concurrentes reales**, ni demuestra despacho a proveedores. El método de bloqueo transaccional está implementado, pero su comportamiento bajo múltiples trabajadores necesita un test de concurrencia real.

El módulo `autopilot-delivery-gates.mjs` y esta tabla son **independientes**: todavía falta un adaptador servidor que consulte las autorizaciones persistentes, bloquee la fila, aplique la política y registre el resultado en la misma frontera transaccional sin confiar en argumentos externos. Se requieren:
- outbox productiva con consentimiento y baja consultados en el instante de ejecución;
- credenciales de proveedor exclusivamente servidor, webhooks autenticados, rastreo de ID de mensaje y reconciliación de estado incierto;
- E2E real de un envío automático únicamente a destinatario interno permitido (no basta SMS manual anterior), reintentos, interrupción del proceso, caídas, concurrencia, revocación de sesión HTTP;
- revisión de QA y autorización independiente para permitir cualquier contacto real.

**Decisión: PASS para pruebas de política y reserva QA sin proveedor; NO-GO para envío autónomo a prospectos y producción.** Esta evidencia no autoriza merge de activación.
