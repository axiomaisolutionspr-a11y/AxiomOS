BEGIN;
CREATE SCHEMA axiomos_meta_preferences;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='axiomos_meta_preferences_ingress') THEN
    CREATE ROLE axiomos_meta_preferences_ingress NOLOGIN;
  END IF;
END $$;

CREATE TABLE axiomos_meta_preferences.contact_preferences (
  contact_key text PRIMARY KEY CHECK (contact_key ~ '^[a-f0-9]{64}$'),
  preference text NOT NULL CHECK (preference IN ('stop','resume')),
  event_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE FUNCTION axiomos_meta_preferences.record_events(p_events jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  INSERT INTO axiomos_meta_preferences.contact_preferences AS existing(contact_key, preference, event_at)
  SELECT DISTINCT ON (key) key, preference, to_timestamp(timestamp)
  FROM jsonb_to_recordset(p_events) AS event(key text, preference text, timestamp double precision)
  WHERE to_timestamp(timestamp) <= statement_timestamp() + interval '5 minutes'
  ORDER BY key, timestamp DESC, (preference='stop') DESC
  ON CONFLICT (contact_key) DO UPDATE
  SET preference=excluded.preference,event_at=excluded.event_at,recorded_at=statement_timestamp()
  WHERE excluded.event_at > existing.event_at
    OR (excluded.event_at=existing.event_at AND excluded.preference='stop' AND existing.preference='resume');
$$;

REVOKE ALL ON SCHEMA axiomos_meta_preferences FROM PUBLIC;
REVOKE ALL ON TABLE axiomos_meta_preferences.contact_preferences FROM PUBLIC, axiomos_meta_preferences_ingress;
REVOKE ALL ON FUNCTION axiomos_meta_preferences.record_events(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA axiomos_meta_preferences TO axiomos_meta_preferences_ingress;
GRANT EXECUTE ON FUNCTION axiomos_meta_preferences.record_events(jsonb) TO axiomos_meta_preferences_ingress;
COMMIT;
