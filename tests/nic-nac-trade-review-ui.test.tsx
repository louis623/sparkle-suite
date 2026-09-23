import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { TradeRequestAlertCenter } from '@/app/nic-nac/components/TradeRequestAlertCenter'
import { TradeRequestReviewDialog } from '@/app/nic-nac/components/TradeRequestReviewDialog'
import type { TradeRequestWithListing } from '@/lib/services/types'

const request: TradeRequestWithListing = {
  id: 'request-1', status: 'pending', customerName: 'Test Customer',
  customerDescription: 'July Birthday ring', revealScreenshot: null,
  offeredFamily: 'birthday', offeredType: 'RG', manualReviewRequested: true,
  screening: { status: 'mismatch', reason: 'The customer selected the wrong family.' },
  verificationNeeded: true, rejectionReason: null, repNotes: null,
  createdAt: '2026-09-23T12:00:00.000Z', updatedAt: '2026-09-23T12:00:00.000Z',
  listing: {
    id: 'listing-1', repId: 'rep-1', listingPhotoUrl: null, usesCanonicalPhoto: false,
    design: { id: 'design-1', itemNumber: 'RG1234', designName: 'July Ring',
      collectionName: 'July Birthday 2026', material: null, mainStone: null,
      bpMsrp: null, canonicalPhotoUrl: null, typePrefix: 'RG' },
  },
}

describe('rep trade review UI', () => {
  it('shows the exact pending count even when the preview has only one of nine requests', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCenter, {
      requests: [request], pendingCount: 9, refreshError: false,
      onReview: vi.fn(), onOpenInbox: vi.fn(),
    }))
    expect(html).toContain('9 trade requests pending')
    expect(html).not.toContain('count unavailable')
  })

  it('keeps last known count and marks a failed refresh', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCenter, {
      requests: [request], pendingCount: 9, refreshError: true,
      onReview: vi.fn(), onOpenInbox: vi.fn(),
    }))
    expect(html).toContain('9 trade requests pending')
    expect(html).toContain('showing last known count')
  })

  it('keeps a pending alert visible with only approve and deny review actions', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCenter, {
      requests: [request], pendingCount: 1, refreshError: false,
      onReview: vi.fn(), onOpenInbox: vi.fn(),
    }))
    expect(html).toContain('Test Customer')
    expect(html).toContain('>Approve</button>')
    expect(html).toContain('>Deny</button>')
    expect(html).not.toContain('Acknowledge')
  })

  it('offers request navigation without changing the pending count or decision actions', () => {
    const next = { ...request, id: 'request-2', customerName: 'Second Customer' }
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCenter, {
      requests: [request, next], pendingCount: 2, refreshError: false,
      onReview: vi.fn(), onOpenInbox: vi.fn(),
    }))
    expect(html).toContain('2 trade requests pending')
    expect(html).toContain('Previous trade request')
    expect(html).toContain('Next trade request')
    expect(html).toContain('1 of 2')
    expect(html).toContain('>Approve</button>')
    expect(html).toContain('>Deny</button>')
    expect(html).not.toContain('Acknowledge')
  })

  it('shows the exception label and requires confirmation in the shared dialog', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestReviewDialog, {
      request, onClose: vi.fn(), onSubmit: vi.fn(),
    }))
    expect(html).toContain('Rule exception — rep review needed')
    expect(html).toContain('The customer selected the wrong family.')
    expect(html).toContain('I verified these facts')
    expect(html).toContain('I confirm this one-for-one trade')
    expect(html).toMatch(/type="submit"[^>]*disabled=""/)
  })

  it('offers required denial reasons and a private notes field', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestReviewDialog, {
      request, initialAction: 'reject', onClose: vi.fn(), onSubmit: vi.fn(),
    }))
    expect(html).toContain('Collection mismatch')
    expect(html).toContain('Jewelry type mismatch')
    expect(html).toContain('Requested item unavailable')
    expect(html).toContain('Private rep notes')
  })

  it('preserves non-trade chat tools and uses opt-in, reduced-motion-safe attention cues', () => {
    const base = resolve(process.cwd(), 'app/nic-nac/components')
    const chat = readFileSync(resolve(base, 'NicNacChatBody.tsx'), 'utf8')
    const dashboard = readFileSync(resolve(base, 'DashboardPlaceholder.tsx'), 'utf8')
    const alert = readFileSync(resolve(base, 'TradeRequestAlertCenter.tsx'), 'utf8')
    const css = readFileSync(resolve(base, 'TradeRequestAlertCenter.module.css'), 'utf8')
    expect(chat).toContain('<HITLBlock')
    expect(chat).toContain('openTradeRequestReview(requestId, action)')
    expect(dashboard).toContain('<TradeRequestAlertCenter')
    expect(dashboard).toContain('tradeRequestsState.pendingCount')
    expect(dashboard).toContain('payload.pendingCount > payload.requests.length')
    expect(dashboard).toContain('loadTradeRequestInbox(signal)')
    expect(alert).toContain("useState<'off' | 'chime' | 'voice'>('off')")
    expect(alert).toContain('Test trade alert sound')
    expect(alert).toContain("onReview(active.id, 'approve')")
    expect(alert).toContain("onReview(active.id, 'reject')")
    expect(alert).not.toContain('trade-alert-ack-v1')
    expect(alert).toContain('Customer-reported details:')
    expect(css).toContain('prefers-reduced-motion:reduce')
  })

  it('keeps the alert above both workspace and live-site preview modes', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'), 'utf8')
    const alertPosition = source.indexOf('<TradeRequestAlertCenter')
    const previewPosition = source.indexOf('{activeWorkspacePreview ? (', alertPosition)
    expect(alertPosition).toBeGreaterThan(source.indexOf('data-customer-site-skin={workspaceSkinPreset}'))
    expect(previewPosition).toBeGreaterThan(alertPosition)
    expect(source).toContain("setWorkspacePreview({ mode: 'workspace' })")
    expect(source).toContain('<div className={styles.workspaceViewport}>')
    const css = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'), 'utf8')
    expect(css).toContain('.workspaceViewport > :first-child')
  })
})
