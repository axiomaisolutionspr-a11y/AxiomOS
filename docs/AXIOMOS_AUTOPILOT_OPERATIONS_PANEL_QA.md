# AxiomOS Autopilot — panel protegido de operaciones sintéticas (QA)

Alcance: lectura únicamente. No cambia secretos, permisos, credenciales, ni despliegues de Vercel. Producción sigue igual.

## Ruta
`/prospectos/autopilot/operaciones` — requiere Neon Auth y membresía activa en QA. Acceso de lectura para owner/operator/viewer; sin escritura ni botones que ejecuten acciones.

## Datos
Neon aislado: rama `br-little-wildflower-avzintxi`, base `axiomos_offers_qa`, esquema `axiomos_autopilot_qa`. Consultas limitadas al tenant sintético `axiomai-qa`. Panel: conteos, prospectos ficticios, tareas pendientes y eventos auditados.

El panel **no está conectado todavía**: lector SQL dedicado sin credenciales provisionadas. Si no está habilitado, no muestra datos de prueba inventados.

Para futura habilitación, requiere un **rol PostgreSQL dedicado de solo SELECT**, sin acceso a `neon_auth`, `axiomos_identity`, `public`, ni tablas comerciales. El administrador revisará el alcance y configurará por canal seguro las tres variables Preview del proyecto QA, sin copiar secretos a GitHub:
- `AXIOMOS_AUTOPILOT_PANEL_QA_ENABLED=true`
- `AXIOMOS_AUTOPILOT_PANEL_QA_READ_URL` (usuario esperado: `axiomos_autopilot_qa_panel_reader`)
- `AXIOMOS_AUTOPILOT_PANEL_QA_HOST` (host exclusivo de la rama hija)

El validador rechaza producción, host distinto, usuario distinto, base incorrecta, ausencia de contraseña y host compartido con identidad o producción.

## Verificación
Se agregaron 3 pruebas unitarias de fail-closed, roles y proyección; CI ejecuta además núcleo y adaptador de almacenamiento. En este PR se mantiene inhabilitado el autodespliegue de las tres ramas de Autopilot.

Pendientes: completar autorización del rol lector, despliegue **manual** Preview después de aprobar el acceso, pruebas HTTP de Rolando y Alex (no reutilizar sus cookies), cierre/revocación, RLS multiempresa, verificación de firmas/webhooks, navegación móvil y E2E real con tareas sintéticas. No declarar el panel listo para usuarios hasta completar esas pruebas.
