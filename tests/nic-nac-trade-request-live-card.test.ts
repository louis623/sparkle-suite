import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildAssistantMessageRenderables,
  getTradeRequestCardState,
} from '@/app/nic-nac/components/NicNacChatBody'
import {
  isTradeRequestCardPart,
  type TradeRequestCardPart,
} from '@/lib/nic-nac/trade-request-card-parts'

const tradeRequestPart: TradeRequestCardPart = {
  type: 'data-trade-request-card',
  data: {
    requestId: 'trade_request_123',
    customerName: 'Maya Stone',
    requestedItem: {
      itemNumber: 'R1234',
      designName: 'Moonlit Garden',
      typePrefix: 'Ring',
      collectionName: 'Sterling Club',
      bpMsrp: 42,
    },
    offeredText: 'Offering R9988 - Garden Glow.',
    ruleCheck: {
      status: 'needs_review',
      label: 'Compare against Ring / Sterling Club',
      description: 'Confirm the offered piece before approving.',
    },
  },
}

describe('Nic-Nac live trade request card UI wiring', () => {
  const cardPath = resolve(
    process.cwd(),
    'app/nic-nac/components/TradeRequestLiveCard.tsx',
  )
  const tradeRequestCardPartsPath = resolve(
    process.cwd(),
    'lib/nic-nac/trade-request-card-parts.ts',
  )
  const tradeRequestNotificationsPath = resolve(
    process.cwd(),
    'lib/nic-nac/trade-request-notifications.ts',
  )
  const dashboardPath = resolve(
    process.cwd(),
    'app/nic-nac/components/DashboardPlaceholder.tsx',
  )
  const chatBodyPath = resolve(
    process.cwd(),
    'app/nic-nac/components/NicNacChatBody.tsx',
  )

  it('defines the live trade request card contract and visible labels', () => {
    const source = readFileSync(cardPath, 'utf8')

    expect(source).toContain("TradeRequestCardPart['data']")
    expect(source).toContain("pendingAction: 'approve' | 'reject' | null")
    expect(source).toContain('actionsDisabled?: boolean')
    expect(source).toContain('terminalNote?: string | null')
    expect(source).toContain('errorMessage?: string | null')
    expect(source).toContain(
      "onDecision: (decision: 'approve' | 'reject', requestId: string) => void",
    )
    expect(source).toContain('actionsDisabled || pendingAction !== null')
    expect(source).toContain("pendingAction === 'approve' ? 'Opening...' : 'Review to approve'")
    expect(source).toContain("pendingAction === 'reject' ? 'Opening...' : 'Review to deny'")
    expect(source).toContain('terminalNote')
    expect(source).toContain('errorMessage')
    expect(source).toContain('aria-label={`Review approval for trade request from ${request.customerName} for ${requestedItem}`}')
    expect(source).toContain('aria-label={`Review denial for trade request from ${request.customerName} for ${requestedItem}`}')
    expect(source).toContain('New trade request')
    expect(source).toContain('customerName')
    expect(source).toContain('itemNumber')
    expect(source).toContain('designName')
    expect(source).toContain('request.requestedItem.itemNumber')
    expect(source).toContain('request.requestedItem.repFacingNote')
    expect(source).toContain('offeredText')
    expect(source).toContain('ruleCheck.label')
    expect(source).toContain('Review to approve')
    expect(source).toContain('Review to deny')
    expect(source).toContain("onDecision('approve', request.requestId)")
    expect(source).toContain("onDecision('reject', request.requestId)")
  })

  it('accepts non-item-number request card data without rendering a null item label', () => {
    const manualPart: TradeRequestCardPart = {
      type: 'data-trade-request-card',
      data: {
        requestId: 'trade_request_manual_123',
        customerName: 'Maya Stone',
        requestedItem: {
          itemNumber: null,
          designName: 'July Birthday 2026 Ring - Size 7',
          typePrefix: 'RG',
          collectionName: 'July Birthday 2026',
          bpMsrp: null,
          repFacingNote: '(non-item number piece)',
        },
        offeredText: 'Offering a July Birthday necklace.',
        ruleCheck: {
          status: 'needs_review',
          label: 'Compare against RG / July Birthday 2026',
          description: 'Confirm the offered piece before approving.',
        },
      },
    }

    expect(isTradeRequestCardPart(manualPart)).toBe(true)
    const renderables = buildAssistantMessageRenderables([manualPart])
    expect(renderables).toEqual([
      {
        type: 'data-trade-request-card',
        key: 'trade-request-trade_request_manual_123-0',
        request: manualPart.data,
      },
    ])

    const source = readFileSync(cardPath, 'utf8')
    expect(source).toContain('request.requestedItem.itemNumber')
    expect(source).toContain('request.requestedItem.repFacingNote')
    expect(source).toContain(': `${request.requestedItem.designName}${')
  })

  it('renders trade request card parts inside assistant messages without replacing text or HITL rendering', () => {
    const source = readFileSync(chatBodyPath, 'utf8')

    expect(source).toContain('TradeRequestLiveCard')
    expect(source).toContain('isTradeRequestCardPart')
    expect(source).toContain('data-trade-request-card')
    expect(source).toContain('<StreamingBubble')
    expect(source).toContain('<Bubble')
    expect(source).toContain('<HITLBlock')
    expect(source).toContain('actionsDisabled={cardState.actionsDisabled}')
    expect(source).toContain('terminalNote={cardState.terminalNote}')
    expect(source).toContain('errorMessage={cardState.errorMessage}')
  })

  it('opens shared trade review from live chat cards without a direct mutation', () => {
    const source = readFileSync(chatBodyPath, 'utf8')

    expect(source).toContain("action: 'approve' | 'reject'")
    expect(source).toContain('openTradeRequestReview(requestId, action)')
    expect(source).not.toContain("fetch('/api/nic-nac/trade-requests'")
    expect(source).toContain('getTradeRequestCardState')
  })

  it('refreshes the visible trade workspace and Nic-Nac conversation every 15 seconds', () => {
    const dashboardSource = readFileSync(dashboardPath, 'utf8')
    const chatBodySource = readFileSync(chatBodyPath, 'utf8')

    expect(dashboardSource).toContain('const TRADE_WORKSPACE_REFRESH_MS = 15_000')
    expect(dashboardSource).toContain("if (activeSection !== 'trade-board') return")
    expect(dashboardSource).toContain('if (reviewWorkspaceMode) return')
    expect(dashboardSource).toContain("document.visibilityState === 'hidden'")
    expect(dashboardSource).toContain('window.setTimeout(refresh, Math.min(60_000, TRADE_WORKSPACE_REFRESH_MS * 2 ** failures))')
    expect(dashboardSource).toContain('refreshTradeWorkspaceSettled()')
    expect(dashboardSource).toContain('TRADE_WORKSPACE_REFRESH_MS')

    expect(chatBodySource).toContain(
      'const CONVERSATION_MESSAGE_REFRESH_MS = 15_000',
    )
    expect(chatBodySource).toContain("status !== 'ready'")
    expect(chatBodySource).toContain('hasPendingApproval')
    expect(chatBodySource).toContain("document.visibilityState === 'hidden'")
    expect(chatBodySource).toContain('window.setInterval(')
    expect(chatBodySource).toContain('refreshIfIdle')
    expect(chatBodySource).toContain('CONVERSATION_MESSAGE_REFRESH_MS')
  })

  it('recovers a stuck Nic-Nac stream from persisted server history', () => {
    const source = readFileSync(chatBodyPath, 'utf8')

    expect(source).toContain('const STREAM_COMPLETION_RECOVERY_MS')
    expect(source).toContain('hasCompletedAssistantAfterLatestUser')
    expect(source).toContain('stop')
    expect(source).toContain('window.setTimeout(')
    expect(source).toContain('status !== \'streaming\' && status !== \'submitted\'')
    expect(source).toContain('mergeServerMessages(current, body.messages ?? [])')
    expect(source).toContain('await stop()')
  })

  it('keeps Nic-Nac live refresh guardrails silent and browser-notification free', () => {
    const guardedSources = [
      dashboardPath,
      chatBodyPath,
      cardPath,
      tradeRequestCardPartsPath,
      tradeRequestNotificationsPath,
    ].map((path) => readFileSync(path, 'utf8'))
    const forbiddenPatterns = [
      'new Audio(',
      'HTMLAudioElement',
      'Notification.requestPermission',
      'new Notification(',
    ]

    for (const source of guardedSources) {
      for (const pattern of forbiddenPatterns) {
        expect(source).not.toContain(pattern)
      }
    }
  })

  it('returns pending live card state that disables every card while one decision is in flight', () => {
    expect(
      getTradeRequestCardState({
        requestId: 'trade_request_123',
        pendingTradeDecision: {
          requestId: 'trade_request_999',
          action: 'approve',
        },
        resolvedTradeDecisions: {},
        tradeDecisionErrors: {},
      }),
    ).toEqual({
      pendingAction: null,
      actionsDisabled: true,
      terminalNote: null,
      errorMessage: null,
    })

    expect(
      getTradeRequestCardState({
        requestId: 'trade_request_123',
        pendingTradeDecision: {
          requestId: 'trade_request_123',
          action: 'reject',
        },
        resolvedTradeDecisions: {},
        tradeDecisionErrors: {},
      }),
    ).toEqual({
      pendingAction: 'reject',
      actionsDisabled: true,
      terminalNote: null,
      errorMessage: null,
    })
  })

  it('returns terminal and error card states by request id', () => {
    expect(
      getTradeRequestCardState({
        requestId: 'trade_request_123',
        pendingTradeDecision: null,
        resolvedTradeDecisions: { trade_request_123: 'approve' },
        tradeDecisionErrors: {},
      }),
    ).toEqual({
      pendingAction: null,
      actionsDisabled: true,
      terminalNote: 'Trade approved.',
      errorMessage: null,
    })

    expect(
      getTradeRequestCardState({
        requestId: 'trade_request_123',
        requestStatus: 'denied',
        pendingTradeDecision: null,
        resolvedTradeDecisions: {},
        tradeDecisionErrors: {},
      }),
    ).toEqual({
      pendingAction: null,
      actionsDisabled: true,
      terminalNote: 'Trade denied.',
      errorMessage: null,
    })

    expect(
      getTradeRequestCardState({
        requestId: 'trade_request_123',
        pendingTradeDecision: null,
        resolvedTradeDecisions: {},
        tradeDecisionErrors: { trade_request_123: 'Trade request is no longer pending.' },
      }),
    ).toEqual({
      pendingAction: null,
      actionsDisabled: false,
      terminalNote: null,
      errorMessage: 'Trade request is no longer pending.',
    })
  })

  it('preserves text, card, text order for mixed assistant message parts', () => {
    const renderables = buildAssistantMessageRenderables([
      { type: 'text', text: 'Maya has a new request. ' },
      tradeRequestPart,
      { type: 'text', text: 'Want to review it?' },
    ])

    expect(renderables).toEqual([
      { type: 'text', key: 'text-1', text: 'Maya has a new request. ' },
      {
        type: 'data-trade-request-card',
        key: 'trade-request-trade_request_123-1',
        request: tradeRequestPart.data,
      },
      { type: 'text', key: 'text-final', text: 'Want to review it?' },
    ])
  })
})
