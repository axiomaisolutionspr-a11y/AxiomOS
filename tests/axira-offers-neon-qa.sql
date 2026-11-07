-- Real Neon QA regression. A single statement keeps all assertions atomic.
-- Execute only in axiomos_offers_qa on the selected QA branch.
DO $qa$
DECLARE
  first_id bigint;
  second_id bigint;
  current_count integer;
BEGIN
  IF current_database() <> 'axiomos_offers_qa' THEN
    RAISE EXCEPTION 'Wrong database for commercial QA';
  END IF;

  -- Subtransaction rollback preserves the original catalog.
  BEGIN
    INSERT INTO axiomos_commercial.offers
      (tenant_id, product_key, request_id, name, normal_cents, promo_cents,
       activation_cents, starts_at, ends_at, channels, tax_included,
       terms_es, external_es)
    VALUES ('axiomai', 'crm', gen_random_uuid(), 'QA synthetic first', 5900, 999,
      2500, statement_timestamp()-interval '1 hour', statement_timestamp()+interval '1 hour',
      ARRAY['whatsapp'], false, 'Synthetic QA agreement.', 'Synthetic external charges.')
    RETURNING id INTO first_id;

    UPDATE axiomos_commercial.offers SET status='approved' WHERE id=first_id;
    INSERT INTO axiomos_commercial.offers
      (tenant_id, product_key, request_id, name, normal_cents, promo_cents,
       activation_cents, starts_at, ends_at, channels, tax_included,
       terms_es, external_es)
    SELECT tenant_id, product_key, gen_random_uuid(), 'QA synthetic overlap', normal_cents, promo_cents,
      activation_cents, starts_at, ends_at, channels, tax_included, terms_es, external_es
    FROM axiomos_commercial.offers WHERE id=first_id
    RETURNING id INTO second_id;

    BEGIN
      UPDATE axiomos_commercial.offers SET status='approved' WHERE id=second_id;
      RAISE EXCEPTION 'Overlapping approvals were accepted';
    EXCEPTION WHEN exclusion_violation THEN NULL;
    END;

    SELECT count(*) INTO current_count FROM axiomos_commercial.offers
    WHERE id IN (first_id,second_id) AND status='approved'
      AND 'whatsapp'=ANY(channels)
      AND starts_at<=statement_timestamp() AND statement_timestamp()<ends_at;
    IF current_count<>1 THEN RAISE EXCEPTION 'Wrong active count'; END IF;

    SELECT count(*) INTO current_count FROM axiomos_commercial.offers
    WHERE id=first_id AND 'instagram'=ANY(channels);
    IF current_count<>0 THEN RAISE EXCEPTION 'Unauthorized channel accepted'; END IF;

    UPDATE axiomos_commercial.offers SET status='paused' WHERE id=first_id;
    SELECT count(*) INTO current_count FROM axiomos_commercial.offers
    WHERE id=first_id AND status='approved';
    IF current_count<>0 THEN RAISE EXCEPTION 'Pause did not remove the quote'; END IF;

    UPDATE axiomos_commercial.offers
      SET starts_at=statement_timestamp()-interval '2 hours', ends_at=statement_timestamp()
    WHERE id=first_id;
    UPDATE axiomos_commercial.offers SET status='approved' WHERE id=first_id;
    SELECT count(*) INTO current_count FROM axiomos_commercial.offers
    WHERE id=first_id AND status='approved'
      AND starts_at<=statement_timestamp() AND statement_timestamp()<ends_at;
    IF current_count<>0 THEN RAISE EXCEPTION 'Exact expiry failed'; END IF;

    BEGIN
      UPDATE axiomos_commercial.offers SET tenant_id='other-tenant' WHERE id=first_id;
      RAISE EXCEPTION 'Pilot accepted another tenant';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    RAISE SQLSTATE 'PZ001' USING MESSAGE='Rollback synthetic QA changes';
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN NULL;
  END;
END
$qa$;
