# Estado de habilitación POS QA — 3 noviembre 2026

## Bloqueador de seguridad confirmado

El rol `pos_qa_runtime` creado por Neon en la rama `pos-location-integrity-qa-20261103` presenta `rolbypassrls=true`. La cuenta conectada no tiene permiso para ejecutar `ALTER ROLE ... NOBYPASSRLS`; se recibió «permission denied to alter role». Por tanto, **NO se habilitó ni se desplegó una conexión de sesión POS a Neon QA**, ni se configuraron secretos en Vercel.

El código de `app/lib/pos/qa-auth.ts` ahora incluye `assertQaRuntimeRestricted()`, ejecutada antes de las consultas de las APIs de sesiones, catálogo y borradores, para denegar explícitamente cualquier usuario con BYPASSRLS o SUPERUSER. Esta protección deja el sistema bloqueado hasta que haya un rol restringido verificable y políticas RLS bien probadas.

## Qué hace falta antes de conectar

1. Mediante administrador Neon autorizado, provisionar rol sin BYPASSRLS y sin membresías privilegiadas; verificar `pg_roles.rolbypassrls=false`, `rolsuper=false` y permisos mínimos. No pegar credenciales en GitHub ni en chats.
2. Crear políticas SELECT/INSERT/UPDATE tenant-scoped para todas las tablas POS, evaluadas por identidad confiable. Probar con **dos comercios diferentes** usando el rol restringido; evitar confiar únicamente en `merchant_id` proporcionado por cliente.
3. Rate limiting de login y protección frente a fuerza bruta con persistencia en servidor antes de exponer Preview a internet.
4. Sólo entonces configurar `POS_QA_DATABASE_URL`, `POS_QA_DATABASE_HOST`, `POS_QA_SESSION_SECRET`, `POS_QA_USERS_JSON` y `POS_QA_ENABLED` en Vercel Preview en el ámbito exacto de la rama.
5. Probar navegador→API→Neon QA, reintento idempotente, identidad del operador, aislamiento y desconexión.
6. Autorización bancaria Evertec/ATH Business separada; no hay transacciones reales, terminales ni recibos fiscales.

## Comprobaciones hechas

- La rama Neon QA sigue separada de producción.
- No se modificaron variables de entorno en Vercel.
- La creación del rol devolvió BYPASSRLS y el intento de revocarlo se rechazó.
- El bloqueo de seguridad fue incorporado al código de la rama experimental.

**No fusionar el PR hasta que se cierre este bloqueador y se ejecuten pruebas reales con rol no privilegiado.**
