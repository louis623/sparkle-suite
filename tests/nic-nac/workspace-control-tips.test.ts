import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SiteSettingsCard, ToolsHub, getWorkspaceToolSections } from '@/app/nic-nac/components/DashboardPlaceholder'
import { TradeBoardWorkspaceCard } from '@/app/nic-nac/components/TradeBoardWorkspaceCard'
import {
  DASHBOARD_TIP_HOVER_MS,
  DASHBOARD_TIP_LONG_PRESS_MS,
} from '@/app/nic-nac/components/rep-dashboard-tips'
import {
  WORKSPACE_CONTROL_TIP_IDS,
  WORKSPACE_CONTROL_TIPS,
  workspaceControlTipText,
  type WorkspaceControlTipId,
} from '@/app/nic-nac/components/workspace-control-tips'

const root = process.cwd()

function source(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

const EXACT_TIPS: Record<WorkspaceControlTipId, string> = {
  'reveal-next':
    'Moves this customer to the front of your waiting lineup. It does not reveal them on Bomb Party.',
  hold:
    'Takes this order off the public waiting list and keeps it private until you return it. Bomb Party orders stay the same.',
  return: 'Puts a held customer back at the end of the waiting lineup.',
  'customer-card':
    'Opens the private match for this order so you can see who it is. It does not change their place in line.',
  'party-controls':
    'Hides a party’s customers from this lineup without changing Bomb Party. Undo does not bring a hidden party back.',
  'recover-archive':
    'Brings chosen customers from an earlier show into private Hold only. Recovery pauses lineup updates and clears Undo.',
  'remove-dancer':
    'Takes this piece off the Dance Floor customers see, and cancels a waiting request for it.',
  'approve-request':
    'Opens a check of what they offered. Nothing is approved until you confirm in that review.',
  'deny-request':
    'Opens the same review so you can turn the request down with a reason. Nothing is denied until you confirm.',
  'jewelry-library':
    'Search the catalog, then add a piece to your Dance Floor so customers can request it.',
  'wispr-flow':
    'Optional voice typing so you can talk to Nic-Nac during a LIVE without stopping to type.',
  'save-site-settings': 'Publishes this draft to your public site. Preview does not.',
}

describe('workspace control hover tips', () => {
  it('keeps the twelve checked sentences and leaves Bulk Collection Intake alone', () => {
    expect(DASHBOARD_TIP_HOVER_MS).toBe(2_000)
    expect(DASHBOARD_TIP_LONG_PRESS_MS).toBeLessThan(DASHBOARD_TIP_HOVER_MS)
    expect(WORKSPACE_CONTROL_TIP_IDS).toEqual(Object.keys(EXACT_TIPS))
    for (const id of WORKSPACE_CONTROL_TIP_IDS) {
      expect(WORKSPACE_CONTROL_TIPS[id]).toBe(EXACT_TIPS[id])
      expect(workspaceControlTipText(id)).toBe(EXACT_TIPS[id])
      expect(WORKSPACE_CONTROL_TIPS[id].length).toBeLessThan(180)
    }
    expect(WORKSPACE_CONTROL_TIP_IDS).not.toContain('collection-intake' as WorkspaceControlTipId)
    expect(JSON.stringify(WORKSPACE_CONTROL_TIPS)).not.toMatch(/Bulk Collection|Coming Soon|folder of jewelry/i)
  })

  it('uses the dashboard rest, focus, and long-press machine without swallowing a normal click', () => {
    const hook = source('app/nic-nac/components/use-delayed-hover-tip.ts')
    const control = source('app/nic-nac/components/ControlTip.tsx')
    const css = source('app/nic-nac/components/ControlTip.module.css')
    expect(hook).toContain("from './dashboard-tip-state'")
    expect(hook).toContain('if (!result.preventClick) return')
    expect(hook).toContain('event.preventDefault()')
    expect(hook).toContain('event.stopPropagation()')
    expect(hook).not.toMatch(/\b2_000\b|\b2000\b/)
    expect(control).toContain('useDelayedHoverTip')
    expect(control).toContain('{...handlers}')
    expect(control).toContain('role="tooltip"')
    expect(control).toContain('createPortal')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('255, 76, 174')
    expect(css).toContain('#171034')
    expect(css).toContain('#f8efe4')
  })

  it('attaches lineup tips to the live controls and the home-rail customer card', () => {
    const card = source('app/nic-nac/components/LiveLineupCard.tsx')
    const show = source('app/nic-nac/components/LiveLineupShowControls.tsx')
    const archive = source('app/nic-nac/components/LiveLineupArchiveControls.tsx')
    const home = source('app/nic-nac/components/DashboardPlaceholder.tsx')

    expect(card.match(/tip="customer-card"/g)).toHaveLength(2)
    const customer = card.indexOf('tip="customer-card"')
    const compactActions = card.indexOf('{!compact && <div className={styles.actions}>')
    expect(customer).toBeGreaterThan(-1)
    expect(customer).toBeLessThan(compactActions)
    expect(card.indexOf('tip="reveal-next"')).toBeGreaterThan(compactActions)
    expect(card.indexOf('tip="hold"')).toBeGreaterThan(card.indexOf('tip="reveal-next"'))
    expect(card).toContain('>Reveal next</button>')
    expect(card).toContain('>Hold</button>')
    expect(card).toContain('>Return</button>')
    expect(card.indexOf('tip="return"')).toBeGreaterThan(card.indexOf('Held for later'))
    expect(show).toContain('<ControlTip tip="party-controls" block><details')
    expect(show).toContain('<summary>Party controls</summary>')
    expect(archive).toContain('<ControlTip tip="recover-archive" block><details')
    expect(archive).toContain('<summary>Recover from a private archive</summary>')
    expect(home).toContain('<LiveLineupCard compact readOnly={liveLineupReadOnly} onAskCustomer={onAskCustomer} />')
    expect(home).toContain('<LiveLineupCard readOnly={readOnly} onAskCustomer={onAskCustomer} />')
  })

  it('attaches Dance Floor, Tools list, and save tips, and not the parked intake', () => {
    const board = source('app/nic-nac/components/TradeBoardWorkspaceCard.tsx')
    const home = source('app/nic-nac/components/DashboardPlaceholder.tsx')
    expect(board).toContain('<ControlTip tip="remove-dancer">')
    expect(board).toContain('<ControlTip tip="approve-request">')
    expect(board).toContain('<ControlTip tip="deny-request">')
    expect(board).toContain("'Remove'")
    expect(board).toContain("'Approve'")
    expect(board).toContain("'Deny'")
    expect(home).toContain("section.key === 'jewelry-library' || section.key === 'wispr-flow'")
    expect(home).toContain('tip={section.key} block listItem')
    expect(home).toContain('tip="save-site-settings"')
    expect(home).not.toContain('tip="collection-intake"')

    const bulkStart = home.indexOf('id="dance-floor-bulk-intake-title"')
    const bulkEnd = home.indexOf('<TradeBoardWorkspaceCard', bulkStart)
    const bulk = home.slice(bulkStart, bulkEnd)
    expect(bulk).toContain('Bulk Collection Intake')
    expect(bulk).toContain('Coming Soon')
    expect(bulk).not.toContain('ControlTip')
    expect(bulk).not.toContain('data-control-tip')

    const preview = home.indexOf('Preview customer site')
    const previewButton = home.lastIndexOf('<button', preview)
    const previewEnd = home.indexOf('</button>', preview)
    expect(home.slice(previewButton, previewEnd)).not.toContain('ControlTip')
    expect(home.indexOf('tip="save-site-settings"')).toBeGreaterThan(previewEnd)
  })

  it('keeps the tip text off the resting controls', () => {
    const tools = getWorkspaceToolSections({ includeRecipes: true, includeCardQr: true })
    const hub = renderToStaticMarkup(
      createElement(ToolsHub, {
        tools,
        activeKey: 'more',
        onSelect: () => undefined,
      }),
    )
    expect(hub).toContain('data-control-tip="jewelry-library"')
    expect(hub).toContain('data-control-tip="wispr-flow"')
    expect(hub.match(/data-control-tip=/g)).toHaveLength(2)
    expect(hub).not.toContain(EXACT_TIPS['jewelry-library'])
    expect(hub).not.toContain(EXACT_TIPS['wispr-flow'])
    expect(hub).toContain('>Business Calculator<')
    expect(hub).toContain('Coming Soon')
    expect(hub).not.toContain('Bulk Collection Intake')

    const settings = renderToStaticMarkup(
      createElement(SiteSettingsCard, {
        state: {
          status: 'ready',
          settings: {
            displayName: 'Louis',
            businessName: 'Sparkle by Sasha',
            email: 'hello@sparklebysasha.com',
            phone: '+19045551234',
            bannerText: 'Going live tonight',
            bannerVisible: true,
            tickerText: 'Fresh reveals every Tuesday',
            tickerVisible: false,
            tagline: 'Live sparkle, zero stress.',
            heroImageUrl: 'https://cdn.example.com/hero.jpg',
            heroAnimationType: 'soft_glow',
            teamName: 'Moonstone Squad',
            showJoinPage: true,
            customerSiteTemplate: 'amethyst',
            appearancePreset: 'amethyst',
            socialHandles: { instagram: '@sparklebysasha', facebook: 'sparklebysasha' },
          },
        },
        draft: {
          displayName: 'Louis',
          businessName: 'Sparkle by Sasha',
          email: 'hello@sparklebysasha.com',
          phone: '+19045551234',
          bannerText: 'Going live tonight',
          bannerVisible: true,
          tickerText: 'Fresh reveals every Tuesday',
          tickerVisible: false,
          tagline: 'Live sparkle, zero stress.',
          heroImageUrl: 'https://cdn.example.com/hero.jpg',
          heroAnimationType: 'soft_glow',
          teamName: 'Moonstone Squad',
          showJoinPage: true,
          customerSiteTemplate: 'amethyst',
          appearancePreset: 'amethyst',
          socialHandles: { instagram: '@sparklebysasha', facebook: 'sparklebysasha' },
        },
        hasUnsavedChanges: true,
        statusMessage: 'Unsaved changes.',
      }),
    )
    expect(settings).toContain('data-control-tip="save-site-settings"')
    expect(settings).toContain('Save site settings')
    expect(settings).toContain('Preview customer site')
    expect(settings).not.toContain(EXACT_TIPS['save-site-settings'])
    expect(settings.match(/data-control-tip=/g)).toHaveLength(1)

    const board = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: {
          status: 'ready',
          board: {
            summary: {
              totalPieces: 1,
              availableDancerCount: 1,
              newDancersTodayCount: 0,
              totalMsrp: 39,
              typeBreakdown: { RG: 1, NK: 0, ER: 0, ST: 0, BR: 0 },
              pendingRequestCount: 1,
            },
            listings: [
              {
                id: 'listing-1',
                rep_id: 'rep-1',
                status: 'available',
                rep_notes: null,
                trade_preferences: null,
                listing_photo_url: null,
                uses_canonical_photo: true,
                listed_at: '2026-05-05T12:00:00Z',
                removal_reason: null,
                deleted_at: null,
                created_at: '2026-05-05T12:00:00Z',
                updated_at: '2026-05-05T12:00:00Z',
                design: {
                  id: 'design-1',
                  item_number: 'RG100',
                  design_name: 'Sapphire Halo',
                  material: 'Sterling',
                  main_stone: 'Sapphire',
                  bp_msrp: 39,
                  canonical_photo_url: null,
                  type_prefix: 'RG',
                  collection: { id: 'collection-1', name: 'Birthday' },
                },
              },
            ],
          },
        },
        tradeRequestsState: {
          status: 'ready',
          requests: [
            {
              id: 'request-1',
              customerName: 'Jamie Lane',
              customerDescription: 'Birthday ring',
              revealScreenshot: null,
              listing: {
                id: 'listing-1',
                repFacingNote: null,
                design: {
                  itemNumber: 'RG100',
                  designName: 'Sapphire Halo',
                  collectionName: 'Birthday',
                  typePrefix: 'RG',
                },
              },
            },
          ],
        },
        fulfillmentQueueState: { status: 'ready', items: [], total: 0, totalOpen: 0, page: 1, pageSize: 10 },
        tradeBoardSearchQuery: '',
        onTradeBoardSearchQueryChange: () => undefined,
        quickAddItemNumber: '',
        onQuickAddItemNumberChange: () => undefined,
        actionState: { pendingKey: null, error: null, helperMessage: null },
        onQuickAddListing: () => undefined,
        onRemoveListing: () => undefined,
        onReviewRequest: () => undefined,
        onAdvanceFulfillment: () => undefined,
        onSoundSettingsTarget: () => undefined,
      }),
    )
    expect(board).toContain('data-control-tip="remove-dancer"')
    expect(board).toContain('data-control-tip="approve-request"')
    expect(board).toContain('data-control-tip="deny-request"')
    expect(board).toContain('>Remove<')
    expect(board).toContain('>Approve<')
    expect(board).toContain('>Deny<')
    expect(board).not.toContain(EXACT_TIPS['remove-dancer'])
    expect(board).not.toContain(EXACT_TIPS['approve-request'])
    expect(board).not.toContain(EXACT_TIPS['deny-request'])
    expect(board).not.toContain('Bulk Collection Intake')
  })
})
