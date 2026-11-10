# AxiomOS Autopilot — Certificación E2E aislada (09-nov-2026)

## Estado verificable
- PR #101: https://github.com/axiomaisolutionspr-a11y/AxiomOS/pull/101 (draft, no merge a producción).
- Proyecto Vercel: `axiomai-solutions`; únicamente **Preview** de `feature/autopilot-dispatch-policy-qa-20261109`.
- URL estable de Preview: `https://axiomai-solutions-git-feature-autopilo-6ba2ac-axiomai-solutions.vercel.app/prospectos/autopilot/qa-e2e`.
- Neon proyecto `icy-field-92690259`, rama **hija** `br-lively-band-avj6yz8x`. Base de datos de producción y rama principal intactas.
- Snapshot directo de la rama no raíz fue denegado por Neon; la rama hija proporciona aislamiento del punto de inicio para esta fase.
- Solo las variables de Preview restringidas a esta rama apuntan a QA (lectura y escritura con usuarios limitados), sin modificar secretos de producción ni credenciales existentes.
- Se comprobó `GET /api/auth/get-session` del Preview: HTTP 200, JSON `null` sin sesión. La página protegida redirige al acceso individual.
- La rama QA incluye la cuenta verificada de prueba y una asociación de propietario creada exclusivamente allí.
- Roles de Neon: lector permite SELECT por columna en membresías; worker permite exclusivamente EXECUTE de procedimientos QA autorizados. Worker no puede leer prospectos ni la tabla de pruebas.
- `qa_e2e_claim_once` deniega un propietario inexistente con SQLSTATE `42501`.
- Prueba real de autorización de reserva mediante rol worker dentro de subtransacción: primera llamada devuelve 1, segunda 0, todas las modificaciones fueron revertidas. Verificación posterior `state=ready`, `attempts=0`.
- En QA hay **una sola autorización SMS interna** a `+17872320132`, expira siete días después de su creación, horario permitido de Puerto Rico 09:00–18:00. No es campaña.
- Código `sms-action.ts` exige sesión OTP del propietario, la reserva SQL segura, flags restringidos a Preview y no permite reintentos automáticos.
- El formulario permite consultar posteriormente el estado mediante `GET /v2/messages/{id}` (lectura autenticada). El resultado de API se registra por separado y **no se confunde con la prueba de firma webhook**.
- Hay un controlador QA de webhook Telnyx que verifica Ed25519 del cuerpo exacto y registra estados contra ID conocido; el secreto público de Telnyx y accesibilidad externa de la ruta deben verificarse antes de declararlo E2E.
- GitHub Actions del PR verifica la política, la simulación de respuestas de Telnyx/Dualhook, firma Ed25519/HMAC, la cola transaccional y duplicados; el despliegue Preview de esta rama compiló y se encuentra READY.

## Evidencia posterior — SMS REAL certificado (09-nov-2026)

**PASS — Aceptación y entrega SMS de un solo intento (no webhook firmado).**

- Propietario inició la prueba en Preview con sesión OTP autorizada. La reserva pasó de `ready` a `claimed` a las `2026-11-09T21:57:17.801Z` (17:57 hora Puerto Rico).
- Neon QA, rama hija `br-lively-band-avj6yz8x`: `axiomos_commercial.qa_e2e_one_shot` devolvió `state=delivered`, `attempts=1`, recibo Telnyx asociado al mensaje `4031a1c2-50cd-4f1c-bcd3-3193b2a8de7c`, última actualización `2026-11-09T21:57:51.885Z`.
- `qa_e2e_provider_checks`: una observación `state=delivered`, `source=telnyx_api`, obtenida por consulta autenticada a Telnyx. **Esta confirmación no sustituye la prueba del webhook firmado**.
- Captura de usuario aportada en conversación: SMS recibido a las 5:57 p. m., cuerpo visible «AxiomAI Solutions: prueba automatica QA autorizada. No responder.». Evidencia visual adicional sin subir la captura a GitHub para evitar difundir datos del teléfono.
- `qa_e2e_delivery_events` (eventos webhook firmados reales): **0**. No afirmar certificación de webhook de producción.
- Segundo intento bloqueado: el usuario observó «La reserva no está disponible, está fuera de horario o ya se consumió» y no se produjo otro envío. La interfaz posterior se corrigió para visualizar el estado real `delivered` y deshabilitar el botón consumido.
- La variable `AXIOMOS_QA_E2E_SMS_SEND_ENABLED` se estableció en `false` para la rama Preview exclusivamente. No modificar ni rearmar esta reserva.
- GitHub PR #101 permanece abierto en draft, sin merge ni despliegue en producción.

