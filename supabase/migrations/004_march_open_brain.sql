-- ─── March's Open Brain — Isolated Instance ──────────────────────────────────
-- Run against: neon-rabbit-core
-- DO NOT touch: thoughts table, match_thoughts, upsert_thought (Louis's data)

create extension if not exists vector;

-- ─── thoughts_march table ────────────────────────────────────────────────────

create table if not exists thoughts_march (
  id            uuid primary key default gen_random_uuid(),
  content       text not null,
  embedding     vector(1536),
  type          text,
  topics        text[],
  people        text[],
  action_items  text[],
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);

alter table thoughts_march enable row level security;

create policy "Service role full access to thoughts_march"
on thoughts_march
for all
to service_role
using (true)
with check (true);

-- ─── match_thoughts_march ────────────────────────────────────────────────────

create or replace function match_thoughts_march(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10,
  filter jsonb default '{}'
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    t.id,
    t.content,
    t.metadata,
    1 - (t.embedding <=> query_embedding) as similarity,
    t.created_at
  from thoughts_march t
  where t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) > match_threshold
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ─── upsert_thought_march ────────────────────────────────────────────────────

create or replace function upsert_thought_march(
  p_content text,
  p_payload jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_metadata jsonb;
begin
  v_metadata := coalesce(p_payload -> 'metadata', '{}');
  insert into thoughts_march (content, type, topics, people, action_items, metadata)
  values (
    p_content,
    v_metadata ->> 'type',
    (select array_agg(x) from jsonb_array_elements_text(v_metadata -> 'topics') x),
    (select array_agg(x) from jsonb_array_elements_text(v_metadata -> 'people') x),
    (select array_agg(x) from jsonb_array_elements_text(v_metadata -> 'action_items') x),
    v_metadata
  )
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;
