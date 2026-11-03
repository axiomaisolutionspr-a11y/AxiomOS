# AxiomOS POS QA — revisión de E2E y bloqueo de inyección de credenciales (2026-11-03)

Se revisó documentación de Vercel Sandbox y recomendaciones de OWASP sobre invalidación de sesiones.
Se añadió tests/pos-http-e2e.mjs para ejecutar un recorrido real sobre Next.js build: login inválido, origen CSRF, login válido, cookie segura, catálogo, borrador, idempotencia, lista, logout, reuso denegado y límite 429. La suite NO es una prueba ejecutada con éxito: se validó compilación y sintaxis.

Entorno adicional seguro: Neon branch pos-http-e2e-qa-20261103 (br-aged-rice-avymo2s8), descendiente exclusivamente de QA. Verificado en esa rama: rol SQL pos_qa_app_login con BYPASSRLS=false y SUPERUSER=false, y tabla pos_qa_sessions existente.

Vercel sandbox aislado creado y proyecto compilado sin errores. node --check del script pasó y ESLint pasó. El intento de pasar POS_QA_DATABASE_URL de Neon al comando sandbox fue bloqueado por los controles de seguridad de herramientas. No se eludió esa restricción ni se expusieron claves.

**Pendiente y NO VALIDADO:** ejecución E2E autenticada con acceso a la BD. Se requiere un mecanismo aprobado por la plataforma para inyectar exclusivamente el secreto de la nueva rama QA al sandbox, o ejecutar la suite con un operador autorizado desde Vercel Preview usando variables de ese ambiente. Hasta entonces no afirmar que login, cookie, logout o bloqueo de 6 intentos HTTP funcionan de punta a punta.

PR mantiene estado draft. No se usaron pagos bancarios ni se cambió producción. Snapshot previo CRM: snap-restless-leaf-av4bp0og.