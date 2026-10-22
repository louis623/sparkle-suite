import { readFileSync } from 'node:fs'
import type { PGlite } from '@electric-sql/pglite'

export const REP = '10000000-0000-4000-8000-000000000001'
export const DESIGN = '20000000-0000-4000-8000-000000000001'
export const SESSION = '30000000-0000-4000-8000-000000000001'
export const PHOTO = '40000000-0000-4000-8000-000000000001'

export async function installIntakeSchema(sql: PGlite) {
  await sql.exec(`create table reps(id uuid primary key);
    insert into reps values ('${REP}');`)
  const intake=readFileSync('supabase/migrations/20260615170000_nic_nac_trade_board_intake_workflows.sql','utf8')
  // Exact checked-in base tables and constraints, excluding hosted role/RLS
  // setup. Identity is a synthetic boundary in these tests, not an RLS test.
  await sql.exec(intake.slice(0,intake.indexOf('alter table public.trade_board_intake_sessions enable')))
  await sql.exec(`drop index idx_trade_board_intake_photos_message_attachment;
    create unique index idx_trade_board_intake_photos_message_attachment on trade_board_intake_photos(session_id,conversation_message_id,attachment_index);
    alter table trade_board_intake_sessions add column catalog_mode text default 'item_number', add column jewelry_type text, add column collection_family text, add column rarity_classification text, add column rarity_confirmed_at timestamptz;
    alter table trade_board_intake_photos add column content_sha256 text, add column visual_role_source text, add column inspected_at timestamptz;
    create table nic_nac_rollovers(id uuid default gen_random_uuid(),rep_id uuid,source_conversation_id text,destination_conversation_id text,carried_message_count integer,reason text,created_at timestamptz default now());
    create table collections(id uuid primary key default gen_random_uuid(),name text,collection_year integer,type text);
    create table jewelry_designs(id uuid primary key default gen_random_uuid(),item_number text,design_name text,type_prefix text,material text,main_stone text,bp_msrp numeric,canonical_photo_url text,collection_id uuid references collections(id),search_tags text[],rarity_classification text default 'standard',times_listed integer default 0,updated_at timestamptz default now());
    create type listing_status as enum ('available','pending_trade','removed','traded');
    create table trade_listings(id uuid primary key default gen_random_uuid(),rep_id uuid,design_id uuid references jewelry_designs(id),listing_source text,status listing_status,rep_notes text,trade_preferences text,ring_size text,listing_photo_url text,uses_canonical_photo boolean,quantity_available integer,listed_at timestamptz,rarity_classification text,rarity_confirmed_at timestamptz,rarity_confirmation_source text,created_at timestamptz default now(),updated_at timestamptz default now());
    create table trade_requests(id uuid default gen_random_uuid(),listing_id uuid,status text);
    create table trade_listing_add_mutations(idempotency_key text,rep_id uuid,input_signature text,listing_id uuid,result jsonb,unique(rep_id,idempotency_key));`)
  const concurrency=readFileSync('supabase/migrations/20260825015000_trade_listing_quantity_concurrency.sql','utf8')
  const start=concurrency.indexOf('create or replace function public.trade_listing_catalog_group_digest(')
  await sql.exec(concurrency.slice(start,concurrency.indexOf('$$;',start)+3))
  const rarity=readFileSync('supabase/migrations/20260913000100_nic_nac_photo_rarity_hardening.sql','utf8')
  const rpcStart=rarity.indexOf('create or replace function public.rpc_add_or_increment_catalog_listing_v3(')
  await sql.exec(rarity.slice(rpcStart,rarity.indexOf('$$;',rpcStart)+3))
}

export async function seedPiece(sql:PGlite, rarity='standard') {
  await sql.exec(`truncate trade_listing_add_mutations,trade_listings,trade_requests,trade_board_intake_photos,trade_board_intake_sessions,nic_nac_conversations,nic_nac_rollovers,jewelry_designs,collections cascade;
    insert into collections(id,name,collection_year,type) values ('50000000-0000-4000-8000-000000000001','July Birthday 2026',2026,'birthday');
    insert into jewelry_designs(id,item_number,design_name,type_prefix,collection_id,canonical_photo_url) values ('${DESIGN}','NK11312','Moonlight','NK','50000000-0000-4000-8000-000000000001','https://storage.test/catalog/original.jpg');`)
  await sql.query(`insert into trade_board_intake_sessions(id,rep_id,conversation_id,item_number,jewelry_type,design_name,collection_name,collection_family,collection_year,rarity_classification,metadata)
    values ($1,$2,'piece-chat','NK11312','NK','Moonlight','July Birthday 2026','birthday',2026,$3,$4)`,
    [SESSION,REP,rarity,JSON.stringify({mainPhotoConfirmationRequired:true})])
}
