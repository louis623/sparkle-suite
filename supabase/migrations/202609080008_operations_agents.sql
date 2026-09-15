BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE public.loc_ops_agents (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text NOT NULL,
 memory_agent_id uuid REFERENCES public.loc_agents(id),
 runtime text NOT NULL CHECK(runtime IN ('codex','grok','other')),
 identity_mode text NOT NULL CHECK(identity_mode IN ('independent','shared')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','removed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.loc_ops_connections (
 id uuid PRIMARY KEY, agent_id uuid NOT NULL REFERENCES public.loc_ops_agents(id),
 token_hash text NOT NULL UNIQUE, label text NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, verified_at timestamptz, last_seen_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.loc_ops_assignments (
 id uuid PRIMARY KEY, agent_id uuid NOT NULL REFERENCES public.loc_ops_agents(id),
 product text NOT NULL CHECK(product IN ('suite','finder')), area text NOT NULL,
 operations text[] NOT NULL, target_ids text[] NOT NULL DEFAULT '{}', enabled boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(agent_id,product,area)
);
CREATE TABLE public.loc_ops_receipts (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, actor_id text NOT NULL, connection_id uuid REFERENCES public.loc_ops_connections(id),
 operation text NOT NULL, input_hash text NOT NULL, target_ids text[] NOT NULL DEFAULT '{}', state text NOT NULL CHECK(state IN ('pending','succeeded','failed','uncertain')),
 result jsonb, error text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE TABLE public.loc_ops_jobs (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, agent_id uuid NOT NULL REFERENCES public.loc_ops_agents(id),
 instruction text NOT NULL, operation text NOT NULL, input jsonb NOT NULL, input_hash text NOT NULL,
 operation_id uuid NOT NULL UNIQUE, assignment_revision integer NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','claimed','running','needs_input','succeeded','failed','cancelled')),
 connection_id uuid REFERENCES public.loc_ops_connections(id), lease_id uuid, lease_until timestamptz,
 attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3,
 result jsonb, evidence text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.loc_ops_events (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, actor_id text NOT NULL, agent_id uuid REFERENCES public.loc_ops_agents(id),
 job_id uuid REFERENCES public.loc_ops_jobs(id), event text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX loc_ops_jobs_queue ON public.loc_ops_jobs(agent_id,state,created_at);
CREATE INDEX loc_ops_events_history ON public.loc_ops_events(owner_id,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['loc_ops_agents','loc_ops_connections','loc_ops_assignments','loc_ops_receipts','loc_ops_jobs','loc_ops_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO loc_runtime',t);
  EXECUTE format('CREATE POLICY loc_runtime_access ON public.%I FOR ALL TO loc_runtime USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
COMMIT;
;
