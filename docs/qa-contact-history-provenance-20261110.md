# AxiomOS Autopilot — historial verificable de contactos en QA

Fecha: 10 de noviembre de 2026. **Solo QA aislado.** No se enviaron mensajes ni se modificaron llaves, tokens, webhooks o producción.

## Hallazgo
Se comprobó que la base tiene `public.whatsapp_messages` (162 filas; 82 rol user, 80 assistant), `public.whatsapp_campaign_sends` (5 filas status `accepted`) y `public.prospects` (33 filas, 31 con teléfono). Solo cinco respuestas de assistant disponían de un `whatsapp_message_id`. Los registros son útiles pero **no garantizan una cronología completa de cada contacto**, incluyendo proveedores, bajas y otros canales.

## Cambios QA
- `database/migrations/20261110_qa_contact_history_failclosed.sql`: `qa_contact_history` con IDs de evento únicos, origen, canal y estado, y `qa_contact_history_coverage` con evidencia explícita de cobertura completa. Función de frecuencia por prospecto y canal que falla con `coverage_valid=false` cuando falta cobertura, esta es antigua, o los intervalos no abarcan los últimos 7 días.
- `database/migrations/20261110_qa_reconcile_campaign_contact_attempts.sql`: añade propósito `marketing`, conserva solo las cinco campañas `accepted` con vínculo válido a prospecto, fecha y mensaje único; hace un backfill idempotente. No convierte `accepted` a `delivered`.
- Ninguna fila de cobertura se crea automáticamente. El historial incompleto nunca equivale a consentimiento para envío.
- Scripts: `scripts/test-qa-contact-history-postgres.sh` y `scripts/test-qa-campaign-history-import-postgres.sh`. Los tests demuestran denegación por cobertura faltante, incompleta y caducada, separación canal/prospecto, rechazo de eventos repetidos y no alteración de cobertura al importar campañas.

## Ejecución verificada
- GitHub Actions `AxiomOS QA transactional outbox` run **42910354590** final **success**, marcador `QA_CONTACT_HISTORY_PROVENANCE_NO_SEND_PASS`.
- GitHub Actions `AxiomOS QA transactional outbox` run **42911040721** final **success**, marcador `QA_CAMPAIGN_HISTORY_IDEMPOTENT_NO_SEND_PASS`. Primeras ejecuciones detectaron errores en fixtures CI; se corrigieron.
- Neon QA hija **br-soft-band-av98etp4**: 5 eventos históricos `reconciled_campaign / whatsapp / marketing / accepted`, con 5 event keys distintos; **0 filas** de `qa_contact_history_coverage`; para un prospecto con historial la función devolvió `coverage_valid=false`, contadores null.
- El control `qa_followup_decision_audit` conserva 8 auditorías anteriores. La cola mantiene 8 seguimientos `needs_review` (2 `opt_out`, 6 sin consentimiento verificable).
- Roles `axiomos_commercial_reader` y `axiomos_autopilot_e2e_worker` no recibieron permisos directos sobre el historial. La restricción `followup_queue_no_live_dispatch` sigue vigente.
- No se enviaron mensajes SMS o WhatsApp reales ni se hicieron cambios en producción.

## Limitación y próximo bloqueo
La función de auditoría transaccional actual sigue fallando en cerrado con `BLOCKED_NO_FREQUENCY_SOURCE` cuando todas las demás condiciones pasan. Aún se debe integrar la cobertura verificada con esa función para tomar una decisión transaccional completa y auditar supresiones/revocaciones globales, mantener un historial exhaustivo de intentos incluso con estado incierto, y realizar pruebas con WhatsApp Meta QA genuinamente separado. El sistema **no** está habilitado para enviar seguimientos autónomos. Cualquier publicación requerirá revisión de seguridad y autorización específica.