**Decisión:** `SMS_REAL_E2E_DELIVERED_PASS` (por API y recepción visual); `SIGNED_WEBHOOK_REAL_PENDING`; `WHATSAPP_REAL_PENDING`; `AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO`.

## Evidencia histórica antes del envío real


1. **SMS real del nuevo worker: completado y confirmado** el 09-nov-2026. No repetir el envío ni rearmar la reserva. OTP no debe compartirse en chat, repositorio ni logs.
2. **Entrega real SMS confirmada por API y captura**. Falta comprobar un evento real firmado recibido por el webhook, correlacionado con el ID de mensaje. No inventar evidencia de firma.
3. **WhatsApp real no certificado en este Preview**: la clave Dualhook no está configurada para la rama; la plantilla de negocio necesita confirmación de aprobación. No copiar secretos de producción sin un plan explícito.
4. **NO-GO de despachos autónomos a prospectos**. No hay migración de la cola comercial ni aprobación de envíos generales.

## Operación autorizada y procedimiento seguro
- **No repetir el SMS**: ya se ejecutó y se recibió. El botón está desactivado después del intento único.
- Solo consultar el estado y evidencias ya registradas; ningún reenvío ni cambio de `attempts=1`.
- Correlacionar con el teléfono interno autorizado y un webhook firmado si está accesible.
- No forzar la reserva a `ready` después de un error o timeout; dejar `uncertain` y reconciliar por el identificador de proveedor.
- Cuando exista la evidencia final, revisión de seguridad y autorización de release antes de producir cualquier campaña. **No mergear PR #101 para activar servicios.**

## Reversión
La rama de QA está aislada; desactivar `AXIOMOS_QA_E2E_SMS_SEND_ENABLED` en la Preview específica basta para impedir nuevos disparos. La restricción original `followup_queue_no_live_dispatch` no ha sido eliminada.

## Auditoría final adicional — 09-nov-2026 (webhooks y WhatsApp)

- Reconsulta Neon QA hijo: SMS `state=delivered`, `attempts=1`, `qa_e2e_delivery_events=0`. No existe evidencia de que el webhook QA recibiera un evento Telnyx real firmado. No reenviar SMS para forzar la prueba.
- La documentación Telnyx confirma prioridad de `webhook_url` **por mensaje** sobre el perfil. El SMS ya enviado no incluyó una URL QA específica; no redirigir retroactivamente ni alterar la URL del perfil de producción. Ref: https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks
- El proyecto Vercel Preview está protegido por Vercel Authentication. No desactivar esa protección para permitir un callback externo: expondría el panel de propietario. Se requiere una entrada webhook pública segregada, verificadora de firma y con un scope de evento sintético, en un despliegue independiente cuando se autorice una nueva prueba.
- La rama de pruebas no contiene `DUALHOOK_API_KEY` de envío ni `META_APP_SECRET` para recibir eventos reales. Sus valores productivos permanecen en Producción. No duplicarlos silenciosamente a Preview ni modificar Webhook Override de WhatsApp.
- Dualhook documenta `POST https://api.dualhook.com/v25.0/<PHONE_NUMBER_ID>/messages` y mensajes de plantilla para apertura fuera de 24 horas; el adaptador existente usa la ruta documentada, pero un envío real necesita un token de conexión QA independiente y una plantilla aprobada o ventana vigente. Refs: https://dualhook.com/docs/messaging-overview, https://dualhook.com/docs/coexistence
- **Hallazgo de seguridad:** `app/api/whatsapp/route.ts` previamente ejecutaba `await request.json()` sin verificar `X-Hub-Signature-256` en ese punto. Se añadió verificación HMAC-SHA256 del cuerpo crudo antes de procesar eventos y se prepararon regresiones contra firmas falsas. Cambio solo en PR draft sin merge; requiere revisión y despliegue controlado antes de producción.
- `tests/whatsapp-signature-route.test.mjs` y el workflow de Autopilot QA validan que la firma se comprueba antes de parsear y que cuerpo modificado/sin firma es rechazado. Esto **no prueba** un webhook real ni la ruta de producción.

