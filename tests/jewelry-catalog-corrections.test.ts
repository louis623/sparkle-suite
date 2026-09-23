import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writeJewelryCatalogChange } from '@/lib/services/jewelry-catalog-audit'
import { reportJewelryCatalogIssue } from '@/lib/services/jewelry-catalog-corrections'

type DesignRow = {
  id: string
  item_number: string
  design_name: string
  collection_id: string | null
  material: string | null
  main_stone: string | null
  bp_msrp: number | null
  canonical_photo_url: string | null
  special_features: string | null
  length_info: string | null
  type_prefix: string
  search_tags: string[] | null
  collection:
    | { id: string; name: string; collection_year: number | null }
    | null
  last_corrected_by_rep_id?: string | null
  last_corrected_at?: string | null
  updated_at?: string | null
}

function baseDesign(overrides: Partial<DesignRow> = {}): DesignRow {
  return {
    id: 'design-1',
    item_number: 'RG100',
    design_name: 'Original Ring',
    collection_id: 'collection-old',
    material: 'Rhodium',
    main_stone: 'Quartz',
    bp_msrp: 39.95,
    canonical_photo_url: 'https://example.com/approved/design-1/old.png',
    special_features: null,
    length_info: null,
    type_prefix: 'RG',
    search_tags: ['ring', 'rhodium'],
    collection: {
      id: 'collection-old',
      name: 'Original Collection',
      collection_year: null,
    },
    ...overrides,
  }
}

