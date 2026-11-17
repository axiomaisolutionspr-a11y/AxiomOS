-- QA only. Read-only health view for scheduled, synthetic WhatsApp recovery.
-- 'recent_execution_confirmed' is a freshness check, not proof of live delivery.
CREATE OR REPLACE VIEW public.whatsapp_worker_health_qa AS
WITH latest AS (
 SELECT max(scheduled_at) AS last_run_at, count(*)::integer AS total_runs,
        count(*) FILTER (WHERE status='error')::integer AS logged_errors
 FROM public.whatsapp_worker_runs_qa
), backlog AS (
 SELECT
   count(*) FILTER (WHERE state='unknown')::integer AS uncertain_count,
   count(*) FILTER (WHERE state='failed' AND attempts < 3 AND reply_text IS NOT NULL)::integer AS retryable_count,
   count(*) FILTER (WHERE state='processing' AND lease_until < now())::integer AS expired_processing_count
 FROM public.whatsapp_delivery_qa
 WHERE inbound_message_id LIKE 'qa-e2e-worker-%'
)
SELECT now() AS checked_at, latest.last_run_at,latest.total_runs,latest.logged_errors,
  backlog.uncertain_count,backlog.retryable_count,backlog.expired_processing_count,
  CASE WHEN latest.last_run_at >= now() - interval '15 minutes'
       THEN 'recent_execution_confirmed' ELSE 'no_recent_execution' END AS schedule_health
FROM latest CROSS JOIN backlog;
