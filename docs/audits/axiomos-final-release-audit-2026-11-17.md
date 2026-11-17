# AxiomOS Autopilot — certificación integral y avances de integración
Fecha de auditoría: 2026-11-17. Estado: **NO-GO producción**, **PASS parcial QA**.

## Investigación y comprobaciones directas
- Revisadas documentación de Dualhook (Webhook Override, firma de Meta), Neon y Resend; código y PR de GitHub, variables de Vercel sin descifrar credenciales, registros de errores de producción y datos agregados Neon.
- El secreto de Meta propio de AxiomAI no permite verificar el HMAC de eventos firmados por la aplicación Meta administrada por Dualhook. Antes de exigir firma en producción se necesita un control compatible de origen/ruta, WABA y teléfono, con pruebas de denegación y recepción legítima; no activar la bandera de cumplimiento de firmas a ciegas.
- Para discrepancias de notificaciones, Resend permite consultar correos por ID y su estado; Telnyx requiere correlación por mensaje/proveedor y su evento de estado. No reintentar aceptación incierta.
- La variable `DATABASE_URL` de producción en Vercel pertenece al proyecto Neon `axiomai-leads`, pero el proveedor de secretos no expone la URL real al conector: **rama productiva exacta no certificada**. Evidencia de fuerte correlación: el ID de prospecto 171 registrado en errores productivos el 17-nov existe en `br-proud-frog-avxt19iu`, creado 2026-11-17 14:25 UTC y actualizado 14:30 UTC; no existe en la rama default. Consulta manual a la rama candidata devolvió `current_setting('neon.branch_id')=br-proud-frog-avxt19iu`, lo cual confirma la identidad de esa rama pero NO que Vercel produzca allí. Hace falta el mismo fingerprint desde el proceso autorizado de Vercel.
- Error de producción `WHATSAPP_CONTACT_EMAIL_RECEIPT_SAVE_FAILED` y `WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN` en el prospecto 171. Su `crm_notes` no contiene marcadores `WA_EMAIL_ACCEPTED` / `WA_SMS_ATTEMPT` / `WA_SMS_ACCEPTED`; esto no prueba rechazo del proveedor. La columna `crm_notes` es `text`, el rol administrativo consultado tiene SELECT/INSERT/UPDATE y `EXPLAIN` de la sentencia de recibo compiló en Neon QA sin ejecutar mutaciones. SQLSTATE del error efectivo sigue sin capturar.
- En rama de auditoría, `app/lib/whatsapp-contact-request.ts` incorpora errores SQLSTATE limitados sin incluir datos de cliente ni tokens. Compilación Vercel QA `READY`, sin prueba del proveedor ni migración productiva.
- Meta QA Neon branch `br-ancient-silence-avta0kyo`: dos respuestas y un seguimiento aceptados por Meta y con evento `delivered` correlacionado (11-nov-2026). Esta es evidencia histórica real; no reenviar pruebas.
- Neon QA scheduled worker `axiomworkerqa` sigue restringido a IDs sintéticos y produce acuses simulados. No hace llamadas a Dualhook/Meta reales.

## Integración de ensayo añadida 2026-11-17
Se trasladó desde PR #107 (borrador, no fusionado) al branch aislado `audit/whatsapp-inbound-outbound-20261116`:
1. `app/api/autopilot/whatsapp-followups/route.ts`
2. `app/lib/whatsapp-followup-worker.mjs`
3. `app/prospectos/autopilot/seguimientos/simulacion-whatsapp/pilot-provider.ts` (adaptador compartido)
4. `database/migrations/20261111_whatsapp_followup_dispatch.sql`
5. `docs/whatsapp-followup-dispatch-20261111.md`
6. `tests/whatsapp-followup-worker.test.mjs`

**Sin activar** `AXIOMOS_WHATSAPP_FOLLOWUP_DISPATCH_ENABLED`, sin configurar CRON_SECRET ni rol de envío, sin agregar el cron de producción de `vercel.json`, sin ejecutar esa migración sobre producción. Por diseño, el worker exige `VERCEL_ENV=production`, bandera de despacho y URL con rol dedicado; falla inactivo en Preview. El Vercel Preview del commit `f2cf409c720e6ff08af10f5705a6efd92fec94d1` compiló y terminó **READY**; Production `main` continuó en commit `8c68202106bd03ef9cad3a25323f95ea06d243a3` READY.

**PASS:** integración de fuentes y compilación Preview. **NO PASS:** cobertura de historial real, consentimiento activo, autorización de envío, entrega real integrada, pruebas funcionales bajo sesión comercial, backup/restore y rollout.

## Gates estrictos del próximo despliegue
1. Fingerprint sin secreto desde la conexión de Production Vercel (rama, usuario, DB, host sin contraseña) frente a la rama que contiene clientes actuales; no cambiar conexión por adivinanza.
2. Recuperar ID/estado de los SMS/correos aceptados por los proveedores y la causa SQLSTATE de escritura de comprobantes; evitar segundo envío.
3. Unir fuente de opt-in/bajas/cobertura reciente a la tabla `whatsapp_followup_coverage` y ensayar deduplicación, frecuencia, revocación y concurrencia sobre QA de datos controlados; aprobar revisión PR y CI.
4. Validar webhook real de producción con Dualhook sobre endpoint aislado compatible, identidad WABA y teléfono correctos; aprovechar tres entregas Meta QA históricas existentes.
5. Pruebas autenticadas del CRM individual owner/operator/viewer y revocación, además del CRM PIN antiguo; notas, estados, asignación, seguimientos, lista íntegra de prospectos.
6. Respaldo y restauración, migraciones controladas, monitoreo y reversión; activar bandera solo tras consentimiento y verificación de proveedor.

**Dictamen: certificación productiva integral NO-GO.** Este informe es evidencia de trabajo real e identifica los bloqueos sin elevar simulaciones a certificaciones comerciales. Ninguna clave, token, webhook ni base productiva fueron alterados.
