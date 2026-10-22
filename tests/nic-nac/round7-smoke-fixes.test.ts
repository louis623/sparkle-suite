import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import { buildAssistantMessageRenderables } from '@/app/nic-nac/components/NicNacChatBody'
import { buildNicNacCapabilityCatalog } from '@/lib/nic-nac/agent/capability-catalog'
import { createSuiteRepWorkspaceProductContext } from '@/lib/nic-nac/core/product-context'
import { stripUnaskedCatalogPhotoOffer } from '@/lib/nic-nac/core/stream-output-guard'
import { MOVED_ON_MESSAGE } from '@/lib/nic-nac/piece-task'
import {
  carryKnownListingFields,
  pendingMainPhotoConfirmation,
  processListingPhotoForAdd,
  repHasListingForItemNumber,
} from '@/lib/nic-nac/tools/add-listing'
import type { ToolContext } from '@/lib/nic-nac/tools/types'
import {
  acceptedReplacementPhotoReply,
  directPieceReply,
  keptDetailsReply,
  retireSupersededPreviews,
} from '@/lib/nic-nac/turn-replies'
import { pieceTitleFromConfirmedDetails } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { resolveWorkflowCustomerFacingPhoto } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import {
  CUT_OFF_PHOTO_MESSAGE,
  REFUSED_MAIN_PHOTO_NOTE,
  bindMainPhotoForTurn,
  mainPhotoPreviewRefusal,
  photoRefusedAsMainPhoto,
  selectBoundMainPhoto,
  speculativeSecondItemClaim,
} from '@/lib/nic-nac/workflows/workflow-photo-roles'

const processRepListingPhotoUrl = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({}),
}))

vi.mock('@/lib/nic-nac/workflows/photo-reuse-guard', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/nic-nac/workflows/photo-reuse-guard')
  >('@/lib/nic-nac/workflows/photo-reuse-guard')
  return {
    ...actual,
    loadItemNumbersForCustomerPhoto: async () => [],
  }
})

vi.mock('@/lib/services/listing-photo-processing', () => ({
  processRepListingPhotoUrl: (...args: unknown[]) => processRepListingPhotoUrl(...args),
}))

const BLURRY = 'https://example.com/blurry-ring.jpg'
const CLEAR = 'https://example.com/clear-earrings.jpg'

function textMessage(role: 'user' | 'assistant', text: string, id = role): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

function photo(id: string, url: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    attachmentIndex: 1,
    declaredRole: 'jewelry_front',
    visualRole: 'jewelry',
    roleConfirmed: true,
    imageUrl: url,
    quality: 'usable',
    qualityScore: 92,
    qualityIssues: [] as string[],
    notes: [] as string[],
    contentSha256: `${id}-sha`,
    ...extra,
  }
}

function activeWorkflow(photos: unknown[], metadata: Record<string, unknown>) {
  return {
    id: 'intake-er98203',
    status: 'active' as const,
    catalogMode: 'item_number' as const,
    repId: 'rep-1',
    metadata: { mainPhotoConfirmationRequired: true, ...metadata },
    known: { itemNumber: 'ER98203', jewelryType: 'ER' as const },
    photos,
  }
}

const rg98103 = {
  itemNumber: 'RG98103',
  designName: 'Smoke Test Ring',
  collectionName: 'Smoke Test',
  material: 'Rose Gold',
  mainStone: 'Purple Stone',
  ringSize: '6',
  rarityClassification: 'standard' as const,
}

