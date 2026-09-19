// Unit tests for add_listing recovery payloads.
//
// Covers the vision-first photo flow refactor:
//   - NEEDS_FULL_INFO returns needsAction:'create_design' with the same
//     requiredFields contract Task 1.5B established (preserves the manual
//     URL fallback) and a vision-first message that explicitly forbids
//     URL-fishing and looping without piecePhotoUrl.
//   - The create-design retry branch still wires through when a real
//     piecePhotoUrl is supplied (regression guard for the manual fallback).
//   - NEEDS_COLLECTION asks for the exact collection name, then a retry can
//     pass collectionName through to the service layer.
//
// All external collaborators are mocked — no network, no Supabase. The tests
// invoke the real tool's execute() function so the runSingle branching and
// error-translation logic are exercised end-to-end.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServiceError, errors } from '@/lib/services/errors'
import type { ToolContext } from '@/lib/nic-nac/tools'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import type { TradeWorkflowSessionState } from '@/lib/nic-nac/workflows/trade-workflow-types'

const addListingMock = vi.fn()
const addListingBatchMock = vi.fn()
const addNonItemNumberListingMock = vi.fn()
const createDesignMock = vi.fn()
const resolveItemNumberMock = vi.fn()
const updateCanonicalPhotoMock = vi.fn()
const uploadJewelryPhotoMock = vi.fn()
const uploadCatalogDesignSourcePhotoCallMock = vi.fn()
const uploadStagedOriginalPhotoMock = vi.fn()
const removeCatalogDesignPhotoAssetsMock = vi.fn()
const publishApprovedPhotoMock = vi.fn()
const updatePhotoPipelineStateMock = vi.fn()
const executePhotoEnhancementMock = vi.fn()
const getPhotoroomConfigMock = vi.fn()
const analyzeServerImageQualityMock = vi.fn()
const decideCanonicalEnhancedPhotoMock = vi.fn()
const processRepListingPhotoUrlMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()
const updateTradeBoardIntakeSessionMock = vi.fn()
const completeTradeWorkflowSessionMock = vi.fn()
const resolveTradeSwapReplacementListingMock = vi.fn()
const createAdminClientMock = vi.fn()
const fetchMock = vi.fn()

function makeCleanAnalysis(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    contentType: 'image/png',
    width: 1800,
    height: 1800,
    blurRisk: 0.05,
    lightingRisk: 0.05,
    detailRisk: 0.04,
    backgroundDistractionRisk: 0.06,
    subjectCoverage: 0.42,
    subjectCentered: true,
    detailConfidence: 0.96,
    backgroundUniformity: 0.94,
    backgroundCleanliness: 0.94,
    ...overrides,
  }
}

vi.mock('@/lib/services/trade-board', () => ({
  addListing: (...args: unknown[]) => addListingMock(...args),
  addListingBatch: (...args: unknown[]) => addListingBatchMock(...args),
  addNonItemNumberListing: (...args: unknown[]) =>
    addNonItemNumberListingMock(...args),
}))

vi.mock('@/lib/services/trade-swaps', () => ({
  resolveTradeSwapReplacementListing: (...args: unknown[]) =>
    resolveTradeSwapReplacementListingMock(...args),
}))

vi.mock('@/lib/services/jewelry-database', () => ({
  createDesign: (...args: unknown[]) => createDesignMock(...args),
  resolveItemNumber: (...args: unknown[]) => resolveItemNumberMock(...args),
  updateCanonicalPhoto: (...args: unknown[]) => updateCanonicalPhotoMock(...args),
  updatePhotoPipelineState: (...args: unknown[]) =>
    updatePhotoPipelineStateMock(...args),
}))

vi.mock('@/lib/services/storage', () => ({
  uploadJewelryPhoto: (...args: unknown[]) => uploadJewelryPhotoMock(...args),
  uploadCatalogDesignSourcePhoto: async (
    repId: unknown,
    _designId: unknown,
    data: unknown,
    filename: unknown,
  ) => {
    uploadCatalogDesignSourcePhotoCallMock(repId, _designId, data, filename)
    const publicUrl = await uploadJewelryPhotoMock(repId, data, filename)
    return {
      objectPath: `mock-design-assets/${String(filename)}`,
      publicUrl,
    }
  },
  uploadStagedOriginalPhoto: (
    repId: unknown,
    data: unknown,
    filename: unknown,
  ) => uploadStagedOriginalPhotoMock(repId, data, filename),
  removeCatalogDesignPhotoAssets: (...args: unknown[]) =>
    removeCatalogDesignPhotoAssetsMock(...args),
  publishApprovedPhoto: (...args: unknown[]) => publishApprovedPhotoMock(...args),
}))

vi.mock('@/lib/services/photo-enhancement', () => ({
  executePhotoEnhancement: (...args: unknown[]) =>
    executePhotoEnhancementMock(...args),
}))

vi.mock('@/lib/services/server-image-quality', () => ({
  analyzeServerImageQuality: (...args: unknown[]) =>
    analyzeServerImageQualityMock(...args),
}))

vi.mock('@/lib/services/photo-enhancement-qa', () => ({
  decideCanonicalEnhancedPhoto: (...args: unknown[]) =>
    decideCanonicalEnhancedPhotoMock(...args),
}))

vi.mock('@/lib/services/listing-photo-processing', () => ({
  processRepListingPhotoUrl: (...args: unknown[]) =>
    processRepListingPhotoUrlMock(...args),
}))

