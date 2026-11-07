# AxiomOS Autopilot QA — persistencia aislada
- Rama Neon: `axiomos-autopilot-storage-qa-20261107` (`br-little-wildflower-avzintxi`), hija de rama QA de identidad. DB `axiomos_offers_qa`.
- Migración aditiva: `database/migrations/20261107_axiomos_autopilot_storage_qa.sql`; aplicada solo a esta rama. Cuatro tablas: events, prospects, tasks, audit.
- El procedimiento `ingest_synthetic` registra eventos validados, prospectos, tarea pendiente y auditoría **atómicamente**. `ON CONFLICT` garantiza idempotencia por tenant/canal/eventId.
- Evidencia real Neon: primera inserción `inserted=true`; repetición `inserted=false`; recuentos 1 evento, 1 prospecto, 1 tarea, 1 auditoría.
- No hay permisos nuevos para roles de aplicación. El esquema y la función revocan acceso PUBLIC. Solo pruebas administrativas sintéticas.
- El adaptador solo usa un cliente SQL inyectado: **no** contiene credenciales, conexión a producción ni endpoint. Aún no está configurado en Vercel.
- Las etiquetas `verified:true` son exclusivamente una marca del harness sintético; **no** constituyen verificación criptográfica de firmas de Meta/Telnyx.
- Faltan E2E autenticado, RLS multiempresa, revocación, integración al panel y validación real de eventos; no usar con clientes.