describe('round 7 a refused upload cannot be previewed or saved', () => {
  beforeEach(() => {
    processRepListingPhotoUrl.mockReset()
    processRepListingPhotoUrl.mockImplementation(
      async (input: { sourceImageUrl: string }) => ({ photoUrl: input.sourceImageUrl }),
    )
  })

  it('binds the preview and the save to the upload that passed this turn', async () => {
    const gated = bindMainPhotoForTurn({
      photos: [
        photo('photo-a', BLURRY, { quality: 'warning', qualityIssues: ['blur_risk'] }),
        photo('photo-b', CLEAR),
      ],
      newPhotoStart: 0,
      itemNumber: 'ER98203',
      jewelryType: 'ER',
      metadata: {},
    })
    expect(gated.metadata.boundMainPhotoId).toBe('photo-b')
    expect(gated.photos[0]?.notes).toContain(REFUSED_MAIN_PHOTO_NOTE)
    expect(photoRefusedAsMainPhoto(gated.photos[0])).toBe(true)
    expect(photoRefusedAsMainPhoto(gated.photos[1])).toBe(false)
    expect(selectBoundMainPhoto(gated.photos, gated.metadata)?.imageUrl).toBe(CLEAR)

    const preview = pendingMainPhotoConfirmation({
      itemNumber: 'ER98203',
      selectedPhotoId: 'photo-a',
      workflow: activeWorkflow(gated.photos, gated.metadata) as never,
    })
    expect(preview?.locator.previewPhotoId).toBe('photo-b')
    expect(preview?.message).toContain('ER98203')
    expect(preview?.message).toContain('reply yes')
    expect(JSON.stringify(preview)).not.toContain('photo-a')
    expect(JSON.stringify(preview)).not.toContain(BLURRY)
    expect(
      resolveWorkflowCustomerFacingPhoto(gated.photos, { selectedPhotoId: 'photo-a' }),
    ).toBeNull()

    const saved = await processListingPhotoForAdd({
      selectedPhotoId: 'photo-a',
      itemNumber: 'ER98203',
      activeTradeBoardWorkflow: activeWorkflow(gated.photos, gated.metadata) as never,
      repId: 'rep-1',
      supabase: {} as never,
      conversationId: 'conv-er98203',
    })
    expect(saved).toBe(CLEAR)
    expect(processRepListingPhotoUrl).toHaveBeenCalledTimes(1)
    expect(processRepListingPhotoUrl.mock.calls[0]?.[0]).toMatchObject({
      sourceImageUrl: CLEAR,
    })

    processRepListingPhotoUrl.mockClear()
    const refusedOnly = activeWorkflow([gated.photos[0]], {})
    expect(() =>
      pendingMainPhotoConfirmation({
        itemNumber: 'ER98203',
        selectedPhotoId: 'photo-a',
        workflow: refusedOnly as never,
      }),
    ).toThrow(/That photo was refused/)
    await expect(
      processListingPhotoForAdd({
        selectedPhotoId: 'photo-a',
        itemNumber: 'ER98203',
        activeTradeBoardWorkflow: refusedOnly as never,
        repId: 'rep-1',
        supabase: {} as never,
        conversationId: 'conv-er98203',
      }),
    ).rejects.toThrow(/That photo was refused/)
    expect(processRepListingPhotoUrl).not.toHaveBeenCalled()
  })

  it('stamps the older photo when the previous reply already refused it', () => {
    const gated = bindMainPhotoForTurn({
      photos: [photo('photo-a', BLURRY), photo('photo-b', CLEAR)],
      newPhotoStart: 1,
      itemNumber: 'ER98203',
      jewelryType: 'ER',
      metadata: { boundMainPhotoId: 'photo-a' },
      previousAssistantText:
        'That photo is too blurry to use as the customer-facing photo. Send a clearer photo of the jewelry.',
    })
    expect(photoRefusedAsMainPhoto(gated.photos[0])).toBe(true)
    expect(gated.metadata.boundMainPhotoId).toBe('photo-b')
    expect(selectBoundMainPhoto(gated.photos, gated.metadata)?.id).toBe('photo-b')

    const neither = bindMainPhotoForTurn({
      photos: [
        photo('photo-a', BLURRY),
        photo('photo-b', CLEAR, { quality: 'warning', qualityIssues: ['blur_risk'] }),
      ],
      newPhotoStart: 1,
      itemNumber: 'ER98203',
      jewelryType: 'ER',
      metadata: { boundMainPhotoId: 'photo-a' },
      previousAssistantText: "That photo isn't clear enough.",
    })
    expect(neither.metadata.boundMainPhotoId).toBeUndefined()
    expect(selectBoundMainPhoto(neither.photos, neither.metadata)).toBeNull()
  })
})

