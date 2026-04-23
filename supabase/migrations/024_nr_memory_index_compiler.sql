-- Migration 024 — Memory Index Compiler
-- =============================================================================
-- Creates the four tables, the atomic rebuild RPC, the lease-row lock + pending
-- flag helpers, and the pg_net trigger function for the Memory Index compiler.
-- The trigger itself on public.thoughts is NOT attached here — it is attached
-- by a follow-up migration (025) only after the Edge Function deploy + dry_run
-- is verified healthy.
--
-- NOTE on body_markdown (R10, Editorial Policy §7):
-- The memory_index_pages.body_markdown column is the compiled output surface.
-- The compiler NEVER reads body_markdown back out of this table — it always
-- rebuilds from public.thoughts so the Memory Index can never launder its own
-- prior output as "context" (the "hallucination-laundering" feedback loop the
-- fresh-context-agent architecture exists to prevent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.0 Reset preamble — drop any leftovers from prior failed attempts.
-- These tables have no production data worth preserving (the prior attempt
-- failed end-to-end). Dropping first eliminates shape-mismatch risk.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tg_thoughts_fire_memory_index ON public.thoughts;

DROP FUNCTION IF EXISTS public.fire_memory_index_compile();
DROP FUNCTION IF EXISTS public.compile_memory_index_pages(jsonb);
DROP FUNCTION IF EXISTS public.try_acquire_compile_lock(text, int);
DROP FUNCTION IF EXISTS public.release_compile_lock(text);
DROP FUNCTION IF EXISTS public.refresh_compile_lock(text, int);
DROP FUNCTION IF EXISTS public.mark_compile_pending();
DROP FUNCTION IF EXISTS public.consume_compile_pending();
-- Stale helpers from the (bad) round-1 advisory-lock plan:
DROP FUNCTION IF EXISTS public.try_compile_lock(bigint);

DROP TABLE IF EXISTS public.memory_index_compile_pending CASCADE;
DROP TABLE IF EXISTS public.memory_index_compile_lock CASCADE;
DROP TABLE IF EXISTS public.memory_index_compile_runs CASCADE;
DROP TABLE IF EXISTS public.memory_index_pages CASCADE;

-- ---------------------------------------------------------------------------
-- 1.1 Tables
-- ---------------------------------------------------------------------------

-- memory_index_pages — the compiled output surface.
CREATE TABLE public.memory_index_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL
    CHECK (page_type IN ('project','person','decision','rule','concept','open_question','index')),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  body_markdown text NOT NULL DEFAULT '',
  source_capture_ids uuid[] DEFAULT '{}',
  last_compiled_at timestamptz,
  last_capture_seen_at timestamptz,
  status text NOT NULL DEFAULT 'current'
    CHECK (status IN ('current','potentially_stale','parked','historical')),
  connected_page_slugs text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_index_pages_page_type ON public.memory_index_pages(page_type);
CREATE INDEX idx_memory_index_pages_status    ON public.memory_index_pages(status);

ALTER TABLE public.memory_index_pages ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only access.

CREATE TRIGGER trg_memory_index_pages_updated_at
  BEFORE UPDATE ON public.memory_index_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- memory_index_compile_runs — one row per compile pass (UNIQUE compile_id).
CREATE TABLE public.memory_index_compile_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compile_id text NOT NULL UNIQUE,
  source_thought_id uuid REFERENCES public.thoughts(id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'triggered'
    CHECK (status IN ('triggered','started','completed','failed','skipped','guard_tripped')),
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  pages_written integer,
  policy_hash text,
  corpus_captures_count integer,
  corpus_estimated_tokens integer,
  dry_run boolean DEFAULT false,
  validate_only boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compile_runs_triggered_at ON public.memory_index_compile_runs(triggered_at DESC);
CREATE INDEX idx_compile_runs_status       ON public.memory_index_compile_runs(status);

ALTER TABLE public.memory_index_compile_runs ENABLE ROW LEVEL SECURITY;

-- memory_index_compile_lock — singleton lease-row lock with TTL-based recovery.
CREATE TABLE public.memory_index_compile_lock (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  holder_compile_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.memory_index_compile_lock ENABLE ROW LEVEL SECURITY;

-- memory_index_compile_pending — dirty-flag for coalesced-skip in-process replay.
CREATE TABLE public.memory_index_compile_pending (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pending boolean NOT NULL DEFAULT false,
  last_marked_at timestamptz
);
INSERT INTO public.memory_index_compile_pending (id, pending) VALUES (1, false);
ALTER TABLE public.memory_index_compile_pending ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 1.2 Atomic rebuild RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compile_memory_index_pages(pages_json jsonb)
RETURNS TABLE (pages_written integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  written integer := 0;
BEGIN
  IF jsonb_typeof(pages_json) <> 'array' THEN
    RAISE EXCEPTION 'pages_json must be a JSON array, got %', jsonb_typeof(pages_json);
  END IF;

  DELETE FROM public.memory_index_pages;

  INSERT INTO public.memory_index_pages
    (page_type, slug, title, body_markdown,
     source_capture_ids, last_compiled_at, last_capture_seen_at,
     status, connected_page_slugs)
  SELECT
    p->>'page_type',
    p->>'slug',
    p->>'title',
    COALESCE(p->>'body_markdown', ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p->'source_capture_ids'))::uuid[],
      '{}'::uuid[]),
    now(),
    NULLIF(p->>'last_capture_seen_at', '')::timestamptz,
    COALESCE(p->>'status', 'current'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p->'connected_page_slugs'))::text[],
      '{}'::text[])
  FROM jsonb_array_elements(pages_json) AS p;

  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN QUERY SELECT written;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1.2a Lease-row lock + pending-flag helpers
