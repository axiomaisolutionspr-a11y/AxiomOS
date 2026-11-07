# AxiomOS Autopilot — seguridad de lectura QA (2026-11-07)

En rama Neon hija `br-little-wildflower-avzintxi` (DB `axiomos_offers_qa`) se habilitó RLS para `events`, `prospects`, `tasks` y `audit` con política SELECT restringida al tenant ficticio `axiomai-qa`.

Se creó mediante Neon un rol nuevo **solo lectura**, `axiomos_autopilot_qa_panel_reader`, limitado al esquema `axiomos_autopilot_qa`. No se cambiaron claves ni tokens de otros roles.

Verificaciones reales:
- SELECT de eventos y tareas: permitido, 1 fila de cada tabla.
- INSERT del lector: rechazado SQLSTATE 42501.
- SELECT de `neon_auth.user`: rechazado SQLSTATE 42501.
- Sin privilegios INSERT ni UPDATE, ni USAGE en esquemas `neon_auth` o `axiomos_identity`.
- Filtro `tenant_id <> 'axiomai-qa'`: 0 registros.
- CI PR #76 y #77 aprobados. No es una certificación E2E en navegador.

Limitaciones importantes:
1. La política RLS fija a un solo tenant sintético. **No sustituye** RLS multiempresa basada en identidad.
2. El lector existe en Neon, pero el nuevo panel no está conectado ni desplegado hasta configurar sus variables Preview y verificar entorno.
3. No se han probado permisos de escritura con la sesión auténtica de Alex ni revocación.
4. Nunca conectar tablas reales de clientes ni proveedores externos hasta superar esos controles.

Para evitar deriva, el SQL adjunto documenta la política aplicada, con comprobación de base y creación idempotente.