function makeSupabaseMock(design: DesignRow = baseDesign()) {
  const state = {
    design,
    collections: new Map<string, { id: string; name: string; collection_year: number | null }>([
      ['March 2026', { id: 'collection-new', name: 'March 2026', collection_year: null }],
    ]),
    catalogLogRows: [] as Array<Record<string, unknown>>,
    designUpdates: [] as Array<Record<string, unknown>>,
  }

  class Query {
    private insertPayload: Record<string, unknown> | null = null
    private updatePayload: Record<string, unknown> | null = null
    private eqFilters = new Map<string, unknown>()

    constructor(private table: string) {}

    select() {
      return this
    }

    eq(column: string, value: unknown) {
      this.eqFilters.set(column, value)
      return this
    }

    insert(payload: Record<string, unknown>) {
      this.insertPayload = payload
      if (this.table === 'jewelry_catalog_change_log') {
        state.catalogLogRows.push(payload)
      }
      return this
    }

    update(payload: Record<string, unknown>) {
      this.updatePayload = payload
      return this
    }

    async maybeSingle() {
      if (this.table === 'jewelry_designs') {
        return this.eqFilters.get('item_number') === state.design.item_number
          ? { data: state.design, error: null }
          : { data: null, error: null }
      }

      if (this.table === 'collections') {
        const name = this.eqFilters.get('name') as string
        return { data: state.collections.get(name) ?? null, error: null }
      }

      return { data: null, error: null }
    }

    async single() {
      if (this.table === 'collections' && this.updatePayload) {
        const id = this.eqFilters.get('id') as string
        const existing = Array.from(state.collections.values()).find(
          (collection) => collection.id === id,
        )
        if (!existing) return { data: null, error: null }
        existing.collection_year =
          (this.updatePayload.collection_year as number | null | undefined) ??
          existing.collection_year
        return { data: existing, error: null }
      }

      if (this.table === 'collections' && this.insertPayload) {
        const name = this.insertPayload.name as string
        const created = {
          id: `collection-${state.collections.size + 1}`,
          name,
          collection_year: (this.insertPayload.collection_year as number | null) ?? null,
        }
        state.collections.set(name, created)
        return { data: created, error: null }
      }

      if (this.table === 'jewelry_designs' && this.updatePayload) {
        state.designUpdates.push(this.updatePayload)
        state.design = {
          ...state.design,
          ...this.updatePayload,
          design_name:
            (this.updatePayload.design_name as string | undefined) ??
            state.design.design_name,
          collection_id:
            (this.updatePayload.collection_id as string | undefined) ??
            state.design.collection_id,
          main_stone:
            (this.updatePayload.main_stone as string | null | undefined) ??
            state.design.main_stone,
          bp_msrp:
            (this.updatePayload.bp_msrp as number | null | undefined) ??
            state.design.bp_msrp,
          canonical_photo_url:
            (this.updatePayload.canonical_photo_url as string | null | undefined) ??
            state.design.canonical_photo_url,
          special_features:
            (this.updatePayload.special_features as string | null | undefined) ??
            state.design.special_features,
          length_info:
            (this.updatePayload.length_info as string | null | undefined) ??
            state.design.length_info,
          search_tags:
            (this.updatePayload.search_tags as string[] | null | undefined) ??
            state.design.search_tags,
          collection:
            typeof this.updatePayload.collection_id === 'string'
              ? (Array.from(state.collections.values()).find(
                  (collection) => collection.id === this.updatePayload?.collection_id,
                ) ?? state.design.collection)
              : state.design.collection,
        }
        return { data: state.design, error: null }
      }

      return { data: this.insertPayload, error: null }
    }
  }

  return {
    state,
    supabase: {
      from: vi.fn((table: string) => new Query(table)),
    },
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('writeJewelryCatalogChange', () => {
  it('does not throw when the quiet history insert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const insert = vi.fn().mockResolvedValue({ error: new Error('audit unavailable') })
    const from = vi.fn().mockReturnValue({ insert })
    const supabase = { from } as never

    await expect(
      writeJewelryCatalogChange(supabase, {
        designId: 'design-1',
        repId: 'rep-1',
        conversationId: 'conversation-1',
        changeType: 'report_issue',
        issueType: 'bad_photo',
        reason: 'The photo is blurry.',
        beforeState: { itemNumber: 'RG100' },
        afterState: { itemNumber: 'RG100' },
      }),
    ).resolves.toBeUndefined()
  })
})

describe('reportJewelryCatalogIssue', () => {
  it('logs an issue without changing the design when no correction is supplied', async () => {
    const { state, supabase } = makeSupabaseMock()

    const result = await reportJewelryCatalogIssue(supabase as never, {
      itemNumber: 'rg100',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      issueType: 'bad_photo',
      reason: 'The catalog photo is blurry.',
    })

    expect(result).toEqual({
      designId: 'design-1',
      itemNumber: 'RG100',
      changedFields: [],
      issueLogged: true,
      corrected: false,
    })
    expect(state.designUpdates).toEqual([])
    expect(state.catalogLogRows).toHaveLength(1)
    expect(state.catalogLogRows[0]).toMatchObject({
      design_id: 'design-1',
      rep_id: 'rep-1',
      conversation_id: 'conversation-1',
      change_type: 'report_issue',
      issue_type: 'bad_photo',
    })
  })

  it('updates safe catalog fields and records before/after history', async () => {
    const { state, supabase } = makeSupabaseMock()

    const result = await reportJewelryCatalogIssue(supabase as never, {
      itemNumber: 'RG100',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      issueType: 'wrong_collection',
      reason: 'The collection and stone are wrong.',
      correction: {
        designName: 'Corrected Ring',
        collectionName: 'March 2026',
        mainStone: 'Ruby',
      },
    })

    expect(result.corrected).toBe(true)
    expect(result.changedFields).toEqual([
      'designName',
      'collectionName',
      'mainStone',
    ])
    expect(state.designUpdates[0]).toMatchObject({
      design_name: 'Corrected Ring',
      collection_id: 'collection-new',
      main_stone: 'Ruby',
      last_corrected_by_rep_id: 'rep-1',
    })
    expect(state.catalogLogRows).toHaveLength(2)
    expect(state.catalogLogRows[1]).toMatchObject({
      change_type: 'correct_design_fields',
      issue_type: 'wrong_collection',
    })
    expect(state.catalogLogRows[1].before_state).toMatchObject({
      designName: 'Original Ring',
      collectionId: 'collection-old',
    })
    expect(state.catalogLogRows[1].after_state).toMatchObject({
      designName: 'Corrected Ring',
      collectionId: 'collection-new',
      mainStone: 'Ruby',
    })
  })

  it('stores corrected Birthday collection names with the year included', async () => {
    const { state, supabase } = makeSupabaseMock()

    const result = await reportJewelryCatalogIssue(supabase as never, {
      itemNumber: 'RG100',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      issueType: 'wrong_collection',
      reason: 'The collection should include the birthday year.',
      correction: {
        collectionName: 'March Birthday',
        collectionYear: 2026,
      },
    })

    expect(result.corrected).toBe(true)
    expect(result.changedFields).toEqual(['collectionName', 'collectionYear'])
    expect(state.collections.get('March Birthday 2026')).toMatchObject({
      name: 'March Birthday 2026',
      collection_year: 2026,
    })
    expect(state.designUpdates[0]).toMatchObject({
      collection_id: state.collections.get('March Birthday 2026')?.id,
    })
  })

  it('updates normalized tags and records quiet history', async () => {
    const { state, supabase } = makeSupabaseMock()

    const result = await reportJewelryCatalogIssue(supabase as never, {
      itemNumber: 'RG100',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      issueType: 'wrong_tags',
      reason: 'The catalog tags include the wrong discovery words.',
      correction: {
        searchTags: ['Rose Gold', 'rare', 'Heart'],
      },
    })

    expect(result.corrected).toBe(true)
    expect(result.changedFields).toEqual(['searchTags'])
    expect(state.designUpdates[0]).toMatchObject({
      search_tags: ['rose gold', 'heart'],
      last_corrected_by_rep_id: 'rep-1',
    })
    expect(state.catalogLogRows).toHaveLength(2)
    expect(state.catalogLogRows[1]).toMatchObject({
      change_type: 'correct_design_fields',
      issue_type: 'wrong_tags',
    })
    expect(state.catalogLogRows[1].after_state).toMatchObject({
      searchTags: ['rose gold', 'heart'],
    })
  })

  it('replaces a bad canonical photo when the corrected URL is an approved design asset', async () => {
    const { state, supabase } = makeSupabaseMock()

    const result = await reportJewelryCatalogIssue(supabase as never, {
      itemNumber: 'RG100',
      repId: 'rep-1',
      conversationId: 'conversation-1',
      issueType: 'bad_photo',
      reason: 'The current catalog image is a label/details photo.',
      correction: {
        canonicalPhotoUrl: 'https://example.com/approved/design-1/front.png',
      },
    })

    expect(result.corrected).toBe(true)
    expect(result.changedFields).toEqual(['canonicalPhotoUrl'])
    expect(state.designUpdates[0]).toMatchObject({
      canonical_photo_url: 'https://example.com/approved/design-1/front.png',
      last_corrected_by_rep_id: 'rep-1',
    })
    expect(state.catalogLogRows).toHaveLength(2)
    expect(state.catalogLogRows[1]).toMatchObject({
      change_type: 'replace_canonical_photo',
      issue_type: 'bad_photo',
    })
    expect(state.catalogLogRows[1].before_state).toMatchObject({
      canonicalPhotoUrl: 'https://example.com/approved/design-1/old.png',
    })
    expect(state.catalogLogRows[1].after_state).toMatchObject({
      canonicalPhotoUrl: 'https://example.com/approved/design-1/front.png',
    })
  })

  it('rejects unapproved canonical photo URLs', async () => {
    const { state, supabase } = makeSupabaseMock()

    await expect(
      reportJewelryCatalogIssue(supabase as never, {
        itemNumber: 'RG100',
        repId: 'rep-1',
        issueType: 'bad_photo',
        reason: 'The photo is wrong.',
        correction: {
          canonicalPhotoUrl: 'https://example.com/raw-photo.jpg',
        },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })

    expect(state.designUpdates).toEqual([])
    expect(state.catalogLogRows).toHaveLength(1)
  })
})
