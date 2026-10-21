import { createHash } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reportJewelryCatalogIssueMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/services/jewelry-catalog-corrections', () => ({
  reportJewelryCatalogIssue: (...args: unknown[]) =>
    reportJewelryCatalogIssueMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { reportJewelryCatalogIssueTool } from '@/lib/nic-nac/tools/report-jewelry-catalog-issue'
import { hashDataImageUrl } from '@/lib/nic-nac/workflows/photo-reuse-guard'

interface ToolDef {
  description?: string
  needsApproval?: boolean
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function activeCatalogWorkflow() {
  return {
    id: 'workflow-catalog-1',
    repId: 'rep-1',
    conversationId: 'conversation-1',
    workflowType: 'trade_catalog_correction',
    status: 'active',
    phase: 'ready_to_report',
    intent: 'report_catalog_issue',
    knownFields: {
      itemNumber: 'ER13229',
      catalogIssueType: 'bad_photo',
    },
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'required',
  } as const
}

const CANONICAL_PHOTO_URL =
  'https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-er34579/front.png'
const DEFAULT_FETCH_SHA = createHash('sha256')
  .update(Uint8Array.from([1, 2, 3, 4]))
  .digest('hex')

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

function emptyPhotoAdmin() {
  return {
    from: () => queryResult({ data: [], error: null }),
  }
}

function conversationSupabase(
  rows: Array<{ role?: string; parts?: unknown }>,
) {
  return {
    from: (table: string) => {
      if (table !== 'nic_nac_conversations') {
        throw new Error(`unexpected table ${table}`)
      }
      return queryResult({ data: rows, error: null })
    },
  }
}

function confirmedCatalogConversation(itemNumber: string, photoUrl: string) {
  return [
    {
      role: 'user',
      parts: [{ type: 'text', text: 'Yes' }],
    },
    {
      role: 'assistant',
      parts: [
        {
          type: 'tool-report_jewelry_catalog_issue',
          output: {
            needsAction: 'confirm_main_photo',
            itemNumber,
            previewImageUrl: photoUrl,
            contentSha256: DEFAULT_FETCH_SHA,
            pieceKey: itemNumber,
          },
        },
      ],
    },
  ]
}

function makeTool(
  activeTradeWorkflow: ReturnType<typeof activeCatalogWorkflow> | null = null,
  extras: {
    supabase?: unknown
    activeTradeBoardWorkflow?: unknown
  } = {},
): ToolDef {
  return reportJewelryCatalogIssueTool.build({
    repId: 'rep-1',
    conversationId: 'conversation-1',
    runId: 'run-1',
    supabase: (extras.supabase ?? {}) as never,
    activeTradeWorkflow,
    activeTradeBoardWorkflow: extras.activeTradeBoardWorkflow as never,
  }) as unknown as ToolDef
}

const PREVIOUS_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  reportJewelryCatalogIssueMock.mockReset()
  createAdminClientMock.mockReset()
  createAdminClientMock.mockReturnValue({ __isAdmin: true })
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

describe('report_jewelry_catalog_issue', () => {
  it('passes admin client plus authenticated rep and conversation context to the service', async () => {
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'RG100',
      changedFields: ['collectionName'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      itemNumber: 'RG100',
      issueType: 'wrong_collection',
      reason: 'This is listed under the wrong collection.',
      correction: {
        collectionName: 'March Birthday',
        collectionYear: 2026,
        searchTags: ['rose gold', 'heart'],
        modelInventedDeleteFlag: 'please delete the duplicate',
      },
    })

    expect(result).toMatchObject({
      designId: 'design-1',
      corrected: true,
    })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      {
        itemNumber: 'RG100',
        repId: 'rep-1',
        conversationId: 'conversation-1',
        issueType: 'wrong_collection',
        reason: 'This is listed under the wrong collection.',
        correction: {
          collectionName: 'March Birthday',
          collectionYear: 2026,
          searchTags: ['rose gold', 'heart'],
        },
      },
    )
  })

