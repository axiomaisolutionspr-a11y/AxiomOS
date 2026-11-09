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

## NO afirmar lo que aún no ocurrió
1. **No se ha hecho el envío real del nuevo worker**. Se requiere que el propietario ingrese su OTP únicamente en la página Preview y pulse una sola vez «Ejecutar un SMS de certificación». No usar el OTP en chat, repositorio ni logs.
2. **No hay entrega real confirmada**. Tras el intento se debe consultar el estado desde el botón de Telnyx y, si existe un webhook firmado hacia una URL accesible, correlacionarlo por el ID real.
3. **WhatsApp real no certificado en este Preview**: la clave Dualhook no está configurada para la rama; la plantilla de negocio necesita confirmación de aprobación. No copiar secretos de producción sin un plan explícito.
4. **NO-GO de despachos autónomos a prospectos**. No hay migración de la cola comercial ni aprobación de envíos generales.

## Operación autorizada y procedimiento seguro
- Abrir únicamente la URL estable de Preview y entrar como propietario QA con email OTP.
- Comprobar identidad y pulsar una sola vez «Ejecutar un SMS de certificación» durante horario diurno permitido; su condición de un único intento está garantizada por base de datos.
- Registrar el resultado de aceptación (no equivale a entrega) y pulsar «Consultar estado real del SMS en Telnyx (sin reenviar)». Repetir la consulta es seguro; no genera otro SMS.
- Correlacionar con el teléfono interno autorizado y un webhook firmado si está accesible.
- No forzar la reserva a `ready` después de un error o timeout; dejar `uncertain` y reconciliar por el identificador de proveedor.
- Cuando exista la evidencia final, revisión de seguridad y autorización de release antes de producir cualquier campaña. **No mergear PR #101 para activar servicios.**

## Reversión
La rama de QA está aislada; desactivar `AXIOMOS_QA_E2E_SMS_SEND_ENABLED` en la Preview específica basta para impedir nuevos disparos. La restricción original `followup_queue_no_live_dispatch` no ha sido eliminada.
