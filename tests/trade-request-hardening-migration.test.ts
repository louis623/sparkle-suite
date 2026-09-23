import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260923190000_trade_request_verification_receipts.sql'), 'utf8')

describe('trade request hardening migration', () => {
  it('keeps existing request rows and makes receipt insertion atomic with submission', () => {
    expect(migration).toContain('add column if not exists receipt_token_hash')
    expect(migration).toContain('p_receipt_token_hash text')
    expect(migration).toContain('receipt_token_hash = p_receipt_token_hash')
    expect(migration).not.toMatch(/delete\s+from\s+public\.trade_requests/i)
  })

  it('guards known mismatch, ownership, verified match and final confirmation in SQL', () => {
    expect(migration).toContain("v_status = 'mismatch' and not coalesce(p_manual_review_requested, false)")
    expect(migration).toContain("raise exception 'VERIFICATION_REQUIRED'")
    expect(migration).toContain("raise exception 'TRADE_FAMILY_MISMATCH'")
    expect(migration).toContain("raise exception 'TRADE_TYPE_MISMATCH'")
    expect(migration).toContain('v_design_type <> p_verified_type')
    expect(migration).toContain('trade_canonical_family_v1(v_design_family) <> public.trade_canonical_family_v1(p_verified_family)')
    expect(migration).toContain('v_listing.rep_id <> p_rep_id')
    expect(migration).toContain("raise exception 'DENIAL_REASON_REQUIRED'")
  })
})
