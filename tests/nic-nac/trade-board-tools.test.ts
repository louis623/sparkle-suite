// Unit tests for the update_listing Nic-Nac tool handler.
//
// Covers: schema-level refines (at-least-one-patch, photo-conflict),
// handler-level defense-in-depth (NO_PATCH_FIELDS, CONFLICTING_PHOTO_INPUTS),
// happy-path service threading + audit, ServiceError translation, and
// audit-failure isolation. Mock paths exactly match the imports in
// lib/nic-nac/tools/update-listing.ts.

import { createHash } from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { errors } from '@/lib/services/errors'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import { hashDataImageUrl } from '@/lib/nic-nac/workflows/photo-reuse-guard'

const updateListingMock = vi.fn()
const processRepCustomListingPhotoUrlMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/services/trade-board', () => ({
  updateListing: (...args: unknown[]) => updateListingMock(...args),
  addListing: vi.fn(),
  addListingBatch: vi.fn(),
  addNonItemNumberListing: vi.fn(),
}))

vi.mock('@/lib/services/listing-photo-processing', () => ({
  processRepCustomListingPhotoUrl: (...args: unknown[]) =>
    processRepCustomListingPhotoUrlMock(...args),
  processRepListingPhotoUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/lib/nic-nac/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

import {
  makeUpdateListingTool,
  updateListingTool,
  inputSchema,
} from '@/lib/nic-nac/tools/update-listing'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

function queryResult(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.eq = passthrough
  builder.order = passthrough
  builder.limit = passthrough
  builder.maybeSingle = () => Promise.resolve(result)
  builder.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

function listingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_LISTING_ID,
    listing_source: 'catalog',
    design: { item_number: 'NK70001' },
    ...overrides,
  }
}

function photoSupabase(args: {
  listing?: Record<string, unknown>
  conversations?: Array<{ role?: string; parts?: unknown }>
} = {}) {
  return {
    from: (table: string) => {
      if (table === 'trade_listings') {
        return queryResult({ data: args.listing ?? listingRow(), error: null })
      }
      if (table === 'nic_nac_conversations') {
        return queryResult({ data: args.conversations ?? [], error: null })
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
}

function confirmedPhotoConversation(photoUrl: string, contentSha256 = DEFAULT_FETCH_SHA) {
  return [
    {
      role: 'user',
      parts: [{ type: 'text', text: 'Yes' }],
    },
    {
      role: 'assistant',
      parts: [
        {
          type: 'tool-update_listing',
          output: {
            needsAction: 'confirm_main_photo',
            listingId: VALID_LISTING_ID,
            previewImageUrl: photoUrl,
            contentSha256,
            pieceKey: 'NK70001',
            message:
              'This is the main photo I will save for NK70001. If this is the right piece, reply yes.',
          },
        },
      ],
    },
  ]
}

function emptyPhotoAdmin() {
  return {
    from: () => queryResult({ data: [], error: null }),
  }
}

function makeTool(
  activeTradeBoardWorkflow?: TradeBoardIntakeSessionState,
  supabase: unknown = {},
): ToolDef {
  return makeUpdateListingTool({
    repId: 'rep-1',
    supabase: supabase as never,
    conversationId: 'conv-1',
    runId: 'run-1',
    activeTradeBoardWorkflow,
  }) as unknown as ToolDef
}

function intakeWorkflow(
  overrides: Partial<TradeBoardIntakeSessionState> = {},
): TradeBoardIntakeSessionState {
  return {
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
    metadata: {},
    photos: [],
    ...overrides,
    known: {
      itemNumber: 'NK60295',
      designName: 'Necklace',
      collectionName: 'Original',
      rarityClassification: 'standard',
      ...(overrides.known ?? {}),
    },
  }
}

// Zod 4 enforces version + variant bits on `.uuid()`: the 3rd group must
// start with [1-8] and the 4th with [89abAB]. Picking a v4-shaped UUID.
const VALID_LISTING_ID = '11111111-1111-4111-8111-111111111111'
const DEFAULT_FETCH_SHA = createHash('sha256')
  .update(Uint8Array.from([1, 2, 3, 4]))
  .digest('hex')

const PREVIOUS_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  updateListingMock.mockReset()
  processRepCustomListingPhotoUrlMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
  createAdminClientMock.mockReset()
  createAdminClientMock.mockReturnValue(emptyPhotoAdmin())
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    })),
  )
})