vi.mock('@/lib/photoroom/config', () => ({
  getPhotoroomConfig: (...args: unknown[]) => getPhotoroomConfigMock(...args),
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

vi.mock('@/lib/nic-nac/workflows/trade-board-intake-store', () => ({
  updateTradeBoardIntakeSession: (...args: unknown[]) =>
    updateTradeBoardIntakeSessionMock(...args),
}))

vi.mock('@/lib/nic-nac/workflows/trade-workflow-store', () => ({
  completeTradeWorkflowSession: (...args: unknown[]) =>
    completeTradeWorkflowSessionMock(...args),
}))

import { makeAddListingTool } from '@/lib/nic-nac/tools/add-listing'

interface AddListingToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeTool(
  supabase: unknown = makeConversationLookupMock([]),
  contextOverrides: Partial<ToolContext> = {},
): AddListingToolDef {
  return makeAddListingTool({
    repId: 'rep-1',
    supabase: supabase as never,
    conversationId: 'conv-1',
    runId: 'run-1',
    ...contextOverrides,
  } as ToolContext) as unknown as AddListingToolDef
}

function activeWorkflow(
  overrides: Partial<TradeBoardIntakeSessionState> = {},
): TradeBoardIntakeSessionState {
  return {
    id: 'workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'photo_capture',
    known: {
      rarityClassification: 'standard',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
    },
    missing: ['jewelryFrontPhoto'],
    blockers: [],
    warnings: [],
    metadata: {},
    photos: [
      {
        attachmentIndex: 1,
        declaredRole: 'label_details',
        visualRole: 'jewelry',
        roleConfirmed: true,
        quality: 'usable',
        qualityIssues: [],
        notes: ['backs of earrings visible'],
      },
    ],
    ...overrides,
    known: {
      rarityClassification: 'standard',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      ...(overrides.known ?? {}),
    },
  }
}

function activeSwapCleanupWorkflow(
  overrides: Partial<TradeWorkflowSessionState> = {},
): TradeWorkflowSessionState {
  return {
    id: 'cleanup-workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_swap_cleanup',
    status: 'active',
    phase: 'ready_to_update',
    intent: 'resolve_swap_cleanup',
    knownFields: {
      swapId: 'swap-1',
      requestId: 'request-1',
      revealedItemNumber: 'NK12345',
      itemNumber: 'NK12345',
    },
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'not_required',
    ...overrides,
  }
}

function makeImageResponse(
  bytes: Uint8Array,
  contentType = 'image/png',
  status = 200,
) {
  return new Response(Buffer.from(bytes), {
    status,
    headers: {
      'content-type': contentType,
    },
  })
}

// Chainable supabase mock matching the call shape used by
// resolvePhotoFromConversation: from(table).select().eq().eq().eq().order().order()
function makeConversationLookupMock(
  rows: Array<{ parts: unknown; role?: string }>,
) {
  const result = { data: rows, error: null as unknown }
  // Each chain method returns the same chain; the terminal `.order()` is
  // awaited for `{ data, error }`. Returning `result` from .order() works
  // because `await result` resolves to result itself (no thenable).
  const chain: Record<string, unknown> = { ...result }
  const passthrough = () => chain
  chain.select = passthrough
  chain.eq = passthrough
  chain.in = passthrough
  chain.order = passthrough
  chain.limit = passthrough
  return {
    from: (table: string) => {
      if (table !== 'nic_nac_conversations') {
        throw new Error(`unexpected table ${table}`)
      }
      return chain
    },
  }
}

function makeAdminClientMock(
  existingListings: Array<Record<string, unknown>> = [],
  committedDesign: Record<string, unknown> | null = null,
) {
  const duplicateLimit = vi.fn().mockResolvedValue({
    data: existingListings,
    error: null,
  })
  const duplicateNeq = vi.fn(() => ({ limit: duplicateLimit }))
  const duplicateDesignEq = vi.fn(() => ({ neq: duplicateNeq }))
  const duplicateRepEq = vi.fn(() => ({ eq: duplicateDesignEq }))
  const duplicateSelect = vi.fn(() => ({ eq: duplicateRepEq }))

  return {
    from: vi.fn((table: string) => {
      if (table === 'trade_listings') {
        return { select: duplicateSelect }
      }
      if (table === 'jewelry_designs') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: committedDesign,
          error: null,
        })
        const eq = vi.fn(() => ({ maybeSingle }))
        const select = vi.fn(() => ({ eq }))
        return { select }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  }
}

beforeEach(() => {
  addListingMock.mockReset()
  addListingBatchMock.mockReset()
  addNonItemNumberListingMock.mockReset()
  createDesignMock.mockReset()
  resolveItemNumberMock.mockReset()
  resolveItemNumberMock.mockResolvedValue({ found: false })
  updateCanonicalPhotoMock.mockReset()
  uploadJewelryPhotoMock.mockReset()
  uploadCatalogDesignSourcePhotoCallMock.mockReset()
  uploadStagedOriginalPhotoMock.mockReset()
  removeCatalogDesignPhotoAssetsMock.mockReset()
  publishApprovedPhotoMock.mockReset()
  updatePhotoPipelineStateMock.mockReset()
  executePhotoEnhancementMock.mockReset()
  getPhotoroomConfigMock.mockReset()
  analyzeServerImageQualityMock.mockReset()
  decideCanonicalEnhancedPhotoMock.mockReset()
  processRepListingPhotoUrlMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
  updateTradeBoardIntakeSessionMock.mockReset()
  completeTradeWorkflowSessionMock.mockReset()
  resolveTradeSwapReplacementListingMock.mockReset()
  createAdminClientMock.mockReset()
  createAdminClientMock.mockReturnValue(makeAdminClientMock())
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  analyzeServerImageQualityMock.mockResolvedValue(makeCleanAnalysis())
  getPhotoroomConfigMock.mockReturnValue(null)
})

describe('add_listing — NEEDS_FULL_INFO recovery payload', () => {
  it('returns needsAction:create_design with vision-first contract (piecePhotoUrl moved to optional)', async () => {
    addListingMock.mockRejectedValueOnce(errors.NEEDS_FULL_INFO('DR-999'))

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'DR-999',
      clickwrapAccepted: true,
    })

    expect(result.needsAction).toBe('create_design')
    expect(result.itemNumber).toBe('DR-999')
    expect(result.requiredFields).toEqual(['designName', 'collectionName'])
    expect(result.optionalFields).toEqual([
      'piecePhotoIndex',
      'listingPhotoIndex',
      'material',
      'mainStone',
      'bpMsrp',
      'collectionYear',
      'searchTags',
      'specialFeatures',
      'lengthInfo',
    ])
  })

  it('message instructs vision-first extraction, Birthday collection normalization, photo indexes, and automatic photo upload', async () => {
    addListingMock.mockRejectedValueOnce(errors.NEEDS_FULL_INFO('DR-999'))

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'DR-999',
      clickwrapAccepted: true,
    })

    const message = result.message as string
    expect(message).toContain("Use vision on the rep's photos")
    expect(message).toContain('designName and any optional metadata')
    expect(message).toContain('Sparkle Suite jewelry database')
    expect(message).toContain('Birthday Collection month/year')
    expect(message).toContain('collectionName like "March Birthday 2026"')
    expect(message).toContain('piecePhotoIndex or listingPhotoIndex')
    expect(message).toContain('recent add-flow photo order')
    expect(message).toContain('Boxed display photos with clear jewelry are acceptable')
    expect(message).toContain('Do not treat label/details photos as bad jewelry photos')
    expect(message).toContain('A label/details photo is only a label/details photo')
    expect(message).toContain(
      'Visible jewelry in that label/details photo does not satisfy the jewelry photo requirement',
    )
    expect(message).toContain('Do not ask for unboxed, no-packaging, or plain-background retakes')
    expect(message).toContain('Do not ask for retakes without the box/card or on a plain surface')
    expect(message).toContain('handler uploads the photo from chat automatically')
    expect(message).not.toMatch(/\b(?:photo URL|direct image link|direct link|cloud link)\b/i)
  })
})

