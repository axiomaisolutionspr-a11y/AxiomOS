-- QA-ONLY read isolation pilot. Does not enable writes, logins, or production access.
-- CREATE ROLE pos_qa_rls_test NOLOGIN NOBYPASSRLS NOINHERIT was run on QA.
BEGIN;
GRANT USAGE ON SCHEMA public TO pos_qa_rls_test;
GRANT SELECT ON pos_merchants, pos_locations, pos_stations, pos_catalog,
 pos_orders, pos_order_lines, pos_operators TO pos_qa_rls_test;

-- current_setting is set ONLY in a trusted server transaction after authenticated session.
-- Never accept tenant context from untrusted JSON or query parameters.
CREATE POLICY pos_qa_rls_catalog_read ON pos_catalog FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_merchant_read ON pos_merchants FOR SELECT TO pos_qa_rls_test
 USING (id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_location_read ON pos_locations FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_station_read ON pos_stations FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_operator_read ON pos_operators FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_order_read ON pos_orders FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
CREATE POLICY pos_qa_rls_line_read ON pos_order_lines FOR SELECT TO pos_qa_rls_test
 USING (merchant_id::text = nullif(current_setting('axiomos.merchant_id', true), ''));
COMMIT;