-- ---------------------------------------------------------------------------

-- Acquire the singleton compile lock. Returns true iff this caller now holds
-- the lease. The ON CONFLICT ... WHERE expires_at < now() makes acquisition
-- atomic: if the current lease is still valid, we do not overwrite it; if it
-- has expired (crashed compile), we take over.
CREATE OR REPLACE FUNCTION public.try_acquire_compile_lock(
  p_compile_id text,
  p_ttl_seconds int DEFAULT 600
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.memory_index_compile_lock
    (id, holder_compile_id, acquired_at, expires_at)
  VALUES
    (1, p_compile_id, now(), now() + make_interval(secs => p_ttl_seconds))
  ON CONFLICT (id) DO UPDATE
    SET holder_compile_id = EXCLUDED.holder_compile_id,
        acquired_at       = EXCLUDED.acquired_at,
        expires_at        = EXCLUDED.expires_at
    WHERE public.memory_index_compile_lock.expires_at < now();

  RETURN EXISTS (
    SELECT 1
    FROM public.memory_index_compile_lock
    WHERE id = 1
      AND holder_compile_id = p_compile_id
      AND expires_at > now()
  );
END;
$$;

-- Release the lock only if this caller still holds it.
CREATE OR REPLACE FUNCTION public.release_compile_lock(p_compile_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.memory_index_compile_lock
    WHERE id = 1 AND holder_compile_id = p_compile_id;
  RETURN FOUND;
END;
$$;

-- Heartbeat: extend the lease iff this caller still holds it and the lease
-- has not already expired. Called by the Edge Function around the Anthropic
-- API call to keep the lease alive without widening the default TTL.
CREATE OR REPLACE FUNCTION public.refresh_compile_lock(
  p_compile_id text,
  p_ttl_seconds int DEFAULT 600
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.memory_index_compile_lock
     SET expires_at = now() + make_interval(secs => p_ttl_seconds)
   WHERE id = 1
     AND holder_compile_id = p_compile_id
     AND expires_at > now();
  RETURN FOUND;
END;
$$;

-- Mark that a compile was requested while another was running.
CREATE OR REPLACE FUNCTION public.mark_compile_pending()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.memory_index_compile_pending
     SET pending = true, last_marked_at = now()
   WHERE id = 1;
$$;

-- Atomically consume the pending flag. Returns true iff flag was true (and
-- was reset in the same statement), false otherwise.
CREATE OR REPLACE FUNCTION public.consume_compile_pending()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE was_pending boolean;
BEGIN
  UPDATE public.memory_index_compile_pending
     SET pending = false
   WHERE id = 1 AND pending = true
  RETURNING true INTO was_pending;
  RETURN COALESCE(was_pending, false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1.3 Trigger function — fires the Edge Function via pg_net on SESSION CLOSE.
-- The trigger itself is NOT attached by this migration; it is attached by a
-- follow-up migration after the Edge Function is verified healthy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fire_memory_index_compile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  edge_function_url text;
  compile_secret text;
BEGIN
  SELECT decrypted_secret INTO edge_function_url
    FROM vault.decrypted_secrets
    WHERE name = 'memory_index_compiler_url';

  SELECT decrypted_secret INTO compile_secret
    FROM vault.decrypted_secrets
    WHERE name = 'memory_index_compile_secret';

  -- Vault-miss check: if either secret is NULL, write a failed audit row and
  -- return. Never silently continue with NULLs — compile cannot proceed.
  IF edge_function_url IS NULL OR compile_secret IS NULL THEN
    INSERT INTO public.memory_index_compile_runs
      (compile_id, source_thought_id, status, error_message)
    VALUES
      ('vault-miss-' || now()::text, NEW.id, 'failed',
       'Vault secret missing: memory_index_compiler_url_present='
         || (edge_function_url IS NOT NULL)::text
         || ', memory_index_compile_secret_present='
         || (compile_secret IS NOT NULL)::text);
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Compile-Secret', compile_secret
    ),
    body := jsonb_build_object('source_thought_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1.4 Permissions — lock down everything to service_role only.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.compile_memory_index_pages(jsonb)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_acquire_compile_lock(text, int)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_compile_lock(text)                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_compile_lock(text, int)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_compile_pending()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_compile_pending()                    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fire_memory_index_compile()                  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.compile_memory_index_pages(jsonb)         TO service_role;
GRANT EXECUTE ON FUNCTION public.try_acquire_compile_lock(text, int)       TO service_role;
GRANT EXECUTE ON FUNCTION public.release_compile_lock(text)                TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_compile_lock(text, int)           TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_compile_pending()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_compile_pending()                 TO service_role;
-- fire_memory_index_compile() is called only by the trigger (when attached),
-- which runs as the table owner via SECURITY DEFINER. No runtime grants needed.
