-- SOLO QA. Catálogo comercial de AxiomAI Solutions (datos suministrados por la dirección, 19-nov-2026).
-- No aplicar en producción sin autorización. Se publica únicamente dentro de la rama Neon de QA.
BEGIN;
SELECT set_config('axiomos.tenant_id', 'axiomai', true);
INSERT INTO axiomos_commercial.catalog_items
  (tenant_id, item_key, version, kind, name, summary, category, pricing_mode, billing_period, regular_cents,
   promo_cents, promo_months, users_included, limits, benefits, restrictions, status, change_reason, created_by)
VALUES
  ('axiomai', 'axiomos-autopilot', 1, 'plan', 'AxiomOS Autopilot',
   'CRM autónomo con Axira para organizar, priorizar y dar seguimiento a tus clientes.', 'CRM', 'fixed', 'month', 1795,
   999, 3, 2, '{"call_minutes": 200, "axira_responses": 500}'::jsonb,
   ARRAY['Dos usuarios', '200 minutos de llamadas', 'Axira incluida con hasta 500 respuestas mensuales',
     'WhatsApp y llamadas en una interfaz unificada', 'Administración y priorización de prospectos',
     'Detección de clientes sin seguimiento', 'Transferencias al vendedor con resumen del cliente',
     'Control de las acciones autónomas y aprobaciones humanas', 'Panel de ventas', 'Historial de actividades y acciones'],
   ARRAY[]::text[], 'draft', 'Oferta comercial suministrada por la dirección (QA)', 'qa-seed'),
  ('axiomai', 'recepcionista-ia', 1, 'service', 'Recepcionista de IA', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'automatizacion-messenger-instagram', 1, 'service', 'Automatización de Messenger e Instagram', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'campanas-whatsapp', 1, 'service', 'Campañas de WhatsApp', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'automatizacion-procesos', 1, 'service', 'Automatización de procesos y seguimientos', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'integraciones-empresariales', 1, 'service', 'Integraciones empresariales', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'software-personalizado', 1, 'service', 'Software personalizado', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'axiomai-robotics', 1, 'service', 'AxiomAI Robotics', '', 'Servicios adicionales', 'quote', NULL, NULL, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed'),
  ('axiomai', 'diagnostico-brain', 1, 'service', 'Diagnóstico inicial AxiomOS Brain', 'Diagnóstico inicial gratuito de tu negocio.', 'Servicios adicionales', 'fixed', 'one_time', 0, NULL, NULL, NULL, '{}', '{}', '{}', 'draft', 'Servicio adicional (QA)', 'qa-seed')
ON CONFLICT (tenant_id, item_key, version) DO NOTHING;

INSERT INTO axiomos_commercial.knowledge_entries (tenant_id, entry_key, version, topic, language, title, answer, keywords, status, change_reason, created_by)
VALUES
  ('axiomai', 'empresa-mercado-idiomas', 1, 'company', 'es', 'Sobre AxiomAI Solutions',
   'AxiomAI Solutions LLC atiende principalmente a negocios de Puerto Rico. La atención es en español y también podemos responder en inglés.',
   ARRAY['empresa', 'puerto rico', 'ingles', 'idioma', 'quienes', 'ubicados'], 'draft', 'Información suministrada por la dirección (QA)', 'qa-seed'),
  ('axiomai', 'servicios-cotizacion', 1, 'terms', 'es', 'Servicios adicionales se cotizan aparte',
   'Los servicios adicionales (Recepcionista de IA, automatización de Messenger e Instagram, campañas de WhatsApp, automatización de procesos, integraciones, software personalizado y AxiomAI Robotics) se cotizan individualmente según las necesidades del negocio.',
   ARRAY['cotizacion', 'cotizar', 'servicios', 'adicionales', 'robotica', 'integraciones', 'recepcionista'], 'draft', 'Información suministrada por la dirección (QA)', 'qa-seed'),
  ('axiomai', 'transferir-asesor', 1, 'handoff', 'es', 'Cuándo transferir a un asesor',
   'Si el cliente pide hablar con una persona, quiere una cotización personalizada o pregunta por condiciones que no están aprobadas, ofrece transferirlo a un asesor de AxiomAI Solutions con un resumen de la conversación.',
   ARRAY['persona', 'asesor', 'humano', 'vendedor', 'cotizacion'], 'draft', 'Regla operativa (QA)', 'qa-seed')
ON CONFLICT (tenant_id, entry_key, version) DO NOTHING;

UPDATE axiomos_commercial.catalog_items SET status = 'approved', approved_by = 'qa-seed', approved_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-seed' AND status = 'draft';
UPDATE axiomos_commercial.catalog_items SET status = 'published', published_by = 'qa-seed', published_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-seed' AND status = 'approved';
UPDATE axiomos_commercial.knowledge_entries SET status = 'approved', approved_by = 'qa-seed', approved_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-seed' AND status = 'draft';
UPDATE axiomos_commercial.knowledge_entries SET status = 'published', published_by = 'qa-seed', published_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-seed' AND status = 'approved';
INSERT INTO axiomos_commercial.catalog_audit (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
SELECT tenant_id, 'item', item_key, version, 'publish', 'approved', 'published', 'qa-seed', 'Carga inicial QA', to_jsonb(t) - 'id'
FROM axiomos_commercial.catalog_items t WHERE created_by = 'qa-seed'
UNION ALL
SELECT tenant_id, 'knowledge', entry_key, version, 'publish', 'approved', 'published', 'qa-seed', 'Carga inicial QA', to_jsonb(t) - 'id'
FROM axiomos_commercial.knowledge_entries t WHERE created_by = 'qa-seed';
COMMIT;
