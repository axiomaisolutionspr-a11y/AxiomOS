# AxiomAI POS — Certificación interna de autenticación: evaluación y pendientes
Fecha: 3 noviembre 2026. Estado: NO CERTIFICADO AÚN, NO habilitar producción ni procesar tarjetas.

## Qué se investigó
- Vercel: build/runtime env scoping, preview deployments, sandbox variables y deploy protection. Los sandboxes no heredan automáticamente secrets de Preview. En un intento de build con test runner, `POS_QA_DATABASE_URL` no estaba disponible: el build falló y se revirtió el buildCommand. No convertir Preview en fuente de secretos mediante logs o rutas públicas.
- Neon: rol SQL mínimo privilegio sin BYPASSRLS, protección RLS por comercio, transacciones que fijan tenant en el mismo contexto y sesiones revocables almacenando hash.
- OWASP: invalidación de sesiones en backend, atributos HttpOnly/Secure/SameSite, defensa CSRF, limitación de contraseñas e intentos, expiración y prueba de replay.
- PCI DSS: la autenticación del CRM/POS no es certificación bancaria ni cumplimiento PCI; el adquirente debe certificar el conector y control de información de tarjetas. No almacenar PAN/CVV.

## Validaciones ejecutadas y aprobadas
- Neon QA: rol sin BYPASSRLS, aislamiento SELECT por comercio bajo rol restringido; se logró crear borrador e impedir repetición y acceso fuera de tenant.
- Neon QA: sesión persistida, consultada como activa, revocada, después consultada como inactiva. No es lo mismo que verificar una cookie por HTTP.
- Next.js: compilación, TypeScript, ESLint del módulo de autenticación y sintaxis de tests/pos-http-e2e.mjs aprobaron en sandbox sobre rama actual.
- Rutas no autenticadas: GET sesión/catalog/orders=401; POST/DELETE sin cabecera Origin=403 en pruebas HTTP previas.
- Corrección adicional: la comprobación de sesión en API de órdenes ahora devuelve rechazo si Neon falla, evitando fuga de error de controlador.

## Bloqueo concreto
**NO existe evidencia de haber completado** HTTP E2E: login válido -> emitir cookie -> catálogo -> crear borrador -> logout -> reusar cookie y recibir 401, ni seis intentos HTTP consecutivos -> 429.
La transferencia de secretos a Sandbox fue bloqueada por los controles de la plataforma. Un Preview build tampoco recibió POS_QA_DATABASE_URL. No violar esas protecciones.

## Criterios necesarios para declarar certificación interna
1. Runner protegido, ejecutado en runtime QA con secretos inyectados por Vercel, nunca copiados a código o logs; elegir rama y entorno expresos, sin tráfico de cobros reales.
2. E2E con usuario de prueba y DB QA aislada, incluyendo 401, 403 CSRF, 200, 201, 429, cookies Secure/HttpOnly/SameSite, revocación inmediata, replay 401, usuario deshabilitado, renovación de sesiones y separación de dos comercios.
3. Pruebas de repetición concurrente de orden, inventario y transacciones simultáneas, rollback y fail-closed cuando BD no responda.
4. Revisión formal antes de habilitar Preview o main. La suite, por diseño, no genera pagos externos.
5. Aprobación de adquirente para conectar ATH Business, Evertec Link o un terminal: acuerdo de integración, credenciales del comercio y certificación/sandbox aplicables; nunca marcar pago confirmado por una notificación no verificada.

Referencias oficiales:
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/vercel-sandbox
- https://neon.com/docs/manage/roles
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://www.pcisecuritystandards.org/

El CRM productivo, el respaldo snap-restless-leaf-av4bp0og y los pagos reales permanecen intactos. Esta auditoría es interna, no una certificación externa.