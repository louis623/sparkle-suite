import { createHash } from 'crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  decideLabelItemNumber,
  LABEL_TEMPLATE_MAX_BYTES,
  readItemNumbersFromImageBytes,
  readItemNumbersFromImageUrl,
  renderItemNumberPng,
} from '@/lib/nic-nac/workflows/label-item-number'
import {
  PHOTO_HASH_MAX_BYTES,
  decidePhotoReuse,
  hashCustomerPhotoUrl,
  hashDataImageUrl,
  isApprovedCatalogPhotoUrl,
} from '@/lib/nic-nac/workflows/photo-reuse-guard'
import {
  hasTradeBoardIntakeSignal,
  ingestLatestTradeBoardIntakeTurn,
  isPositiveConfirmation,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
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

describe('Kelly 9/18 — a photo starts a piece only while one is being added', () => {
  const labelPhoto = {
    id: 'label-turn',
    role: 'user' as const,
    parts: [
      {
        type: 'file' as const,
        mediaType: 'image/jpeg',
        url: 'data:image/jpeg;base64,TEFCRUw=',
      },
    ],
  }

  it('does not start piece tracking on a label shot sent by itself', () => {
    expect(hasTradeBoardIntakeSignal([labelPhoto])).toBe(false)
  })

  it('does not start tracking when the previous message was not an add', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-chat',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Sure, send whatever you have for the next one.' }],
        },
        labelPhoto,
      ]),
    ).toBe(false)
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-site',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Send the logo you want on the website.' }],
        },
        labelPhoto,
      ]),
    ).toBe(false)
  })

  it('does not start tracking from generic jewelry advice', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-tips',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'I can share jewelry tips if you need them',
            },
          ],
        },
        labelPhoto,
      ]),
    ).toBe(false)
  })

  it('does not start tracking from a Dance Floor status update', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-count',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Your Dance Floor has 12 dancers.' }],
        },
        labelPhoto,
      ]),
    ).toBe(false)
  })

  it('starts tracking when the previous message asked for the piece photo', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-ask',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Send the label for this piece.' }],
        },
        labelPhoto,
      ]),
    ).toBe(true)
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-photo',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Send the photo for this piece.' }],
        },
        labelPhoto,
      ]),
    ).toBe(true)
  })

  it('does not start tracking from a banner upload or a photo checklist', () => {
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-banner',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Upload your banner image in Site Settings.',
            },
          ],
        },
        labelPhoto,
      ]),
    ).toBe(false)
    expect(
      hasTradeBoardIntakeSignal([
        {
          id: 'assistant-checklist',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Want me to send you a photo checklist…',
            },
          ],
        },
        labelPhoto,
      ]),
    ).toBe(false)
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

  it('asks before using the NK60295 necklace photo on ST21027 and ST49881', () => {
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
      expect(decision.message).toContain('belongs with that set')
      expect(decision.message).not.toMatch(/\b(sold|sales|trade|traded)\b/i)
      expect(decision.message).not.toMatch(/\b(her|his|their|they)\b/i)
      expect(decision.message).not.toMatch(/I won't use it/i)
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

describe('label item numbers', () => {
  it('reads an item number painted in the label font and ignores a broken photo', async () => {
    const png = await renderItemNumberPng('NK60295')
    expect(await readItemNumbersFromImageBytes(png)).toEqual(['NK60295'])
    expect(
      await readItemNumbersFromImageUrl('data:image/jpeg;base64,TEFCRUw='),
    ).toEqual([])
    expect(
      await readItemNumbersFromImageUrl('https://cdn.example.com/label.jpg'),
    ).toEqual([])
    expect(png.length).toBeLessThanOrEqual(LABEL_TEMPLATE_MAX_BYTES)
  })

  it('H7 is a no-op on a real-sized chat photo until real OCR exists', async () => {
    const liveSized = Buffer.alloc(140_000, 1)
    expect(liveSized.length).toBeGreaterThan(LABEL_TEMPLATE_MAX_BYTES)
    expect(await readItemNumbersFromImageBytes(liveSized)).toEqual([])
    const liveUrl = `data:image/jpeg;base64,${'A'.repeat(182_000)}`
    expect(await readItemNumbersFromImageUrl(liveUrl)).toEqual([])
    expect(
      decideLabelItemNumber({
        itemNumber: 'ST21027',
        readItemNumbers: await readItemNumbersFromImageUrl(liveUrl),
      }).blocked,
    ).toBe(false)
  })

  it('blocks a label for a different item number and allows the same item number', () => {
    const mismatch = decideLabelItemNumber({
      itemNumber: 'ST21027',
      readItemNumbers: ['NK60295'],
    })
    expect(mismatch.blocked).toBe(true)
    if (!mismatch.blocked) return
    expect(mismatch.message).toContain('NK60295')
    expect(mismatch.message).toContain('ST21027')
    expect(mismatch.message).not.toMatch(/\b(sold|sales|trade|traded)\b/i)
    expect(mismatch.message).not.toMatch(/\b(her|his|their|they)\b/i)

    expect(
      decideLabelItemNumber({
        itemNumber: 'NK60295',
        readItemNumbers: ['nk60295'],
      }).blocked,
    ).toBe(false)
    expect(
      decideLabelItemNumber({
        itemNumber: 'ER34579',
        readItemNumbers: [],
      }).blocked,
    ).toBe(false)
  })
})

describe('main photo confirmation', () => {
  it('shows the chosen main photo thumbnail before a new piece is saved', () => {
    const liveSizedPhoto = `data:image/jpeg;base64,${'A'.repeat(182_000)}`
    const renderables = buildAssistantMessageRenderables([
      {
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          needsAction: 'confirm_main_photo',
          previewPhotoId: 'photo-nk60295',
          previewImageUrl: liveSizedPhoto,
          message:
            'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
        },
      },
    ])
    expect(renderables).toEqual([
      {
        type: 'main-photo-preview',
        key: 'main-photo-0',
        text: 'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
        imageUrl: '/api/nic-nac/intake-photos/photo-nk60295',
      },
    ])
    expect(JSON.stringify(renderables)).not.toContain('data:image')
    expect(JSON.stringify(renderables).length).toBeLessThan(2_000)
    expect(renderables[0]).not.toMatchObject({
      text: expect.stringMatching(/\b(sold|sales|trade|traded|Live Queue)\b/i),
    })
  })

  it('remembers a yes after the main photo preview', async () => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk60295',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK60295',
        designName: 'Necklace',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: { mainPhotoConfirmationRequired: true },
      photos: [],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'preview',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-nk60295',
                message:
                  'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })

    expect(ingested.metadata.mainPhotoConfirmedPhotoId).toBe('photo-nk60295')
    expect(ingested.metadata.mainPhotoConfirmedItemNumber).toBe('NK60295')
    expect(ingested.metadata.mainPhotoConfirmed).toBeUndefined()
    expect(ingested.metadata.photoSetReuseConfirmed).toBeUndefined()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          mainPhotoConfirmedPhotoId: 'photo-nk60295',
        }),
      }),
    )
  })

  it('shows the main photo preview again after a yes when a new jewelry photo arrives', async () => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const upsert = vi.fn(() => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_photos') return { upsert }
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk60295',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK60295',
        designName: 'Necklace',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: { mainPhotoConfirmationRequired: true },
      photos: [
        {
          id: 'photo-old',
          intakeSessionId: 'intake-nk60295',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }
    const confirmed = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'preview',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-old',
                message:
                  'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })
    expect(confirmed.metadata.mainPhotoConfirmedPhotoId).toBe('photo-old')

    const replaced = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session: confirmed,
      messages: [
        ...[
          {
            id: 'preview',
            role: 'assistant' as const,
            parts: [
              {
                type: 'text' as const,
                text: 'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
              },
            ],
          },
          {
            id: 'yes',
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: 'Yes' }],
          },
        ],
        {
          id: 'new-photo',
          role: 'user',
          parts: [
            { type: 'text', text: 'The first photo is the jewelry.' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TkVX',
            },
          ],
        },
      ],
    })

    expect(replaced.metadata.mainPhotoConfirmedPhotoId).toBeUndefined()
    expect(replaced.metadata.mainPhotoConfirmedItemNumber).toBeUndefined()
    expect(
      replaced.photos.some(
        (photo) =>
          photo.imageUrl === 'data:image/jpeg;base64,TkVX' &&
          photo.declaredRole === 'jewelry_front',
      ),
    ).toBe(true)
  })

  it('cancels a yes when the same turn adds a photo with no role words', async () => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const upsert = vi.fn(() => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_photos') return { upsert }
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk60295',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK60295',
        designName: 'Necklace',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {
        mainPhotoConfirmationRequired: true,
        mainPhotoConfirmedPhotoId: 'photo-old',
      },
      photos: [
        {
          id: 'photo-old',
          intakeSessionId: 'intake-nk60295',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'yes-with-photo',
          role: 'user',
          parts: [
            { type: 'text', text: 'yes' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TkVX',
            },
          ],
        },
      ],
    })

    expect(ingested.metadata.mainPhotoConfirmedPhotoId).toBeUndefined()
    expect(ingested.metadata.mainPhotoConfirmed).toBeUndefined()
    expect(
      ingested.photos.some(
        (photo) => photo.imageUrl === 'data:image/jpeg;base64,TkVX',
      ),
    ).toBe(true)
    expect(
      ingested.photos.find((photo) => photo.imageUrl === 'data:image/jpeg;base64,TkVX')
        ?.declaredRole,
    ).not.toBe('jewelry_front')
  })

  it.each([
    'that isn’t correct',
    'don’t use that one',
    'Nah, use this one',
    'nope, use this one instead',
    "doesn't look right, use this one",
    'can’t use that…',
    'never mind, use this one',
    'wait, use this one instead',
    'nooo use this one',
    '👎 use this one',
    'yes 👎',
    'No, that is not correct',
    "no, don't use that one",
    'Is that correct?',
    'nvm, use this one',
    'ugh, use this one',
    'meh, use this',
    'idk, yes',
    'yes, the other one',
    'yes, the second one',
    'yes the 2nd photo',
    'other one, use that one',
    'swap it, use this one',
    'redo it, use that',
    'try again, use this one',
    'x use this one',
    'yes but use the other one',
    'yes but crop it',
    'yes 🤔',
    'confirmed, oops, other one',
    'don\u02BCt use that',
    'isn`t right',
    'hold on, use this one',
    'stop, use this one',
    'cancel, use that one',
    'different one, use that',
    'use this one instead',
    '❌ use this one',
  ])('does not treat %s as a yes', (reply) => {
    expect(isPositiveConfirmation(reply)).toBe(false)
  })

  it.each([
    'yes',
    'yep',
    'yeah',
    'yup',
    'that’s right',
    'yes, no problem',
    'not bad, yes',
    'nothing wrong, yes',
    'yes 👍',
    'yes 🙌',
    'yes 😊',
    'looks good',
    'perfect',
    'confirmed',
    'ok',
    'okay',
    'sure',
    'use it',
    'that one',
    '👍',
  ])('still treats %s as a yes', (reply) => {
    expect(isPositiveConfirmation(reply)).toBe(true)
  })

  it.each([
    'No, that is not correct',
    "no, don't use that one",
    'Is that correct?',
  ])('does not confirm the main photo or the set from %s', async (reply) => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk60295',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK60295',
        designName: 'Necklace',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: { mainPhotoConfirmationRequired: true },
      photos: [],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-nk60295',
                code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                message:
                  'This photo is already on NK60295. If ST21027 belongs with that set, reply yes. This is the main photo I will save for NK60295.',
              },
            },
          ],
        },
        {
          id: 'reply',
          role: 'user',
          parts: [{ type: 'text', text: reply }],
        },
      ],
    })

    expect(ingested.metadata.mainPhotoConfirmedPhotoId).toBeUndefined()
    expect(ingested.metadata.mainPhotoConfirmed).toBeUndefined()
    expect(ingested.metadata.photoSetReuseConfirmed).toBeUndefined()
    expect(ingested.metadata.photoSetReuseConfirmedSha).toBeUndefined()
  })

  it('binds a set yes to the earlier flagged photo, not the latest one', async () => {
    const earlierSha = 'a'.repeat(64)
    const laterSha = 'b'.repeat(64)
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-st21027',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'ST21027',
        designName: 'Stack',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [
        {
          id: 'photo-earlier',
          intakeSessionId: 'intake-st21027',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          contentSha256: earlierSha,
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
        {
          id: 'photo-later',
          intakeSessionId: 'intake-st21027',
          attachmentIndex: 2,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TEFURVI=',
          contentSha256: laterSha,
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                ok: false,
                code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                contentSha256: earlierSha,
                photoId: 'photo-earlier',
                message:
                  'This photo is already on NK60295. If ST21027 belongs with that set, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })

    expect(ingested.metadata.photoSetReuseConfirmedSha).toBe(earlierSha)
    expect(ingested.metadata.photoSetReuseConfirmedItemNumber).toBe('ST21027')
    expect(ingested.metadata.photoSetReuseConfirmedSha).not.toBe(laterSha)
    expect(ingested.metadata.photoSetReuseConfirmed).toBeUndefined()
    expect(ingested.metadata.mainPhotoConfirmedPhotoId).toBeUndefined()
  })

  it('binds a set yes to the photo id when the reuse error has no hash', async () => {
    const earlierSha = 'c'.repeat(64)
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-st21027',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'ST21027',
        designName: 'Stack',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [
        {
          id: 'photo-earlier',
          intakeSessionId: 'intake-st21027',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          contentSha256: earlierSha,
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
        {
          id: 'photo-later',
          intakeSessionId: 'intake-st21027',
          attachmentIndex: 2,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TEFURVI=',
          contentSha256: 'd'.repeat(64),
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                ok: false,
                code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                photoId: 'photo-earlier',
                message:
                  'This photo is already on NK60295. If ST21027 belongs with that set, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })

    expect(ingested.metadata.photoSetReuseConfirmedSha).toBe(earlierSha)
  })

  it('stores no set confirmation when the reuse error names no photo', async () => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-st21027',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'ST21027',
        designName: 'Stack',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [
        {
          id: 'photo-later',
          intakeSessionId: 'intake-st21027',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          contentSha256: 'a'.repeat(64),
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                ok: false,
                code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                message:
                  'This photo is already on NK60295. If ST21027 belongs with that set, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })

    expect(ingested.metadata.photoSetReuseConfirmedSha).toBeUndefined()
  })

  it('keeps the photo fingerprint when a yes confirms the main photo in words', async () => {
    const contentSha256 = 'a'.repeat(64)
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
      id: 'intake-nk60295',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'photo_capture',
      known: { itemNumber: 'NK60295' },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [
        {
          intakeSessionId: 'intake-nk60295',
          conversationMessageId: 'photo-msg',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TktK',
          contentSha256,
          visualRoleSource: 'inspection',
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }

    await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'ask',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Can you confirm this is the jewelry-front photo for NK60295?',
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'Yes' }],
        },
      ],
    })

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_sha256: contentSha256,
        visual_role_source: 'inspection',
        image_url: 'data:image/jpeg;base64,TktK',
      }),
      expect.anything(),
    )
  })
})

