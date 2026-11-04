# AxiomOS POS authenticated E2E — QA instructions
**No production access or real payments.**

## Confirmed QA data
Neon project icy-field-92690259, branch br-aged-rice-avymo2s8, database neondb contains the expected synthetic merchant, operator, QA-SKU and active station. These were checked in SQL without modifying data.

## One-time protected setup
1. GitHub repository Settings > Environments > New environment: axiomos-qa.
2. Restrict environment deployment to branch feature/pos-qa-session-revocation-20261103; optionally require review.
3. Add environment secret POS_QA_DATABASE_URL from Neon QA branch br-aged-rice-avymo2s8, database neondb, restricted role pos_qa_app_login.
4. Never use production branch, owner credentials, or global Vercel DATABASE_URL; never paste credentials in chat or logs.

## Run and certify
Actions > POS authenticated QA E2E > Run workflow, with POS QA branch selected.
Only certify if actual E2E step completed successfully and logs show POS_QA_E2E_SUCCESS. Record commit SHA, run ID, and HTTP outcomes. A skipped run, missing secret, green build, and negative HTTP tests do not qualify.
Test automatically generates synthetic QA username/password and session secret, checks login, draft order, idempotency, logout, cookie replay, and rate limit. Does not submit payments.

## Afterward
Keep production unchanged. Review any new synthetic QA orders/sessions; cleanup only with explicit authorization.

## Separate unresolved tests
CRM positive sessions require dedicated isolated Neon and protected E2E; Dualhook/Meta and Telnyx require genuine signed provider events. Do not mark certified based on synthetic signature unit tests.
