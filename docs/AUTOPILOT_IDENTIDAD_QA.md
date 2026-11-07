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

## Personas y acceso

Rolando confirmó ambos correos. Se crearon dos identidades en la rama hija de Neon Auth y sus membresías por UUID: Rolando `owner`, Alex `operator`. Las cuentas aún no tienen correo verificado ni contraseña; cada titular debe solicitar e introducir en el Preview un código de un solo uso recibido en su propio correo. No compartir códigos. La pantalla inicia sesión mediante Email OTP del proveedor, sin asignar contraseñas por terceros. El acceso real por cada cuenta aún requiere una prueba con el titular.

El origen exacto del Preview está en los dominios confiables. Después de iniciar sesión se debe probar cierre, recuperación de sesión y desactivación de una membresía. La pantalla comprueba la membresía en cada solicitud, sin caché de permiso.

## Recuperación

Desactivar `AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED` o revertir el despliegue Preview. La rama hija puede eliminarse tras exportar cualquier configuración QA que se quiera conservar. No eliminar la rama QA anterior ni la base de producción. Deshabilitar un usuario en `memberships` corta el acceso de aplicación mientras se revocan sus sesiones con la administración de Neon Auth.

Antes de habilitar las acciones comerciales se creó una copia verificable de la rama hija: `backup-identity-qa-20261107` (`br-plain-mouse-avouv163`, sin compute, estado `ready`). Neon rechazó snapshots de una rama no raíz, por eso se usó una rama hija de respaldo. Para detener escrituras sin afectar la lectura, quitar la variable Preview del escritor o revertir el despliegue. Para recuperar datos de QA, crear una rama nueva desde el respaldo y verificar cuentas, sesiones y ofertas antes de cambiar variables; no restaurar sobre producción.

## Panel comercial de solo lectura

Tras validar sesión y membresía, `/prospectos/autopilot` consulta el catálogo de ofertas de la misma rama hija mediante el rol lector. Muestra estado calculado al momento de lectura, borradores, vencimientos y fuente. Los dos registros heredados de QA son sintéticos; no se presentan como promociones comerciales reales. Si la lectura falla, el panel no muestra cifras ni recomendaciones.

Solo el rol `owner` puede crear borradores y aprobar o pausar ofertas en esa rama. Las acciones verifican de nuevo la sesión y membresía, validan condiciones comerciales, exigen la palabra `APROBAR` o `PAUSAR`, controlan revisión y solapamiento, y atribuyen auditoría al UUID autenticado. `operator` y `viewer` solo leen. No se publica nada en canales reales por usar este formulario QA.

La conexión de prospectos se marca expresamente como pendiente porque esta base aislada no tiene tablas de prospectos. El panel no permite escrituras, mensajes ni aprobaciones. No usarlo como prueba de que el CRM comercial ya fue migrado a la identidad nueva.

## Límites de este prototipo

Rolando inició sesión con OTP y Neon registró su correo verificado, membresía de propietario y una sesión activa. Alex aún no ha probado su acceso. El panel no expone prospectos ni habilita escritura comercial. El PIN actual sigue protegiendo las demás rutas; una migración de producción exige integrar la identidad nueva en **cada** consulta y Server Action, y verificar las firmas de los canales antes del corte.