describe('add_listing — manual URL fallback (Task 1.5B regression guard)', () => {
  it('runs the create-design retry path when the model supplies a real piecePhotoUrl', async () => {
    fetchMock.mockResolvedValueOnce(makeImageResponse(new Uint8Array([1, 2, 3])))
    analyzeServerImageQualityMock.mockResolvedValueOnce({
      contentType: 'image/png',
      width: 1800,
      height: 1800,
      blurRisk: 0.05,
      lightingRisk: 0.05,
      detailRisk: 0.04,
      backgroundDistractionRisk: 0.06,
      subjectCoverage: 0.42,
      subjectCentered: true,
      detailConfidence: 0.96,
      backgroundUniformity: 0.94,
      backgroundCleanliness: 0.94,
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/manual-source.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/manual-source.jpg',
      signedUrl: 'https://signed.example.com/manual-source',
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      piecePhotoUrl: 'https://dropbox.example/photo.jpg',
      collectionName: 'Lustre',
      collectionYear: 2026,
      searchTags: ['rose gold', 'heart'],
    })

    expect(createDesignMock).toHaveBeenCalledTimes(1)
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/manual-source.jpg',
      collectionName: 'Lustre',
      collectionYear: 2026,
      searchTags: ['rose gold', 'heart'],
      photoPipeline: {
        originalPath: 'rep-1/originals/manual-source.jpg',
        originalUrl: 'https://signed.example.com/manual-source',
        status: 'ready',
        preflightScore: 100,
        preflightIssues: [],
      },
    })
    expect(createDesignMock.mock.calls[0][1].piecePhotoUrl).toBe(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/manual-source.jpg',
    )
    expect(fetchMock).toHaveBeenCalledWith('https://dropbox.example/photo.jpg')
    expect(uploadStagedOriginalPhotoMock).toHaveBeenCalledTimes(1)
    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'NEW-100',
      createdNewDesign: true,
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('does not try to recreate an existing catalog design when recovery fields are present', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-existing',
        itemNumber: 'NK18149',
        designName: 'The Harper Necklace',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'NK18149',
      designName: 'The Harper Necklace',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NK18149',
      designName: 'The Harper Necklace',
      collectionName: 'April Birthday',
    })

    expect(createDesignMock).not.toHaveBeenCalled()
    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      itemNumber: 'NK18149',
      collectionName: 'April Birthday',
    })
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      createdNewDesign: false,
    })
  })

  it('links an active swap cleanup workflow to the replacement listing it just added', async () => {
    const adminClient = makeAdminClientMock()
    createAdminClientMock.mockReturnValue(adminClient)
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-existing',
        itemNumber: 'NK12345',
        designName: 'Moonlit Pendant',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'replacement-listing-1',
      designId: 'design-existing',
      itemNumber: 'NK12345',
      designName: 'Moonlit Pendant',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    resolveTradeSwapReplacementListingMock.mockResolvedValueOnce({
      swapId: 'swap-1',
      requestId: 'request-1',
      replacementListingId: 'replacement-listing-1',
      replacementStatus: 'added_to_board',
      fulfillmentId: 'fulfillment-1',
    })

    const workflow = activeSwapCleanupWorkflow()
    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeWorkflow: workflow,
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK12345',
        designName: 'Moonlit Pendant',
        collectionName: 'July Birthday',
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'replacement-listing-1',
      createdNewDesign: false,
    })

    expect(resolveTradeSwapReplacementListingMock).toHaveBeenCalledWith(
      adminClient,
      'rep-1',
      {
        swapId: 'swap-1',
        replacementListingId: 'replacement-listing-1',
      },
    )
    expect(completeTradeWorkflowSessionMock).toHaveBeenCalledWith(
      adminClient,
      workflow,
      expect.objectContaining({
        knownFields: expect.objectContaining({
          swapId: 'swap-1',
          requestId: 'request-1',
          itemNumber: 'NK12345',
          revealedItemNumber: 'NK12345',
        }),
        dbAssertions: {
          tradeSwap: {
            id: 'swap-1',
            requestId: 'request-1',
            replacementListingId: 'replacement-listing-1',
            replacementStatus: 'added_to_board',
          },
          fulfillment: {
            id: 'fulfillment-1',
            requestId: 'request-1',
            receivedListingId: 'replacement-listing-1',
          },
        },
        publicProof: {
          replacementListingShouldBeVisible: true,
          replacementListingId: 'replacement-listing-1',
        },
        createdMutationIds: expect.arrayContaining([
          { kind: 'trade_swap', id: 'swap-1' },
          { kind: 'listing', id: 'replacement-listing-1' },
          { kind: 'fulfillment', id: 'fulfillment-1' },
        ]),
      }),
    )
  })

  it('uses a confirmed workflow photo as a listing photo when recovery fields find an existing design', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-existing',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
      },
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,Qk9YRUQ=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
        collectionYear: 2026,
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 160,
        piecePhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      createdNewDesign: false,
    })

    expect(createDesignMock).not.toHaveBeenCalled()
    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'data:image/jpeg;base64,Qk9YRUQ=',
      filenameStem: 'ER13229-listing-photo',
      mutationAssetKey: expect.any(String),
    }, { confirmedJewelryFront: true })
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'ER13229',
        collectionName: 'July Birthday',
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
      }),
    )
  })

  it('creates a new catalog variant when the same item number has a different plating', async () => {
    resolveItemNumberMock.mockImplementation(
      (_admin: unknown, itemNumber: string, options?: { material?: string }) => {
        if (options?.material === 'Hematite Plating') {
          return Promise.resolve({
            found: false,
            itemNumber,
            variantCandidates: [
              {
                designId: 'design-rhodium',
                itemNumber,
                designName: 'The Piper Necklace',
                material: 'Rhodium Plating',
              },
            ],
          })
        }

        return Promise.resolve({
          found: true,
          hasCollection: true,
          design: {
            id: 'design-rhodium',
            itemNumber,
            designName: 'The Piper Necklace',
            material: 'Rhodium Plating',
            canonicalPhotoUrl: 'https://cdn.example.com/nk12032-rhodium.png',
          },
        })
      },
    )
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/piper-hematite.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/piper-hematite.jpg',
      signedUrl: 'https://signed.example.com/piper-hematite',
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-hematite',
      itemNumber: 'NK12032',
      collectionId: 'coll-1',
      collectionName: 'July Birthday 2026',
      typePrefix: 'NK',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-hematite',
      designId: 'design-hematite',
      itemNumber: 'NK12032',
      designName: 'The Piper Necklace',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'NK12032',
          designName: 'The Piper Necklace',
          collectionName: 'July Birthday 2026',
          material: 'Hematite Plating',
          mainStone: 'Lab-Created Ruby',
          bpMsrp: 138,
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SEVNQVRJVEU=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK12032',
        designName: 'The Piper Necklace',
        collectionName: 'July Birthday 2026',
        material: 'Hematite Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 138,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-hematite',
      designId: 'design-hematite',
      createdNewDesign: true,
    })

    expect(resolveItemNumberMock).toHaveBeenCalledWith(
      expect.anything(),
      'NK12032',
      { material: 'Hematite Plating', mainStone: 'Lab-Created Ruby' },
    )
    expect(createDesignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemNumber: 'NK12032',
        designName: 'The Piper Necklace',
        material: 'Hematite Plating',
      }),
    )
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'NK12032',
        material: 'Hematite Plating',
      }),
    )
  })

  it('creates ER59000 Ruby beside the existing Rose Quartz design with a distinct internal variant id', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: false,
      itemNumber: 'ER59000',
      variantCandidates: [
        {
          designId: 'design-rose-quartz',
          itemNumber: 'ER59000',
          designName: 'Baguette Braid Sparkle',
          material: 'Rhodium Plating',
          mainStone: 'Rose Quartz Cubic Zirconia',
        },
      ],
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/rep-1/designs/design-ruby/ER59000-source.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath:
        'rep-1/designs/design-ruby/uuid-ER59000-original.jpg',
      signedUrl: 'https://signed.example.com/ER59000-ruby-original',
    })
    createDesignMock.mockImplementationOnce(
      async (_admin: unknown, input: { designId: string }) => ({
        designId: input.designId,
        itemNumber: 'ER59000',
        collectionId: 'coll-og',
        collectionName: 'OG',
        typePrefix: 'ER',
      }),
    )
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-ruby',
      designId: 'design-ruby',
      itemNumber: 'ER59000',
      designName: 'Baguette Braid Sparkle',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'ER59000',
          designName: 'Baguette Braid Sparkle',
          collectionName: 'OG',
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
          bpMsrp: 128,
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,UlVCWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: ['Ruby customer-facing photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER59000',
        designName: 'Baguette Braid Sparkle',
        collectionName: 'OG',
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 128,
        piecePhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-ruby',
      itemNumber: 'ER59000',
      createdNewDesign: true,
    })

    const internalVariantId = createDesignMock.mock.calls[0][1].designId
    expect(internalVariantId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(uploadCatalogDesignSourcePhotoCallMock).toHaveBeenCalledWith(
      'rep-1',
      internalVariantId,
      expect.stringMatching(/^data:image\/png;base64,/),
      'ER59000-source',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      designId: internalVariantId,
      itemNumber: 'ER59000',
      material: 'Rhodium Plating',
      mainStone: 'Lab-Created Ruby',
    })
    expect(resolveItemNumberMock).toHaveBeenCalledWith(
      expect.anything(),
      'ER59000',
      {
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
      },
    )
  })

  it('cleans the Ruby variant photo assets when catalog creation fails so retry is safe', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: false,
      itemNumber: 'ER59000',
      variantCandidates: [],
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/rep-1/designs/design-ruby/ER59000-source.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath:
        'rep-1/designs/design-ruby/uuid-ER59000-original.jpg',
      signedUrl: 'https://signed.example.com/ER59000-ruby-original',
    })
    createDesignMock.mockRejectedValueOnce(
      new Error('catalog insert failed'),
    )

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'ER59000',
          designName: 'Baguette Braid Sparkle',
          collectionName: 'OG',
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,UlVCWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER59000',
        designName: 'Baguette Braid Sparkle',
        collectionName: 'OG',
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        piecePhotoIndex: 1,
      }),
    ).rejects.toBeDefined()

    expect(removeCatalogDesignPhotoAssetsMock).toHaveBeenCalledWith({
      publicObjectPath: 'mock-design-assets/ER59000-source',
      stagedObjectPath:
        'rep-1/designs/design-ruby/uuid-ER59000-original.jpg',
    })
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('keeps variant assets when a failed create response is read back as committed', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: false,
      itemNumber: 'ER59000',
      variantCandidates: [],
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://cdn.example.com/rep-1/designs/design-ruby/ER59000-source.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/designs/design-ruby/uuid-ER59000-original.jpg',
      signedUrl: 'https://signed.example.com/ER59000-ruby-original',
    })
    createDesignMock.mockRejectedValueOnce(new Error('response lost'))
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-ruby',
      designId: 'design-ruby',
      itemNumber: 'ER59000',
      designName: 'Baguette Braid Sparkle',
      status: 'available',
      usesCanonicalPhoto: false,
      quantityAvailable: 1,
      groupedWithExisting: false,
    })
    createAdminClientMock.mockReturnValue(
      makeAdminClientMock([], {
        id: 'design-ruby',
        item_number: 'ER59000',
        design_name: 'Baguette Braid Sparkle',
        type_prefix: 'ER',
        collection_id: 'collection-og',
        search_tags: [],
        material: 'Rhodium Plating',
        main_stone: 'Lab-Created Ruby',
        canonical_photo_url:
          'https://cdn.example.com/rep-1/designs/design-ruby/ER59000-source.jpg',
      }),
    )

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,UlVCWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER59000',
        designName: 'Baguette Braid Sparkle',
        collectionName: 'OG',
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        piecePhotoIndex: 1,
      }),
    ).resolves.toMatchObject({ listingId: 'listing-ruby' })

    expect(removeCatalogDesignPhotoAssetsMock).not.toHaveBeenCalled()
  })

  it('processes a rep-level custom listing photo before creating the board listing', async () => {
    fetchMock.mockResolvedValueOnce(makeImageResponse(new Uint8Array([4, 5, 6])))
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/ring-enhanced.png',
    })

    const tool = makeTool()
    await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      piecePhotoUrl: 'https://dropbox.example/photo.jpg',
      collectionName: 'Lustre',
      listingPhotoUrl: 'https://rep.example.com/raw-listing.jpg',
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'https://rep.example.com/raw-listing.jpg',
      filenameStem: 'NEW-100-listing-photo',
      mutationAssetKey: expect.any(String),
    })
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      listingPhotoUrl: 'https://cdn.example.com/listings/rep-1/ring-enhanced.png',
    })
  })

  it('uses the only image in the current user message as the listing photo for existing designs', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER76003',
      designName: 'The Elodie Luxe',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/elodie-jewelry.png',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Please add to my dance floor' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER76003',
      clickwrapAccepted: true,
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'data:image/jpeg;base64,SkVXRUw=',
      filenameStem: 'ER76003-listing-photo',
      mutationAssetKey: expect.any(String),
    })
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      listingPhotoUrl: 'https://cdn.example.com/listings/rep-1/elodie-jewelry.png',
    })
  })

  it('does not guess a listing photo when a label/card photo and jewelry photo are both present', async () => {
    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Please add to my dance floor' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER76003',
        clickwrapAccepted: true,
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_CHOICE_REQUIRED',
      userMessage: expect.stringContaining('actual jewelry photo'),
    })
    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('uses an explicit listingPhotoIndex to pick the jewelry-front photo from a multi-photo message', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/for-keeps-front.png',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'First photo is the front, second is the label.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER13743',
      listingPhotoIndex: 1,
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'data:image/jpeg;base64,SkVXRUw=',
      filenameStem: 'ER13743-listing-photo',
      mutationAssetKey: expect.any(String),
    })
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      itemNumber: 'ER13743',
      listingPhotoUrl:
        'https://cdn.example.com/listings/rep-1/for-keeps-front.png',
    })
  })

  it('uses the most recent prior chat photo after the rep confirms it in a text-only turn', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [{ type: 'text', text: 'Correct.' }],
      },
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
          {
            type: 'text',
            text: 'It is a July birthday collection, 2026.',
          },
        ],
      },
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUxfUEhPVE8=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
      filenameStem: 'ER13229-listing-photo',
      mutationAssetKey: expect.any(String),
    })
    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
      listingPhotoUrl:
        'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    })
  })

  it('treats listingPhotoIndex as a recent-conversation photo number when the latest turn is text-only', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl: 'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [{ type: 'text', text: 'Correct.' }],
      },
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
        ],
      },
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUxfUEhPVE8=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER13229',
      listingPhotoIndex: 2,
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith({
      repId: 'rep-1',
      sourceImageUrl: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
      filenameStem: 'ER13229-listing-photo',
      mutationAssetKey: expect.any(String),
    })
  })
})

