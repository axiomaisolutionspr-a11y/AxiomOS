# Acceso individual de AxiomOS Autopilot en QA

Estado: prototipo aislado. La autenticación de AxiomOS comercial sigue en la ruta existente.

## Aislamiento

- Neon: rama hija `axiomos-identity-qa-20261107` (`br-polished-smoke-avoq7zol`), derivada de `axira-menu-qa-20261101`. Base dedicada `axiomos_offers_qa`.
- Neon Auth Managed Better Auth se habilitó únicamente en la rama hija. El registro público está desactivado, se exige correo verificado y el restablecimiento de contraseña revoca sesiones.
- `axiomos_identity.memberships` mantiene un permiso por usuario y empresa. Sin fila activa, se deniega la vista. Cambiar `status` a `disabled` revoca de inmediato **el acceso a AxiomOS**, aunque la sesión del proveedor siga activa hasta cerrarse o revocarse en Neon Auth.
- El rol PostgreSQL de la aplicación solo puede leer `memberships`; no puede modificarla ni leer `neon_auth.user`.
- Vercel: únicamente `axiomos-autopilot-qa`, con protección de despliegues. La rama de código tiene deshabilitado el despliegue automático del proyecto comercial.

## Variables Preview

`AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED=true`, `NEON_AUTH_BASE_URL` de la rama hija, `NEON_AUTH_COOKIE_SECRET` aleatorio (32+ caracteres), `AXIOMOS_IDENTITY_QA_AUTH_HOST`, `AXIOMOS_IDENTITY_QA_DATABASE_URL` de rol lector y `AXIOMOS_IDENTITY_QA_DATABASE_HOST`. Todas pertenecen solo al proyecto aislado y al entorno Preview. No guardar valores secretos en el repositorio.

La gestión de ofertas del propietario requiere además `AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL`, también **sensible y solo Preview**, del rol `axiomos_autopilot_qa_offer_writer` en la misma rama/base. Se verifica usuario, host y base en cada conexión. Este rol solo lee el esquema comercial, inserta ofertas/auditoría y actualiza `status` y `revision`; no puede borrar ofertas, leer membresías ni leer usuarios de Neon Auth. La sesión y membresía siempre se comprueban primero con el rol lector.

`AXIRA_OFFERS_QA_DATABASE_URL` (rol lector) y `AXIRA_OFFERS_QA_DATABASE_HOST` apuntan ahora a esa **misma rama hija**; `AXIRA_OFFERS_QA_ENABLED=true` y `AXIRA_OFFERS_QA_REVIEW_ONLY=true`. Así, la ruta QA `/api/brain` y la revisión `/prospectos/ofertas` consultan el catálogo administrado en `/prospectos/autopilot`. El cambio se aplicó solo al proyecto aislado de Vercel Preview; no se configuraron variables de producción ni se conectaron WhatsApp, Messenger o Telnyx. Para revertirlo, restablecer las dos variables `AXIRA_OFFERS_QA_DATABASE_*` de Preview a la rama anterior `axira-menu-qa-20261101` y redesplegar. Verificar el host de esa rama antes de hacerlo.

## Personas y acceso

Rolando confirmó ambos correos. Se crearon dos identidades en la rama hija de Neon Auth y sus membresías por UUID: Rolando `owner`, Alex `operator`. Ambos completaron el acceso por código de un solo uso en sus propios correos; Neon registró los correos verificados y una sesión activa por persona. No compartir códigos. La pantalla inicia sesión mediante Email OTP del proveedor, sin asignar contraseñas por terceros.

El origen exacto del Preview está en los dominios confiables. Quedan pendientes las pruebas del cierre, recuperación de sesión y desactivación de una membresía. La pantalla comprueba la membresía en cada solicitud, sin caché de permiso.

## Recuperación

Desactivar `AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED` o revertir el despliegue Preview. La rama hija puede eliminarse tras exportar cualquier configuración QA que se quiera conservar. No eliminar la rama QA anterior ni la base de producción. Deshabilitar un usuario en `memberships` corta el acceso de aplicación mientras se revocan sus sesiones con la administración de Neon Auth.

