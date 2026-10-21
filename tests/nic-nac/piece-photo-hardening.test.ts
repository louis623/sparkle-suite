import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:https'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Socket } from 'node:net'
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici'
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
  isNegativePhotoConfirmation,
  isPositiveConfirmation,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
import {
  CLIENT_PHOTO_MAX_EDGE,
  compressedPhotoEdges,
} from '@/lib/nic-nac/image-compress'
import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import {
  mainPhotoPreviewLocator,
  mainPhotoPreviewSrc,
} from '@/lib/nic-nac/workflows/main-photo-preview'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import {
  isAcceptedCustomerFacingWorkflowPhoto,
  TURNED_DOWN_MAIN_PHOTO_NOTE,
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

  it('leaves a real-sized label unread when no vision key is set', async () => {
    const previous = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    try {
      const liveSized = Buffer.alloc(140_000, 1)
      expect(liveSized.length).toBeGreaterThan(LABEL_TEMPLATE_MAX_BYTES)
      expect(await readItemNumbersFromImageBytes(liveSized)).toEqual([])
      const liveUrl = `data:image/jpeg;base64,${'A'.repeat(182_000)}`
      expect(await readItemNumbersFromImageUrl(liveUrl, { allowVision: true })).toEqual([])
      expect(
        decideLabelItemNumber({
          itemNumber: 'ST21027',
          readItemNumbers: await readItemNumbersFromImageUrl(liveUrl, {
            allowVision: true,
          }),
        }).blocked,
      ).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previous
    }
  })

  it('refuses a save when vision reads a different item number on the label', async () => {
    const previous = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              { type: 'output_text', text: '{"itemNumbers":["ER90999"]}' },
            ],
          },
        ],
      }),
    }))
    try {
      const liveUrl = `data:image/jpeg;base64,${'A'.repeat(182_000)}`
      const readItemNumbers = await readItemNumbersFromImageUrl(liveUrl, {
        allowVision: true,
        fetch: fetchMock as unknown as typeof fetch,
      })
      expect(readItemNumbers).toEqual(['ER90999'])
      const decision = decideLabelItemNumber({
        itemNumber: 'NK90303',
        readItemNumbers,
      })
      expect(decision.blocked).toBe(true)
      if (!decision.blocked) return
      expect(decision.message).toContain('ER90999')
      expect(decision.message).toContain("I won't save it on NK90303")
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
      expect(request.input[0].content[1].image_url).toBe(liveUrl)
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = previous
    }
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

  it.each([
    [
      'tool-add_listing',
      {
        needsAction: 'confirm_main_photo',
        previewImageUrl: 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/add.jpg',
        message: 'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
      },
    ],
    [
      'tool-update_listing',
      {
        needsAction: 'confirm_main_photo',
        previewImageUrl: 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/update.jpg',
        message: 'This is the main photo I will save for NK70001. If this is the right piece, reply yes.',
      },
    ],
    [
      'tool-report_jewelry_catalog_issue',
      {
        needsAction: 'confirm_main_photo',
        previewImageUrl: 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/front.jpg',
        message: 'This is the main photo I will save for ER34579. If this is the right piece, reply yes.',
      },
    ],
  ])('shows a main-photo preview for %s', (toolType, output) => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    try {
      const renderables = buildAssistantMessageRenderables([
        { type: toolType, state: 'output-available', output },
      ])
      expect(renderables).toEqual([
        {
          type: 'main-photo-preview',
          key: 'main-photo-0',
          text: output.message,
          imageUrl: output.previewImageUrl,
        },
      ])
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
    }
  })

  it('shows the photo on a set-reuse ask that carries a preview', () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const previewImageUrl =
      'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/reused.jpg'
    const message =
      'This photo is already on NK60295. If NK70001 belongs with that set, reply yes.'
    try {
      const renderables = buildAssistantMessageRenderables([
        {
          type: 'tool-update_listing',
          state: 'output-available',
          output: {
            code: 'PHOTO_REUSED_ON_OTHER_ITEM',
            previewImageUrl,
            message,
          },
        },
      ])
      expect(renderables).toEqual([
        {
          type: 'main-photo-preview',
          key: 'main-photo-0',
          text: message,
          imageUrl: previewImageUrl,
        },
      ])
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
    }
  })

  it('shows a set-reuse photo from its photo id', () => {
    const renderables = buildAssistantMessageRenderables([
      {
        type: 'tool-report_jewelry_catalog_issue',
        state: 'output-available',
        output: {
          code: 'PHOTO_REUSED_ON_OTHER_ITEM',
          previewPhotoId: 'photo-er34579',
          message: 'This photo is already on NK60295. If ER34579 belongs with that set, reply yes.',
        },
      },
    ])
    expect(renderables[0]).toMatchObject({
      type: 'main-photo-preview',
      imageUrl: '/api/nic-nac/intake-photos/photo-er34579',
    })
  })

  it('shows only the current preview when one reply has two photo cards', () => {
    const renderables = buildAssistantMessageRenderables([
      {
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          needsAction: 'confirm_main_photo',
          previewPhotoId: 'photo-ring',
          message:
            'This is the main photo I will save for NK90303. If this is the right piece, reply yes.',
        },
      },
      {
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          needsAction: 'confirm_main_photo',
          previewPhotoId: 'photo-earrings',
          message:
            'This is the main photo I will save for ER90202. If this is the right piece, reply yes.',
        },
      },
    ])
    expect(renderables.filter((item) => item.type === 'main-photo-preview')).toEqual([
      {
        type: 'main-photo-preview',
        key: 'main-photo-1',
        text: 'This is the main photo I will save for ER90202. If this is the right piece, reply yes.',
        imageUrl: '/api/nic-nac/intake-photos/photo-earrings',
      },
    ])
  })

  it('keeps the saved id for a photo sent in the same message as the add request', async () => {
    const upsert = vi.fn(() => ({
      select: () => ({
        maybeSingle: async () => ({ data: { id: 'photo-current' }, error: null }),
      }),
    }))
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
      id: 'intake-er90202',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'photo_capture',
      known: { itemNumber: 'ER90202' },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {},
      photos: [],
    }
    const ingested = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'add',
          role: 'user',
          parts: [
            { type: 'text', text: 'Add ER90202. This is the jewelry.' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TkVX',
            },
          ],
        },
      ],
    })
    const photo = ingested.photos.at(-1)
    expect(photo?.id).toBe('photo-current')
    expect(mainPhotoPreviewLocator(photo ?? {}).previewPhotoId).toBe('photo-current')
    expect(mainPhotoPreviewSrc({ previewPhotoId: photo?.id })).toBe(
      '/api/nic-nac/intake-photos/photo-current',
    )
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

  it('binds yes to the last photo shown, not an earlier turned-down one', async () => {
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk90303',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK90303',
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
          id: 'photo-ring',
          intakeSessionId: 'intake-nk90303',
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,UklORw==',
          quality: 'usable',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
        {
          id: 'photo-earrings',
          intakeSessionId: 'intake-nk90303',
          attachmentIndex: 2,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,RUFSA==',
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
          id: 'preview',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-ring',
                message:
                  'This is the main photo I will save for NK90303. If this is the right piece, reply yes.',
              },
            },
            {
              type: 'tool-add_listing',
              state: 'output-available',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-earrings',
                message:
                  'This is the main photo I will save for NK90303. If this is the right piece, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [{ type: 'text', text: 'yes' }],
        },
      ],
    })

    expect(ingested.metadata.mainPhotoConfirmedPhotoId).toBe('photo-earrings')
    expect(ingested.metadata.mainPhotoConfirmedPhotoId).not.toBe('photo-ring')
  })

  it('detaches a photo the rep turns down so it is not offered again', async () => {
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
    const ring = {
      id: 'photo-ring',
      intakeSessionId: 'intake-nk90303',
      attachmentIndex: 1,
      declaredRole: 'jewelry_front' as const,
      visualRole: 'jewelry' as const,
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,UklORw==',
      quality: 'usable' as const,
      qualityIssues: [],
      notes: ['declared as customer-facing jewelry photo'],
    }
    const earrings = {
      id: 'photo-earrings',
      intakeSessionId: 'intake-nk90303',
      attachmentIndex: 2,
      declaredRole: 'jewelry_front' as const,
      visualRole: 'jewelry' as const,
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,RUFSA==',
      quality: 'usable' as const,
      qualityIssues: [],
      notes: ['declared as customer-facing jewelry photo'],
    }
    const session: TradeBoardIntakeSessionState = {
      id: 'intake-nk90303',
      repId: 'rep-1',
      conversationId: 'conv-1',
      workflowType: 'trade_board_add_listing',
      catalogMode: 'item_number',
      status: 'active',
      phase: 'ready_to_add',
      known: {
        itemNumber: 'NK90303',
        designName: 'Necklace',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      missing: [],
      blockers: [],
      warnings: [],
      metadata: {
        mainPhotoConfirmationRequired: true,
        mainPhotoConfirmedPhotoId: 'photo-ring',
        mainPhotoConfirmedItemNumber: 'NK90303',
      },
      photos: [ring, earrings],
    }

    const turnedDown = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
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
                previewPhotoId: 'photo-ring',
                message:
                  'This is the main photo I will save for NK90303. If this is the right piece, reply yes.',
              },
            },
          ],
        },
        {
          id: 'no',
          role: 'user',
          parts: [{ type: 'text', text: 'no' }],
        },
      ],
    })

    expect(isNegativePhotoConfirmation('no')).toBe(true)
    expect(isNegativePhotoConfirmation('no problem')).toBe(false)
    expect(isPositiveConfirmation('no problem')).toBe(false)
    const ringAfter = turnedDown.photos.find((photo) => photo.id === 'photo-ring')
    expect(ringAfter?.notes).toContain(TURNED_DOWN_MAIN_PHOTO_NOTE)
    expect(isAcceptedCustomerFacingWorkflowPhoto(ringAfter)).toBe(false)
    expect(workflowPhotoSatisfiesJewelryFront(ringAfter)).toBe(false)
    expect(turnedDown.metadata.mainPhotoConfirmedPhotoId).toBeUndefined()
    expect(turnedDown.metadata.turnedDownMainPhotoIds).toEqual(['photo-ring'])
    expect(
      resolveWorkflowCustomerFacingPhoto(turnedDown.photos, {
        intakeSessionId: 'intake-nk90303',
      })?.id,
    ).toBe('photo-earrings')

    const stillAttached = await ingestLatestTradeBoardIntakeTurn(supabase as never, {
      session,
      messages: [
        {
          id: 'preview',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'This is the main photo I will save for NK90303. If this is the right piece, reply yes.',
            },
          ],
        },
        {
          id: 'filler',
          role: 'user',
          parts: [{ type: 'text', text: 'no problem' }],
        },
      ],
    })
    expect(stillAttached.photos[0]?.notes).not.toContain(TURNED_DOWN_MAIN_PHOTO_NOTE)
    expect(stillAttached.metadata.mainPhotoConfirmedPhotoId).toBe('photo-ring')
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
    'yes please, the other one',
    'go ahead and crop it',
    'sounds good but use the other one',
    'yea, the second one',
    'yes thank you, use the other one',
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
    'yes please',
    "yes that's it",
    'yes that’s it',
    'thats right',
    "that's the one",
    'sounds good',
    'go ahead',
    'all good',
    'yea',
    'yes thank you',
    '✔️',
    'yes ✔️',
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

  it('ignores a set yes when that turn also attaches a new image', async () => {
    const earlierSha = 'a'.repeat(64)
    const eq = vi.fn(() => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const upsert = vi.fn(async () => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'trade_board_intake_sessions') return { update }
        if (table === 'trade_board_intake_photos') return { upsert }
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
      phase: 'photo_capture',
      known: { itemNumber: 'ST21027' },
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
                message:
                  'This photo is already on NK60295. If ST21027 belongs with that set, reply yes.',
              },
            },
          ],
        },
        {
          id: 'yes',
          role: 'user',
          parts: [
            { type: 'text', text: 'Yes' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TkVX',
            },
          ],
        },
      ],
    })

    expect(ingested.metadata.photoSetReuseConfirmedSha).toBeUndefined()
    expect(ingested.metadata.photoSetReuseConfirmedItemNumber).toBeUndefined()
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

  it('does not follow a redirect when hashing a storage photo', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: { get: () => '3' },
      arrayBuffer: async () => Uint8Array.from([4, 5, 6]).buffer,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await hashCustomerPhotoUrl({ sourceImageUrl: storageUrl })
    expect(fetchMock).toHaveBeenCalledWith(
      storageUrl,
      expect.objectContaining({ redirect: 'error' }),
    )
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

  it('stops reading a storage photo once the streamed body passes 8MB', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const cancel = vi.fn(async () => undefined)
    const read = vi.fn(async () => ({
      done: false,
      value: { byteLength: PHOTO_HASH_MAX_BYTES + 1 },
    }))
    const arrayBuffer = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => null },
        body: { getReader: () => ({ read, cancel }) },
        arrayBuffer,
      })),
    )

    await expect(hashCustomerPhotoUrl({ sourceImageUrl: storageUrl })).resolves.toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledTimes(1)
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
    expect(
      isApprovedCatalogPhotoUrl(
        'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/jewelry-photos/approved/front.png',
      ),
    ).toBe(false)
    restoreUrl()
  })

  it(
    'stops a dribbling storage photo within the timeout, ten times',
    async () => {
      vi.unstubAllGlobals()
      const dir = mkdtempSync(join(tmpdir(), 'nn-r47-'))
      const keyPath = join(dir, 'key.pem')
      const certPath = join(dir, 'cert.pem')
      execFileSync('openssl', [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=127.0.0.1',
      ])
      const timers = new Set<ReturnType<typeof setInterval>>()
      const sockets = new Set<Socket>()
      const server = createServer(
        { key: readFileSync(keyPath), cert: readFileSync(certPath) },
        (_req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
          res.write(Buffer.from([0xff, 0xd8, 0xff]))
          const timer = setInterval(() => {
            if (res.destroyed || res.writableEnded) {
              clearInterval(timer)
              timers.delete(timer)
              return
            }
            res.write(Buffer.from([0]))
          }, 3_000)
          timers.add(timer)
          const stop = () => {
            clearInterval(timer)
            timers.delete(timer)
          }
          res.on('close', stop)
          res.on('error', stop)
        },
      )
      server.on('connection', (socket) => {
        sockets.add(socket)
        socket.on('close', () => sockets.delete(socket))
      })
      const previousDispatcher = getGlobalDispatcher()
      setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }))
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://127.0.0.1'
      try {
        await new Promise<void>((resolve, reject) => {
          server.listen(0, '127.0.0.1', () => resolve())
          server.on('error', reject)
        })
        const address = server.address()
        if (!address || typeof address === 'string') throw new Error('no port')
        const port = address.port
        process.env.NEXT_PUBLIC_SUPABASE_URL = `https://127.0.0.1:${port}`
        const url = `https://127.0.0.1:${port}/storage/v1/object/public/jewelry-photos/rep-1/slow.jpg`
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const started = Date.now()
          await expect(hashCustomerPhotoUrl({ sourceImageUrl: url })).resolves.toBeNull()
          const elapsed = Date.now() - started
          expect(elapsed).toBeGreaterThanOrEqual(7_000)
          expect(elapsed).toBeLessThan(9_500)
        }
      } finally {
        for (const timer of timers) clearInterval(timer)
        for (const socket of sockets) socket.destroy()
        setGlobalDispatcher(previousDispatcher)
        await new Promise<void>((resolve) => server.close(() => resolve()))
        restoreUrl()
      }
    },
    120_000,
  )
})

