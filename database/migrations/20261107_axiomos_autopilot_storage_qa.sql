-- QA-only additive schema. Apply ONLY to a child Neon branch, database axiomos_offers_qa.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$ BEGIN
 IF current_database() <> 'axiomos_offers_qa' THEN RAISE EXCEPTION 'QA database required'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS axiomos_autopilot_qa;
CREATE TABLE IF NOT EXISTS axiomos_autopilot_qa.events (
 tenant_id text NOT NULL CHECK (tenant_id='axiomai-qa'),
 channel text NOT NULL CHECK (channel IN ('web','whatsapp','messenger','instagram','telnyx')),
 event_id text NOT NULL CHECK (event_id ~ '^[a-zA-Z0-9_-]{4,100}$'),
 contact_key text NOT NULL CHECK (contact_key ~ '^qa:[a-zA-Z0-9_-]{4,100}$'),
 verified boolean NOT NULL CHECK (verified = true),
 simulated boolean NOT NULL CHECK (simulated = true),
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,channel,event_id)
);
CREATE TABLE IF NOT EXISTS axiomos_autopilot_qa.prospects (
 tenant_id text NOT NULL CHECK (tenant_id='axiomai-qa'),
 contact_key text NOT NULL CHECK (contact_key ~ '^qa:[a-zA-Z0-9_-]{4,100}$'),
 first_seen timestamptz NOT NULL DEFAULT now(),
 last_seen timestamptz NOT NULL DEFAULT now(),
 events_seen int NOT NULL DEFAULT 1 CHECK (events_seen >= 1),
 PRIMARY KEY(tenant_id,contact_key)
);
CREATE TABLE IF NOT EXISTS axiomos_autopilot_qa.tasks (
 tenant_id text NOT NULL CHECK (tenant_id='axiomai-qa'),
 channel text NOT NULL,
 event_id text NOT NULL,
 contact_key text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('human_handoff','prepare_followup','review_inquiry')),
 priority text NOT NULL CHECK(priority IN ('normal','medium','high')),
 state text NOT NULL DEFAULT 'awaiting_approval' CHECK(state='awaiting_approval'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,channel,event_id),
 FOREIGN KEY(tenant_id,channel,event_id) REFERENCES axiomos_autopilot_qa.events(tenant_id,channel,event_id)
);
CREATE TABLE IF NOT EXISTS axiomos_autopilot_qa.audit (
 tenant_id text NOT NULL,
 channel text NOT NULL,
 event_id text NOT NULL,
 action text NOT NULL CHECK(action='recorded_pending_review'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,channel,event_id),
 FOREIGN KEY(tenant_id,channel,event_id) REFERENCES axiomos_autopilot_qa.events(tenant_id,channel,event_id)
);
-- Atomic receipt: one transaction inserts event, prospect, pending task, audit or none.
CREATE OR REPLACE FUNCTION axiomos_autopilot_qa.ingest_synthetic(
 p_tenant text,p_channel text,p_event text,p_contact text,p_verified boolean,p_simulated boolean,
 p_kind text,p_priority text)
RETURNS TABLE(inserted boolean,receipt text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE v_count int;
BEGIN
 IF p_tenant IS DISTINCT FROM 'axiomai-qa' OR p_verified IS DISTINCT FROM true OR p_simulated IS DISTINCT FROM true
    OR p_channel NOT IN ('web','whatsapp','messenger','instagram','telnyx')
    OR p_kind NOT IN ('human_handoff','prepare_followup','review_inquiry')
    OR p_priority NOT IN ('normal','medium','high') THEN
   RAISE EXCEPTION 'INVALID_QA_EVENT';
 END IF;
 INSERT INTO axiomos_autopilot_qa.events(tenant_id,channel,event_id,contact_key,verified,simulated)
 VALUES(p_tenant,p_channel,p_event,p_contact,p_verified,p_simulated)
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS v_count = ROW_COUNT;
 IF v_count=0 THEN
   -- Duplicate event must not mutate prospect/task or report a new action.
   RETURN QUERY SELECT false,(p_tenant||':'||p_channel||':'||p_event)::text;
   RETURN;
 END IF;
 INSERT INTO axiomos_autopilot_qa.prospects(tenant_id,contact_key)
 VALUES(p_tenant,p_contact)
 ON CONFLICT(tenant_id,contact_key) DO UPDATE
 SET last_seen=now(), events_seen=axiomos_autopilot_qa.prospects.events_seen+1;
 INSERT INTO axiomos_autopilot_qa.tasks(tenant_id,channel,event_id,contact_key,kind,priority)
 VALUES(p_tenant,p_channel,p_event,p_contact,p_kind,p_priority);
 INSERT INTO axiomos_autopilot_qa.audit(tenant_id,channel,event_id,action)
 VALUES(p_tenant,p_channel,p_event,'recorded_pending_review');
 RETURN QUERY SELECT true,(p_tenant||':'||p_channel||':'||p_event)::text;
END $$;
-- No application roles receive access in this phase. Explicitly close PUBLIC.
REVOKE ALL ON SCHEMA axiomos_autopilot_qa FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA axiomos_autopilot_qa FROM PUBLIC;
REVOKE ALL ON FUNCTION axiomos_autopilot_qa.ingest_synthetic(text,text,text,text,boolean,boolean,text,text) FROM PUBLIC;
COMMIT;
