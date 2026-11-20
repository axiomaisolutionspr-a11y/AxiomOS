-- SOLO QA. Precios aprobados por la dirección el 20-nov-2026 (propuesta "Precios AxiomOS — propuesta 2026").
-- Requiere la migración 20261119_axiomos_catalog_v2.sql y el seed QA 20261119.
-- No aplicar en producción sin autorización. Idempotente: se puede correr más de una vez.
--
-- Cambios:
--  * Minutos de teléfono (call_minutes) y minutos de Axira por voz (axira_voice_minutes) se separan.
--  * Plan Gratis (sin número ni llamadas), Básico (axiomos-autopilot v2) y Pro.
--  * Complementos con precio fijo y Brain (asistente del dueño) como límite de preguntas.
--  * Precios sin IVU. Ningún límite tiene control técnico todavía (ver LIMIT_ENFORCEMENT).
BEGIN;
SELECT set_config('axiomos.tenant_id', 'axiomai', true);

INSERT INTO axiomos_commercial.catalog_items
  (tenant_id, item_key, version, kind, name, summary, category, pricing_mode, billing_period, regular_cents,
   promo_cents, promo_months, users_included, limits, benefits, restrictions, status, change_reason, created_by)
VALUES
  ('axiomai', 'axiomos-gratis', 1, 'plan', 'AxiomOS Gratis',
   'Descarga gratis: CRM y bandeja de WhatsApp, Instagram y Messenger, sin número ni llamadas.', 'Planes', 'fixed', 'month', 0,
   NULL, NULL, 2, '{"call_minutes": 0, "axira_voice_minutes": 0, "axira_responses": 50, "brain_questions": 20}'::jsonb,
   ARRAY['Dos usuarios', 'CRM, contactos y embudo de ventas', 'Bandeja de WhatsApp, Instagram y Messenger',
     'Hasta 50 respuestas de Axira al mes', 'Hasta 20 preguntas a Brain al mes', 'App móvil'],
   ARRAY['No incluye número telefónico ni llamadas; para llamar hay que pasar al plan Básico'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'axiomos-autopilot', 2, 'plan', 'AxiomOS Básico',
   'CRM autónomo con número telefónico y Axira atendiendo llamadas y mensajes.', 'Planes', 'fixed', 'month', 1795,
   999, 3, 2, '{"call_minutes": 200, "axira_voice_minutes": 50, "axira_responses": 500, "brain_questions": 100}'::jsonb,
   ARRAY['Dos usuarios', 'Un número local', '200 minutos de teléfono', '50 minutos de Axira contestando llamadas',
     'Hasta 500 respuestas de Axira al mes', 'Hasta 100 preguntas a Brain al mes',
     'WhatsApp, Instagram, Messenger y llamadas en una interfaz', 'Detección de clientes sin seguimiento',
     'Transferencias al vendedor con resumen del cliente', 'Control de acciones autónomas con aprobación humana'],
   ARRAY['Precio sin IVU'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA): separa minutos de teléfono y de Axira por voz', 'qa-precios-20261120'),
  ('axiomai', 'axiomos-pro', 1, 'plan', 'AxiomOS Pro',
   'Más usuarios, minutos y respuestas para negocios con más volumen.', 'Planes', 'fixed', 'month', 2999,
   NULL, NULL, 3, '{"call_minutes": 500, "axira_voice_minutes": 150, "axira_responses": 1500, "brain_questions": 500}'::jsonb,
   ARRAY['Tres usuarios', 'Un número local', '500 minutos de teléfono', '150 minutos de Axira contestando llamadas',
     'Hasta 1,500 respuestas de Axira al mes', 'Hasta 500 preguntas a Brain al mes', 'Todo lo del plan Básico'],
   ARRAY['Precio sin IVU'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'usuario-adicional', 1, 'service', 'Usuario adicional', 'Un usuario más en tu cuenta.', 'Complementos',
   'fixed', 'month', 499, NULL, NULL, 1, '{}'::jsonb, '{}', ARRAY['Requiere plan Gratis, Básico o Pro'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'numero-adicional', 1, 'service', 'Número local adicional', 'Otro número local para tu negocio.', 'Complementos',
   'fixed', 'month', 299, NULL, NULL, NULL, '{}'::jsonb, '{}', ARRAY['Requiere plan Básico o Pro', 'Sujeto a disponibilidad de números'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'paquete-minutos-telefono', 1, 'service', 'Paquete de 500 minutos de teléfono', '500 minutos de teléfono adicionales al mes.', 'Complementos',
   'fixed', 'month', 799, NULL, NULL, NULL, '{"call_minutes": 500}'::jsonb, '{}', ARRAY['Requiere plan Básico o Pro'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'paquete-axira-voz', 1, 'service', 'Paquete de 100 minutos de Axira por voz', '100 minutos adicionales de Axira contestando llamadas.', 'Complementos',
   'fixed', 'month', 899, NULL, NULL, NULL, '{"axira_voice_minutes": 100}'::jsonb, '{}', ARRAY['Requiere plan Básico o Pro'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'paquete-respuestas-axira', 1, 'service', 'Paquete de 1,000 respuestas de Axira', '1,000 respuestas adicionales de Axira al mes.', 'Complementos',
   'fixed', 'month', 699, NULL, NULL, NULL, '{"axira_responses": 1000}'::jsonb, '{}', '{}',
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'paquete-preguntas-brain', 1, 'service', 'Paquete de 1,000 preguntas a Brain', '1,000 preguntas adicionales a Brain, tu asistente de negocio, al mes.', 'Complementos',
   'fixed', 'month', 499, NULL, NULL, NULL, '{"brain_questions": 1000}'::jsonb, '{}', '{}',
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'sms-10dlc', 1, 'service', 'Mensajes de texto SMS', '300 mensajes SMS al mes desde tu número registrado.', 'Complementos',
   'fixed', 'month', 1299, NULL, NULL, NULL, '{}'::jsonb, '{}', ARRAY['Requiere plan Básico o Pro', 'Requiere el registro de SMS (pago único)'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'registro-sms-10dlc', 1, 'service', 'Registro de SMS (10DLC)', 'Registro de tu negocio con las compañías telefónicas para enviar SMS.', 'Complementos',
   'fixed', 'one_time', 1950, NULL, NULL, NULL, '{}'::jsonb, '{}', ARRAY['Pago único; es el costo que cobran las compañías telefónicas'],
   'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120')
ON CONFLICT (tenant_id, item_key, version) DO NOTHING;

INSERT INTO axiomos_commercial.knowledge_entries (tenant_id, entry_key, version, topic, language, title, answer, keywords, status, change_reason, created_by)
VALUES
  ('axiomai', 'precios-impuestos', 1, 'terms', 'es', 'Los precios no incluyen IVU',
   'Los precios de AxiomOS no incluyen el IVU de Puerto Rico; el impuesto se añade en la factura.',
   ARRAY['ivu', 'impuesto', 'impuestos', 'factura', 'tax'], 'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'plan-gratis-llamadas', 1, 'faq', 'es', 'El plan Gratis no incluye llamadas',
   'La app se descarga gratis e incluye el CRM y la bandeja de WhatsApp, Instagram y Messenger. Para tener número telefónico y llamadas hay que pasar al plan Básico.',
   ARRAY['gratis', 'descargar', 'llamadas', 'numero', 'telefono', 'free'], 'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'excesos-uso', 1, 'terms', 'es', 'Uso por encima de lo incluido',
   'Si un negocio usa más de lo incluido en su plan sin paquete adicional: $0.02 por minuto de teléfono, $0.10 por minuto de Axira por voz y $0.01 por respuesta de Axira.',
   ARRAY['exceso', 'excedo', 'adicional', 'pasarme', 'limite', 'minutos', 'respuestas'], 'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'pago-anual', 1, 'terms', 'es', 'Pago anual',
   'Con pago anual el negocio recibe 2 meses gratis: Básico $179.50 al año y Pro $299.90 al año, sin IVU.',
   ARRAY['anual', 'año', 'descuento', 'yearly'], 'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120'),
  ('axiomai', 'brain-vs-axira', 1, 'product', 'es', 'Diferencia entre Axira y Brain',
   'Axira atiende a los clientes del negocio por llamadas, WhatsApp, Instagram y Messenger. Brain es el asistente del dueño dentro de la app: responde preguntas sobre su propio negocio usando los datos de su CRM.',
   ARRAY['brain', 'asistente', 'preguntas', 'diferencia', 'axira'], 'draft', 'Precios aprobados por la dirección 20-nov-2026 (QA)', 'qa-precios-20261120')
ON CONFLICT (tenant_id, entry_key, version) DO NOTHING;

-- La v1 de axiomos-autopilot (200 "minutos de llamadas" sin separar) deja de estar publicada.
INSERT INTO axiomos_commercial.catalog_audit (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
SELECT tenant_id, 'item', item_key, version, 'archive', 'published', 'archived', 'qa-precios-20261120',
  'Reemplazada por v2: minutos de teléfono y de Axira por voz separados', to_jsonb(t) - 'id'
FROM axiomos_commercial.catalog_items t
WHERE tenant_id = 'axiomai' AND item_key = 'axiomos-autopilot' AND version = 1 AND status = 'published';
UPDATE axiomos_commercial.catalog_items SET status = 'archived', archived_by = 'qa-precios-20261120', archived_at = now()
  WHERE tenant_id = 'axiomai' AND item_key = 'axiomos-autopilot' AND version = 1 AND status = 'published';

UPDATE axiomos_commercial.catalog_items SET status = 'approved', approved_by = 'qa-precios-20261120', approved_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-precios-20261120' AND status = 'draft';
UPDATE axiomos_commercial.knowledge_entries SET status = 'approved', approved_by = 'qa-precios-20261120', approved_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-precios-20261120' AND status = 'draft';

INSERT INTO axiomos_commercial.catalog_audit (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
SELECT tenant_id, 'item', item_key, version, 'publish', 'approved', 'published', 'qa-precios-20261120', 'Precios 20-nov-2026 (QA)', to_jsonb(t) - 'id'
FROM axiomos_commercial.catalog_items t WHERE created_by = 'qa-precios-20261120' AND status = 'approved'
UNION ALL
SELECT tenant_id, 'knowledge', entry_key, version, 'publish', 'approved', 'published', 'qa-precios-20261120', 'Precios 20-nov-2026 (QA)', to_jsonb(t) - 'id'
FROM axiomos_commercial.knowledge_entries t WHERE created_by = 'qa-precios-20261120' AND status = 'approved';

UPDATE axiomos_commercial.catalog_items SET status = 'published', published_by = 'qa-precios-20261120', published_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-precios-20261120' AND status = 'approved';
UPDATE axiomos_commercial.knowledge_entries SET status = 'published', published_by = 'qa-precios-20261120', published_at = now()
  WHERE tenant_id = 'axiomai' AND created_by = 'qa-precios-20261120' AND status = 'approved';
COMMIT;
