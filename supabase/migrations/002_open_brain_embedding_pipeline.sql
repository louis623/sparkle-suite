-- Enable required extensions
create extension if not exists pgmq;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Alter open_brain table
alter table open_brain alter column embedding type halfvec(1536) using embedding::text::halfvec(1536);
alter table open_brain alter column source set default 'telegram';
alter table open_brain alter column tags set default '{}';
alter table open_brain alter column metadata set default '{}';

-- HNSW index for fast similarity search
create index if not exists open_brain_embedding_idx
on open_brain using hnsw (embedding halfvec_cosine_ops);

-- Create the embedding job queue
select pgmq.create('embed_jobs');

-- Trigger function to queue embedding jobs
create or replace function queue_embedding_job()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') or (TG_OP = 'UPDATE' and NEW.content is distinct from OLD.content) then
    NEW.embedding = null;
    perform pgmq.send(
      'embed_jobs',
      jsonb_build_object(
        'id', NEW.id,
        'table', 'open_brain',
        'content_column', 'content',
        'embedding_column', 'embedding'
      )
    );
  end if;
  return NEW;
end;
$$;

-- Attach trigger to open_brain
drop trigger if exists open_brain_embedding_trigger on open_brain;
create trigger open_brain_embedding_trigger
before insert or update on open_brain
for each row execute function queue_embedding_job();

-- Semantic search function
create or replace function match_open_brain(
  query_embedding halfvec(1536),
  match_count int default 10,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  content text,
  source text,
  tags text[],
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    o.id,
    o.content,
    o.source,
    o.tags,
    o.metadata,
    1 - (o.embedding <=> query_embedding) as similarity,
    o.created_at
  from open_brain o
  where o.embedding is not null
    and 1 - (o.embedding <=> query_embedding) > similarity_threshold
  order by o.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RLS policy for service role full access
create policy "Service role full access to open_brain"
on open_brain
for all
to service_role
using (true)
with check (true);