describe('main photo preview sources', () => {
  const previousPublic = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousServer = process.env.SUPABASE_URL

  function restore() {
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublic
    if (previousServer === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousServer
  }

  it('shows our storage object and an intake photo, and no other link', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.SUPABASE_URL
    const storage =
      'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/front.jpg'
    expect(mainPhotoPreviewSrc({ previewImageUrl: storage })).toBe(storage)
    expect(mainPhotoPreviewLocator({ imageUrl: storage }).previewImageUrl).toBe(storage)
    expect(mainPhotoPreviewSrc({ previewPhotoId: 'photo-nk60295' })).toBe(
      '/api/nic-nac/intake-photos/photo-nk60295',
    )
    expect(
      mainPhotoPreviewSrc({
        previewImageUrl: '/api/nic-nac/intake-photos/photo-er34579',
      }),
    ).toBe('/api/nic-nac/intake-photos/photo-er34579')
    expect(
      mainPhotoPreviewSrc({
        previewImageUrl: 'https://evil.example/storage/v1/object/public/jewelry-photos/a.jpg',
        previewPhotoId: 'photo-nk60295',
      }),
    ).toBe('/api/nic-nac/intake-photos/photo-nk60295')

    const hidden = [
      'https://evil.example/photo.jpg',
      'https://project.supabase.co.evil.example/storage/v1/object/public/a.jpg',
      'https://project.supabase.co/rest/v1/jewelry-photos/a.jpg',
      'http://project.supabase.co/storage/v1/object/public/a.jpg',
      'https://www.yoursparklesuite.com/api/nic-nac/intake-photos/photo-nk60295',
      '/api/nic-nac/intake-photos/../photo-nk60295',
      '/api/nic-nac/intake-photos/photo-nk60295/extra',
      `https://project.supabase.co/storage/v1/object/public/${'a'.repeat(480)}.jpg`,
    ]
    for (const previewImageUrl of hidden) {
      expect(mainPhotoPreviewSrc({ previewImageUrl })).toBeNull()
      expect(mainPhotoPreviewLocator({ imageUrl: previewImageUrl }).previewImageUrl).toBeUndefined()
    }

    process.env.SUPABASE_URL = 'https://other.supabase.co'
    const otherHost =
      'https://other.supabase.co/storage/v1/object/public/jewelry-photos/approved/front.jpg'
    expect(mainPhotoPreviewSrc({ previewImageUrl: otherHost })).toBe(otherHost)
    restore()
  })

  it('returns the parsed storage URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.SUPABASE_URL
    try {
      expect(
        mainPhotoPreviewSrc({
          previewImageUrl:
            'HTTPS://Project.supabase.co:443/storage/v1/object/public/jewelry-photos/a.jpg',
        }),
      ).toBe('https://project.supabase.co/storage/v1/object/public/jewelry-photos/a.jpg')
    } finally {
      restore()
    }
  })

  it('rejects a storage URL that includes a username or password', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.SUPABASE_URL
    try {
      const withUserinfo = [
        'https://user:secret@project.supabase.co/storage/v1/object/public/jewelry-photos/a.jpg',
        'https://user@project.supabase.co/storage/v1/object/public/jewelry-photos/a.jpg',
        'https://:secret@project.supabase.co/storage/v1/object/public/jewelry-photos/a.jpg',
      ]
      for (const previewImageUrl of withUserinfo) {
        expect(mainPhotoPreviewSrc({ previewImageUrl })).toBeNull()
        expect(mainPhotoPreviewLocator({ imageUrl: previewImageUrl }).previewImageUrl).toBeUndefined()
      }
    } finally {
      restore()
    }
  })

  it('asks for the photo again when the browser cannot draw a picture', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_URL
    try {
      const renderables = buildAssistantMessageRenderables([
        {
          type: 'tool-add_listing',
          state: 'output-available',
          output: {
            needsAction: 'confirm_main_photo',
            previewImageUrl:
              'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/front.jpg',
            message:
              'This is the main photo I will save for NK60295. If this is the right piece, reply yes.',
          },
        },
      ])
      expect(renderables).toEqual([
        {
          type: 'main-photo-preview',
          key: 'main-photo-0',
          text: "I can't show this photo here. Please send it again.",
        },
      ])
    } finally {
      restore()
    }
  })

  it('does not render a foreign https link as the chat image', () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    try {
      const renderables = buildAssistantMessageRenderables([
        {
          type: 'tool-update_listing',
          state: 'output-available',
          output: {
            needsAction: 'confirm_main_photo',
            previewImageUrl: 'https://evil.example/storage/v1/object/public/a.jpg',
            message: 'This is the main photo I will save for NK70001. If this is the right piece, reply yes.',
          },
        },
      ])
      expect(renderables[0]).toMatchObject({ type: 'main-photo-preview' })
      expect(renderables[0]).not.toHaveProperty('imageUrl')
      expect(JSON.stringify(renderables)).not.toContain('evil.example')
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
    }
  })
})

describe('phone photo size and quality', () => {
  const clear = {
    blurRisk: 0.12,
    lightingRisk: 0.18,
    subjectCoverage: 0.42,
    subjectCentered: true,
  }

  it('rates a good phone photo as good after the client shrinks it', () => {
    expect(CLIENT_PHOTO_MAX_EDGE).toBe(2400)
    const fourByThree = compressedPhotoEdges(4032, 3024)
    const sixteenByNine = compressedPhotoEdges(4032, 2268)
    expect(assessJewelryPhotoPreflight({ ...fourByThree, ...clear }).passed).toBe(true)
    expect(assessJewelryPhotoPreflight({ ...sixteenByNine, ...clear }).passed).toBe(true)
    expect(
      assessJewelryPhotoPreflight({ ...fourByThree, ...clear }).issues.some(
        (issue) => issue.code === 'low_resolution',
      ),
    ).toBe(false)

    const oldClientSize = assessJewelryPhotoPreflight({
      width: 1024,
      height: 768,
      ...clear,
    })
    expect(oldClientSize.passed).toBe(false)
    expect(oldClientSize.issues).toContainEqual(
      expect.objectContaining({ code: 'low_resolution', severity: 'critical' }),
    )
  })
})