Antes de habilitar las acciones comerciales se creó una copia verificable de la rama hija: `backup-identity-qa-20261107` (`br-plain-mouse-avouv163`, sin compute, estado `ready`). Neon rechazó snapshots de una rama no raíz, por eso se usó una rama hija de respaldo. Para detener escrituras sin afectar la lectura, quitar la variable Preview del escritor o revertir el despliegue. Para recuperar datos de QA, crear una rama nueva desde el respaldo y verificar cuentas, sesiones y ofertas antes de cambiar variables; no restaurar sobre producción.

## Panel comercial QA

Tras validar sesión y membresía, `/prospectos/autopilot` consulta el catálogo de ofertas de la misma rama hija mediante el rol lector. Muestra estado calculado al momento de lectura, borradores, vencimientos y fuente. Los dos registros heredados de QA son sintéticos; no se presentan como promociones comerciales reales. Si la lectura falla, el panel no muestra cifras ni recomendaciones.

Solo el rol `owner` puede crear borradores y aprobar o pausar ofertas en esa rama. Las acciones verifican de nuevo la sesión y membresía, validan condiciones comerciales, exigen la palabra `APROBAR` o `PAUSAR`, controlan revisión y solapamiento, y atribuyen auditoría al UUID autenticado. `operator` y `viewer` solo leen. No se publica nada en canales reales por usar este formulario QA.

La conexión de prospectos se marca expresamente como pendiente porque esta base aislada no tiene tablas de prospectos. Las únicas escrituras previstas son borradores y cambios de estado de ofertas QA por el propietario; el panel no envía mensajes. No usarlo como prueba de que el CRM comercial ya fue migrado a la identidad nueva.

### Bloqueo concreto de prospectos y canales

Lectura de metadatos en la rama principal de Neon: `prospects`, `call_leads` y `whatsapp_messages` no tienen columna `tenant_id`. Las rutas actuales de formularios y Telnyx escriben en `prospects` mediante `DATABASE_URL`; WhatsApp escribe mensajes en la base comercial. Sus datos no pueden exponerse en un CRM multiempresa con una simple consulta desde este panel. La rama hija de identidad carece de esas tablas por diseño.

El PR #65 (`security/crm-webhooks-hardening-20261103`) ya prepara sesiones revocables, validación Meta/Telnyx y pruebas aisladas; no se debe duplicar ni fusionar a ciegas con este piloto. Su propia documentación exige eventos auténticos de los proveedores y resolver la autenticación del relay Dualhook antes de producción. Integrar prospectos requiere una tabla o proyección con `tenant_id`, identidad de evento por canal, consentimiento, permisos de fila y una migración aditiva probada en QA. No copiar clientes reales a esta rama para simular la integración.

## Límites de este prototipo

Rolando y Alex iniciaron sesión con OTP; Neon registró ambos correos verificados, membresías separadas y una sesión activa por persona. El formulario comercial QA está preparado y sus operaciones SQL se probaron en transacciones revertidas; todavía falta la prueba E2E del formulario desde la sesión del propietario y la denegación desde la sesión del operador. El Preview y su CI están listos, y las variables de Brain y del panel apuntan a la misma rama hija. Se consultó en `/brain` «¿Cuál es la promoción vigente y hasta cuándo?»; Axira respondió «Para esa consulta no tenemos una promoción vigente confirmada. Podemos prepararte una cotización.» Esto comprueba el caso negativo en el Preview, pero falta comprobar la respuesta positiva de `/api/brain` tras una aprobación hecha en el panel. No se ha aprobado ninguna oferta QA real: los dos registros existentes son sintéticos, uno borrador y otro pausado. El panel no expone prospectos. El PIN actual sigue protegiendo las demás rutas; una migración de producción exige integrar la identidad nueva en **cada** consulta y Server Action, y verificar las firmas de los canales antes del corte.