describe('add_listing — vision-first photo extraction (Task 1.5B closure)', () => {
  it('uploads the most recent user-uploaded image from chat and passes its public URL into createDesign', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/abc.jpg',
      signedUrl: 'https://signed.example.com/original',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'add this' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,AAAA',
            width: 1800,
            height: 1800,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      collectionName: 'Lustre',
      // no piecePhotoUrl — handler resolves it from chat history
    })

    expect(uploadJewelryPhotoMock).toHaveBeenCalledTimes(1)
    expect(uploadJewelryPhotoMock.mock.calls[0][0]).toBe('rep-1')
    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,AAAA',
    )
    expect(uploadStagedOriginalPhotoMock).toHaveBeenCalledWith(
      'rep-1',
      'data:image/png;base64,AAAA',
      'NEW-100-original',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NEW-100',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
      collectionName: 'Lustre',
      photoPipeline: {
        originalPath: 'rep-1/originals/abc.jpg',
        originalUrl: 'https://signed.example.com/original',
        status: 'ready',
        preflightScore: 100,
        preflightIssues: [],
      },
    })
    expect(result).toMatchObject({
      createdNewDesign: true,
      listingId: 'listing-1',
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
  })

  it('uses the only chat image as the new canonical design photo', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-101',
      designName: 'Pearl Drop Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-101',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'ER',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/jewelry.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/jewelry.jpg',
      signedUrl: 'https://signed.example.com/jewelry',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'add this' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-101',
      clickwrapAccepted: true,
      designName: 'Pearl Drop Earrings',
      collectionName: 'Lustre',
    })

    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,SkVXRUw=',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/jewelry.jpg',
    })
  })

  it('does not create a new canonical design photo from an ambiguous multi-photo chat message', async () => {
    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'add this' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NEW-101',
        clickwrapAccepted: true,
        designName: 'Pearl Drop Earrings',
        collectionName: 'Lustre',
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_CHOICE_REQUIRED',
      userMessage: expect.stringContaining('actual jewelry photo'),
    })
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
    expect(uploadStagedOriginalPhotoMock).not.toHaveBeenCalled()
    expect(createDesignMock).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
  })

  it('uses an explicit piecePhotoIndex to create a new design from the jewelry-front photo', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13743',
      collectionId: 'coll-1',
      collectionName: 'March Birthday',
      typePrefix: 'ER',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/for-keeps.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/for-keeps.jpg',
      signedUrl: 'https://signed.example.com/for-keeps',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'First photo is the front, second is the label.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      collectionName: 'March Birthday',
      collectionYear: 2026,
      mainStone: 'Aquamarine Cubic Zirconia',
      material: 'Rhodium Plating',
      bpMsrp: 138,
      piecePhotoIndex: 1,
    })

    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,SkVXRUw=',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      collectionName: 'March Birthday',
      collectionYear: 2026,
      mainStone: 'Aquamarine Cubic Zirconia',
      material: 'Rhodium Plating',
      bpMsrp: 138,
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/for-keeps.jpg',
    })
    expect(result).toMatchObject({
      mode: 'single',
      itemNumber: 'ER13743',
      createdNewDesign: true,
    })
  })

  it('uses the later jewelry-front upload after an earlier label/details photo', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13743',
      collectionId: 'coll-1',
      collectionName: 'March Birthday',
      typePrefix: 'ER',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/for-keeps-front.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/for-keeps-front.jpg',
      signedUrl: 'https://signed.example.com/for-keeps-front',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Here is the jewelry-front photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SlRZ',
          },
        ],
      },
      {
        parts: [
          { type: 'text', text: 'Here is the label/details photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      collectionName: 'March Birthday',
      collectionYear: 2026,
      mainStone: 'Aquamarine Cubic Zirconia',
      material: 'Rhodium Plating',
      bpMsrp: 138,
    })

    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,SlRZ',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'ER13743',
      designName: 'For Keeps',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/for-keeps-front.jpg',
    })
  })

  it('recovers a batch of same-item new designs by creating the design once and adding each physical unit', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NK18149',
      designName: 'The Harper Necklace',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    addListingBatchMock
      .mockResolvedValueOnce({
        added: [],
        pending: {
          needCollection: [],
          needFullInfo: [
            { itemNumber: 'NK18149' },
            { itemNumber: 'NK18149' },
            { itemNumber: 'NK18149' },
            { itemNumber: 'NK18149' },
          ],
        },
      })
      .mockResolvedValueOnce({
        added: [
          {
            listingId: 'listing-2',
            designId: 'design-1',
            itemNumber: 'NK18149',
            designName: 'The Harper Necklace',
            status: 'available',
            usesCanonicalPhoto: true,
          },
          {
            listingId: 'listing-3',
            designId: 'design-1',
            itemNumber: 'NK18149',
            designName: 'The Harper Necklace',
            status: 'available',
            usesCanonicalPhoto: true,
          },
          {
            listingId: 'listing-4',
            designId: 'design-1',
            itemNumber: 'NK18149',
            designName: 'The Harper Necklace',
            status: 'available',
            usesCanonicalPhoto: true,
          },
        ],
        pending: { needCollection: [], needFullInfo: [] },
      })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NK18149',
      collectionId: 'coll-1',
      collectionName: 'April Birthday',
      typePrefix: 'NK',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/harper.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/harper.jpg',
      signedUrl: 'https://signed.example.com/harper',
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    const result = await tool.execute({
      mode: 'batch',
      items: [
        {
          itemNumber: 'NK18149',
          designName: 'The Harper Necklace',
          collectionName: 'April Birthday',
        },
        {
          itemNumber: 'NK18149',
          designName: 'The Harper Necklace',
          collectionName: 'April Birthday',
        },
        {
          itemNumber: 'NK18149',
          designName: 'The Harper Necklace',
          collectionName: 'April Birthday',
        },
        {
          itemNumber: 'NK18149',
          designName: 'The Harper Necklace',
          collectionName: 'April Birthday',
        },
      ],
    })

    expect(createDesignMock).toHaveBeenCalledTimes(1)
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NK18149',
      designName: 'The Harper Necklace',
      collectionName: 'April Birthday',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/harper.jpg',
    })
    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(addListingBatchMock).toHaveBeenCalledTimes(2)
    expect(addListingBatchMock.mock.calls[1][2]).toMatchObject({
      items: [
        { itemNumber: 'NK18149' },
        { itemNumber: 'NK18149' },
        { itemNumber: 'NK18149' },
      ],
    })
    expect(result).toMatchObject({
      mode: 'batch',
      added: [
        { listingId: 'listing-1', itemNumber: 'NK18149' },
        { listingId: 'listing-2', itemNumber: 'NK18149' },
        { listingId: 'listing-3', itemNumber: 'NK18149' },
        { listingId: 'listing-4', itemNumber: 'NK18149' },
      ],
      summary: {
        addedCount: 4,
        needFullInfoCount: 0,
      },
    })
  })

  it('blocks the create-design path with coaching when the recovered chat photo is too small', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      makeCleanAnalysis({
        width: 640,
        height: 640,
      }),
    )
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/tiny.jpg',
    )

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,BBBB',
            width: 640,
            height: 640,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NEW-100',
        clickwrapAccepted: true,
        designName: 'Sapphire Halo',
        collectionName: 'Lustre',
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_PREFLIGHT_FAILED',
      userMessage: expect.stringContaining('That photo needs one more try'),
    })
    expect(createDesignMock).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
    expect(uploadStagedOriginalPhotoMock).not.toHaveBeenCalled()
  })

  it('blocks the create-design path when advisory blur and framing signals are poor even at decent resolution', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      makeCleanAnalysis({
        blurRisk: 0.84,
        lightingRisk: 0.76,
        detailRisk: 0.83,
        backgroundDistractionRisk: 0.86,
        subjectCoverage: 0.1,
        subjectCentered: false,
        detailConfidence: 0.12,
        backgroundUniformity: 0.35,
        backgroundCleanliness: 0.14,
      }),
    )
    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,CCCC',
            width: 1800,
            height: 1800,
            blurRisk: 0.84,
            lightingRisk: 0.76,
            subjectCoverage: 0.1,
            subjectCentered: false,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NEW-100',
        clickwrapAccepted: true,
        designName: 'Sapphire Halo',
        collectionName: 'Lustre',
      }),
    ).rejects.toMatchObject({
      code: 'PHOTO_PREFLIGHT_FAILED',
      userMessage: expect.stringContaining('That photo needs one more try'),
    })
    expect(createDesignMock).not.toHaveBeenCalled()
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
    expect(uploadStagedOriginalPhotoMock).not.toHaveBeenCalled()
  })

  it('throws MISSING_PIECE_PHOTO when no image part exists in any recent user message', async () => {
    const supabaseMock = makeConversationLookupMock([
      { parts: [{ type: 'text', text: 'add this' }] },
    ])
    const tool = makeTool(supabaseMock)
    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NEW-100',
        clickwrapAccepted: true,
        designName: 'Sapphire Halo',
        collectionName: 'Lustre',
      }),
    ).rejects.toMatchObject({ code: 'MISSING_PIECE_PHOTO' })
    expect(createDesignMock).not.toHaveBeenCalled()
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })

  it('records a qa-review enhancement candidate when the conservative decision helper requires manual review', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/abc.jpg',
      signedUrl: 'https://signed.example.com/original',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
    )
    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    updatePhotoPipelineStateMock.mockResolvedValue({
      designId: 'design-1',
      photoPipelineStatus: 'qa_review',
      enhancedPhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    })
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: new Uint8Array([1, 2, 3]) },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 3,
        requestId: 'req-1',
      },
    })
    analyzeServerImageQualityMock.mockResolvedValue(makeCleanAnalysis({
      blurRisk: 0.08,
      lightingRisk: 0.08,
    }))
    decideCanonicalEnhancedPhotoMock.mockReturnValue({
      assetId: 'design-1:NEW-100',
      provider: 'photoroom',
      decision: 'qa_review',
      qaDecision: 'review',
      flaggedChecks: ['source-preflight'],
      reasons: ['review'],
    })
    publishApprovedPhotoMock.mockResolvedValue(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    )

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,AAAA',
            width: 1800,
            height: 1800,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      collectionName: 'Lustre',
    })

    expect(executePhotoEnhancementMock).toHaveBeenCalledTimes(1)
    expect(analyzeServerImageQualityMock).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
    )
    expect(decideCanonicalEnhancedPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'design-1:NEW-100',
        provider: 'photoroom',
        sourcePreflight: {
          passed: true,
          score: 100,
          issues: [],
          coachingMessages: [
            'Nice start - this photo looks clear, bright enough, and framed well for the next step.',
          ],
        },
        outputPreflight: {
          passed: true,
          score: 100,
          issues: [],
          coachingMessages: [
            'Nice start - this photo looks clear, bright enough, and framed well for the next step.',
          ],
        },
        outputAnalysis: {
          blurRisk: 0.08,
          lightingRisk: 0.08,
          detailRisk: 0.04,
          backgroundDistractionRisk: 0.06,
          subjectCoverage: 0.42,
          subjectCentered: true,
        },
        sourceWidth: 1800,
        sourceHeight: 1800,
        outputWidth: 1800,
        outputHeight: 1800,
        contentType: 'image/png',
      }),
    )
    expect(publishApprovedPhotoMock).toHaveBeenCalledWith(
      'design-1',
      new Uint8Array([1, 2, 3]),
      {
        contentType: 'image/png',
        filename: 'NEW-100-enhanced',
      },
    )
    expect(updatePhotoPipelineStateMock.mock.calls[0][2]).toMatchObject({
      provider: 'photoroom',
      status: 'processing',
    })
    expect(updatePhotoPipelineStateMock.mock.calls[1][2]).toMatchObject({
      provider: 'photoroom',
      status: 'qa_review',
      qaDecision: 'review',
    })
    expect(result).toMatchObject({
      createdNewDesign: true,
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
  })

  it('publishes the enhanced photo as canonical when the conservative helper explicitly approves it', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    updateCanonicalPhotoMock.mockResolvedValueOnce({
      designId: 'design-1',
      canonicalPhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    })
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/abc.jpg',
      signedUrl: 'https://signed.example.com/original',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
    )
    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    updatePhotoPipelineStateMock.mockResolvedValue({
      designId: 'design-1',
      photoPipelineStatus: 'published',
      enhancedPhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    })
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: new Uint8Array([1, 2, 3]) },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 3,
        requestId: 'req-1',
      },
    })
    analyzeServerImageQualityMock.mockResolvedValue(
      makeCleanAnalysis({
        detailRisk: 0.03,
        backgroundDistractionRisk: 0.05,
        subjectCoverage: 0.45,
        detailConfidence: 0.97,
        backgroundUniformity: 0.96,
        backgroundCleanliness: 0.95,
      }),
    )
    decideCanonicalEnhancedPhotoMock.mockReturnValue({
      assetId: 'design-1:NEW-100',
      provider: 'photoroom',
      decision: 'promote_canonical',
      qaDecision: 'approve',
      flaggedChecks: [],
      reasons: ['promote'],
    })
    publishApprovedPhotoMock.mockResolvedValue(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    )

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,AAAA',
            width: 1800,
            height: 1800,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      collectionName: 'Lustre',
    })

    expect(publishApprovedPhotoMock).toHaveBeenCalledTimes(1)
    expect(updateCanonicalPhotoMock).toHaveBeenCalledWith(
      expect.anything(),
      'design-1',
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    )
    expect(updatePhotoPipelineStateMock.mock.calls[1][2]).toMatchObject({
      provider: 'photoroom',
      status: 'published',
      qaDecision: 'approve',
      enhancedUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/approved/design-1/enhanced.png',
    })
    expect(result).toMatchObject({
      createdNewDesign: true,
      usesCanonicalPhoto: true,
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
  })

  it('holds the enhancement when the conservative helper rejects auto-publish', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NEW-100',
      collectionId: 'coll-1',
      collectionName: 'Lustre',
      typePrefix: 'DR',
    })
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/abc.jpg',
      signedUrl: 'https://signed.example.com/original',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
    )
    getPhotoroomConfigMock.mockReturnValue({
      provider: 'photoroom',
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 8000,
    })
    updatePhotoPipelineStateMock.mockResolvedValue({
      designId: 'design-1',
      photoPipelineStatus: 'rejected',
      enhancedPhotoUrl: null,
    })
    executePhotoEnhancementMock.mockResolvedValue({
      provider: 'photoroom',
      output: { bytes: new Uint8Array([1, 2, 3]) },
      response: {
        statusCode: 200,
        contentType: 'image/png',
        contentLength: 3,
        requestId: 'req-1',
      },
    })
    analyzeServerImageQualityMock
      .mockResolvedValueOnce(makeCleanAnalysis())
      .mockResolvedValueOnce(
        makeCleanAnalysis({
          width: 900,
          height: 900,
          blurRisk: 0.9,
          lightingRisk: 0.8,
          detailRisk: 0.88,
          backgroundDistractionRisk: 0.83,
          subjectCoverage: 0.12,
          subjectCentered: false,
          detailConfidence: 0.12,
          backgroundUniformity: 0.32,
          backgroundCleanliness: 0.18,
        }),
      )
    decideCanonicalEnhancedPhotoMock.mockReturnValue({
      assetId: 'design-1:NEW-100',
      provider: 'photoroom',
      decision: 'hold',
      qaDecision: 'hold',
      flaggedChecks: ['resolution'],
      reasons: ['hold'],
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,AAAA',
            width: 1800,
            height: 1800,
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock)
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NEW-100',
      clickwrapAccepted: true,
      designName: 'Sapphire Halo',
      collectionName: 'Lustre',
    })

    expect(publishApprovedPhotoMock).not.toHaveBeenCalled()
    expect(updateCanonicalPhotoMock).not.toHaveBeenCalled()
    expect(updatePhotoPipelineStateMock.mock.calls[1][2]).toMatchObject({
      provider: 'photoroom',
      status: 'rejected',
      qaDecision: 'hold',
    })
    expect(result).toMatchObject({
      createdNewDesign: true,
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
  })
})