  it('previews a canonical catalog photo and waits for yes before saving it', async () => {
    createAdminClientMock.mockReturnValueOnce(emptyPhotoAdmin())
    const tool = makeTool()

    const result = await tool.execute({
      itemNumber: 'ER34579',
      issueType: 'bad_photo',
      reason: 'The current catalog photo is the item label/details photo.',
      correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
    })

    expect(result).toMatchObject({
      needsAction: 'confirm_main_photo',
      code: 'MAIN_PHOTO_CONFIRMATION_REQUIRED',
      itemNumber: 'ER34579',
      previewImageUrl: CANONICAL_PHOTO_URL,
      message: expect.stringContaining('ER34579'),
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('saves a canonical catalog photo after the preview and a yes', async () => {
    createAdminClientMock
      .mockReturnValueOnce(emptyPhotoAdmin())
      .mockReturnValueOnce({ __isAdmin: true })
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-er34579',
      itemNumber: 'ER34579',
      changedFields: ['canonicalPhotoUrl'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool(
      null,
      {
        supabase: conversationSupabase(
          confirmedCatalogConversation('ER34579', CANONICAL_PHOTO_URL),
        ),
      },
    )
    const result = await tool.execute({
      itemNumber: 'ER34579',
      issueType: 'bad_photo',
      reason: 'The current catalog photo is the item label/details photo.',
      correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
    })

    expect(result).toMatchObject({
      designId: 'design-er34579',
      corrected: true,
    })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      expect.objectContaining({
        itemNumber: 'ER34579',
        repId: 'rep-1',
        conversationId: 'conversation-1',
        issueType: 'bad_photo',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    )
  })

  it('asks again when the yes is for a different photo or is not a short yes', async () => {
    createAdminClientMock.mockReturnValue(emptyPhotoAdmin())
    const tool = makeTool(
      null,
      {
        supabase: conversationSupabase([
          { role: 'user', parts: [{ type: 'text', text: 'yes but crop it' }] },
          {
            role: 'assistant',
            parts: [
              {
                output: {
                  needsAction: 'confirm_main_photo',
                  itemNumber: 'ER34579',
                  previewImageUrl: 'https://example.com/other-photo.png',
                },
              },
            ],
          },
        ]),
      },
    )

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
      previewImageUrl: CANONICAL_PHOTO_URL,
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('refuses a canonical photo that is already on another saved piece', async () => {
    createAdminClientMock.mockReturnValueOnce({
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
    const tool = makeTool()

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      userMessage: expect.stringContaining('NK60295'),
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('saves a reused catalog photo after one yes, with no second ask', async () => {
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
    const reusedAdmin = {
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
    }
    createAdminClientMock.mockReturnValueOnce(reusedAdmin)
    const first = makeTool()
    const ask = await first
      .execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      })
      .then(
        () => {
          throw new Error('expected the set ask')
        },
        (err: { userMessage?: string; details?: Record<string, unknown> }) => err,
      )
    expect(ask.details).toMatchObject({
      contentSha256,
      itemNumber: 'ER34579',
      pieceKey: 'ER34579',
      previewImageUrl: CANONICAL_PHOTO_URL,
    })

    createAdminClientMock
      .mockReturnValueOnce(reusedAdmin)
      .mockReturnValueOnce({ __isAdmin: true })
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-er34579',
      itemNumber: 'ER34579',
      changedFields: ['canonicalPhotoUrl'],
      issueLogged: true,
      corrected: true,
    })
    const second = makeTool(null, {
      supabase: conversationSupabase([
        { role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
        {
          role: 'assistant',
          parts: [
            {
              output: {
                code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                message: ask.userMessage,
                contentSha256,
                itemNumber: 'ER34579',
                pieceKey: 'ER34579',
                previewImageUrl: CANONICAL_PHOTO_URL,
              },
            },
          ],
        },
      ]),
    })

    await expect(
      second.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).resolves.toMatchObject({
      designId: 'design-er34579',
      corrected: true,
    })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledTimes(1)
  })

  it('does not download a canonical photo again when the intake already hashed it', async () => {
    const storedSha = 'cd'.repeat(32)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    createAdminClientMock.mockReturnValueOnce({
      from: () =>
        queryResult({
          data: [
            {
              trade_board_intake_sessions: {
                item_number: 'NK60295',
                status: 'completed',
                created_design_id: 'design-nk60295',
                created_listing_ids: [],
              },
            },
          ],
          error: null,
        }),
    })
    const tool = makeTool(null, {
      activeTradeBoardWorkflow: {
        photos: [{ imageUrl: CANONICAL_PHOTO_URL, contentSha256: storedSha }],
      },
    })

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      details: { contentSha256: storedSha },
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('does not save a canonical photo it cannot read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    )
    const tool = makeTool()

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_UNREADABLE',
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('refuses a catalog photo it cannot show instead of asking forever', async () => {
    createAdminClientMock.mockReturnValue(emptyPhotoAdmin())
    const tool = makeTool()
    const longUrl = `https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/${'a'.repeat(500)}.png`

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: longUrl },
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_PREVIEW_UNAVAILABLE',
      userMessage: expect.stringMatching(/didn't save it/i),
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it.each([
    ['data URL', 'data:image/jpeg;base64,TktK'],
    [
      '520-character storage link',
      `https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/${'a'.repeat(520 - 'https://project.supabase.co/storage/v1/object/public/jewelry-photos/approved/'.length - '.png'.length)}.png`,
    ],
  ])(
    'refuses a reused %s it cannot show before the reuse ask, and a following yes saves nothing',
    async (_label, canonicalPhotoUrl) => {
      if (!canonicalPhotoUrl.startsWith('data:')) expect(canonicalPhotoUrl).toHaveLength(520)
      const reusedAdmin = {
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
      }
      createAdminClientMock.mockReturnValue(reusedAdmin)
      const input = {
        itemNumber: 'ER34579',
        issueType: 'bad_photo' as const,
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl },
      }
      await expect(makeTool().execute(input)).rejects.toMatchObject({
        code: 'PHOTO_PREVIEW_UNAVAILABLE',
      })

      const contentSha256 = canonicalPhotoUrl.startsWith('data:')
        ? hashDataImageUrl(canonicalPhotoUrl)
        : DEFAULT_FETCH_SHA
      const afterYes = makeTool(null, {
        supabase: conversationSupabase([
          { role: 'user', parts: [{ type: 'text', text: 'Yes' }] },
          {
            role: 'assistant',
            parts: [
              {
                output: {
                  code: 'PHOTO_REUSED_ON_OTHER_ITEM',
                  contentSha256,
                  itemNumber: 'ER34579',
                  pieceKey: 'ER34579',
                  message:
                    'This photo is already on NK60295. If ER34579 belongs with that set, reply yes.',
                },
              },
            ],
          },
        ]),
      })
      await expect(afterYes.execute(input)).rejects.toMatchObject({
        code: 'PHOTO_PREVIEW_UNAVAILABLE',
      })
      expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
    },
  )

  it('saves a catalog photo yes from the hash and item, not the link text', async () => {
    createAdminClientMock
      .mockReturnValueOnce(emptyPhotoAdmin())
      .mockReturnValueOnce({ __isAdmin: true })
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-er34579',
      itemNumber: 'ER34579',
      changedFields: ['canonicalPhotoUrl'],
      issueLogged: true,
      corrected: true,
    })
    const tool = makeTool(null, {
      supabase: conversationSupabase(
        confirmedCatalogConversation('ER34579', 'https://example.com/different-link.png'),
      ),
    })

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).resolves.toMatchObject({ corrected: true })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledTimes(1)
  })

  it('does not treat a catalog photo yes as confirmation when that turn also has a new image', async () => {
    createAdminClientMock.mockReturnValue(emptyPhotoAdmin())
    const tool = makeTool(null, {
      supabase: conversationSupabase([
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
              type: 'tool-report_jewelry_catalog_issue',
              output: {
                needsAction: 'confirm_main_photo',
                itemNumber: 'ER34579',
                previewImageUrl: CANONICAL_PHOTO_URL,
                contentSha256: DEFAULT_FETCH_SHA,
                pieceKey: 'ER34579',
              },
            },
          ],
        },
      ]),
    })

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: { canonicalPhotoUrl: CANONICAL_PHOTO_URL },
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
    })
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('drops stray catalog photo URLs from non-photo corrections', async () => {
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13229',
      changedFields: ['material'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool()
    await tool.execute({
      itemNumber: 'ER13229',
      issueType: 'wrong_material',
      reason: 'The shared catalog material is wrong.',
      correction: {
        material: 'Silver',
        bpMsrp: 54,
        canonicalPhotoUrl:
          'https://static.example.invalid/sparkle-suite/current-catalog-photo.png',
      },
    })

    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      expect.objectContaining({
        issueType: 'wrong_material',
        correction: {
          material: 'Silver',
        },
      }),
    )
  })

  it('is registered as a write tool', () => {
    expect(reportJewelryCatalogIssueTool.name).toBe('report_jewelry_catalog_issue')
    expect(reportJewelryCatalogIssueTool.readOnly).toBe(false)
  })

  it('rejects catalog corrections that point at a different item than the active workflow', async () => {
    const tool = makeTool(activeCatalogWorkflow())

    await expect(
      tool.execute({
        itemNumber: 'NK99999',
        issueType: 'bad_photo',
        reason: 'Wrong photo.',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'WORKFLOW_TARGET_MISMATCH',
    })

    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('does not download a catalog photo that is not an approved storage photo', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const tool = makeTool()

    await expect(
      tool.execute({
        itemNumber: 'ER34579',
        issueType: 'bad_photo',
        reason: 'The current catalog photo is the item label/details photo.',
        correction: {
          canonicalPhotoUrl: 'https://evil.example/jewelry-photos/approved/front.png',
        },
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_NOT_APPROVED',
      userMessage: expect.stringMatching(/didn't save that one/i),
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('tells Nic-Nac to replace bad catalog photos only with approved jewelry-front photos', () => {
    const tool = makeTool()

    expect(tool.needsApproval).toBe(true)
    expect(tool.description).toContain('approved jewelry-front')
    expect(tool.description).toContain('label/details')
    expect(tool.description).toContain('canonical catalog photo')
    expect(tool.description).toContain('Requires explicit user approval')
  })
})
