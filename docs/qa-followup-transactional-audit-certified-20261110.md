# AxiomOS Autopilot — Transacción de seguridad CRM en QA certificada

Fecha: 2026-11-10. Autorización: solo pruebas, mejoras seguras de QA, sin cambiar producción, llaves, tokens, webhooks ni enviar mensajes.

## Problema encontrado
El CRM QA registra consentimiento por canal y propósito, pero **no dispone de una fuente consolidada de historial de envíos, revocación/supresión y frecuencia que permita autorizar seguimientos autónomos**. Ninguna ausencia de registro debe interpretarse como permiso para contactar a alguien.

## Implementación
- `database/migrations/20261110_qa_followup_transactional_gate.sql`: función `qa_audit_followup_transaction` que toma bloqueo de fila de la cola, consulta el consentimiento más reciente, la revisión humana y horarios de Puerto Rico, y escribe una decisión auditable en `qa_followup_decision_audit`.
- Si se satisfacen las primeras condiciones pero no hay historial autoritativo de contactos, la decisión queda `BLOCKED_NO_FREQUENCY_SOURCE`, nunca aprobada.
- La función no altera `followup_queue`, no concede acceso a roles del CRM, no puede reservar un envío real, no tiene credenciales de proveedores y no toca `followup_queue_no_live_dispatch`.
- `scripts/test-qa-followup-transactional-gate-postgres.sh`: pruebas PostgreSQL sintéticas que cubren baja, consentimiento inexistente o expirado, revisión humana bloqueada, horario, aislamiento de tenant, estado bloqueado y fuente de frecuencia ausente.

## Evidencia de CI
En la rama QA de PR #103, commit `fe49443c72996b8e33a3047bf749cf70c7831430`:
- `AxiomOS QA transactional outbox` run **42908327149**: **success**, marcador `QA_FOLLOWUP_TRANSACTIONAL_AUDIT_NO_SEND_PASS`.
- `AxiomOS isolated QA policy (NO SEND)` run **42908327083**: **success**.
- Los intentos CI anteriores detectaron dos errores en fechas/IDs de las fixtures sintéticas, se corrigieron antes de la ejecución aprobada.

## Evidencia ejecutada en Neon QA
- Migración aplicada **exclusivamente** a la rama hija `br-soft-band-av98etp4`; no a la rama principal ni a producción.
- Ejecutada una verificación por cada uno de los ocho registros de `followup_queue` de `axiomai`: **8/8 = BLOCKED_NO_CONSENT**.
- Resultado registrado: **8 auditorías** con `BLOCKED_NO_CONSENT`. La cola conserva **8 needs_review**, sin cambios.
- El rol lector y el rol worker aislado no tienen EXECUTE sobre esta función; el rol lector no tiene SELECT directo sobre la nueva tabla de auditoría.
- Se confirmó que el constraint `followup_queue_no_live_dispatch` sigue presente.
- **0 SMS / 0 WhatsApp enviados**, sin llamadas a proveedores.

## Decisión
`QA_TRANSACTIONAL_CONSENT_AUDIT_PASS`, `QA_EIGHT_OF_EIGHT_BLOCKED`, `NO_CONTACT_FREQUENCY_PROVENANCE`, `AUTONOMOUS_COMMERCIAL_DISPATCH_NO_GO`.

## Qué sigue pendiente antes de producción
1. Implementar y verificar una fuente de historial autoritativo de contactos por prospecto, canal, propósito y tenant, incluidas bajas y estado incierto; integrar esa evidencia de forma atómica con reservas/claims.
2. Certificar un webhook firmado real de Meta WhatsApp usando un entorno de Meta aislado (WABA, número de prueba y App Secret independientes), sin desviar callbacks de producción. Los tests HMAC y POST anteriores son sintéticos.
3. Integrar y revisar un trabajador real con prevención de duplicados, control de horas, idempotencia, reintentos, registro de estado, rollback y monitoreo; sin enviar a clientes no autorizados.
4. Revisar PR #103 y una propuesta de publicación por commit preciso; cualquier habilitación de envíos reales requerirá revisión y autorización independiente.
