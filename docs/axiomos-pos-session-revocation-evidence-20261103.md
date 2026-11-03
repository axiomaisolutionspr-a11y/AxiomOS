# POS QA — Validación de sesiones revocables (3 nov 2026)

Base: Neon QA pos-location-integrity-qa-20261103; no se modificó producción.

## Implementado
- Migración pos_qa_sessions: hash SHA-256 de cookie, comercio y operador, expiración y revocación; RLS de lectura/escritura por tenant.
- Login guarda una sesión activa en Neon antes de entregar cookie; cada sesión incorpora nonce aleatorio.
- GET sesión, catálogo y órdenes verifican cookie firmada y sesión activa no revocada en Neon, además de operador habilitado.
- Logout marca revoked_at en Neon antes de eliminar cookie. Si la BD no responde, retorna error, no anuncia logout exitoso.
- Las consultas tenant-scoped usan el contexto del comercio en la misma transacción.

## Pruebas realmente realizadas
- Migración aplicada: 7 sentencias SQL sobre Neon QA.
- Bajo rol SQL pos_qa_app_login sin BYPASSRLS: insertar sesión de prueba permitido; consulta activa=1; UPDATE de revocación permitido; consulta posterior activa=0.
- Next.js build + TypeScript: PASS en Vercel Sandbox tras corregir rutas asíncronas.

## Aún no demostrado
- E2E HTTP completo login→cookie→catálogo→crear pedido→logout→reutilización de cookie. El sandbox creado para compilar no tiene variables POS QA y no se copiaron secretos del entorno de Vercel. No afirmar que pasó.
- Pruebas de expiración, doble sesión y concurrencia entre servidores pendientes.
- Protección de login por nombre de usuario existente: funcionalmente implementada, pero requiere defensa adicional por origen/volumen, limpieza de buckets y análisis de bloqueo malicioso antes de apertura pública.

## Seguridad y despliegue
El POS sigue desactivado en Preview mediante POS_QA_ENABLED=false. No hay claves bancarias ni procesador real. PR draft hacia rama QA, no main. Snapshot de CRM previo: snap-restless-leaf-av4bp0og.

Referencias: OWASP Session Management Cheat Sheet; PostgreSQL Row Security; Neon Serverless Driver.