describe('round 7 duplicate no keeps stored details and asks for a photo', () => {
  it('previews the replacement without re-asking collection, size, or rarity', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', "I can't use an earrings photo for this ring."),
        textMessage('user', "No, that's not right. Here's the right photo for RG98103."),
      ],
      latestUserText: "No, that's not right. Here's the right photo for RG98103.",
      latestUserHasImage: true,
      known: rg98103,
    })
    expect(reply).toBe(acceptedReplacementPhotoReply(rg98103))
    expect(reply).toContain('Smoke Test collection')
    expect(reply).toContain('size 6')
    expect(reply).toContain('standard')
    expect(reply).toContain('reply yes')
    expect(reply).not.toMatch(
      /design name|diamond or unicorn|design list photo|replace the design list|what's its/i,
    )

    const bare = directPieceReply({
      messages: [
        textMessage('assistant', 'Send a different photo of NK98305.'),
        textMessage('user', "No, here's the right photo for NK98305."),
      ],
      latestUserText: "No, here's the right photo for NK98305.",
      latestUserHasImage: true,
      known: { itemNumber: 'NK98305', collectionName: 'Smoke Test', rarityClassification: 'standard' },
    })
    expect(bare).toContain('This is the main photo I will save for NK98305.')
    expect(bare).not.toMatch(/diamond or unicorn|design list/i)
  })

  it('a no without a new photo asks only for the photo', () => {
    const known = rg98103
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', "I won't use that photo. Send a different photo of this piece."),
        textMessage('user', 'no'),
      ],
      latestUserText: 'no',
      latestUserHasImage: false,
      known,
    })
    expect(reply).toBe(keptDetailsReply(known))
    expect(reply).toContain('Smoke Test collection')
    expect(reply).toContain('size 6')
    expect(reply).toContain('Send a different photo')
    expect(reply).not.toMatch(/diamond or unicorn|design name|reply yes|design list/i)
  })
})

describe('round 7 the shared design-list photo is not part of saving a piece', () => {
  it('hides the catalog photo tool unless the rep asks to update that photo', () => {
    const workspace = {
      productContext: createSuiteRepWorkspaceProductContext({ repId: 'rep-1' }),
    }
    const baseContext: ToolContext = {
      repId: 'rep-1',
      conversationId: 'conversation-1',
      runId: 'run-1',
      supabase: {} as ToolContext['supabase'],
    }
    const saving = buildNicNacCapabilityCatalog({
      ...workspace,
      toolContext: { ...baseContext, latestUserText: "Here's the right photo for RG98103." },
    })
    expect(saving.toolNames).not.toContain('report_jewelry_catalog_issue')
    const asked = buildNicNacCapabilityCatalog({
      ...workspace,
      toolContext: {
        ...baseContext,
        latestUserText: 'update the catalog photo for The Florence Earrings',
      },
    })
    expect(asked.toolNames).toContain('report_jewelry_catalog_issue')
    expect(
      stripUnaskedCatalogPhotoOffer(
        'Would you like me to replace the design list photo with this one?',
      ),
    ).toBe("I won't change the design list photo from this chat.")
  })
})

describe('round 7 carried rollover details stay confirmed', () => {
  it('does not ask diamond or unicorn after the notice already said standard', () => {
    const known = {
      itemNumber: 'RG98106',
      collectionName: 'Smoke Test',
      material: 'Silver',
      mainStone: 'Pink Stone',
      ringSize: '7',
      rarityClassification: 'standard' as const,
    }
    const notice =
      'I started a fresh chat. I still have RG98106, standard, Silver, Pink Stone, Smoke Test collection. Want to finish RG98106? Send the photo again.'
    const resent = directPieceReply({
      messages: [textMessage('assistant', notice), textMessage('user', 'Here it is again.')],
      latestUserText: 'Here it is again.',
      latestUserHasImage: true,
      known,
    })
    expect(resent).toContain("I'll keep")
    expect(resent).toContain('standard')
    expect(resent).toContain('This is the main photo I will save for RG98106.')
    expect(resent).not.toMatch(/diamond or unicorn/i)
    const yes = directPieceReply({
      messages: [textMessage('assistant', notice), textMessage('user', 'yes')],
      latestUserText: 'yes',
      latestUserHasImage: false,
      known,
    })
    expect(yes).toBe('Send the photo for RG98106 again.')
  })
})

