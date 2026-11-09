# AxiomOS Autopilot — Informe de evidencias de certificación (2026-11-09)

**Alcance:** módulo de propuestas de seguimiento, sin envío. No certifica mensajería autónoma.

**Producción**: Neon project icy-field-92690259; branch br-square-field-avmxjhvf (main). Respaldo previo `snap-broad-band-avwhkvxz`. QA `br-hidden-cell-avgl66g4` (derivada de producción). No se borró ni sobrescribió la base.

## Evidencias obtenidas
| Control | Resultado | Evidencia |
|---|---|---|
| Preservación de CRM | PASS | 33 prospects / 20 call_leads / 162 whatsapp_messages al inicio de auditoría; 0 followup_queue / 0 approved / 0 consent_events |
| Cuentas y sesiones | PARCIAL | Owner y operator activos; ambas cuentas verificadas; una sesión vigente cada una. No se ejecutó revocación real ni login autenticado de navegador |
| Protección del rol lector | PASS (SQL) | SELECT de función generadora: SQLSTATE 42501; INSERT de decisión: 42501; SELECT ledger de consentimiento: 42501 |
| Protección del rol escritor | PASS (SQL) | UPDATE de bitácora de decisiones: SQLSTATE 42501 |
| Bloqueo de envíos | PASS (SQL) | INSERT en followup_queue status='approved' con metadatos -> CHECK followup_queue_no_live_dispatch, SQLSTATE 23514; sin consentimiento -> misma restricción |
| Duplicados | PASS (QA anterior) | Generador sobre 8 pendientes: 8 insertados, segunda ejecución 0 |
| Baja voluntaria | PASS (QA anterior) | 1 opt_out sintético -> 7 insertados, 0 para el ID excluido, segunda ejecución 0 |
| Compilación/despliegue | PASS | Vercel production dpl_2fmUamWEp3xW4LLmkwR3c46mUMiX READY; aplicación sin sesión solicita login |
| SMTP de Neon Auth | CONFIGURADO, no E2E | smtp.resend.com, registro de acceso deniega signup, email verificado para 2 miembros |
| Envío externo WhatsApp/SMS | NO CERTIFICADO | No existe ruta de dispatch para followup_queue ni pruebas E2E de webhook / provider message id / delivery receipt / retry / STOP |
| Revocación de sesiones | NO CERTIFICADA | No hay evidencia de sesión capturada antes/después de revocar y rechazo de server actions |
| Autorización usuario-operador vs owner en endpoint | PARCIAL | Role check en server actions revisado; no se han enviado solicitudes autenticadas de prueba contra esos endpoints con tokens de QA |

## Requisitos para GO de mensajería
1. Identidades QA owner/operator; sign-in OTP, action success owner, denial operator, session revoke server-side and denial of replay after revoke; audit logs.
2. Registro de consentimiento explícito, evidencia de fuente, canal, propósito, timestamp; baja/STOP y revocación reenforced al momento de envío.
3. Reglas Meta WhatsApp para mensajes iniciados por empresa: fuera de las 24 horas usar plantilla previamente aprobada. Aprobar modalidad/categoría de mensaje.
4. Transport sandbox con teléfonos exclusivamente de prueba; nunca números de prospectos; idempotency key, atomic claim, dedup, reintentos, receipt reconciliations, quiet hours America/Puerto_Rico, emergency stop y rate limits.
5. Evaluación seguridad webhook, secretos y respuesta a errores, separada de CRM principal.
6. Las acciones actuales *solo* generan borradores; una decisión de revisión no concede autorización para envío.

**Decisión:** GO para generación y revisión sin envío, NO-GO para envío automático. Mantener el bloqueo SQL CHECK(status <> 'approved'), no introducir un worker hasta certificación y autorización explícita.


## Evidencia complementaria — 2026-11-09

- Snapshot adicional antes de pruebas: `snap-square-darkness-avi5d0cs`.
- QA nueva creada desde rama main: `br-odd-scene-avgbjflt`. Producción sin cambios de contenido.
- Inventario producción: `33 public.prospects`, `20 public.call_leads`, `162 public.whatsapp_messages`, `0` propuestas, `0` aprobaciones.
- `neon_auth.user`: ambas cuentas verificadas, `owner` y `operator` activos, una sesión activa cada uno. Esto **no** prueba revocación E2E.
- Pruebas negativas SQL con rol `axiomos_commercial_reader` (PASS): ejecución de función generadora denegada, lectura de bitácora denegada, lectura de consentimiento denegada (`42501`).
- Rol `axiomos_commercial_writer`: eliminación de decisión denegada (`42501`).
- Intento sintético de INSERT con estado `approved`: denegado por `followup_queue_no_live_dispatch` (`23514`), `0 approved` tras prueba.
- Registro del operador verificado a nivel DB como `operator`; rechazo *HTTP autenticado* de server action pendiente.
- No se ejecutaron cambios de token, envíos, ni llamadas a prospectos reales.

**Certificación adicional:** bloqueo SQL/roles PASS; autenticación de navegador con sesiones de prueba, revocación real y entrega de proveedor permanecen NO CERTIFICADAS. No levantar prohibición de envíos.
