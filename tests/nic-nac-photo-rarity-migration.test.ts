import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  path.resolve('supabase/migrations/20260913000100_nic_nac_photo_rarity_hardening.sql'),
  'utf8',
)

describe('Nic-Nac photo and rarity hardening migration', () => {
  it('adds constrained explicit rarity without description-based inference', () => {
    expect(sql).toContain("rarity_classification in ('standard', 'diamond', 'unicorn')")
    expect(sql).toMatch(/set\s+rarity_classification = 'standard'/)
    expect(sql).not.toMatch(/set\s+rarity_classification[\s\S]{0,100}(?:design_name|main_stone|search_tags)/i)
  })

  it('feeds Finder labels only from the explicit classification column', () => {
    expect(sql).toContain("coalesce(d.rarity_classification, 'standard') as catalog_label")
    expect(sql).toContain("'catalog_label', coalesce(d.rarity_classification, 'standard')")
    expect(sql).not.toMatch(/search_tags[\s\S]{0,180}then 'diamond'/i)
  })

  it('provides a service-role-only guarded and auditable photo repair RPC', () => {
    expect(sql).toContain('create table if not exists public.jewelry_listing_repair_audit')
    expect(sql).toContain('create or replace function public.rpc_apply_jewelry_listing_photo_repair')
    expect(sql).toContain('listing repair photo pointer changed after review')
    expect(sql).toContain('listing repair design is now shared by another current listing')
    expect(sql).toContain("other_listing.status in ('available', 'pending_trade')")
    expect(sql).toContain('listing repair source photo is outside the owning workflow')
    expect(sql).toMatch(/revoke all on function public\.rpc_apply_jewelry_listing_photo_repair\([\s\S]+?from public, anon, authenticated;/)
    expect(sql).toMatch(/grant execute on function public\.rpc_apply_jewelry_listing_photo_repair\([\s\S]+?to service_role;/)
  })
})