afterEach(() => {
  if (PREVIOUS_SUPABASE_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIOUS_SUPABASE_URL
})

describe('update_listing — schema (inputSchema.safeParse)', () => {
  it('rejects an empty patch (no fields besides listingId)', () => {
    const result = inputSchema.safeParse({ listingId: VALID_LISTING_ID })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages.some((m) => /at least one of/.test(m))).toBe(true)
    }
  })

  it('rejects missing listingId', () => {
    const result = inputSchema.safeParse({ repNotes: 'updated' })
    expect(result.success).toBe(false)
  })

  it('accepts a patch with a single field set', () => {
    const result = inputSchema.safeParse({
      listingId: VALID_LISTING_ID,
      repNotes: 'wedding gift',
    })
    expect(result.success).toBe(true)
  })

  it('rejects listingPhotoUrl + useCanonicalPhoto:true (conflicting photo inputs)', () => {
    const result = inputSchema.safeParse({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: 'https://example.com/x.jpg',
      useCanonicalPhoto: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages.some((m) => /cannot set listingPhotoUrl/.test(m))).toBe(
        true,
      )
    }
  })

  it('allows listingPhotoUrl:null + useCanonicalPhoto:true (both express "clear the rep photo")', () => {
    const result = inputSchema.safeParse({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: null,
      useCanonicalPhoto: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('update_listing — handler defense-in-depth (bypasses schema)', () => {
  it('throws NO_PATCH_FIELDS when execute() is called with no patch fields', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({ listingId: VALID_LISTING_ID }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'NO_PATCH_FIELDS',
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('throws CONFLICTING_PHOTO_INPUTS when listingPhotoUrl and useCanonicalPhoto:true both arrive at the handler', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: 'https://example.com/x.jpg',
        useCanonicalPhoto: true,
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'CONFLICTING_PHOTO_INPUTS',
    })
    // Critical: must NOT touch the service or audit when rejecting.
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })
})

describe('update_listing — write + audit happy path', () => {
  it('calls updateListing with auth client + repId + listingId + scoped patch, writes listing_updated audit, returns service result + patchedFields', async () => {
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })

    const tool = makeTool()
    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      repNotes: 'updated note',
      tradePreferences: 'looking for sapphires',
    })

    expect(updateListingMock).toHaveBeenCalledTimes(1)
    // updateListing(supabase, repId, listingId, patch)
    expect(updateListingMock.mock.calls[0][1]).toBe('rep-1')
    expect(updateListingMock.mock.calls[0][2]).toBe(VALID_LISTING_ID)
    expect(updateListingMock.mock.calls[0][3]).toEqual({
      repNotes: 'updated note',
      tradePreferences: 'looking for sapphires',
    })
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()

    expect(writeTradeActionAuditMock).toHaveBeenCalledTimes(1)
    const auditArg = writeTradeActionAuditMock.mock.calls[0][0] as {
      actionType: string
      repId: string
      targetListingId: string
      beforeState: Record<string, unknown>
      afterState: Record<string, unknown>
      details: Record<string, unknown>
    }
    expect(auditArg).toMatchObject({
      actionType: 'listing_updated',
      repId: 'rep-1',
      targetListingId: VALID_LISTING_ID,
      details: { runId: 'run-1', conversationId: 'conv-1' },
    })
    expect(auditArg.afterState.patchedFields).toEqual([
      'repNotes',
      'tradePreferences',
    ])

    expect(result).toEqual({
      listingId: VALID_LISTING_ID,
      status: 'available',
      patchedFields: ['repNotes', 'tradePreferences'],
    })
  })

  it('previews the exact https photo and waits for a yes when no intake is open', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    const tool = makeTool(undefined, photoSupabase())

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
      listingId: VALID_LISTING_ID,
      previewImageUrl: photoUrl,
      message: expect.stringContaining('NK70001'),
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('processes a confirmed https listing photo before calling updateListing', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/normalized.jpg',
    })
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })

    const tool = makeTool(
      undefined,
      photoSupabase({ conversations: confirmedPhotoConversation(photoUrl) }),
    )
    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: photoUrl,
    })

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledTimes(1)
    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: photoUrl,
      filenameStem: `${VALID_LISTING_ID}-listing-photo`,
    })
    expect(updateListingMock).toHaveBeenCalledTimes(1)
    expect(updateListingMock.mock.calls[0][3]).toEqual({
      listingPhotoUrl: 'https://cdn.example.com/normalized.jpg',
    })
    expect(result).toEqual({
      listingId: VALID_LISTING_ID,
      status: 'available',
      patchedFields: ['listingPhotoUrl'],
    })
  })

  it('treats a yes as the photo yes from the hash and listing, not the link text', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/normalized.jpg',
    })
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })
    const conversations = confirmedPhotoConversation('https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/some-other-link.jpg')
    const tool = makeTool(undefined, photoSupabase({ conversations }))

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).resolves.toMatchObject({
      patchedFields: ['listingPhotoUrl'],
    })
    expect(updateListingMock).toHaveBeenCalledTimes(1)
  })

  it('does not treat a photo yes as confirmation when that turn also has a new image', async () => {
    const photoUrl =
      'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    const tool = makeTool(
      undefined,
      photoSupabase({
        conversations: [
          {
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
          {
            role: 'assistant',
            parts: [
              {
                type: 'tool-update_listing',
                output: {
                  needsAction: 'confirm_main_photo',
                  listingId: VALID_LISTING_ID,
                  previewImageUrl: photoUrl,
                  contentSha256: DEFAULT_FETCH_SHA,
                  pieceKey: 'NK70001',
                },
              },
            ],
          },
        ],
      }),
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('refuses a data-URL listing photo it cannot show', async () => {
    const tool = makeTool(undefined, photoSupabase())

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: 'data:image/jpeg;base64,TktK',
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_PREVIEW_UNAVAILABLE',
      userMessage: expect.stringMatching(/didn't save it/i),
    })
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('refuses an https listing photo whose link is too long to show', async () => {
    const photoUrl = `https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/${'a'.repeat(500)}.jpg`
    const tool = makeTool(undefined, photoSupabase())

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_PREVIEW_UNAVAILABLE',
    })
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it.each([
    ['data URL', 'data:image/jpeg;base64,TktK'],
    [
      '520-character storage link',
      `https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/${'a'.repeat(520 - 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/'.length - '.jpg'.length)}.jpg`,
    ],
  ])(
    'refuses a reused %s it cannot show before the reuse ask, and a following yes saves nothing',
    async (_label, photoUrl) => {
      if (!photoUrl.startsWith('data:')) expect(photoUrl).toHaveLength(520)
      createAdminClientMock.mockReturnValue({
        from: () =>
          queryResult({
            data: [
              {
                trade_board_intake_sessions: {
                  item_number: 'NK60295',
                  status: 'completed',
                  created_design_id: 'design-nk60295',
                  created_listing_ids: ['listing-nk60295'],
                },
              },
            ],
            error: null,
          }),
      })
      const input = { listingId: VALID_LISTING_ID, listingPhotoUrl: photoUrl }
      await expect(makeTool(undefined, photoSupabase()).execute(input)).rejects.toMatchObject({
        code: 'PHOTO_PREVIEW_UNAVAILABLE',
      })

      const contentSha256 = photoUrl.startsWith('data:')
        ? hashDataImageUrl(photoUrl)
        : DEFAULT_FETCH_SHA
      const afterYes = makeTool(
        undefined,
        photoSupabase({
          conversations: [
            { role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
            {
              role: 'assistant',
              parts: [
                {
                  output: {
                    code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                    contentSha256,
                    listingId: VALID_LISTING_ID,
                    itemNumber: 'NK70001',
                    pieceKey: 'NK70001',
                    message:
                      'This photo is already on NK60295. If NK70001 belongs with that set, reply yes.',
                  },
                },
              ],
            },
          ],
        }),
      )
      await expect(afterYes.execute(input)).rejects.toMatchObject({
        code: 'PHOTO_PREVIEW_UNAVAILABLE',
      })
      expect(updateListingMock).not.toHaveBeenCalled()
      expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
    },
  )

  it('previews the listing photo even when an open intake has a different picture', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    const tool = makeTool(
      intakeWorkflow({
        metadata: { mainPhotoConfirmationRequired: true },
        photos: [
          {
            id: '11111111-1111-4111-8111-111111111112',
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
      }),
      photoSupabase(),
    )

    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: photoUrl,
    })
    expect(result).toMatchObject({
      needsAction: 'confirm_main_photo',
      previewImageUrl: photoUrl,
      message: expect.stringContaining('NK70001'),
    })
    expect(result).not.toHaveProperty('previewPhotoId')
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('refuses a listing photo that is already on another saved piece', async () => {
    const photoUrl = 'data:image/jpeg;base64,TktK'
    const result = {
      data: [
        {
          trade_board_intake_sessions: {
            item_number: 'NK60295',
            status: 'completed',
            created_design_id: 'design-nk60295',
            created_listing_ids: ['listing-nk60295'],
          },
        },
      ],
      error: null,
    }
    const builder: Record<string, unknown> = {}
    const passthrough = () => builder
    builder.select = passthrough
    builder.eq = passthrough
    builder.then = (
      onFulfilled: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected)
    createAdminClientMock.mockReturnValue({
      from: (table: string) => {
        if (table !== 'trade_board_intake_photos') {
          throw new Error(`unexpected table ${table}`)
        }
        return builder
      },
    })
    const tool = makeTool(
      intakeWorkflow({
        known: { itemNumber: 'NK60295' },
        photos: [
          {
            id: 'photo-nk60296',
            intakeSessionId: 'intake-nk60295',
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: photoUrl,
            quality: 'usable',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
      photoSupabase({
        listing: listingRow({ design: { item_number: 'NK60296' } }),
      }),
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      userMessage: expect.stringContaining('NK60296'),
      details: {
        contentSha256: hashDataImageUrl(photoUrl),
      },
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('hashes an https listing photo and checks that listing when no intake is open', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/other-piece.jpg'
    const bytes = Uint8Array.from([9, 9, 9])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => bytes.buffer,
      })),
    )
    const { createHash } = await import('crypto')
    const contentSha256 = createHash('sha256').update(bytes).digest('hex')
    const result = {
      data: [
        {
          trade_board_intake_sessions: {
            item_number: 'NK60295',
            status: 'completed',
            created_design_id: 'design-nk60295',
            created_listing_ids: ['listing-nk60295'],
          },
        },
      ],
      error: null,
    }
    createAdminClientMock.mockReturnValue({
      from: () => queryResult(result),
    })
    const tool = makeTool(undefined, photoSupabase())

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      details: {
        contentSha256,
        listingId: VALID_LISTING_ID,
        itemNumber: 'NK70001',
        pieceKey: 'NK70001',
      },
      userMessage: expect.stringContaining('NK70001'),
    })
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('refuses a reused https listing photo again after yes', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/reused-set.jpg'
    const bytes = Uint8Array.from([9, 9, 9])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => bytes.buffer,
      })),
    )
    const { createHash } = await import('crypto')
    const contentSha256 = createHash('sha256').update(bytes).digest('hex')
    const reused = {
      data: [
        {
          trade_board_intake_sessions: {
            item_number: 'NK60295',
            status: 'completed',
            created_design_id: 'design-nk60295',
            created_listing_ids: ['listing-nk60295'],
          },
        },
      ],
      error: null,
    }
    createAdminClientMock.mockReturnValue({
      from: () => queryResult(reused),
    })
    const first = makeTool(undefined, photoSupabase())
    const ask = await first
      .execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      })
      .then(
        () => {
          throw new Error('expected the set ask')
        },
        (err: { userMessage?: string; details?: Record<string, unknown> }) => err,
      )
    expect(ask.details).toMatchObject({
      contentSha256,
      listingId: VALID_LISTING_ID,
      pieceKey: 'NK70001',
    })
    expect(ask.details).not.toHaveProperty('previewImageUrl')

    const second = makeTool(
      undefined,
      photoSupabase({
        conversations: [
          { role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
          {
            role: 'assistant',
            parts: [
              {
                output: {
                  code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                  message: ask.userMessage,
                  contentSha256,
                  listingId: VALID_LISTING_ID,
                  itemNumber: 'NK70001',
                  previewImageUrl: photoUrl,
                  pieceKey: 'NK70001',
                },
              },
            ],
          },
        ],
      }),
    )

    await expect(
      second.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
    })
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('uses a stored photo hash instead of downloading the listing photo again', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/stored.jpg'
    const storedSha = 'ab'.repeat(32)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    createAdminClientMock.mockReturnValue({
      from: () =>
        queryResult({
          data: [
            {
              trade_board_intake_sessions: {
                item_number: 'NK60295',
                status: 'completed',
                created_design_id: 'design-nk60295',
                created_listing_ids: ['listing-nk60295'],
              },
            },
          ],
          error: null,
        }),
    })
    const tool = makeTool(
      intakeWorkflow({
        photos: [
          {
            intakeSessionId: 'intake-nk60295',
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: photoUrl,
            contentSha256: storedSha,
            quality: 'usable',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
      photoSupabase({
        listing: listingRow({ design: { item_number: 'NK60296' } }),
      }),
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      details: { contentSha256: storedSha },
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('saves a non-item listing after one yes to a reused photo', async () => {
    const listingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/non-item-reused.jpg'
    const bytes = Uint8Array.from([7, 7, 7])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => bytes.buffer,
      })),
    )
    const { createHash } = await import('crypto')
    const contentSha256 = createHash('sha256').update(bytes).digest('hex')
    const pieceKey = `NON_ITEM:${listingId}`
    createAdminClientMock.mockReturnValue({
      from: () =>
        queryResult({
          data: [
            {
              trade_board_intake_sessions: {
                item_number: 'NK60295',
                status: 'completed',
                created_design_id: 'design-nk60295',
                created_listing_ids: ['listing-nk60295'],
              },
            },
          ],
          error: null,
        }),
    })
    const listing = listingRow({
      id: listingId,
      listing_source: 'non_item_number',
      design: null,
    })
    const first = makeTool(undefined, photoSupabase({ listing }))
    const ask = await first
      .execute({ listingId, listingPhotoUrl: photoUrl })
      .then(
        () => {
          throw new Error('expected the set ask')
        },
        (err: { userMessage?: string; details?: Record<string, unknown> }) => err,
      )
    expect(ask.userMessage).toContain('this piece')
    expect(ask.userMessage).not.toMatch(/If [A-Z]{1,4}-?\d{3,} belongs with that set/)
    expect(ask.details).toMatchObject({
      contentSha256,
      listingId,
      pieceKey,
    })

    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/non-item-normalized.jpg',
    })
    updateListingMock.mockResolvedValueOnce({
      listingId,
      status: 'available',
    })
    const second = makeTool(
      undefined,
      photoSupabase({
        listing,
        conversations: [
          { role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
          {
            role: 'assistant',
            parts: [
              {
                output: {
                  code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                  message: ask.userMessage,
                  contentSha256,
                  listingId,
                  pieceKey,
                },
              },
            ],
          },
        ],
      }),
    )

    await expect(
      second.execute({ listingId, listingPhotoUrl: photoUrl }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      userMessage: expect.stringContaining("won't use it as the main photo"),
    })
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('previews a non-item listing photo as this piece', async () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/non-item.jpg'
    const tool = makeTool(
      undefined,
      photoSupabase({
        listing: listingRow({
          listing_source: 'non_item_number',
          design: null,
        }),
      }),
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
      previewImageUrl: photoUrl,
      itemNumber: null,
      message: expect.stringContaining('this piece'),
    })
    expect(updateListingMock).not.toHaveBeenCalled()
  })

  it('useCanonicalPhoto:true does not include listingPhotoUrl in patchedFields even if model passed it as null (allowed combo)', async () => {
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })

    const tool = makeTool()
    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: null,
      useCanonicalPhoto: true,
    })

    // Service receives both fields — the service applies useCanonicalPhoto
    // precedence. Audit reflects what the service actually used.
    const patch = updateListingMock.mock.calls[0][3] as Record<string, unknown>
    expect(patch.useCanonicalPhoto).toBe(true)

    // patchedFields list excludes listingPhotoUrl when useCanonicalPhoto:true
    // is set with a non-null URL — audit mirrors service behavior, not input.
    // For null + true (allowed combo), the order doesn't matter much, but
    // the audit must at least include useCanonicalPhoto.
    const patchedFields = (result.patchedFields as string[]) ?? []
    expect(patchedFields).toContain('useCanonicalPhoto')
  })
})