describe('customer photo hashing', () => {
  const storageUrl =
    'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/front.jpg'
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  function restoreUrl() {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
  }

  it('does not fetch a photo from a host outside storage', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      hashCustomerPhotoUrl({
        sourceImageUrl: 'https://evil.example/storage/v1/object/public/jewelry-photos/a.jpg',
      }),
    ).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    restoreUrl()
  })

  it('does not read a storage photo that declares it is too large', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const arrayBuffer = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-length' ? String(PHOTO_HASH_MAX_BYTES + 1) : null,
        },
        arrayBuffer,
      })),
    )

    await expect(hashCustomerPhotoUrl({ sourceImageUrl: storageUrl })).resolves.toBeNull()
    expect(arrayBuffer).not.toHaveBeenCalled()
    restoreUrl()
  })

  it('stops when storage does not answer in time', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    vi.stubGlobal(
      'fetch',
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )

    await expect(
      hashCustomerPhotoUrl({ sourceImageUrl: storageUrl, timeoutMs: 20 }),
    ).resolves.toBeNull()
    restoreUrl()
  })

  it('hashes an approved storage photo and rejects one that is not approved', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const bytes = Uint8Array.from([4, 5, 6])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => bytes.buffer,
      })),
    )
    const approved =
      'https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/front.png'

    await expect(hashCustomerPhotoUrl({ sourceImageUrl: approved })).resolves.toBe(
      createHash('sha256').update(bytes).digest('hex'),
    )
    expect(isApprovedCatalogPhotoUrl(approved)).toBe(true)
    expect(isApprovedCatalogPhotoUrl(storageUrl)).toBe(false)
    expect(isApprovedCatalogPhotoUrl('https://evil.example/approved/front.png')).toBe(false)
    restoreUrl()
  })
})
