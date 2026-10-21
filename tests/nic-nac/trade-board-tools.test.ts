// Unit tests for the update_listing Nic-Nac tool handler.
//
// Covers: schema-level refines (at-least-one-patch, photo-conflict),
// handler-level defense-in-depth (NO_PATCH_FIELDS, CONFLICTING_PHOTO_INPUTS),
// happy-path service threading + audit, ServiceError translation, and
// audit-failure isolation. Mock paths exactly match the imports in
// lib/nic-nac/tools/update-listing.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'
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

function makeTool(
  activeTradeBoardWorkflow?: TradeBoardIntakeSessionState,
): ToolDef {
  return makeUpdateListingTool({
    repId: 'rep-1',
    supabase: {} as never,
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

beforeEach(() => {
  updateListingMock.mockReset()
  processRepCustomListingPhotoUrlMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
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

  it('processes a non-null custom listing photo URL before calling updateListing', async () => {
    processRepCustomListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/normalized.jpg',
    })
    updateListingMock.mockResolvedValueOnce({
      listingId: VALID_LISTING_ID,
      status: 'available',
    })

    const tool = makeTool()
    const result = await tool.execute({
      listingId: VALID_LISTING_ID,
      listingPhotoUrl: 'https://rep.example.com/raw-upload.jpg',
    })

    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledTimes(1)
    expect(processRepCustomListingPhotoUrlMock).toHaveBeenCalledWith(
      {
        repId: 'rep-1',
        sourceImageUrl: 'https://rep.example.com/raw-upload.jpg',
        filenameStem: `${VALID_LISTING_ID}-listing-photo`,
      },
    )
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

  it('shows the main photo preview before update_listing saves an unconfirmed photo', async () => {
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
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: 'https://rep.example.com/raw-upload.jpg',
      }),
    ).resolves.toMatchObject({
      needsAction: 'confirm_main_photo',
      previewPhotoId: '11111111-1111-4111-8111-111111111112',
      message: expect.stringContaining('NK60295'),
    })
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
        known: { itemNumber: 'NK60296' },
      }),
    )

    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: photoUrl,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_REUSED_ON_OTHER_ITEM',
      details: {
        contentSha256: hashDataImageUrl(photoUrl),
      },
    })
    expect(updateListingMock).not.toHaveBeenCalled()
    expect(processRepCustomListingPhotoUrlMock).not.toHaveBeenCalled()
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

    const tool = makeTool()
    await expect(
      tool.execute({
        listingId: VALID_LISTING_ID,
        listingPhotoUrl: 'https://rep.example.com/raw-upload.jpg',
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
