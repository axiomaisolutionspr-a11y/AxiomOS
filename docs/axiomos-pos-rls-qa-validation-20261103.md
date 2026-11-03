# Seguridad POS: resolución investigada y validada en Neon QA (2026-11-03)

## Hallazgo técnico

Los roles creados desde Neon Console/API pueden recibir membresía `neon_superuser` y `BYPASSRLS`. El rol `pos_qa_runtime` generado por API resultó `rolbypassrls=true` y la cuenta no podía hacer `ALTER ROLE ... NOBYPASSRLS`.

La documentación de Neon recomienda crear un usuario SQL para la aplicación. Se creó en **rama QA exclusivamente**:

`CREATE ROLE pos_qa_rls_test NOLOGIN NOBYPASSRLS NOINHERIT;`

Verificado: `rolbypassrls=false`, `rolsuper=false`, `rolcreaterole=false`, `rolcanlogin=false`.

## Prueba de RLS en QA

Migración: `database/migrations/20261103_pos_rls_read_pilot_qa_only.sql` (9 sentencias aplicadas).

- Se concedieron exclusivamente privilegios de lectura a `pos_qa_rls_test` sobre siete tablas POS; sin permisos de escritura.
- Se incorporaron siete políticas SELECT por comercio basadas en `current_setting('axiomos.merchant_id', true)`.
- Se autorizó a la cuenta propietaria **sólo en QA** para ejecutar `SET LOCAL ROLE pos_qa_rls_test` al ensayar las restricciones. La sesión de prueba cambia su rol efectivo para que la consulta esté sujeta a RLS; no usar el rol propietario como runtime de la aplicación.
- Consulta sin contexto de comercio: **0** artículos visibles.
- Comercio A (`QA test order and stock`): **1** artículo visible.
- Comercio B (`QA other merchant`): **0** artículos visibles.
- Estos resultados se obtuvieron con `SET LOCAL ROLE` dentro de transacciones, no con el usuario del futuro Preview.

## Estado y limitaciones

**Solo política SELECT de demostración; no es seguridad completa del SaaS ni test de login remoto.**

1. No se creó usuario LOGIN de runtime con contraseña segura en consola. No hay variables POS QA en Vercel; la pantalla permanece desactivada.
2. Las políticas INSERT/UPDATE, autorización por operador, auditoría, gestión de sesiones y comprobaciones de dos comercios con productos en ambos deben completarse y probarse con usuario LOGIN sin BYPASSRLS.
3. Hay riesgo de falsificación de `axiomos.merchant_id` si el usuario tiene acceso SQL arbitrario. La aplicación debe derivar el comercio de autenticación confiable y aplicar el contexto mediante transacción atómica; no recibir el contexto desde el navegador.
4. Por ahora el motor de caja simulada opera únicamente con propietario QA y comprobaciones de IDs. No habilitar para clientes.
5. No se modificó Neon principal ni se fusionó código en GitHub `main`. El snapshot `CRM-PROD-PRE-POS-2026-11-03` permanece como referencia de recuperación.

## Fuentes verificadas

- Neon: https://neon.com/docs/manage/roles
- Neon, acceso a bases: https://neon.com/docs/manage/database-access
- PostgreSQL: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Neon serverless driver: https://neon.com/docs/serverless/serverless-driver

## Siguientes tareas para autorización Preview

Crear cuenta LOGIN de mínimo privilegio mediante SQL, verificar su cadena en la rama QA sin compartir secretos, probar políticas SELECT/INSERT/UPDATE con transacciones y dos tenants, implementar rate limiting y luego configurar variables exclusivamente por rama de Preview.

Mantener el sistema de cobro real, los recibos fiscales y la fusión de ramas desactivados hasta validación y aprobación separadas.
