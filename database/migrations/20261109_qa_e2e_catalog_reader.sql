-- QA child branch `br-lively-band-avj6yz8x` only.
-- Fix read-only catalog on isolated Autopilot Preview. Do not grant read on prospects.
GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_autopilot_e2e_reader;
GRANT SELECT (
 tenant_id,id,product_key,name,normal_cents,promo_cents,activation_cents,
 starts_at,ends_at,channels,tax_included,terms_es,terms_en,external_es,external_en,
 max_clients,status,revision,created_at
) ON axiomos_commercial.offers TO axiomos_autopilot_e2e_reader;
-- Do not grant request_id, insert, update, delete or access to public.prospects.
