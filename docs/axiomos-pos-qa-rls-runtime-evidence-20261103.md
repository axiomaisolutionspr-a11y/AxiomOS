# POS QA — permisos de escritura y transacciones seguras (2026-11-03)

Rama aislada de Neon: `pos-location-integrity-qa-20261103`. Producción no modificada. Snapshot pre-POS: `snap-restless-leaf-av4bp0og`.

## Aplicado en QA
- Rol SQL LOGIN `pos_qa_app_login` con `BYPASSRLS=false`, `rolsuper=false`. No se estableció contraseña ni se publicó connection string.
- Rol de políticas SELECT `pos_qa_rls_test` heredado; privilegios explícitos INSERT/UPDATE para borradores, inventario QA y recibos simulados.
- RLS INSERT/UPDATE para órdenes y líneas, auditoría y tablas de inventario simuladas.
- Tabla `pos_qa_login_limiter` creada como infraestructura para rate limiting; **aún no conectada al login HTTP**, por lo que el servicio permanece apagado.
- Tres APIs POS QA modificadas para ejecutar `set_config('axiomos.merchant_id', ..., true)` **dentro de la misma transacción HTTP** que la consulta; evitar depender del contexto entre llamadas de conexión pooling.

## Resultados técnicos
- 25 instrucciones SQL de migración QA ejecutadas sin errores.
- Validación de rol: LOGIN true, BYPASSRLS false, SUPERUSER false.
- RLS con rol efectivo restringido: sin contexto 0 productos; comercio A 1 producto; comercio B 0 productos.
- Función `pos_qa_create_draft_order`: creación aprobada con rol restringido, identidad comercial en transacción.
- Compilación Next.js / TypeScript: aprobada.
- ESLint del módulo API QA: sin errores.

## Límites importantes
- La tabla de throttling NO está conectada a las rutas; no activar Preview hasta hacerla cumplir y verificar bloqueo de intentos.
- Las pruebas negativas de borradores en una consulta posterior fueron rechazadas, pero no son concluyentes para aislamiento porque su longitud de idempotency key también era inválida. **Pendiente:** repetir pruebas con claves válidas y datos A/B.
- La propiedad de seguridad del tenant depende del contexto confiable establecido por el servidor. Se requiere conexión real como rol no propietario, sin BYPASSRLS, y verificar RLS en todas las operaciones (incluidas auditoría, detalles y solicitudes de otra empresa).
- Las funciones de simulación en base de QA no son pagos reales ni comprobantes fiscales. No conectar el banco sin contrato y pruebas de proveedor.
- Vercel Preview **no configurado** con claves; la ruta se mantiene deshabilitada.

## Siguiente
Implementar rate limiting real (por usuario/IP), rotación de secreto de sesión y política de auditoría, crear credenciales de QA fuera de repositorios y configurar variables exclusivamente para la rama Preview. Después ejecutar E2E con dos comercios y probar reintentos y expiración. No fusionar en main sin aprobación separada.
