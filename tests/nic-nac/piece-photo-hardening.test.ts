import { createHash } from 'crypto'
import { describe, expect, it, vi } from 'vitest'

import { decidePhotoReuse, hashDataImageUrl } from '@/lib/nic-nac/workflows/photo-reuse-guard'
import {
  hasTradeBoardIntakeSignal,
  ingestLatestTradeBoardIntakeTurn,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import {
  isAcceptedCustomerFacingWorkflowPhoto,
  workflowPhotoSatisfiesJewelryFront,
} from '@/lib/nic-nac/workflows/workflow-photo-roles'
import {
  conversationImagesForIntake,
  resolvePiecePhotoNumber,
  resolveWorkflowCustomerFacingPhoto,
  selectWorkflowJewelryPhoto,
} from '@/lib/nic-nac/workflows/workflow-photo-selection'

const leftoverLabel = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  intakeSessionId: 'intake-earlier-piece',
  attachmentIndex: 1,
  declaredRole: 'jewelry_front',
  visualRole: 'jewelry',
  quality: 'usable',
  imageUrl: 'earlier-piece-label',
}

const nkLabel = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  intakeSessionId: 'intake-nk60295',
  attachmentIndex: 1,
  declaredRole: 'label_details',
  visualRole: 'label_or_packaging',
  quality: 'usable',
  imageUrl: 'nk60295-label',
}

const nkNecklace = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  intakeSessionId: 'intake-nk60295',
  attachmentIndex: 1,
  declaredRole: 'jewelry_front',
  visualRole: 'jewelry',
  quality: 'usable',
  imageUrl: 'nk60295-necklace',
}

describe('Kelly 9/18 — photos stay on the intake they were sent for', () => {
  it('does not treat chat position as identity when an earlier piece is still in the list', () => {
    const photos = [leftoverLabel, nkLabel, nkNecklace]
    const selected = selectWorkflowJewelryPhoto(photos, {
      modelIndex: 1,
      intakeSessionId: 'intake-nk60295',
    })

    expect(selected?.imageUrl).toBe('nk60295-necklace')
    expect(selected?.imageUrl).not.toBe('earlier-piece-label')
    expect(selected?.intakeSessionId).toBe('intake-nk60295')
  })

  it('does not publish another intake photo when the model points at its id', () => {
    const selected = resolveWorkflowCustomerFacingPhoto(
      [leftoverLabel, nkLabel, nkNecklace],
      {
        selectedPhotoId: leftoverLabel.id,
        intakeSessionId: 'intake-nk60295',
      },
    )

    expect(selected?.imageUrl).toBe('nk60295-necklace')
    expect(selected?.intakeSessionId).toBe('intake-nk60295')
  })

  it('drops chat images that were never recorded on this intake', () => {
    const bound = conversationImagesForIntake(
      [
        { url: 'earlier-piece-label' },
        { url: 'nk60295-label' },
        { url: 'nk60295-necklace' },
      ],
      [nkLabel, nkNecklace],
      'intake-nk60295',
    )

    expect(bound.map((image) => image.url)).toEqual([
      'nk60295-label',
      'nk60295-necklace',
    ])
  })
})

describe('photo numbers stay inside the current piece', () => {
  it('counts photo 2 as this piece necklace, not an earlier chat photo', () => {
    const decision = resolvePiecePhotoNumber(
      [leftoverLabel, nkLabel, nkNecklace],
      2,
      'intake-nk60295',
    )

    expect(decision.status).toBe('use')
    if (decision.status !== 'use') return
    expect(decision.photo.imageUrl).toBe('nk60295-necklace')
    expect(decision.photo.imageUrl).not.toBe('earlier-piece-label')
    expect(decision.photo.imageUrl).not.toBe('nk60295-label')
  })

  it('asks when the number does not fit this piece instead of guessing', () => {
    const decision = resolvePiecePhotoNumber(
      [leftoverLabel, nkLabel, nkNecklace],
      4,
      'intake-nk60295',
    )

    expect(decision.status).toBe('ask')
    if (decision.status !== 'ask') return
    expect(decision.photoCount).toBe(2)
    expect(decision.message).toContain('photo 4')
    expect(decision.message).not.toContain('earlier-piece-label')
    expect(decision.message).not.toMatch(/\b(sold|sales|trade|traded)\b/i)
  })

  it('keeps an in-range label number on this piece confirmed jewelry photo', () => {
    const decision = resolvePiecePhotoNumber(
      [leftoverLabel, nkLabel, nkNecklace],
      1,
      'intake-nk60295',
    )
    expect(decision.status).toBe('confirmed-front')

    const selected = resolveWorkflowCustomerFacingPhoto(
      [leftoverLabel, nkLabel, nkNecklace],
      { modelIndex: 1, intakeSessionId: 'intake-nk60295' },
    )
    expect(selected?.imageUrl).toBe('nk60295-necklace')
    expect(selected?.imageUrl).not.toBe('earlier-piece-label')
  })
})