describe('round 7 skip checks the Dance Floor row', () => {
  it('does not treat earlier chat text as a saved listing', async () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'I put the wrong piece on your Dance Floor.'),
        textMessage('user', 'Skip RG98104'),
      ],
      latestUserText: 'Skip RG98104',
      latestUserHasImage: false,
      known: { itemNumber: 'RG98104' },
      listingExists: false,
    })
    expect(reply).toBeNull()
    const saved = directPieceReply({
      messages: [
        textMessage('assistant', 'I put the wrong piece on your Dance Floor.'),
        textMessage('user', 'Skip RG98104'),
      ],
      latestUserText: 'Skip RG98104',
      latestUserHasImage: false,
      listingExists: true,
    })
    expect(saved).toContain('RG98104 is already on your Dance Floor')

    const tables: string[] = []
    const query = (rows: unknown[]) => {
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      builder.select = chain
      builder.eq = chain
      builder.in = chain
      builder.neq = chain
      builder.limit = chain
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      return builder
    }
    const admin = {
      from(table: string) {
        tables.push(table)
        if (table === 'jewelry_designs') return query([{ id: 'design-1' }])
        if (table === 'trade_listings') return query([])
        throw new Error(`unexpected table ${table}`)
      },
    }
    expect(
      await repHasListingForItemNumber({
        admin: admin as never,
        repId: 'rep-1',
        itemNumber: 'RG98104',
      }),
    ).toBe(false)
    expect(tables).toEqual(['jewelry_designs', 'trade_listings'])
    const source = readFileSync('lib/nic-nac/tools/add-listing.ts', 'utf8')
    const start = source.indexOf('export async function repHasListingForItemNumber')
    const body = source.slice(start, source.indexOf('async function requireDuplicatePhysicalPieceConfirmationIfNeeded'))
    expect(body).not.toContain('trade_board_intake_sessions')
    const route = readFileSync('app/api/nic-nac/route.ts', 'utf8')
    expect(route).toContain('statedItemNumber(sessionAfter?.known.itemNumber')
    expect(route).toContain('statedItemNumber(previousAssistantText)')
  })
})

describe('round 7 type refusal needs a clear conflict', () => {
  it('does not refuse a speculative second item', () => {
    expect(speculativeSecondItemClaim('the jewelry photo also shows earrings')).toBe(true)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['also shows earrings'] },
        itemNumber: 'RG98104',
        jewelryType: 'RG',
      }),
    ).toBeNull()
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['ring', 'earrings'] },
        itemNumber: 'ER98203',
        jewelryType: 'ER',
      }),
    ).toBeNull()
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['subject-type:RG'] },
        itemNumber: 'ER98203',
        jewelryType: 'ER',
      }),
    ).toMatch(/shows a ring/)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: ['earrings'] },
        itemNumber: 'RG98104',
        jewelryType: 'RG',
      }),
    ).toMatch(/shows earrings/)
  })
})

