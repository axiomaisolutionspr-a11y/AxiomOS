BEGIN;
CREATE TABLE axiomos_qa_ingress_scope.meta_whatsapp_marketing_preferences (
  contact_key text PRIMARY KEY CHECK (contact_key ~ '^[a-f0-9]{64}$'),
  preference text NOT NULL CHECK (preference IN ('stop','resume')),
  event_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

REVOKE ALL ON axiomos_qa_ingress_scope.meta_whatsapp_marketing_preferences FROM PUBLIC, axiomos_wa_qa_ingress;

CREATE FUNCTION axiomos_qa_ingress_scope.record_meta_marketing_preference(
  p_key text, p_preference text, p_event_at timestamptz
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_marketing_preferences AS existing
    (contact_key,preference,event_at)
  SELECT p_key,p_preference,p_event_at
  WHERE p_event_at <= statement_timestamp() + interval '5 minutes'
  ON CONFLICT (contact_key) DO UPDATE
  SET preference=excluded.preference,event_at=excluded.event_at,recorded_at=statement_timestamp()
  WHERE excluded.event_at > existing.event_at
    OR (excluded.event_at=existing.event_at AND excluded.preference='stop' AND existing.preference='resume')
$$;
REVOKE ALL ON FUNCTION axiomos_qa_ingress_scope.record_meta_marketing_preference(text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_qa_ingress_scope.record_meta_marketing_preference(text,text,timestamptz) TO axiomos_wa_qa_ingress;
COMMIT;
