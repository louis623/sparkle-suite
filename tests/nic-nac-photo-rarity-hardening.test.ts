import { describe, expect, it } from 'vitest'

import { mapTradeListingToAmethystTradeBoardListing } from '@/lib/amethyst/trade-board-listings'
import { extractKnownFieldsFromText } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { computeTradeBoardIntakeReadiness } from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import { resolveWorkflowCustomerFacingPhoto, selectWorkflowJewelryPhoto } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import type { TradeListingWithDesign } from '@/lib/services/types'

function workflow(known: TradeBoardIntakeSessionState['known']): TradeBoardIntakeSessionState {
  return {
    id: 'workflow-1', repId: 'rep-1', conversationId: 'conversation-1',
    workflowType: 'trade_board_add_listing', catalogMode: 'item_number',
    status: 'active', phase: 'details_capture', known, missing: [], blockers: [],
    warnings: [], metadata: {}, photos: [{ attachmentIndex: 1,
      declaredRole: 'jewelry_front', visualRole: 'jewelry', roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,AA==', quality: 'usable', qualityIssues: [], notes: [] }],
  }
}

describe('Nic-Nac photo and rarity hardening', () => {
  it('never infers rarity from a diamond stone description', () => {
    expect(extractKnownFieldsFromText('Main Stone: Diamond Cubic Zirconia')).not.toHaveProperty('rarityClassification')
    expect(extractKnownFieldsFromText('No')).toMatchObject({ rarityClassification: 'standard' })
    expect(extractKnownFieldsFromText('Diamond')).toMatchObject({ rarityClassification: 'diamond' })
  })

  it('requires an explicit rarity answer before authorizing the add', () => {
    const state = workflow({ itemNumber: 'ER29067', designName: 'Echo First', collectionName: 'OG' })
    expect(computeTradeBoardIntakeReadiness(state)).toMatchObject({
      ready: false,
      nextAction: 'ask_for_rarity_classification',
    })
    state.known.rarityClassification = 'standard'
    expect(computeTradeBoardIntakeReadiness(state).ready).toBe(true)
  })

  it('uses the selected workflow asset instead of a stale prior URL and rejects declared label photos', () => {
    const photos = [
      { id: '11111111-1111-4111-8111-111111111111', attachmentIndex: 1, declaredRole: 'jewelry_front', visualRole: 'jewelry', quality: 'usable', imageUrl: 'current-piece' },
      { id: '22222222-2222-4222-8222-222222222222', attachmentIndex: 2, declaredRole: 'label_details', visualRole: 'label_or_packaging', quality: 'usable', imageUrl: 'label-photo' },
    ]
    expect(selectWorkflowJewelryPhoto(photos, { selectedPhotoId: photos[0].id })?.imageUrl).toBe('current-piece')
    expect(selectWorkflowJewelryPhoto(photos, { selectedPhotoId: photos[1].id })).toBeNull()
    expect(resolveWorkflowCustomerFacingPhoto(photos, { selectedPhotoId: photos[1].id })?.imageUrl).toBe('current-piece')
  })


  it('maps only the explicit rarity field to the public tier', () => {
    const listing = {
      id: 'listing-1', rep_id: 'rep-1', status: 'available', rep_notes: 'diamond unicorn grail',
      trade_preferences: null, listing_photo_url: null, uses_canonical_photo: true,
      rarity_classification: 'standard', listed_at: null, removal_reason: null, deleted_at: null,
      created_at: '', updated_at: '', design: { id: 'design-1', item_number: 'ER29067',
        design_name: 'Diamond Sparkle', material: null, main_stone: 'Diamond Cubic Zirconia',
        bp_msrp: 148, canonical_photo_url: null, type_prefix: 'ER', collection: { id: 'c', name: 'OG' } },
    } as TradeListingWithDesign
    expect(mapTradeListingToAmethystTradeBoardListing(listing).tier).toBe('everyday')
    listing.rarity_classification = 'unicorn'
    expect(mapTradeListingToAmethystTradeBoardListing(listing).tier).toBe('unicorn')
  })
})
