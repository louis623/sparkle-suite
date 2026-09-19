import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  shouldUseTradeBoardGuidedStart,
  TRADE_BOARD_GUIDED_START_RESPONSE,
} from '@/lib/nic-nac/workflows/trade-board-guided-start'
import {
  hasTradeBoardIntakeSignal,
  inferCatalogModeFromTurn,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'

function workflow(
  patch: Partial<TradeBoardIntakeSessionState> = {},
): TradeBoardIntakeSessionState {
  return {
    id: 'workflow-1',
    repId: 'rep-1',
    conversationId: 'conversation-1',
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'details_capture',
    known: {},
    missing: ['itemNumber'],
    blockers: [],
    warnings: [],
    metadata: {},
    photos: [],
    ...patch,
  }
}

describe('Dance Floor deterministic guided start', () => {
  it('handles the exact failed Kim support-mode sentence, including its comma', () => {
    expect(
      shouldUseTradeBoardGuidedStart({
        latestUserText:
          'Nic-Nac. I need to add a dancer to my dance floor, please.',
        workflow: workflow(),
      }),
    ).toBe(true)
  })

  it.each([
    'Help me add a dancer to the Dance Floor.',
    'I want to put a piece on my trade board',
    'Can we list this jewelry on the dance floor?',
    'Post this jewelry to my Dance Floor.',
  ])('recognizes a generic guided start: %s', (latestUserText) => {
    expect(
      shouldUseTradeBoardGuidedStart({ latestUserText, workflow: workflow() }),
    ).toBe(true)
  })

  it.each([
    'Help me add a dancer to the Dance Floor.',
    'I want to put a piece on my trade board',
    'Can we list this jewelry on the dance floor?',
    'Post this jewelry to my Dance Floor.',
  ])('starts the durable intake workflow before applying the guided response: %s', (text) => {
    expect(
      hasTradeBoardIntakeSignal([
        { id: 'user-1', role: 'user', parts: [{ type: 'text', text }] },
      ]),
    ).toBe(true)
  })

  it.each([
    'List everything currently on my Dance Floor.',
    'What is on my trade board?',
    'Add an item to my Calendar.',
  ])('does not mistake a read request for a new listing workflow: %s', (text) => {
    expect(
      hasTradeBoardIntakeSignal([
        { id: 'user-1', role: 'user', parts: [{ type: 'text', text }] },
      ]),
    ).toBe(false)
  })

  it('does not intercept facts, photos, confirmed non-item flow, or another product', () => {
    expect(
      shouldUseTradeBoardGuidedStart({
        latestUserText: 'Add dancer ER13229',
        workflow: workflow({ known: { itemNumber: 'ER13229' } }),
      }),
    ).toBe(false)
    expect(
      shouldUseTradeBoardGuidedStart({
        latestUserText: 'Add this dancer',
        workflow: workflow({
          photos: [
            {
              attachmentIndex: 0,
              declaredRole: 'unknown',
              visualRole: 'uncertain',
              roleConfirmed: false,
              quality: 'unknown',
              qualityIssues: [],
              notes: [],
            },
          ],
        }),
      }),
    ).toBe(false)
    expect(
      shouldUseTradeBoardGuidedStart({
        latestUserText: "I don't have an item number.",
        workflow: workflow(),
      }),
    ).toBe(false)
    expect(
      shouldUseTradeBoardGuidedStart({
        latestUserText: 'Add a show to my Calendar.',
        workflow: workflow(),
      }),
    ).toBe(false)
  })

  it('does not force dance-floor-only just because an item number is missing', () => {
    expect(
      inferCatalogModeFromTurn({
        currentMode: 'item_number',
        latestUserText: 'Add this dancer from the photos I just sent.',
        previousAssistantText: '',
        hasItemNumber: false,
      }),
    ).toBe('item_number')
    expect(
      inferCatalogModeFromTurn({
        currentMode: 'item_number',
        latestUserText: "I don't have an item number.",
        previousAssistantText: '',
        hasItemNumber: false,
      }),
    ).toBe('non_item_number')
  })

  it('keeps the concise guidance reusable without bypassing agent reasoning', () => {
    expect(TRADE_BOARD_GUIDED_START_RESPONSE).toContain('1. Type the item number.')
    expect(TRADE_BOARD_GUIDED_START_RESPONSE).toContain(
      '2. Upload a clear photo of the item-info tag or label.',
    )
    expect(TRADE_BOARD_GUIDED_START_RESPONSE).toContain(
      '3. Tell me you don’t have an item number.',
    )

    const routeSource = readFileSync(
      resolve(process.cwd(), 'app/api/nic-nac/route.ts'),
      'utf8',
    )
    expect(routeSource).not.toContain('shouldUseTradeBoardGuidedStart')
    expect(routeSource).not.toContain("model: 'guided_trade_board_start'")
    expect(routeSource).toContain('createConfiguredNicNacAgent({')
    expect(routeSource).toContain('configuredAgent.agent.stream({')
  })
})
