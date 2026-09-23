// Unit tests for the search_jewelry_database Nic-Nac tool handler.
//
// All external collaborators are mocked — no network, no Supabase. Tests
// invoke the real tool's execute() function so the service-arg threading,
// flatten shape, and ServiceError → NicNacToolError translation are
// exercised end-to-end. Mock paths exactly match the imports in
// lib/nic-nac/tools/search-jewelry-database.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { errors } from '@/lib/services/errors'

const searchJewelryDatabaseMock = vi.fn()

vi.mock('@/lib/services/jewelry-database', () => ({
  searchJewelryDatabase: (...args: unknown[]) =>
    searchJewelryDatabaseMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ __isAdmin: true }),
}))

import { makeSearchJewelryDatabaseTool, searchJewelryDatabaseTool } from '@/lib/nic-nac/tools/search-jewelry-database'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeTool(): ToolDef {
  return makeSearchJewelryDatabaseTool({
    repId: 'rep-1',
  }) as unknown as ToolDef
}

beforeEach(() => {
  searchJewelryDatabaseMock.mockReset()
})

describe('search_jewelry_database — flattened structured output', () => {
  it('passes admin client + repId + { query, limit } to the service and flattens results', async () => {
    searchJewelryDatabaseMock.mockResolvedValueOnce([
      {
        designId: 'd-1',
        itemNumber: 'RG31452',
        designName: 'The Celeste Ring',
        material: 'Rhodium',
        mainStone: 'Lab Sapphire',
        bpMsrp: 128,
        canonicalPhotoUrl: 'https://canonical/celeste.jpg',
        typePrefix: 'RG',
        collectionName: 'Lustre',
        collectionYear: 2026,
        searchTags: ['ring', 'rhodium', 'sapphire'],
        isOnMyBoard: true,
        activeListingsCount: 3,
      },
      {
        designId: 'd-2',
        itemNumber: 'NK66139',
        designName: 'Orbit',
        material: null,
        mainStone: null,
        bpMsrp: null,
        canonicalPhotoUrl: null,
        typePrefix: 'NK',
        collectionName: null,
        collectionYear: null,
        searchTags: [],
        isOnMyBoard: false,
        activeListingsCount: 0,
      },
    ])

    const tool = makeTool()
    const result = await tool.execute({ query: 'sapphire', limit: 10 })

    // Service called with (admin, repId, { query, limit })
    expect(searchJewelryDatabaseMock).toHaveBeenCalledTimes(1)
    expect(searchJewelryDatabaseMock.mock.calls[0][0]).toEqual({ __isAdmin: true })
    expect(searchJewelryDatabaseMock.mock.calls[0][1]).toBe('rep-1')
    expect(searchJewelryDatabaseMock.mock.calls[0][2]).toEqual({
      query: 'sapphire',
      limit: 10,
    })

    expect(result.count).toBe(2)
    const results = result.results as Array<Record<string, unknown>>
    expect(results[0]).toMatchObject({
      designId: 'd-1',
      itemNumber: 'RG31452',
      designName: 'The Celeste Ring',
      material: 'Rhodium',
      mainStone: 'Lab Sapphire',
      photoUrl: 'https://canonical/celeste.jpg',
      type: 'RG',
      collectionName: 'Lustre',
      collectionYear: 2026,
      searchTags: ['ring', 'rhodium', 'sapphire'],
      isOnMyBoard: true,
      activeListingsCount: 3,
    })
    expect(results[0].addListingGuidance).toContain(
      'Are we adding a second identical physical piece?',
    )
    expect(results[1]).toMatchObject({
      designId: 'd-2',
      itemNumber: 'NK66139',
      photoUrl: null,
      isOnMyBoard: false,
      activeListingsCount: 0,
    })
    expect(results[1].addListingGuidance).toBeUndefined()
  })

  it('passes repId to the service even though admin client is used (so isOnMyBoard works)', async () => {
    // The service uses repId for the per-rep isOnMyBoard flag. This is the
    // key contract guard: search uses an admin client (cross-rep COUNT
    // requires it), but repId still flows through so isOnMyBoard remains
    // accurate. Without this, the rep would never see "you already have
    // this listed."
    searchJewelryDatabaseMock.mockResolvedValueOnce([])

    const tool = makeTool()
    await tool.execute({ query: 'anything' })

    expect(searchJewelryDatabaseMock.mock.calls[0][1]).toBe('rep-1')
  })

  it('returns count:0 with empty array when service returns empty', async () => {
    searchJewelryDatabaseMock.mockResolvedValueOnce([])

    const tool = makeTool()
    const result = await tool.execute({ query: 'no-such-piece' })

    expect(result.count).toBe(0)
    expect(result.results).toEqual([])
  })

  it('forwards limit when provided, omits when not', async () => {
    searchJewelryDatabaseMock.mockResolvedValue([])

    const tool = makeTool()
    await tool.execute({ query: 'q1', limit: 5 })
    expect(searchJewelryDatabaseMock.mock.calls[0][2]).toEqual({
      query: 'q1',
      limit: 5,
    })

    await tool.execute({ query: 'q2' })
    expect(searchJewelryDatabaseMock.mock.calls[1][2]).toEqual({
      query: 'q2',
      limit: undefined,
    })
  })

  it('translates ServiceError into NicNacToolError', async () => {
    searchJewelryDatabaseMock.mockRejectedValueOnce(
      errors.UNAUTHORIZED('foreign repId'),
    )

    const tool = makeTool()
    await expect(tool.execute({ query: 'sapphire' })).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'UNAUTHORIZED',
    })
  })

  it('exposes readOnly: true on the registered ToolDefinition', () => {
    // readOnly lives on the exported ToolDefinition (lib/nic-nac/tools/types.ts:15),
    // not on the built tool instance from make*Tool(). The Tier-1 transient
    // retry wrapper reads it off the registry entry.
    expect(searchJewelryDatabaseTool.readOnly).toBe(true)
    expect(searchJewelryDatabaseTool.name).toBe('search_jewelry_database')
  })
})