**Decisión vigente:** `SMS_REAL_PASS`; `TELNYX_SIGNED_WEBHOOK_REAL_PENDING`; `WHATSAPP_REAL_PENDING`; `AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO`. No activar flags comerciales ni mutar credenciales productivas. 

## Revisión de preparación sin envíos — 10-nov-2026

Esta revisión fue de solo lectura sobre Vercel, GitHub y Neon QA, sin rearmar reservas, modificar credenciales ni tocar producción.

- Vercel: el proyecto segregado `axiomos-qa-telnyx-webhook` tiene despliegue `READY` y alias `axiomos-qa-telnyx-webhook.vercel.app`. Esto **no acredita** por sí solo acceso HTTP externo ni recepción de eventos reales.
- Configuración: la variable `TELNYX_SIGNING_PUBLIC_KEY` existe en el proyecto receptor con destino production; no se leyó ni copió su valor. La Preview de la rama tiene `AXIOMOS_QA_TELNYX_PUBLIC_KEY` y otros parámetros QA configurados; no se divulgaron valores.
- Código revisado: el receptor segrega GET de estado y POST; POST exige Ed25519 sobre bytes crudos y timestamp; evita registrar teléfonos y cuerpos de mensajes. Los tests con claves sintéticas prueban firma válida, alteración de cuerpo, expiración, falta de firma y falta de clave.
- GitHub Actions, rama QA PR #101: `AxiomOS Autopilot QA dispatch policy` y `AxiomOS QA transactional outbox` terminaron `success` el 09-nov. La segunda ejecuta dos procesos PostgreSQL concurrentes contra un trabajo sintético, validando reserva única, horarios, opt-out, permisos y recibos simulados.
- Neon QA rama hija `br-lively-band-avj6yz8x`: `qa_telnyx_signed_probe` contiene **1** reserva `ready`, `attempts=0`, aún vigente en la consulta; **no** se consumió. `qa_e2e_delivery_events` tiene **0** eventos registrados. El SMS anterior de `qa_e2e_one_shot` permanece `delivered`, `attempts=1`.
- No se pudieron obtener logs históricos del receptor (retención de plan limitada); la consulta de logs de los últimos 30 minutos no encontró registros. El estado `READY` tampoco demuestra recepción por Telnyx.
- La comprobación GET en vivo no se pudo confirmar desde el entorno de herramientas de esta ejecución; **NO** registrar `PUBLIC_INGRESS_PASS`.

**Decisión:** `QA_CODE_AND_CONFIG_REVIEW_PASS`; `PUBLIC_INGRESS_UNVERIFIED`; `REAL_ED25519_WEBHOOK_PENDING`; `WHATSAPP_REAL_PENDING`; `AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO`.

**Próximo ensayo condicionado:** verificar GET público al receptor desde un cliente externo, revisar que Telnyx tenga configurada la URL específica por mensaje, y obtener autorización **explícita para un segundo SMS real** si se decide consumir la reserva independiente de firma. No habilitar flags ni enviar un mensaje sin esa autorización. Registrar un evento real autenticado correlacionado con el identificador de proveedor antes de marcar PASS. No cambiar perfil ni webhooks productivos.