describe('add_listing — NEEDS_COLLECTION recovery payload', () => {
  it('asks for an exact collection name instead of hard-stopping', async () => {
    addListingMock.mockRejectedValueOnce(
      errors.NEEDS_COLLECTION('design-x', 'Mystery Piece'),
    )

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'EX-1',
      clickwrapAccepted: true,
    })

    expect(result.needsAction).toBe('provide_collection')
    expect(result.code).toBe('NEEDS_COLLECTION')
    expect(result.itemNumber).toBe('EX-1')
    expect(result.requiredFields).toEqual(['collectionName'])
    expect(result.message).toContain('exact collection name')
    expect(result.message).toContain('retry')
  })

  it('passes collectionName through on the retry path for existing designs', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-x',
      itemNumber: 'EX-1',
      designName: 'Mystery Piece',
      status: 'available',
      usesCanonicalPhoto: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'EX-1',
      collectionName: 'Lustre',
      clickwrapAccepted: true,
    })

    expect(addListingMock.mock.calls[0][2]).toMatchObject({
      itemNumber: 'EX-1',
      collectionName: 'Lustre',
    })
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'EX-1',
    })
  })
})

describe('add_listing - direct listing without ownership clickwrap', () => {
  it('does not ask for ownership confirmation before touching the service layer', async () => {
    addListingMock.mockResolvedValueOnce({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'DR-1',
      designName: 'Demo Ring',
      status: 'available',
    })
    const tool = makeTool()

    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'DR-1',
      clickwrapAccepted: false,
    })

    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'DR-1',
    })
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.not.objectContaining({ clickwrapAccepted: expect.anything() }),
    )
    expect(createDesignMock).not.toHaveBeenCalled()
  })
})

