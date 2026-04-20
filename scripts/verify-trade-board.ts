// Isolated service-layer verification for Phase 1 Task 1.0 spike Step 1.
// Uses the admin client throughout (RLS enforcement is separately tested in
// Deliverable 6). This script confirms function-level correctness: shapes,
// writes, auto-cancel behaviour.
//
// Run: npx tsx scripts/verify-trade-board.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAdminClient } from '@/lib/supabase/admin'
import { getMyBoard, removeListing } from '@/lib/services/trade-board'

async function main() {
  const admin = createAdminClient()

  // 1. Resolve test rep (Demo Rep per actual seed, prompt said "Lindsey") +
  //    a jewelry_design to reference
  const { data: lindsey, error: repErr } = await admin
    .from('reps')
    .select('id, email, display_name')
    .eq('email', 'testrep@neonrabbit.net')
    .limit(1)
    .maybeSingle()
  if (repErr || !lindsey) throw new Error(`No test rep: ${repErr?.message}`)

  const { data: design, error: designErr } = await admin
    .from('jewelry_designs')
    .select('id, item_number, design_name')
    .limit(1)
    .maybeSingle()
  if (designErr || !design) throw new Error(`No jewelry_design: ${designErr?.message}`)

  console.log(`[verify] Using rep=${lindsey.display_name} (${lindsey.id})`)
  console.log(`[verify] Using design=${design.design_name} (${design.item_number})`)

  // 2. Seed two temp listings for Lindsey
  const tagA = `__spike_verify_${Date.now()}_A`
  const tagB = `__spike_verify_${Date.now()}_B`
  const { data: listingsInserted, error: insErr } = await admin
    .from('trade_listings')
    .insert([
      { rep_id: lindsey.id, design_id: design.id, rep_notes: tagA, status: 'available', listed_at: new Date().toISOString() },
      { rep_id: lindsey.id, design_id: design.id, rep_notes: tagB, status: 'available', listed_at: new Date().toISOString() },
    ])
    .select('id, rep_notes')
  if (insErr || !listingsInserted) throw new Error(`Insert listings: ${insErr?.message}`)
  const listingA = listingsInserted.find((l) => l.rep_notes === tagA)!
  const listingB = listingsInserted.find((l) => l.rep_notes === tagB)!
  console.log(`[verify] Seeded listings: A=${listingA.id}, B=${listingB.id}`)

  // 3. Seed a pending trade_request on listing A
  const { data: req, error: reqErr } = await admin
    .from('trade_requests')
    .insert({ listing_id: listingA.id, customer_name: 'VerifyCustomer', customer_description: 'verification', status: 'pending' })
    .select('id')
    .single()
  if (reqErr || !req) throw new Error(`Insert trade_request: ${reqErr?.message}`)
  console.log(`[verify] Seeded trade_request on A: ${req.id}`)

  let pass = true

  try {
    // 4. getMyBoard assertions
    const board = await getMyBoard(admin, lindsey.id, { statusFilter: 'available' })
    const tagged = board.listings.filter((l) => l.rep_notes === tagA || l.rep_notes === tagB)
    if (tagged.length !== 2) {
      console.error(`[verify][FAIL] getMyBoard expected 2 tagged listings, got ${tagged.length}`)
      pass = false
    } else {
      console.log(`[verify][OK] getMyBoard returned 2 tagged listings`)
    }
    if (!tagged.every((l) => 'rep_notes' in l)) {
      console.error(`[verify][FAIL] getMyBoard listings missing rep_notes field`)
      pass = false
    } else {
      console.log(`[verify][OK] rep_notes field present on every listing`)
    }
    if (!tagged.every((l) => l.design && l.design.item_number)) {
      console.error(`[verify][FAIL] getMyBoard listings missing nested design shape`)
      pass = false
    } else {
      console.log(`[verify][OK] design join populated`)
    }
    if (typeof board.summary.totalPieces !== 'number' || typeof board.summary.pendingRequestCount !== 'number') {
      console.error(`[verify][FAIL] summary shape wrong:`, board.summary)
      pass = false
    } else {
      console.log(`[verify][OK] summary shape correct; pendingRequestCount=${board.summary.pendingRequestCount}`)
    }

    // 5. removeListing on A — should auto-cancel the pending request
    const removeResult = await removeListing(admin, lindsey.id, { listingId: listingA.id, reason: 'sold' })
    if (removeResult.listingId !== listingA.id) {
      console.error(`[verify][FAIL] removeListing.listingId mismatch`)
      pass = false
    }
    if (removeResult.previousStatus !== 'available') {
      console.error(`[verify][FAIL] previousStatus expected 'available', got ${removeResult.previousStatus}`)
      pass = false
    }
    if (removeResult.cancelledRequestId !== req.id) {
      console.error(`[verify][FAIL] cancelledRequestId expected ${req.id}, got ${removeResult.cancelledRequestId}`)
      pass = false
    } else {
      console.log(`[verify][OK] removeListing reports cancelledRequestId=${removeResult.cancelledRequestId}`)
    }

    // Verify DB state
    const { data: afterA } = await admin.from('trade_listings').select('status, removal_reason').eq('id', listingA.id).single()
    if (afterA?.status !== 'removed' || afterA?.removal_reason !== 'sold') {
      console.error(`[verify][FAIL] listing A not properly updated:`, afterA)
      pass = false
    } else {
      console.log(`[verify][OK] listing A status=removed, removal_reason=sold`)
    }
    const { data: afterReq } = await admin.from('trade_requests').select('status').eq('id', req.id).single()
    if (afterReq?.status !== 'cancelled') {
      console.error(`[verify][FAIL] trade_request not cancelled:`, afterReq)
      pass = false
    } else {
      console.log(`[verify][OK] trade_request status=cancelled`)
    }

    // 6. removeListing by itemNumber — resolves to most-recent active.
    // With pre-existing listings on the same design_id for Demo Rep, we can't
    // assert which specific row gets hit; we only assert the call succeeds and
    // the resolved listing is owned by the rep.
    const removeB = await removeListing(admin, lindsey.id, { itemNumber: design.item_number, reason: 'mistake' })
    if (!removeB.listingId) {
      console.error(`[verify][FAIL] removeListing by itemNumber returned no listingId`)
      pass = false
    } else {
      const { data: hit } = await admin
        .from('trade_listings')
        .select('rep_id, status')
        .eq('id', removeB.listingId)
        .single()
      if (hit?.rep_id !== lindsey.id || hit?.status !== 'removed') {
        console.error(`[verify][FAIL] removeListing by itemNumber post-state wrong:`, hit)
        pass = false
      } else {
        console.log(`[verify][OK] removeListing by itemNumber hit an owned listing and removed it (${removeB.listingId})`)
      }
      // Revert so we don't leave Demo Rep's real data mutated
      if (removeB.listingId !== listingB.id) {
        await admin.from('trade_listings').update({ status: removeB.previousStatus, removal_reason: null }).eq('id', removeB.listingId)
        console.log(`[verify] Reverted pre-existing listing ${removeB.listingId} to ${removeB.previousStatus}`)
      }
    }
  } finally {
    // Cleanup seeded rows
    await admin.from('trade_requests').delete().eq('id', req.id)
    await admin.from('trade_listings').delete().in('id', [listingA.id, listingB.id])
    console.log('[verify] Cleaned up seed data')
  }

  if (!pass) {
    console.error('\n[verify] FAILED')
    process.exit(1)
  }
  console.log('\n[verify] ALL CHECKS PASSED')
}

main().catch((err) => {
  console.error('[verify] error:', err)
  process.exit(1)
})
