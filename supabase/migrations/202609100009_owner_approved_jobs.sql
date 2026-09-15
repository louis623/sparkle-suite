-- Additive: existing assignments, jobs, receipts and business records are retained.
-- Only the server's verified owner route may create this exact-job authorization.
ALTER TABLE public.loc_ops_jobs
  ADD COLUMN IF NOT EXISTS owner_authorization jsonb;

COMMENT ON COLUMN public.loc_ops_jobs.owner_authorization IS
  'Server-validated owner approval bound to exact job, agent, operation, input and expiry; never a client-supplied execution bypass.';
;
