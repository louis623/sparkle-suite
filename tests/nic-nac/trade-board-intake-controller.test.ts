import { describe, expect, it } from 'vitest'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'
import {
  buildTradeBoardIntakePromptState,
  computeTradeBoardAddAttemptReadiness,
  computeTradeBoardIntakeReadiness,
  createEmptyTradeBoardIntakeState,
  formatWorkflowNotReadyMessage,
  getTradeBoardIntakeToolsRequired,
  transitionTradeBoardIntake,
} from '@/lib/nic-nac/workflows/trade-board-intake-controller'

function baseState(
  overrides: Partial<TradeBoardIntakeSessionState> = {},
): TradeBoardIntakeSessionState {
  return {
    id: 'workflow-1',
    repId: 'rep-1',
    conversationId: 'conv-1',
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'started',
    missing: [],
    blockers: [],
    warnings: [],
    metadata: {},
    photos: [],
    ...overrides,
    known: {
      rarityClassification: 'standard',
      ...(overrides.known ?? {}),
    },
  }
}

describe('Dance Floor intake controller', () => {
  it('creates an empty active workflow state', () => {
    const state = createEmptyTradeBoardIntakeState({
      id: 'workflow-1',
      repId: 'rep-1',
      conversationId: 'conv-1',
    })

    expect(state.status).toBe('active')
    expect(state.phase).toBe('started')
    expect(state.workflowType).toBe('trade_board_add_listing')
    expect(state.missing).toContain('itemNumber')
  })

  it('treats a confirmed non-item-number ring as ready without item number or design name', () => {
    const state = baseState({
      catalogMode: 'non_item_number',
      known: {
        jewelryType: 'RG',
        collectionFamily: 'Birthday',
        collectionName: 'July Birthday 2026',
        ringSize: '7',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: ['customer-facing jewelry photo'],
        },
      ],
    })

    const readiness = computeTradeBoardIntakeReadiness(state)

    expect(readiness.ready).toBe(true)
    expect(readiness.missing).toEqual([])
    expect(readiness.nextAction).toBe('call_add_listing')
    expect(buildTradeBoardIntakePromptState(state).workflow.phase).toBe(
      'ready_to_add',
    )
  })

  it('requires ring size and broad collection in non-item-number mode', () => {
    const state = baseState({
      catalogMode: 'non_item_number',
      known: {
        jewelryType: 'RG',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: [],
        },
      ],
    })

    const readiness = computeTradeBoardIntakeReadiness(state)

    expect(readiness.ready).toBe(false)
    expect(readiness.missing).toEqual(
      expect.arrayContaining(['collectionFamily', 'ringSize']),
    )
    expect(readiness.missing).not.toContain('itemNumber')
    expect(readiness.missing).not.toContain('designName')
  })

  it('never lets label/details photos satisfy jewelry-front readiness', () => {
    const state = baseState({
      phase: 'catalog_match',
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
        collectionYear: 2026,
      },
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
    })

    const readiness = computeTradeBoardIntakeReadiness(state)

    expect(readiness.ready).toBe(false)
    expect(readiness.missing).toContain('jewelryFrontPhoto')
    expect(readiness.blockers).not.toContain('labelPhotoUnreadable')
  })

  it('accepts boxed display jewelry-front photos when clear and usable', () => {
    const state = baseState({
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'label_details',
          visualRole: 'label_or_packaging',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: [],
        },
        {
          attachmentIndex: 2,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: ['boxed display jewelry is centered and clear'],
        },
      ],
    })

    const readiness = computeTradeBoardIntakeReadiness(state)

    expect(readiness.ready).toBe(true)
    expect(readiness.missing).toEqual([])
    expect(readiness.blockers).toEqual([])
  })

  it('keeps Dance Floor tools required while active', () => {
    expect(getTradeBoardIntakeToolsRequired(baseState())).toEqual([
      'trade_board',
      'catalog',
    ])
  })

  it('builds model prompt state with the correct next action', () => {
    const promptState = buildTradeBoardIntakePromptState(
      baseState({
        known: {
          itemNumber: 'ER13229',
          designName: 'The Florence Earrings',
          collectionName: 'July Birthday',
        },
        photos: [
          {
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            quality: 'usable',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
    )

    expect(promptState.nextAction).toBe('ask_for_jewelry_front_photo')
    expect(promptState.hardRules).toContain(
      'label_details photos cannot satisfy jewelry_front',
    )
    expect(promptState.hardRules).toContain(
      'dance-floor-only vs catalog is Nic-Nac discretion, not a forced path',
    )
    expect(promptState.hardRules).toContain(
      'catalog and Finder keep jewelry-facing quality; if the rep says the piece is Bomb Party, a good-quality-looking image is enough — do not invent extra proof hurdles',
    )
    expect(promptState.photos[0]).toMatchObject({
      declaredRole: 'label_details',
      visualRole: 'label_or_packaging',
    })
  })

  it('moves ready state to adding only through controller transition', () => {
    const state = baseState({
      phase: 'ready_to_add',
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: [],
        },
      ],
    })

    const next = transitionTradeBoardIntake(state, {
      type: 'authorize_add_listing',
    })

    expect(next.phase).toBe('adding')
    expect(next.status).toBe('active')
  })

  it('allows an add attempt when current tool input supplies stale workflow item fields and jewelry photo is confirmed', () => {
    const state = baseState({
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
          quality: 'unknown',
          qualityIssues: [],
          notes: ['declared as label/details source'],
        },
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
    })

    const readiness = computeTradeBoardAddAttemptReadiness(state, {
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missing).toEqual([])
    expect(readiness.blockers).toEqual([])
  })

  it('still blocks an add attempt when the only workflow photo is label_details', () => {
    const state = baseState({
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'label_details',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'unknown',
          qualityIssues: [],
          notes: ['backs of earrings visible'],
        },
      ],
    })

    const readiness = computeTradeBoardAddAttemptReadiness(state, {
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.missing).toContain('jewelryFrontPhoto')
  })

  it('lets a boxed-display photo already in the thread satisfy jewelry-front readiness', () => {
    const state = baseState({
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'unknown',
          visualRole: 'uncertain',
          roleConfirmed: false,
          quality: 'usable',
          qualityIssues: [],
          notes: ['boxed display jewelry appears clear enough'],
        },
      ],
    })

    const readiness = computeTradeBoardAddAttemptReadiness(state, {
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missing).toEqual([])
    expect(readiness.blockers).toEqual([])
  })

  it('does not let a leftover unread label block save when jewelry and item number are already known', () => {
    const state = baseState({
      known: {
        itemNumber: 'ER13229',
        designName: 'Original Earring',
        collectionName: 'Original',
        rarityClassification: 'standard',
      },
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'label_details',
          visualRole: 'label_or_packaging',
          roleConfirmed: true,
          quality: 'blocked',
          qualityIssues: [],
          notes: ['unreadable leftover label'],
        },
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'uncertain',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: ['boxed blue studs on hex card'],
        },
      ],
    })

    const readiness = computeTradeBoardAddAttemptReadiness(state, {
      itemNumber: 'ER13229',
      rarityClassification: 'standard',
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missing).toEqual([])
    expect(readiness.blockers).toEqual([])
    expect(formatWorkflowNotReadyMessage(readiness)).not.toMatch(/listing:\s*\./)
  })

  it('names the missing field instead of shipping an empty missing-details list', () => {
    const emptyColon = formatWorkflowNotReadyMessage({
      missing: [],
      blockers: ['labelPhotoUnreadable'],
    })
    expect(emptyColon).toContain('readable item-info label or the item number')
    expect(emptyColon).not.toMatch(/listing:\s*\./)
    expect(emptyColon).not.toBe(
      'I still need these details before I can save this listing: .',
    )

    const nothingNamed = formatWorkflowNotReadyMessage({
      missing: [],
      blockers: [],
    })
    expect(nothingNamed).toContain('customer-facing jewelry photo or a readable item number')
    expect(nothingNamed).not.toMatch(/listing:\s*\./)
  })

  it('keeps a human-review workflow terminal and exposes no mutation tools', () => {
    const state = baseState({
      status: 'needs_human_review',
      phase: 'needs_human_review',
      known: {
        itemNumber: 'ER59000',
        material: 'Rhodium Plating',
        mainStone: 'Lab-Created Ruby',
      },
      blockers: ['add_listing_backend_failure'],
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          quality: 'usable',
          qualityIssues: [],
          notes: ['confirmed Ruby photo'],
        },
      ],
    })

    expect(getTradeBoardIntakeToolsRequired(state)).toEqual([])
    expect(buildTradeBoardIntakePromptState(state)).toMatchObject({
      workflow: { status: 'needs_human_review' },
      nextAction: 'escalate_to_human_review',
      blockers: ['add_listing_backend_failure'],
      photos: [{ roleConfirmed: true }],
    })
  })
})