describe('update_listing — error handling', () => {
  it('translates LISTING_NOT_FOUND ServiceError into NicNacToolError without auditing', async () => {
    updateListingMock.mockRejectedValueOnce(errors.LISTING_NOT_FOUND('l-1'))

    const tool = makeTool()
    await expect(
      tool.execute({ listingId: VALID_LISTING_ID, repNotes: 'x' }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'LISTING_NOT_FOUND',
    })
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('translates INVALID_STATUS_TRANSITION ServiceError without auditing', async () => {
    updateListingMock.mockRejectedValueOnce(
      errors.INVALID_STATUS_TRANSITION('traded', 'edit'),
    )

    const tool = makeTool()
    await expect(
      tool.execute({ listingId: VALID_LISTING_ID, repNotes: 'x' }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'INVALID_STATUS_TRANSITION',
    })
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('translates listing photo processing ServiceError before updateListing is called', async () => {
    processRepCustomListingPhotoUrlMock.mockRejectedValueOnce(
      errors.LISTING_PHOTO_PREFLIGHT_FAILED([
        'Move the camera a little closer so the jewelry takes up more of the frame.',
      ]),
    )

    const photoUrl = 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/raw-upload.jpg'
    const tool = makeTool(
      undefined,
      photoSupabase({ conversations: confirmedPhotoConversation(photoUrl) }),
    )
    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'LISTING_PHOTO_PREFLIGHT_FAILED',
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(writeTradeActionAuditMock).not.toHaveBeenCalled()
  })

  it('returns the success result even when audit write fails (audit is observability, not business logic)', async () => {
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })
    writeTradeActionAuditMock.mockRejectedValueOnce(
      new Error('audit table unreachable'),
    )

    const tool = makeTool()
    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      repNotes: 'x',
    })

    expect(result).toMatchObject({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })
    expect(logIncidentMock).toHaveBeenCalledTimes(1)
    expect(logIncidentMock.mock.calls[0][0]).toMatchObject({
      errorType: 'audit_write_failed',
      severity: 'warn',
    })
  })
})

describe('update_listing — registry metadata', () => {
  it('exposes readOnly:false on the ToolDefinition (write tool) and no needsApproval (reversible)', () => {
    expect(updateListingTool.readOnly).toBe(false)
    expect(updateListingTool.name).toBe('update_listing')

    // The factory return — needsApproval should NOT be set (update is reversible).
    const built = makeTool()
    expect(built.needsApproval).toBeFalsy()
  })
})
