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
