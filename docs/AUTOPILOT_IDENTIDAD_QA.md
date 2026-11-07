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

## Habilitar personas reales

1. Confirmar los correos de Rolando y Alex con ellos. No inferir el correo de Alex ni compartir una credencial.
2. Crear cada usuario mediante el flujo administrativo de Neon Auth de la rama hija. Completar la verificación del correo y configurar contraseña individual; no enviar invitaciones durante pruebas sin autorización.
3. Obtener el UUID devuelto por Neon Auth y registrar una membresía activa con `tenant_id='axiomai'` y rol `owner`, `operator` o `viewer` mediante una operación de administración en la base QA. Nunca otorgar permisos por coincidencia de nombre o correo mostrado.
4. Añadir el origen exacto del Preview a dominios confiables de Neon Auth antes de iniciar sesión.
5. Probar inicio, cierre y recuperación de sesión; después desactivar una membresía y confirmar que se deniega `/prospectos/autopilot` de inmediato. La pantalla comprueba la membresía en cada solicitud, sin caché de permiso.

## Recuperación

Desactivar `AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED` o revertir el despliegue Preview. La rama hija puede eliminarse tras exportar cualquier configuración QA que se quiera conservar. No eliminar la rama QA anterior ni la base de producción. Deshabilitar un usuario en `memberships` corta el acceso de aplicación mientras se revocan sus sesiones con la administración de Neon Auth.

## Límites de este prototipo

No se crearon cuentas de Rolando ni Alex. El panel nuevo prueba identidad y rol, pero todavía no expone datos de prospectos ni habilita escritura comercial. El PIN actual sigue protegiendo las demás rutas; una migración de producción exige integrar la identidad nueva en **cada** consulta y Server Action, y verificar las firmas de los canales antes del corte.