describe('add_listing - active workflow readiness guard', () => {
  it('does not use label_details photos as listing photos when server workflow state says jewelry-front is missing', async () => {
    const supabaseMock = makeConversationLookupMock([])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow(),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      }),
    ).rejects.toMatchObject({
      code: 'WORKFLOW_NOT_READY',
      userMessage: expect.stringContaining('customer-facing jewelry photo'),
    })
    expect(addListingMock).not.toHaveBeenCalled()
    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
  })

  it('adds a known catalog design with the canonical photo after duplicate confirmation even when the only workflow photo is label/details', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-er13229',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        canonicalPhotoUrl: 'https://cdn.example.com/catalog/er13229.png',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-er13229',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createAdminClientMock.mockReturnValue(
      makeAdminClientMock([{ id: 'listing-existing' }]),
    )
    const supabaseMock = makeConversationLookupMock([
      {
        role: 'user',
        parts: [{ type: 'text', text: "Yes, we're adding a second piece." }],
      },
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'That item number is already on your Dance Floor. Are we adding a second physical piece of that same design?',
          },
        ],
      },
      {
        role: 'user',
        parts: [
          { type: 'text', text: 'Here is the label.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'photo_capture',
        missing: ['jewelryFrontPhoto'],
        known: {
          itemNumber: 'ER13229',
          designName: 'The Florence Earrings',
          collectionName: 'July Birthday 2026',
          collectionYear: 2026,
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-2',
      usesCanonicalPhoto: true,
    })

    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'ER13229',
        listingPhotoUrl: undefined,
      }),
    )
  })

  it('uses durable workflow duplicate confirmation instead of depending on recent wording', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-er13229',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        canonicalPhotoUrl: 'https://cdn.example.com/catalog/er13229.png',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-er13229',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createAdminClientMock.mockReturnValue(
      makeAdminClientMock([{ id: 'listing-existing' }]),
    )
    const supabaseMock = makeConversationLookupMock([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Go ahead.' }],
      },
      {
        role: 'assistant',
        parts: [{ type: 'text', text: 'I have the details now.' }],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'details_capture',
        known: {
          itemNumber: 'ER13229',
          duplicatePhysicalConfirmed: true,
        },
        missing: ['designName', 'collectionName', 'jewelryFrontPhoto'],
        photos: [],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-2',
    })
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({ itemNumber: 'ER13229' }),
    )
  })

  it('ignores a bogus photo index for an item-number-only known catalog add with canonical photo', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-er13229',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        canonicalPhotoUrl: 'https://cdn.example.com/catalog/er13229.png',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-2',
      designId: 'design-er13229',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createAdminClientMock.mockReturnValue(makeAdminClientMock([]))
    const supabaseMock = makeConversationLookupMock([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Yes' }],
      },
      {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Want me to add it with the catalog photo, or do you want to use your own listing photo?',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'details_capture',
        known: { itemNumber: 'ER13229' },
        missing: ['designName', 'collectionName', 'jewelryFrontPhoto'],
        photos: [],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        listingPhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-2',
      usesCanonicalPhoto: true,
    })

    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'ER13229',
        listingPhotoUrl: undefined,
      }),
    )
  })

  it('ignores a bogus photo index for an existing catalog design retry with design fields', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-er13229',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        canonicalPhotoUrl: 'https://cdn.example.com/catalog/er13229.png',
      },
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-3',
      designId: 'design-er13229',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createAdminClientMock.mockReturnValue(makeAdminClientMock([]))
    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'details_capture',
        known: { itemNumber: 'ER13229' },
        missing: ['designName', 'collectionName', 'jewelryFrontPhoto'],
        photos: [],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday 2026',
        listingPhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-3',
      usesCanonicalPhoto: true,
    })

    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalled()
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'ER13229',
        listingPhotoUrl: undefined,
      }),
    )
  })

  it('allows add_listing when active workflow readiness is satisfied', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    const supabaseMock = makeConversationLookupMock([])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        metadata: {
          addAttempt: {
            failureSignature: 'same-backend-failure',
            failureCount: 1,
            lastFailureRunId: 'run-before-retry',
          },
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            quality: 'usable',
            qualityIssues: [],
            notes: ['boxed display jewelry is centered and clear'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        collectionName: 'July Birthday',
      }),
    ).resolves.toMatchObject({
      listingId: 'listing-1',
    })
    expect(
      (
        updateTradeBoardIntakeSessionMock.mock.calls[0][1].patch.metadata as {
          addAttempt: Record<string, unknown>
        }
      ).addAttempt,
    ).toMatchObject({
      failureSignature: 'same-backend-failure',
      failureCount: 1,
      lastFailureRunId: 'run-before-retry',
      lastAuthorizedRunId: 'run-1',
    })
    expect(updateTradeBoardIntakeSessionMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        sessionId: 'workflow-1',
        patch: expect.objectContaining({
          status: 'completed',
          current_phase: 'completed',
          created_listing_ids: ['listing-1'],
          created_design_id: 'design-1',
          missing_fields: [],
          hard_blockers: [],
        }),
      },
    )
  })

  it('uses the workflow-confirmed jewelry-front photo instead of a stale label index', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13229',
      collectionId: 'coll-1',
      collectionName: 'July Birthday',
      typePrefix: 'ER',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/florence-boxed.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/florence-boxed.jpg',
      signedUrl: 'https://signed.example.com/florence-boxed',
    })
    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Here is the boxed display jewelry photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
          },
        ],
      },
      {
        parts: [
          { type: 'text', text: 'Here is the label/details photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await tool.execute({
      mode: 'single',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
      material: 'Rhodium Plating',
      mainStone: 'Lab-Created Ruby',
      bpMsrp: 160,
      piecePhotoIndex: 1,
    })

    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,SkVXRUxSWQ==',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'ER13229',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/florence-boxed.jpg',
    })
  })

  it('accepts a clear workflow-confirmed boxed display jewelry photo', async () => {
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      makeCleanAnalysis({
        subjectCoverage: 0.34,
        backgroundDistractionRisk: 0.2,
        backgroundUniformity: 0.8,
        backgroundCleanliness: 0.8,
        detailConfidence: 0.9,
        detailRisk: 0.2,
        blurRisk: 0.05,
      }),
    )
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/florence-boxed.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/florence-boxed.jpg',
      signedUrl: 'https://signed.example.com/florence-boxed',
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13229',
      collectionId: 'coll-1',
      collectionName: 'July Birthday',
      typePrefix: 'ER',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })
    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Use this boxed display as the jewelry photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRUQ=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'ER13229',
          designName: 'The Florence Earrings',
          collectionName: 'July Birthday',
          collectionYear: 2026,
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
          bpMsrp: 160,
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
        collectionYear: 2026,
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 160,
        piecePhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'ER13229',
      createdNewDesign: true,
    })
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/florence-boxed.jpg',
    })
  })

  it('still saves the listing when optional Photoroom config is unavailable in production', async () => {
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/florence-boxed.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/florence-boxed.jpg',
      signedUrl: 'https://signed.example.com/florence-boxed',
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13229',
      collectionId: 'coll-1',
      collectionName: 'July Birthday',
      typePrefix: 'ER',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    getPhotoroomConfigMock.mockImplementationOnce(() => {
      throw new Error(
        'Photoroom configuration is incomplete - cannot start in production',
      )
    })
    updatePhotoPipelineStateMock.mockResolvedValueOnce({
      designId: 'design-1',
      photoPipelineStatus: 'error',
      enhancedPhotoUrl: null,
    })

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'Use this boxed display as the jewelry photo.' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRUQ=',
          },
        ],
      },
    ])
    const tool = makeTool(supabaseMock, {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
        collectionYear: 2026,
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 160,
        piecePhotoIndex: 1,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'ER13229',
      createdNewDesign: true,
    })

    expect(executePhotoEnhancementMock).not.toHaveBeenCalled()
    expect(updatePhotoPipelineStateMock).toHaveBeenCalledWith(
      expect.anything(),
      'design-1',
      expect.objectContaining({
        provider: 'photoroom',
        status: 'error',
      }),
    )
    expect(logIncidentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: 'photo_pipeline_failed',
        severity: 'warn',
        details: expect.objectContaining({
          toolName: 'add_listing',
          itemNumber: 'ER13229',
          designId: 'design-1',
          message:
            'Photoroom configuration is incomplete - cannot start in production',
        }),
      }),
    )
    expect(addListingMock).toHaveBeenCalledTimes(1)
  })

  it('does not let stale workflow catalog fields veto a valid ER13229 add attempt with a confirmed jewelry photo', async () => {
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'details_capture',
        known: {
          collectionName: 'ection',
        },
        missing: ['itemNumber', 'designName'],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        collectionName: 'July Birthday',
        collectionYear: 2026,
        piecePhotoIndex: 2,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'ER13229',
    })

    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        itemNumber: 'ER13229',
        collectionName: 'July Birthday',
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
      }),
    )
  })

  it('adds a confirmed non-item-number piece without creating or resolving catalog designs', async () => {
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/non-item-ring.jpg',
    })
    addNonItemNumberListingMock.mockResolvedValueOnce({
      listingId: 'listing-non-item-1',
      listingSource: 'non_item_number',
      displayName: 'July Birthday 2026 Ring - Size 7',
      status: 'available',
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        catalogMode: 'non_item_number',
        phase: 'ready_to_add',
        known: {
          jewelryType: 'RG',
          collectionFamily: 'Birthday',
          collectionName: 'July Birthday 2026',
          ringSize: '7',
        },
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,Tk9OSVRFTV9SSU5H',
            quality: 'usable',
            qualityIssues: [],
            notes: ['customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        catalogMode: 'non_item_number',
        jewelryType: 'RG',
        collectionFamily: 'Birthday',
        collectionName: 'July Birthday 2026',
        ringSize: '7',
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-non-item-1',
      listingSource: 'non_item_number',
      displayName: 'July Birthday 2026 Ring - Size 7',
      itemNumber: null,
      designId: null,
      createdNewDesign: false,
    })

    expect(resolveItemNumberMock).not.toHaveBeenCalled()
    expect(createDesignMock).not.toHaveBeenCalled()
    expect(addListingMock).not.toHaveBeenCalled()
    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith(
      {
        repId: 'rep-1',
        sourceImageUrl: 'data:image/jpeg;base64,Tk9OSVRFTV9SSU5H',
        filenameStem: 'non-item-number-piece-listing-photo',
      },
      { confirmedJewelryFront: true },
    )
    expect(addNonItemNumberListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      {
        jewelryType: 'RG',
        collectionFamily: 'Birthday',
        collectionName: 'July Birthday 2026',
        size: '7',
        photoUrl:
          'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/non-item-ring.jpg',
        repNotes: undefined,
        tradePreferences: undefined,
        rarityClassification: 'standard',
      },
    )
    expect(updateTradeBoardIntakeSessionMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        sessionId: 'workflow-1',
        patch: expect.objectContaining({
          status: 'completed',
          current_phase: 'completed',
          created_listing_ids: ['listing-non-item-1'],
          created_design_id: null,
          missing_fields: [],
          hard_blockers: [],
        }),
      },
    )
  })

  it('does not expose accepted-photo warning details in successful add_listing results', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NK75454',
      designName: 'The Piper Necklace',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NK75454',
      collectionId: 'coll-1',
      collectionName: 'July Birthday',
      typePrefix: 'NK',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/piper.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/piper.jpg',
      signedUrl: 'https://signed.example.com/piper-original',
    })
    analyzeServerImageQualityMock.mockResolvedValueOnce(
      makeCleanAnalysis({
        width: 1300,
        height: 1300,
        backgroundDistractionRisk: 0.72,
        subjectCoverage: 0.3,
        detailConfidence: 0.6,
      }),
    )

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        known: {
          itemNumber: 'NK75454',
          designName: 'The Piper Necklace',
          collectionName: 'July Birthday',
          collectionYear: 2026,
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
          bpMsrp: 138,
        },
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,UElQRVJfTkVDS0xBQ0U=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'NK75454',
      designName: 'The Piper Necklace',
      collectionName: 'July Birthday',
      collectionYear: 2026,
      material: 'Rhodium Plating',
      mainStone: 'Lab-Created Ruby',
      bpMsrp: 138,
      piecePhotoIndex: 2,
    })

    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NK75454',
      createdNewDesign: true,
    })
    expect(result).not.toHaveProperty('photoPipelineStatus')
    expect(result).not.toHaveProperty('photoPreflight')
  })

  it('uses the latest confirmed workflow jewelry photo when the model retries without a photo index', async () => {
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-1',
      itemNumber: 'NK75454',
      designName: 'The Piper Necklace',
      status: 'available',
      usesCanonicalPhoto: true,
    })
    createDesignMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'NK75454',
      collectionId: 'coll-1',
      collectionName: 'July Birthday 2026',
      typePrefix: 'NK',
    })
    uploadJewelryPhotoMock.mockResolvedValueOnce(
      'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/piper-latest.jpg',
    )
    uploadStagedOriginalPhotoMock.mockResolvedValueOnce({
      objectPath: 'rep-1/originals/piper-latest.jpg',
      signedUrl: 'https://signed.example.com/piper-latest',
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        known: {
          itemNumber: 'NK75454',
          designName: 'The Piper Necklace',
          collectionName: 'July Birthday 2026',
          material: 'Rhodium Plating',
          mainStone: 'Lab-Created Ruby',
          bpMsrp: 138,
        },
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,T0xEX0ZBUg==',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFURVNUX0NMT1NF',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK75454',
        designName: 'The Piper Necklace',
        collectionName: 'July Birthday 2026',
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
        bpMsrp: 138,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'NK75454',
      createdNewDesign: true,
    })

    expect(uploadJewelryPhotoMock.mock.calls[0][1]).toBe(
      'data:image/png;base64,TEFURVNUX0NMT1NF',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NK75454',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/piper-latest.jpg',
    })
  })

  it('treats piecePhotoIndex as the model-facing workflow photo number when several jewelry photos are confirmed', async () => {
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://cdn.example.com/listings/rep-1/florence-second-boxed-display.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,RklSU1Q=',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
          {
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,U0VDT05E',
            quality: 'unknown',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'ER13229',
        collectionName: 'July Birthday',
        piecePhotoIndex: 3,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'ER13229',
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith(
      {
        repId: 'rep-1',
        sourceImageUrl: 'data:image/jpeg;base64,U0VDT05E',
        filenameStem: 'ER13229-listing-photo',
        mutationAssetKey: expect.any(String),
      },
      { confirmedJewelryFront: true },
    )
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/florence-second-boxed-display.png',
      }),
    )
  })
  it('publishes the jewelry-front photo from two-photo intake and ignores a label selectedPhotoId', async () => {
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://cdn.example.com/listings/rep-1/half-moon-crescent-jewelry.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-1',
      designId: 'design-existing',
      itemNumber: 'NK96080',
      designName: 'Half Moon Crescent',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const labelId = '11111111-1111-4111-8111-111111111111'
    const jewelryId = '22222222-2222-4222-8222-222222222222'
    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'NK96080',
          designName: 'Half Moon Crescent',
          collectionName: 'Original Necklace',
          rarityClassification: 'standard',
        },
        photos: [
          {
            id: labelId,
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            id: jewelryId,
            attachmentIndex: 2,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK96080',
        collectionName: 'Original Necklace',
        selectedPhotoId: labelId,
        listingPhotoUrl: 'data:image/jpeg;base64,TEFCRUw=',
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'NK96080',
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith(
      {
        repId: 'rep-1',
        sourceImageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
        filenameStem: 'NK96080-listing-photo',
        mutationAssetKey: expect.any(String),
      },
      { confirmedJewelryFront: true },
    )
    expect(processRepListingPhotoUrlMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        sourceImageUrl: 'data:image/jpeg;base64,TEFCRUw=',
      }),
      expect.anything(),
    )
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/half-moon-crescent-jewelry.png',
      }),
    )
  })

  it('uses the workflow jewelry photo for an existing catalog design even when listingPhotoUrl is omitted', async () => {
    resolveItemNumberMock.mockResolvedValueOnce({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-nk57811',
        itemNumber: 'NK57811',
        designName: 'A Statement Of Sparkle Exclusive Bringback',
        canonicalPhotoUrl:
          'https://cdn.example.com/catalog/nk96080-storyteller-label.jpg',
      },
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://cdn.example.com/listings/rep-1/statement-of-sparkle-jewelry.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-statement',
      designId: 'design-nk57811',
      itemNumber: 'NK57811',
      designName: 'A Statement Of Sparkle Exclusive Bringback',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const jewelryId = '22222222-2222-4222-8222-222222222222'
    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'NK57811',
          designName: 'A Statement Of Sparkle Exclusive Bringback',
          collectionName: 'Original Necklace',
          rarityClassification: 'standard',
        },
        photos: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as label/details source'],
          },
          {
            id: jewelryId,
            attachmentIndex: 2,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK57811',
        designName: 'A Statement Of Sparkle Exclusive Bringback',
        collectionName: 'Original Necklace',
        selectedPhotoId: jewelryId,
      }),
    ).resolves.toMatchObject({
      mode: 'single',
      listingId: 'listing-statement',
      itemNumber: 'NK57811',
      createdNewDesign: false,
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalledWith(
      {
        repId: 'rep-1',
        sourceImageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
        filenameStem: 'NK57811-listing-photo',
        mutationAssetKey: expect.any(String),
      },
      { confirmedJewelryFront: true },
    )
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/statement-of-sparkle-jewelry.png',
      }),
    )
  })

  it('uses the workflow jewelry photo for an item-number-only known catalog add', async () => {
    resolveItemNumberMock.mockResolvedValue({
      found: true,
      hasCollection: true,
      design: {
        id: 'design-nk88350',
        itemNumber: 'NK88350',
        designName: 'Half Moon Crescent',
        canonicalPhotoUrl:
          'https://cdn.example.com/catalog/nk96080-storyteller-label.jpg',
      },
    })
    processRepListingPhotoUrlMock.mockResolvedValueOnce({
      photoUrl:
        'https://cdn.example.com/listings/rep-1/half-moon-crescent-jewelry.png',
    })
    addListingMock.mockResolvedValueOnce({
      listingId: 'listing-half-moon',
      designId: 'design-nk88350',
      itemNumber: 'NK88350',
      designName: 'Half Moon Crescent',
      status: 'available',
      usesCanonicalPhoto: false,
    })

    const jewelryId = '22222222-2222-4222-8222-222222222222'
    const tool = makeTool(makeConversationLookupMock([]), {
      activeTradeBoardWorkflow: activeWorkflow({
        phase: 'ready_to_add',
        missing: [],
        known: {
          itemNumber: 'NK88350',
          designName: 'Half Moon Crescent',
          collectionName: 'Original Necklace',
          rarityClassification: 'standard',
        },
        photos: [
          {
            id: jewelryId,
            attachmentIndex: 1,
            declaredRole: 'jewelry_front',
            visualRole: 'jewelry',
            roleConfirmed: true,
            imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'usable',
            qualityIssues: [],
            notes: ['declared as customer-facing jewelry photo'],
          },
        ],
      }),
    })

    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'NK88350',
        selectedPhotoId: jewelryId,
      }),
    ).resolves.toMatchObject({
      listingId: 'listing-half-moon',
      itemNumber: 'NK88350',
    })

    expect(processRepListingPhotoUrlMock).toHaveBeenCalled()
    expect(addListingMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        listingPhotoUrl:
          'https://cdn.example.com/listings/rep-1/half-moon-crescent-jewelry.png',
      }),
    )
  })
})

// Sanity: make sure ServiceError import resolves (avoids the test file
// silently passing if the module path was wrong).
describe('test wiring', () => {
  it('errors module exports ServiceError', () => {
    expect(typeof ServiceError).toBe('function')
  })
})
