BEGIN;
SET LOCAL lock_timeout = '5s';

-- Permanent request tombstones contain references only, never task inputs.
CREATE TABLE public.loc_ops_job_creation_fences (
  job_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.loc_ops_agents(id),
  operation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loc_ops_job_creation_fences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.loc_ops_job_creation_fences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.loc_ops_job_creation_fences TO loc_runtime;
CREATE POLICY loc_runtime_access ON public.loc_ops_job_creation_fences
  FOR ALL TO loc_runtime USING (true) WITH CHECK (true);

-- The trigger also fences a delayed request handled by a previous runtime.
-- The cancellation transaction uses the same lock before checking for a job.
CREATE FUNCTION public.loc_check_job_creation_fence() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('loc:job-create:' || NEW.id::text, 0));
  IF EXISTS (SELECT 1 FROM public.loc_ops_job_creation_fences WHERE job_id = NEW.id) THEN
    RAISE EXCEPTION 'This job request was cancelled before creation.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.loc_check_job_creation_fence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.loc_check_job_creation_fence() TO loc_runtime;
CREATE TRIGGER loc_job_creation_fence BEFORE INSERT OR UPDATE OF id ON public.loc_ops_jobs
  FOR EACH ROW EXECUTE FUNCTION public.loc_check_job_creation_fence();

COMMENT ON TABLE public.loc_ops_job_creation_fences IS
  'Permanent owner-authorized cancellation of absent job IDs; prevents delayed creation, including across runtime rollback.';
COMMIT;
;
