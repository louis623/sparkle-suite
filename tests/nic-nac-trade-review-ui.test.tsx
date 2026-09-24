import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { TradeAlertSoundControls, TradeRequestAlertCard } from '@/app/nic-nac/components/TradeRequestAlertCenter'
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
  it('identifies a partial alert preview without restoring the top count bar', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCard, {
      active: request, activeIndex: 0, requestCount: 1, pendingCount: 9, refreshError: false,
      onReview: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(),
    }))
    expect(html).toContain('1 of 1 shown')
    expect(html).not.toContain('9 trade requests pending')
  })

  it('marks a failed refresh in the request card', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCard, {
      active: request, activeIndex: 0, requestCount: 1, pendingCount: 9, refreshError: true,
      onReview: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(),
    }))
    expect(html).toContain('Showing last known request')
  })

  it('keeps a pending alert visible with only approve and deny review actions', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCard, {
      active: request, activeIndex: 0, requestCount: 1, pendingCount: 1, refreshError: false,
      onReview: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(),
    }))
    expect(html).toContain('Test Customer')
    expect(html).toContain('>Approve</button>')
    expect(html).toContain('>Deny</button>')
    expect(html).not.toContain('Acknowledge')
  })

  it('offers request navigation without changing the pending count or decision actions', () => {
    const html = renderToStaticMarkup(createElement(TradeRequestAlertCard, {
      active: request, activeIndex: 0, requestCount: 2, pendingCount: 2, refreshError: false,
      onReview: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(),
    }))
    expect(html).not.toContain('2 trade requests pending')
    expect(html).toContain('Previous trade request')
    expect(html).toContain('Next trade request')
    expect(html).toContain('1 of 2')
    expect(html).toContain('>Approve</button>')
    expect(html).toContain('>Deny</button>')
    expect(html).not.toContain('Acknowledge')
  })

  it('offers only muted and chime settings on the Dance Floor', () => {
    const html = renderToStaticMarkup(createElement(TradeAlertSoundControls, {
      enabled: true, onChange: vi.fn(), onTest: vi.fn(),
    }))
    expect(html).toContain('Trade request sound')
    expect(html).toContain('>Chime</option>')
    expect(html).toContain('Preview chime')
    expect(html).not.toContain('Voice')
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
    expect(alert).toContain("saved === 'chime' || saved === 'voice'")
    expect(alert).not.toContain('speechSynthesis')
    expect(alert).toContain('Preview chime')
    expect(alert).toContain("onReview(active.id, 'approve')")
    expect(alert).toContain("onReview(active.id, 'reject')")
    expect(alert).not.toContain('trade-alert-ack-v1')
    expect(alert).toContain('Customer-reported details:')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('mounts the request card below the chat and sound controls on the Dance Floor', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'), 'utf8')
    const board = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/TradeBoardWorkspaceCard.tsx'), 'utf8')
    expect(source).toContain('alertTarget={homeTradeAlertTarget}')
    expect(source).toContain('mobileAlertTarget={mobileTradeAlertTarget}')
    expect(source).toContain('soundTarget={tradeSoundTarget}')
    expect(source.indexOf('<div ref={onTradeAlertTarget}')).toBeGreaterThan(source.indexOf('<div className={styles.embeddedChat}>{chat}</div>'))
    expect(board).toContain('<div ref={onSoundSettingsTarget}')
    const css = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'), 'utf8')
    expect(css).toContain('.homeTradeAlertSlot')
  })
})
