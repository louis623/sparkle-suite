import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/lib/supabase/admin'
import {
  approveTradeWithRevealedItemCapture,
  approveTradeFromReview,
  getTradeSwapCleanupQueue,
} from '@/lib/services/trade-swaps'

type DesignSeed = {
  item_number: string
  design_name: string
  type_prefix: 'RG' | 'NK' | 'ER' | 'ST' | 'BR'
}

async function main() {
  const admin = createAdminClient()
  const stamp = Date.now()
  const email = `sparkle-swap-smoke-${stamp}@example.invalid`
  const password = `SmokeSwap2026!${stamp}`
  const prefix = `SSSWAP${String(stamp).slice(-8)}`
  const itemOut1 = `NK${prefix}A`
  const itemOut2 = `NK${prefix}B`
  const itemOut3 = `NK${prefix}C`
  const itemRevealedKnown = `ER${prefix}D`
  const itemRevealedRing = `RG${prefix}E`
  const itemRevealedUnknown = `NK${prefix}Z`

  let authUserId: string | null = null
  let repId: string | null = null
  let collectionId: string | null = null
  const designIds: string[] = []
  const requestIds: string[] = []
  let pass = true

  function assertSmoke(condition: boolean, message: string) {
    if (condition) {
      console.log(`[swap-smoke][OK] ${message}`)
      return
    }
    pass = false
    console.error(`[swap-smoke][FAIL] ${message}`)
  }

  try {
    const createdUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { smoke: 'trade_swap' },
    })
    if (createdUser.error) throw createdUser.error
    authUserId = createdUser.data.user.id

    const { data: rep, error: repError } = await admin
      .from('reps')
      .insert({
        auth_user_id: authUserId,
        account_classification: 'demo',
        display_name: 'Trade Swap Smoke Rep',
        business_name: 'Trade Swap Smoke Studio',
        email,
        status: 'active',
      })
      .select('id')
      .single()
    if (repError) throw repError
    repId = rep.id

    const { data: collection, error: collectionError } = await admin
      .from('collections')
      .insert({ name: `Trade Swap Smoke ${stamp}` })
      .select('id')
      .single()
    if (collectionError) throw collectionError
    collectionId = collection.id

    const designSeeds: DesignSeed[] = [
      {
        item_number: itemOut1,
        design_name: 'Smoke Outgoing One',
        type_prefix: 'NK',
      },
      {
        item_number: itemOut2,
        design_name: 'Smoke Outgoing Two',
        type_prefix: 'NK',
      },
      {
        item_number: itemOut3,
        design_name: 'Smoke Outgoing Three',
        type_prefix: 'NK',
      },
      {
        item_number: itemRevealedKnown,
        design_name: 'Smoke Revealed Earrings',
        type_prefix: 'ER',
      },
      {
        item_number: itemRevealedRing,
        design_name: 'Smoke Revealed Ring',
        type_prefix: 'RG',
      },
    ]

    const { data: designs, error: designError } = await admin
      .from('jewelry_designs')
      .insert(
        designSeeds.map((row) => ({
          ...row,
          collection_id: collectionId,
          bp_msrp: 38,
          canonical_photo_url: null,
        })),
      )
      .select('id,item_number')
    if (designError) throw designError
    for (const row of designs ?? []) designIds.push(row.id)

    const designIdByItem = new Map(
      (designs ?? []).map((row) => [row.item_number, row.id]),
    )

    const { data: listings, error: listingError } = await admin
      .from('trade_listings')
      .insert(
        [itemOut1, itemOut2, itemOut3].map((itemNumber, index) => ({
          rep_id: repId,
          design_id: designIdByItem.get(itemNumber),
          status: 'available',
          rep_notes: `trade swap smoke outgoing ${index}`,
          uses_canonical_photo: true,
          listed_at: new Date().toISOString(),
        })),
      )
      .select('id,design_id')
    if (listingError) throw listingError

    const { data: requests, error: requestError } = await admin
      .from('trade_requests')
      .insert(
        (listings ?? []).map((listing, index) => ({
          listing_id: listing.id,
          customer_name: `Swap Smoke Customer ${index}`,
          customer_description: 'Synthetic trade swap smoke request',
          status: 'pending',
        })),
      )
      .select('id,listing_id')
    if (requestError) throw requestError
    for (const row of requests ?? []) requestIds.push(row.id)

    if (!repId || requestIds.length !== 3) {
      throw new Error('smoke setup did not create expected rep/request rows')
    }

    const resultKnown = await approveTradeWithRevealedItemCapture(
      admin,
      repId,
      {
        requestId: requestIds[0],
        revealedItemNumber: itemRevealedKnown,
        repNotes: 'known non-ring smoke',
      },
    )
    assertSmoke(
      resultKnown.replacementStatus === 'added_to_board',
      'known non-ring revealed item is added back to the board',
    )
    assertSmoke(
      Boolean(resultKnown.replacementListingId),
      'known non-ring result includes replacement listing id',
    )

    const resultRing = await approveTradeWithRevealedItemCapture(
      admin,
      repId,
      {
        requestId: requestIds[1],
        revealedItemNumber: itemRevealedRing,
        repNotes: 'ring missing size smoke',
      },
    )
    assertSmoke(
      resultRing.replacementStatus === 'needs_ring_size',
      'known ring without size is saved for ring-size cleanup',
    )
    assertSmoke(
      !resultRing.replacementListingId,
      'ring without size does not create replacement listing yet',
    )

    const resultUnknown = await approveTradeFromReview(
      admin,
      repId,
      {
        requestId: requestIds[2],
        revealedItemNumber: itemRevealedUnknown,
        repNotes: 'unknown item smoke',
      },
    )
    assertSmoke(
      resultUnknown.kind === 'noted_only' && !('swapId' in resultUnknown),
      'unknown revealed item is privately noted without creating a swap',
    )

    const cleanup = await getTradeSwapCleanupQueue(admin, repId)
    const smokeCleanup = cleanup.filter((item) =>
      requestIds.includes(item.requestId),
    )
    assertSmoke(
      smokeCleanup.length === 1,
      'cleanup queue returns only the ring-size item',
    )
    assertSmoke(
      smokeCleanup.some(
        (item) =>
          item.revealedItemNumber === itemRevealedRing &&
          item.replacementStatus === 'needs_ring_size',
      ),
      'cleanup queue includes ring-size item',
    )
    assertSmoke(
      !smokeCleanup.some((item) => item.revealedItemNumber === itemRevealedUnknown),
      'unknown number creates no cleanup task',
    )

    const { data: swapRows, error: swapError } = await admin
      .from('trade_swaps')
      .select(
        'request_id,revealed_item_number,replacement_status,replacement_listing_id',
      )
      .in('request_id', requestIds)
    if (swapError) throw swapError
    assertSmoke(
      (swapRows ?? []).length === 2,
      'database has two trade_swaps rows; the unknown number has none',
    )

    if (!pass) throw new Error('trade swap smoke assertions failed')
    console.log('[swap-smoke] ALL CHECKS PASSED')
  } finally {
    if (requestIds.length) {
      await admin.from('trade_swaps').delete().in('request_id', requestIds)
      await admin
        .from('trade_fulfillment')
        .delete()
        .in('request_id', requestIds)
      await admin.from('trade_requests').delete().in('id', requestIds)
    }
    if (repId) await admin.from('trade_listings').delete().eq('rep_id', repId)
    if (designIds.length) {
      await admin.from('jewelry_designs').delete().in('id', designIds)
    }
    if (collectionId) {
      await admin.from('collections').delete().eq('id', collectionId)
    }
    if (repId) await admin.from('reps').delete().eq('id', repId)
    if (authUserId) await admin.auth.admin.deleteUser(authUserId)
    console.log('[swap-smoke] cleanup attempted')
  }
}

main().catch((error) => {
  console.error('[swap-smoke] error', error)
  process.exit(1)
})
