// Unit tests for add_listing recovery payloads.
//
// Covers the vision-first photo flow refactor:
//   - NEEDS_FULL_INFO returns needsAction:'create_design' with the same
//     requiredFields contract Task 1.5B established (preserves the manual
//     URL fallback) and a vision-first message that explicitly forbids
//     URL-fishing and looping without piecePhotoUrl.
//   - The create-design retry branch still wires through when a real
//     piecePhotoUrl is supplied (regression guard for the manual fallback).
//   - NEEDS_COLLECTION still returns needsAction:'cannot_complete' with
//     the existing flag-to-Louis message (regression guard).
//
// All external collaborators are mocked — no network, no Supabase. The tests
// invoke the real tool's execute() function so the runSingle branching and
// error-translation logic are exercised end-to-end.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServiceError, errors } from '@/lib/services/errors'

const addListingMock = vi.fn()
const createDesignMock = vi.fn()
const uploadJewelryPhotoMock = vi.fn()
const writeTradeActionAuditMock = vi.fn()
const logIncidentMock = vi.fn()

vi.mock('@/lib/services/trade-board', () => ({
  addListing: (...args: unknown[]) => addListingMock(...args),
  addListingBatch: vi.fn(),
}))

vi.mock('@/lib/services/jewelry-database', () => ({
  createDesign: (...args: unknown[]) => createDesignMock(...args),
}))

vi.mock('@/lib/services/storage', () => ({
  uploadJewelryPhoto: (...args: unknown[]) => uploadJewelryPhotoMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({}),
}))

vi.mock('@/lib/thumper/audit', () => ({
  writeTradeActionAudit: (...args: unknown[]) =>
    writeTradeActionAuditMock(...args),
}))

vi.mock('@/lib/thumper/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
}))

import { makeAddListingTool } from '@/lib/thumper/tools/add-listing'

interface AddListingToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeTool(supabase: unknown = {} as never): AddListingToolDef {
  return makeAddListingTool({
    repId: 'rep-1',
    supabase: supabase as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }) as unknown as AddListingToolDef
}

// Chainable supabase mock matching the call shape used by
// resolvePhotoFromConversation: from(table).select().eq().eq().eq().order().order()
function makeConversationLookupMock(rows: Array<{ parts: unknown }>) {
  const result = { data: rows, error: null as unknown }
  // Each chain method returns the same chain; the terminal `.order()` is
  // awaited for `{ data, error }`. Returning `result` from .order() works
  // because `await result` resolves to result itself (no thenable).
  const chain: Record<string, unknown> = { ...result }
  const passthrough = () => chain
  chain.select = passthrough
  chain.eq = passthrough
  chain.order = passthrough
  return {
    from: (table: string) => {
      if (table !== 'thumper_conversations') {
        throw new Error(`unexpected table ${table}`)
      }
      return chain
    },
  }
}

beforeEach(() => {
  addListingMock.mockReset()
  createDesignMock.mockReset()
  uploadJewelryPhotoMock.mockReset()
  writeTradeActionAuditMock.mockReset()
  logIncidentMock.mockReset()
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
      'piecePhotoUrl',
      'material',
      'mainStone',
      'bpMsrp',
      'specialFeatures',
      'lengthInfo',
    ])
  })

  it('message instructs vision-first extraction, requires rep confirmation of collection, and explains automatic photo upload', async () => {
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
    expect(message).toContain('ask the rep to confirm or provide collectionName')
    expect(message).toContain(
      'never extract or autofill the collection from vision',
    )
    expect(message).toContain('handler uploads the photo from chat automatically')
    expect(message).toContain('do NOT ask the rep for a URL')
  })
})

describe('add_listing — manual URL fallback (Task 1.5B regression guard)', () => {
  it('runs the create-design retry path when the model supplies a real piecePhotoUrl', async () => {
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
    })

    expect(createDesignMock).toHaveBeenCalledTimes(1)
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NEW-100',
      designName: 'Sapphire Halo',
      piecePhotoUrl: 'https://dropbox.example/photo.jpg',
      collectionName: 'Lustre',
    })
    expect(createDesignMock.mock.calls[0][1].piecePhotoUrl).toBe(
      'https://dropbox.example/photo.jpg',
    )
    expect(addListingMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      mode: 'single',
      listingId: 'listing-1',
      itemNumber: 'NEW-100',
      createdNewDesign: true,
    })
    // The vision-first path was NOT exercised — manual URL bypassed it.
    expect(uploadJewelryPhotoMock).not.toHaveBeenCalled()
  })
})

describe('add_listing — vision-first photo extraction (Task 1.5B closure)', () => {
  it('uploads the most recent user-uploaded image from chat and passes its public URL into createDesign', async () => {
    // The handler enters the create-design path on the first call (gated on
    // `if (designName)`), so addListing is only called ONCE, after the design
    // is created. Do NOT pre-queue a NEEDS_FULL_INFO rejection — it would be
    // consumed by this single call and the success path would fail for the
    // wrong reason.
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

    const supabaseMock = makeConversationLookupMock([
      {
        parts: [
          { type: 'text', text: 'add this' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,AAAA',
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
      'data:image/jpeg;base64,AAAA',
    )
    expect(createDesignMock.mock.calls[0][1]).toMatchObject({
      itemNumber: 'NEW-100',
      piecePhotoUrl:
        'https://example.supabase.co/storage/v1/object/public/jewelry-photos/rep-1/abc.jpg',
      collectionName: 'Lustre',
    })
    expect(result).toMatchObject({
      createdNewDesign: true,
      listingId: 'listing-1',
    })
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
})

describe('add_listing — NEEDS_COLLECTION recovery payload (preservation regression guard)', () => {
  it('returns needsAction:cannot_complete with the existing flag-to-Louis message', async () => {
    addListingMock.mockRejectedValueOnce(
      errors.NEEDS_COLLECTION('design-x', 'Mystery Piece'),
    )

    const tool = makeTool()
    const result = await tool.execute({
      mode: 'single',
      itemNumber: 'EX-1',
      clickwrapAccepted: true,
    })

    expect(result.needsAction).toBe('cannot_complete')
    expect(result.code).toBe('NEEDS_COLLECTION')
    expect(result.itemNumber).toBe('EX-1')
    expect(result.message).toContain('flagging to Louis')
  })
})

describe('add_listing — clickwrap gate (sanity)', () => {
  it('rejects when clickwrapAccepted is false before touching the service layer', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({
        mode: 'single',
        itemNumber: 'DR-1',
        clickwrapAccepted: false,
      }),
    ).rejects.toThrow(/own the piece/)
    expect(addListingMock).not.toHaveBeenCalled()
    expect(createDesignMock).not.toHaveBeenCalled()
  })
})

// Sanity: make sure ServiceError import resolves (avoids the test file
// silently passing if the module path was wrong).
describe('test wiring', () => {
  it('errors module exports ServiceError', () => {
    expect(typeof ServiceError).toBe('function')
  })
})
