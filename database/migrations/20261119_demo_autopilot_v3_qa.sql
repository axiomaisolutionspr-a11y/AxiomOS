-- DEMO comercial v3 — SOLO base QA `axiomai_demo_comercial_qa` (rama Neon qa-whatsapp-delivery-cert-20261116).
-- Nunca aplicar en neondb ni en producción. No modifica demo_leads.

BEGIN;

-- Operaciones internas del Autopilot por prospecto: responsable, seguimiento y transferencia.
CREATE TABLE IF NOT EXISTS public.demo_lead_ops (
  lead_id uuid PRIMARY KEY REFERENCES public.demo_leads(id) ON DELETE CASCADE,
  seller_id text CHECK (seller_id IN ('s1','s2','s3')),
  followup_due timestamptz,
  handoff_seller text CHECK (handoff_seller IN ('s1','s2','s3')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bitácora de auditoría: solo se agregan filas. El rol de la app no puede editar ni borrar.
CREATE TABLE IF NOT EXISTS public.demo_autopilot_events (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.demo_leads(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  action_key text NOT NULL CHECK (char_length(action_key) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('clasificar','crear_oportunidad','asignar_vendedor','programar_seguimiento',
    'borrador_respuesta','transferir_humano','avanzar_etapa','enviar_mensaje','confirmar_cita','cobrar')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  detail text NOT NULL CHECK (char_length(detail) <= 700),
  outcome text NOT NULL CHECK (outcome IN ('ejecutada','aprobada','descartada','bloqueada','error')),
  actor text NOT NULL CHECK (actor IN ('Axira','Persona'))
);
-- Idempotencia: una misma acción no se puede resolver dos veces (los errores sí se pueden reintentar).
CREATE UNIQUE INDEX IF NOT EXISTS demo_autopilot_events_once
  ON public.demo_autopilot_events (action_key) WHERE outcome <> 'error';
CREATE INDEX IF NOT EXISTS demo_autopilot_events_at ON public.demo_autopilot_events (at DESC);

GRANT SELECT, INSERT, UPDATE ON public.demo_lead_ops TO axiomai_demo_qa_writer;
GRANT SELECT, INSERT ON public.demo_autopilot_events TO axiomai_demo_qa_writer;
-- Los privilegios por defecto de la base otorgan UPDATE/DELETE en tablas nuevas: se retiran de forma explícita.
REVOKE UPDATE, DELETE, TRUNCATE ON public.demo_autopilot_events FROM axiomai_demo_qa_writer;
REVOKE DELETE, TRUNCATE ON public.demo_lead_ops FROM axiomai_demo_qa_writer;

-- Tope diario de llamadas a la IA del DEMO (control de costo).
CREATE TABLE IF NOT EXISTS public.demo_ai_usage (
  day date PRIMARY KEY,
  calls integer NOT NULL DEFAULT 0 CHECK (calls >= 0)
);
GRANT SELECT, INSERT, UPDATE ON public.demo_ai_usage TO axiomai_demo_qa_writer;
REVOKE DELETE, TRUNCATE ON public.demo_ai_usage FROM axiomai_demo_qa_writer;

COMMIT;
