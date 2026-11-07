# AxiomOS Autopilot — núcleo autónomo QA (fase 1)
Este cambio NO modifica producción, claves, tokens, panel, datos de clientes ni bases existentes.
- El núcleo solo admite eventos marcados `verified:true`, `simulated:true`, `tenantId:axiomai-qa` y contactos `qa:`.
- Clasifica interés comercial, urgencia y atención humana; prepara tareas que requieren aprobación.
- No envía WhatsApp, SMS, llamadas, correos, precios o cotizaciones.
- `processSyntheticInbound` exige un adaptador transaccional con idempotencia y recibo persistente; **todavía no se conecta a Neon**.
- Las pruebas son unitarias, no una prueba integral HTTP/Neon/CRM.
- Antes de operar con datos reales: integrar identificaciones de eventos verificadas por proveedor, tenantId real con RLS, consentimiento, asignaciones, un almacén transaccional de eventos+prospectos+tareas+auditoría, revocación y prueba E2E.
- Ejecutar `node --test tests/axiomos-autopilot-core.test.mjs` para probar la lógica.
