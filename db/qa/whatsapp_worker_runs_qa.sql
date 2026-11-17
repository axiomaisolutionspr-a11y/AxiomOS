-- QA audit branch only. Synthetic worker run ledger, no production migration.
CREATE TABLE IF NOT EXISTS public.whatsapp_worker_runs_qa (
 scheduled_at timestamptz PRIMARY KEY,
 quarantined integer NOT NULL DEFAULT 0,
 stale_intake integer NOT NULL DEFAULT 0,
 replies_reconstructed integer NOT NULL DEFAULT 0,
 mocked_sent integer NOT NULL DEFAULT 0,
 status text NOT NULL CHECK (status IN ('ok','error')),
 finished_at timestamptz NOT NULL DEFAULT now()
);