describe('Kelly 9/18 — a label sent alone starts the piece', () => {
  it('starts piece tracking on a label shot sent by itself', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'label-turn',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TEFCRUw=',
            },
          ],
        },
      ]),
    ).toBe(true)
  })

  it('starts tracking when the previous message was not a photo ask', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-chat',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Sure, send whatever you have for the next one.' }],
        },
        {
          id: 'label-turn',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TEFCRUw=',
            },
          ],
        },
      ]),
    ).toBe(true)
  })

  it('does not start a new piece from a photo after the last one was saved', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-done',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'NK60295 is now on your Dance Floor as available.',
            },
          ],
        },
        {
          id: 'snapshot',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TEFCRUw=',
            },
          ],
        },
      ]),
    ).toBe(false)
  })
})

describe('Kelly 9/18 — the same photo file cannot land on a different item number', () => {
  const necklaceUrl = 'data:image/jpeg;base64,TktK'
  const necklaceHash = createHash('sha256')
    .update(Buffer.from('TktK', 'base64'))
    .digest('hex')

  it('hashes photo bytes the same way intake inspection does', () => {
    expect(hashDataImageUrl(necklaceUrl)).toBe(necklaceHash)
    expect(hashDataImageUrl('https://cdn.example.com/nk60295.jpg')).toBeNull()
  })

  it('refuses the NK60295 necklace photo on ST21027 and ST49881', () => {
    for (const itemNumber of ['ST21027', 'ST49881']) {
      const decision = decidePhotoReuse({
        itemNumber,
        contentSha256: necklaceHash,
        existing: [{ itemNumber: 'NK60295' }],
      })
      expect(decision.blocked).toBe(true)
      if (!decision.blocked) return
      expect(decision.otherItemNumber).toBe('NK60295')
      expect(decision.message).toContain(itemNumber)
      expect(decision.message).toContain('NK60295')
      expect(decision.message).not.toMatch(/\b(sold|sales|trade|traded)\b/i)
      expect(decision.message).not.toMatch(/\b(her|his|their|they)\b/i)
    }
  })

  it('does not block a gold and citrine variant that shares NK60295 with the silver photo', () => {
    const decision = decidePhotoReuse({
      itemNumber: 'nk60295',
      contentSha256: necklaceHash,
      existing: [{ itemNumber: 'NK60295' }, { itemNumber: null }],
    })
    expect(decision.blocked).toBe(false)
  })
})

describe('Louis June — a label tagged as the front photo stays off the library image', () => {
  const labelTaggedAsFront = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    intakeSessionId: 'intake-er34579',
    attachmentIndex: 1,
    declaredRole: 'jewelry_front' as const,
    visualRole: 'label_or_packaging' as const,
    roleConfirmed: true,
    quality: 'usable' as const,
    imageUrl: 'er34579-label',
    qualityIssues: [] as string[],
    notes: ['declared as customer-facing jewelry photo'],
  }

  it('does not publish ER34579 label bytes just because the tag says front', () => {
    expect(workflowPhotoSatisfiesJewelryFront(labelTaggedAsFront)).toBe(false)
    expect(isAcceptedCustomerFacingWorkflowPhoto(labelTaggedAsFront)).toBe(false)
    expect(
      resolveWorkflowCustomerFacingPhoto([labelTaggedAsFront], {
        intakeSessionId: 'intake-er34579',
      })?.imageUrl,
    ).toBeUndefined()
  })

  it('publishes that label only after you confirm it is the main photo', () => {
    const confirmed = {
      ...labelTaggedAsFront,
      notes: [
        ...labelTaggedAsFront.notes,
        'confirmed by rep as customer-facing jewelry photo',
      ],
    }
    expect(isAcceptedCustomerFacingWorkflowPhoto(confirmed)).toBe(true)
    expect(
      resolveWorkflowCustomerFacingPhoto([confirmed], {
        intakeSessionId: 'intake-er34579',
      })?.imageUrl,
    ).toBe('er34579-label')
  })

  it('records your yes on a label that was already tagged as the front photo', async () => {
    const upsert = vi.fn(() => ({ error: null }))
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_photos') return { upsert }
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-er34579',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'photo_capture',
      known: {
        itemNumber: 'ER34579',
        designName: 'Earrings',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: ['jewelryFrontPhoto'],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [labelTaggedAsFront],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'That shot looks like the label. Confirm if you want it as the customer-facing photo.',
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes, use that photo.' }],
        },
      ],
    })

    expect(ingested.photos[0]?.visualRole).toBe('label_or_packaging')
    expect(ingested.photos[0]?.notes).toContain(
      'confirmed by rep as customer-facing jewelry photo',
    )
    expect(isAcceptedCustomerFacingWorkflowPhoto(ingested.photos[0])).toBe(true)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'er34579-label',
        visual_role: 'label_or_packaging',
        notes: expect.arrayContaining([
          'confirmed by rep as customer-facing jewelry photo',
        ]),
      }),
      { onConflict: 'session_id,conversation_message_id,attachment_index' },
    )
  })
})
