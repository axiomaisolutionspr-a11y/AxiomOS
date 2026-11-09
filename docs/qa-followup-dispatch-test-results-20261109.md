# AxiomOS Autopilot — Pruebas de despacho aislado (09-nov-2026)

**Resultado:** Las reglas del simulador de despacho pasan en Neon QA. NO certifica envío autónomo real.

## Entorno
- Neon QA branch: `br-raspy-boat-aveu0gky`; clonada de la rama principal.
- Respaldo de producción: `snap-wispy-tree-av9qisa3`.
- Función QA: `axiomos_commercial.qa_claim_followup_no_send(bigint,timestamptz)`.
- Guarda únicamente un recibo ficticio `SIMULATION_ONLY`, sin teléfono, API de proveedor, credenciales, plantillas ni envío.
- La restricción en producción `followup_queue_no_live_dispatch` permanece intacta. No se realiza migración a producción.

## Evidencia reproducible (Neon QA)
Se usó solo una propuesta de la rama QA, con autorización ficticia del propietario y registros de consentimiento sintéticos.

| Prueba | Resultado devuelto | Evaluación |
|---|---|---|
| Sin autorización explícita del propietario | `no_owner_authorization` | PASS |
| Con autorización QA pero sin consentimiento | `blocked_no_current_opt_in` | PASS |
| Consentimiento sintético y horario nocturno PR | `quiet_hours` | PASS |
| Consentimiento sintético, horario hábil PR, autorización QA | `SIMULATED_NO_SEND` | PASS (sin proveedor) |
| Segundo intento de la misma propuesta | `duplicate` | PASS |
| Baja posterior a simulación, reintento | `blocked_no_current_opt_in` | PASS |
| Rol lector intenta ejecutar | SQLSTATE `42501` | PASS |
| Rol lector intenta leer recibos internos | SQLSTATE `42501` | PASS |
| Rol escritor intenta insertar recibos directamente | SQLSTATE `42501` | PASS |

**Balance QA:** 8 propuestas, 1 recibo de simulación, 0 aprobaciones de envío, 0 mensajes enviados.

## Revisión de autenticación HTTP (prueba parcial)
- En Neon Auth QA, `GET /get-session` sin cookie => HTTP 200 con JSON `null`.
- Con cookie ficticia => HTTP 200 `null`.
- `POST /revoke-session` sin autenticación => HTTP 401 `UNAUTHORIZED`.
- El OTP de prueba fue enviado exitosamente al buzón conectado. No se pudo completar el canje de OTP en el entorno de pruebas debido a controles del sistema; no se eludieron.
- **Pendiente**: emitir sesión QA válida mediante una interacción autorizada, demostrar `get-session` antes de revocar y `null` después usando la misma cookie; verificar server actions de owner/operator desde HTTP.

## Requisitos para GO de envío real de seguimientos
1. Diseñar worker específico de despacho real con atomicidad transaccional y deduplicación de proveedor, reintentos finitos, estados registrados y trazas auditables.
2. Garantizar consentimiento por canal y propósito, opt-out/STOP al momento del despacho, horarios permitidos, límite de frecuencia y permisos de roles.
3. Verificar ventana de 24h y plantillas previamente aprobadas de WhatsApp, y cumplimiento de SMS.
4. E2E con **destinatario exclusivamente de prueba** y webhook autenticado que registre confirmaciones y errores; no usar prospectos.
5. Superar la prueba de revocación HTTP con una sesión legítima de QA.

**Decisión:** GO de la preparación/revisión sin enviar; NO-GO de envío automático. Este PR es QA-only; no habilita ni modifica producción.