describe('round 7 titles come from confirmed details', () => {
  it('drops label small print and does not invent a name', () => {
    expect(
      pieceTitleFromConfirmedDetails({
        proposed: 'Grok Run8 Piece Smoke only - run 8',
        confirmed: 'Grok Run8 Piece',
      }),
    ).toBe('Grok Run8 Piece')
    expect(
      pieceTitleFromConfirmedDetails({
        proposed: 'Smoke only - run 8',
        confirmed: null,
      }),
    ).toBeUndefined()
    expect(
      pieceTitleFromConfirmedDetails({
        proposed: 'Smoke Test Ring',
        confirmed: 'Grok Run8 Piece',
      }),
    ).toBe('Smoke Test Ring')
    expect(
      pieceTitleFromConfirmedDetails({
        proposed: '',
        confirmed: 'Grok Run8 Piece',
      }),
    ).toBeUndefined()
    const carried = carryKnownListingFields(
      {
        mode: 'single',
        catalogMode: 'item_number',
        itemNumber: 'RG98104',
        designName: 'Grok Run8 Piece Smoke only - run 8',
      },
      {
        status: 'active',
        catalogMode: 'item_number',
        known: { itemNumber: 'RG98104', designName: 'Grok Run8 Piece' },
      },
    )
    expect(carried.designName).toBe('Grok Run8 Piece')
    const omitted = carryKnownListingFields(
      { mode: 'single', catalogMode: 'item_number', itemNumber: 'RG98104' },
      {
        status: 'active',
        catalogMode: 'item_number',
        known: { itemNumber: 'RG98104', designName: 'Grok Run8 Piece' },
      },
    )
    expect(omitted.designName).toBeUndefined()
  })
})

describe('round 7 a cropped piece says it is cut off', () => {
  it('uses the step-back sentence only when the jewelry fails and touches the edge', () => {
    expect(
      mainPhotoPreviewRefusal({
        photo: {
          quality: 'warning',
          qualityIssues: ['subject_cut_off'],
          notes: [],
        },
        itemNumber: 'NK98301',
        jewelryType: 'NK',
      }),
    ).toBe(CUT_OFF_PHOTO_MESSAGE)
    expect(
      mainPhotoPreviewRefusal({
        photo: {
          quality: 'warning',
          qualityIssues: ['blur_risk', 'subject_cut_off'],
          notes: [],
        },
        itemNumber: 'NK98304',
        jewelryType: 'NK',
      }),
    ).toMatch(/too blurry/)
    expect(
      mainPhotoPreviewRefusal({
        photo: {
          quality: 'usable',
          qualityScore: 90,
          qualityIssues: ['subject_cut_off'],
          notes: [],
        },
        itemNumber: 'NK98304',
        jewelryType: 'NK',
      }),
    ).toBeNull()
  })
})

describe('round 7 preview text and old chats', () => {
  it('shows the preview sentence once and keeps moved chats readable', () => {
    const renderables = buildAssistantMessageRenderables([
      {
        type: 'text',
        text: 'This is the main photo I will save for NK98304. If this is the right piece, reply yes. This is the main photo I’ll save for NK98304. If it’s the right piece, reply yes.',
      },
      {
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          needsAction: 'confirm_main_photo',
          previewPhotoId: 'photo-b',
          message:
            'This is the main photo I will save for NK98304. If this is the right piece, reply yes.',
        },
      },
    ])
    const printed = JSON.stringify(renderables)
    expect(renderables.filter((item) => item.type === 'main-photo-preview')).toHaveLength(1)
    expect(printed.match(/main photo I(?:['’]ll| will) save/gi)).toHaveLength(1)
    expect(renderables.some((item) => item.type === 'text')).toBe(false)

    const history = retireSupersededPreviews([
      { role: 'user', parts: [{ type: 'text', text: 'Add RG98104, silver ring' }] },
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is the main photo I will save for RG98104. If this is the right piece, reply yes.',
          },
          {
            type: 'tool-add_listing',
            state: 'output-available',
            output: {
              needsAction: 'confirm_main_photo',
              previewImageUrl: 'https://example.com/ring.jpg',
              message: 'Reply yes to save RG98104.',
            },
          },
        ],
      },
    ])
    expect(JSON.stringify(history[0])).toContain('Add RG98104')
    const old = buildAssistantMessageRenderables(
      (history[1] as { parts: unknown[] }).parts,
    )
    expect(old.some((item) => item.type === 'main-photo-preview')).toBe(false)
    expect(JSON.stringify(old)).toContain(MOVED_ON_MESSAGE)

    const conversationState = readFileSync('app/api/nic-nac/conversation-state/route.ts', 'utf8')
    expect(conversationState).toContain('readOnly = true')
    const client = readFileSync('app/nic-nac/_client.tsx', 'utf8')
    expect(client).toContain('const readOnly = body.readOnly === true')
    expect(client).toContain('!readOnly &&')
  })
})
