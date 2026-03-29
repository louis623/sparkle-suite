# Open Brain — Architecture Summary

## What it is
Supabase-backed semantic memory store for Neon Rabbit. Captures thoughts, decisions, and session summaries via Telegram. Searchable by meaning using pgvector + OpenAI embeddings.

## Table: open_brain
- id: uuid primary key
- content: text (the memory)
- embedding: halfvec(1536) (semantic vector)
- source: text (telegram, session-close, manual, agent)
- tags: text[] (categorical labels)
- metadata: jsonb (arbitrary structured data)
- created_at: timestamptz

## Embedding pipeline
Telegram message → insert to open_brain → trigger queues job in pgmq → pg_cron fires every 10s → Edge Function reads queue → calls OpenAI text-embedding-3-small → writes vector back to row

## Semantic search
Call match_open_brain RPC with a query embedding. Returns rows ordered by cosine similarity above threshold.

## Session close protocol
At end of every Claude/Gemini session, paste the session close prompt, copy output, send to Telegram bot. Gets embedded automatically.

## Session open query
POST to /api/open-brain/context with {"query": "topic", "count": 10}. Returns most relevant memories. Paste into new session.

## Ingest methods
1. Telegram bot (primary)
2. POST /api/open-brain/ingest
3. Direct Supabase insert
