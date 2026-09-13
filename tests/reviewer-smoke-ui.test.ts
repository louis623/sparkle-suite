import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TradeBoardWorkspaceCard } from '@/app/nic-nac/components/TradeBoardWorkspaceCard'

describe('reviewer smoke UI wiring', () => {
  const startForm = readFileSync(
    resolve(process.cwd(), 'app/start/StartSparkleSuiteForm.tsx'),
    'utf8',
  )
  const startPage = readFileSync(
    resolve(process.cwd(), 'app/start/page.tsx'),
    'utf8',
  )
  const nicNacClient = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/_client.tsx'),
    'utf8',
  )
  const nicNacChatBody = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/NicNacChatBody.tsx'),
    'utf8',
  )
  const nicNacPage = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/page.tsx'),
    'utf8',
  )
  const loginPage = readFileSync(
    resolve(process.cwd(), 'app/login/page.tsx'),
    'utf8',
  )
  const requiredSetupHome = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.tsx'),
    'utf8',
  )
  const nicNacHeader = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/NicNacHeader.tsx'),
    'utf8',
  )
  const nicNacHeaderCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/NicNacHeader.module.css'),
    'utf8',
  )
  const dashboardPlaceholder = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
    'utf8',
  )
  const standard = readFileSync(
    resolve(process.cwd(), 'docs/sparkle-suite/testing/reviewer-smoke-standard.md'),
    'utf8',
  )
  const nicNacShellCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/_shell.module.css'),
    'utf8',
  )
  const workspaceShell = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.tsx'),
    'utf8',
  )
  const workspaceShellCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.module.css'),
    'utf8',
  )
  const workspaceSectionTabsCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.module.css'),
    'utf8',
  )
  const nicNacPageCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/page.module.css'),
    'utf8',
  )
  const nicNacColumnCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/NicNacColumn.module.css'),
    'utf8',
  )
  const requiredSetupCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.module.css'),
    'utf8',
  )
  const dashboardCss = readFileSync(
    resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
    'utf8',
  )
  const tradeBoardWorkspaceCardHtml = renderToStaticMarkup(
    createElement(TradeBoardWorkspaceCard, {
      tradeBoardState: {
        status: 'ready',
        board: {
          summary: {
            totalPieces: 2,
            totalMsrp: 78,
            typeBreakdown: { RG: 1, NK: 0, ER: 0, ST: 1, BR: 0 },
            pendingRequestCount: 1,
          },
          listings: [
            {
              id: 'listing-1',
              rep_id: 'rep-1',
              status: 'available',
              rep_notes: null,
              trade_preferences: null,
              listing_photo_url: 'https://cdn.example.com/sapphire-halo.jpg',
              uses_canonical_photo: false,
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
            customerName: 'Jamie',
            customerDescription: 'Looking for a silver swap.',
            createdAt: '2026-06-10T20:00:00.000Z',
            listing: {
              id: 'listing-1',
              rep_id: 'rep-1',
              status: 'available',
              rep_notes: null,
              trade_preferences: null,
              listing_photo_url: 'https://cdn.example.com/sapphire-halo.jpg',
              uses_canonical_photo: false,
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
            revealScreenshot: null,
          },
        ],
      },
      fulfillmentQueueState: {
        status: 'ready',
        items: [
          {
            fulfillmentId: 'fulfillment-1',
            requestId: 'request-1',
            customerName: 'Jamie',
            itemNumber: 'RG100',
            designName: 'Sapphire Halo',
            status: 'approved',
            daysSinceLastUpdate: 2,
          },
        ],
      },
      tradeSwapCleanupState: {
        status: 'ready',
        items: [
          {
            swapId: 'swap-1',
            requestId: 'request-1',
            customerName: 'Jamie',
            outgoingListingId: 'listing-1',
            revealedItemNumber: 'ER00001',
            revealedRingSize: null,
            replacementStatus: 'needs_catalog_details',
            createdAt: '2026-06-11T20:00:00.000Z',
          },
        ],
      },
      tradeBoardSearchQuery: '',
      onTradeBoardSearchQueryChange: () => {},
      quickAddItemNumber: '',
      onQuickAddItemNumberChange: () => {},
      actionState: { pendingKey: null, error: null, helperMessage: null },
      onQuickAddListing: () => {},
      onRemoveListing: () => {},
      onApproveRequest: () => {},
      onRejectRequest: () => {},
      onAdvanceFulfillment: () => {},
    }),
  )
  const tradeBoardWorkspaceCardQuietHtml = renderToStaticMarkup(
    createElement(TradeBoardWorkspaceCard, {
      tradeBoardState: {
        status: 'ready',
        board: {
          summary: {
            totalPieces: 2,
            totalMsrp: 78,
            typeBreakdown: { RG: 1, NK: 0, ER: 0, ST: 1, BR: 0 },
            pendingRequestCount: 0,
          },
          listings: [
            {
              id: 'listing-1',
              rep_id: 'rep-1',
              status: 'available',
              rep_notes: null,
              trade_preferences: null,
              listing_photo_url: 'https://cdn.example.com/sapphire-halo.jpg',
              uses_canonical_photo: false,
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
      tradeRequestsState: { status: 'ready', requests: [] },
      fulfillmentQueueState: { status: 'ready', items: [] },
      tradeSwapCleanupState: { status: 'ready', items: [] },
      tradeBoardSearchQuery: '',
      onTradeBoardSearchQueryChange: () => {},
      quickAddItemNumber: '',
      onQuickAddItemNumberChange: () => {},
      actionState: { pendingKey: null, error: null, helperMessage: null },
      onQuickAddListing: () => {},
      onRemoveListing: () => {},
      onApproveRequest: () => {},
      onRejectRequest: () => {},
      onAdvanceFulfillment: () => {},
      hasMoreListings: true,
      isInventoryBrowseLoading: true,
    }),
  )

  it('keeps reviewer controls on the protected start route without public signup', () => {
    expect(startForm).toContain('/api/reviewer-smoke/session')
    expect(startForm).toContain('reviewerSmokeVisible')
    expect(startForm).toContain('Review inactive account')
    expect(startForm).toContain('Open setup preview')
    expect(startForm).toContain('Open workspace preview')
    expect(startForm).toContain("startReviewerSmoke('required_setup')")
    expect(startForm).toContain("startReviewerSmoke('dashboard_unlocked')")
    expect(startForm).not.toContain('Review checkout recovery')
    expect(startForm).not.toContain('{reviewToken ? (')
    expect(startForm).not.toContain('/api/self-serve/signup')
    expect(startForm).not.toContain('/api/stripe/create-checkout')
    expect(startForm).not.toContain('Continue with Google')
    expect(startPage).toContain('inactive')
    expect(startPage).toContain('account guard')
    expect(startPage).not.toContain('review checkout')
  })

  it('reviews inactive access without opening checkout automatically', () => {
    expect(nicNacClient).not.toContain('/api/stripe/create-checkout')
    expect(nicNacClient).not.toContain('handleStartCheckout')
    expect(nicNacClient).not.toContain('/api/reviewer-smoke/checkout')
    expect(nicNacClient).not.toContain('void handleSimulateReviewerCheckout()')
    expect(nicNacClient).toContain('WorkspaceAccessPending')
    expect(requiredSetupHome).not.toContain('Simulate paid checkout')
    expect(requiredSetupHome).not.toContain('Secure checkout')
  })

  it('captures reviewer smoke path as a standard process', () => {
    expect(standard).toContain('not ready for Louis review')
    expect(standard).toContain(
      'tests proving production review mode requires the explicit long review token',
    )
    expect(standard).toContain('no live charges')
    expect(standard).toContain('npm run smoke:calendar')
    expect(standard).toContain('Finder live-shows endpoint')
  })

  it('exposes a reviewer-only reset on the required setup preview', () => {
    expect(nicNacClient).toContain('reviewerSmokeVisible')
    expect(nicNacClient).toContain('showReviewerSetupActions')
    expect(nicNacClient).toContain('state?.supportState?.reviewer_smoke')
    expect(nicNacClient).toContain('/api/reviewer-smoke/session')
    expect(nicNacClient).toContain("searchParams.get('review')")
    expect(nicNacClient).toContain('token: reviewerSmokeToken')
    expect(nicNacClient).toContain('encodeURIComponent(reviewerSmokeToken)')
    expect(nicNacClient).toContain('Reset setup preview')
    expect(requiredSetupHome).toContain('reviewerActions')
  })

  it('keeps the post-setup workspace visible in non-production review mode', () => {
    expect(nicNacPage).toContain('workspaceReviewAccessEnabled()')
    expect(nicNacClient).toContain('buildWorkspaceReviewFallbackState')
    expect(nicNacClient).toContain('review_workspace')
    expect(nicNacClient).toContain('Gracie Smoke')
    expect(nicNacClient).toContain('Gracie Test Studio 20260605001558')
    expect(nicNacClient).toContain('GS2-2335')
  })

  it('lets the Nic-Nac workspace own its Concept 1 app chrome', () => {
    expect(nicNacPage).not.toContain('SparkleSuitePublicHeader')
    expect(nicNacPage).not.toContain('SparkleSuitePublicFooter')
    expect(nicNacPage).not.toContain('sparkle-landing-v2')
    expect(nicNacPage).toContain('<NicNacClient')
    expect(dashboardPlaceholder).toContain('function WorkspaceAppHeader')
    expect(dashboardPlaceholder).not.toContain('Ask Nic-Nac anything...')
    expect(dashboardPlaceholder).toContain('aria-label="Go to Nic-Nac home"')
    expect(dashboardPlaceholder).not.toContain('<form className={styles.appSearch} onSubmit={handleSubmit}>')
    expect(dashboardPlaceholder).not.toContain('aria-label="Ask Nic-Nac anything"')
    expect(dashboardPlaceholder).toContain('onSendNicNacPrompt')
    expect(nicNacClient).toContain('handleSendNicNacPrompt')
    expect(dashboardPlaceholder).toContain('className={styles.appProfile}')
  })

  it('keeps public Sparkle Suite header and footer around login', () => {
    expect(loginPage).toContain('SparkleSuitePublicHeader')
    expect(loginPage).toContain('SparkleSuitePublicFooter')
    expect(loginPage).toContain('sparkle-landing-v2')
    expect(loginPage).toContain('sl2-shell')
    expect(loginPage.indexOf('<SparkleSuitePublicHeader')).toBeLessThan(
      loginPage.indexOf('<LoginClient'),
    )
    expect(loginPage.indexOf('<LoginClient')).toBeLessThan(
      loginPage.indexOf('<SparkleSuitePublicFooter'),
    )
  })

  it('keeps Nic-Nac page chrome from fighting the workspace layout', () => {
    expect(nicNacPage).not.toContain('styles.chrome')
    expect(nicNacPageCss).toContain('--nic-nac-app-height: 100dvh')
    expect(nicNacPageCss).toContain('overflow-x: clip')
    expect(nicNacShellCss).not.toContain('grid-template-columns: minmax(0, 1fr) minmax(380px, 420px)')
    expect(nicNacClient).toContain('desktopChat={')
    expect(dashboardPlaceholder).toContain('desktopChat?: ReactNode')
    expect(dashboardPlaceholder).toContain('ConceptHomeWorkspace')
    expect(nicNacColumnCss).not.toMatch(/\.desktop\s*{[^}]*position:\s*fixed/s)
    expect(nicNacColumnCss).toMatch(/\.desktop\s*{[^}]*position:\s*sticky/s)
    expect(requiredSetupCss).not.toMatch(/\.root\s*{[^}]*height:\s*100dvh/s)
    expect(requiredSetupCss).toContain('var(--nic-nac-app-height')
    expect(dashboardCss).toContain('var(--nic-nac-app-height')
  })

  it('uses the streamlined primary workspace navigation', () => {
    expect(dashboardPlaceholder).toContain("label: 'Nic-Nac'")
    expect(dashboardPlaceholder).toContain("label: 'Dance Floor'")
    expect(dashboardPlaceholder).toContain("label: 'Calendar'")
    expect(dashboardPlaceholder).toContain("label: 'Tools'")
    expect(dashboardPlaceholder).toContain('SECONDARY_WORKSPACE_SECTIONS')
    expect(dashboardPlaceholder.indexOf('SECONDARY_WORKSPACE_SECTIONS')).toBeLessThan(
      dashboardPlaceholder.indexOf("key: 'jewelry-library'"),
    )
    expect(dashboardPlaceholder).toContain("key: 'collection-intake'")
    expect(dashboardPlaceholder).toContain("key: 'live-queue'")
    expect(dashboardPlaceholder).toContain('LiveQueueTool')
    expect(dashboardPlaceholder).toContain('LIVE_QUEUE_CHROME_EXTENSION_URL')
    expect(workspaceShell).toContain('className={styles.content}')
    expect(workspaceShell.indexOf('className={styles.content}')).toBeLessThan(
      workspaceShell.indexOf('className={styles.tabsWrap}'),
    )
    expect(workspaceShellCss).toContain('bottom: 0')
    expect(workspaceShellCss).toContain('env(safe-area-inset-bottom)')
    expect(workspaceSectionTabsCss).toContain('min-height: 46px')
    expect(workspaceSectionTabsCss).toContain('min-height: 54px')
    expect(workspaceSectionTabsCss).toContain('justify-content: space-around')
  })

  it('keeps the Nic-Nac header compact instead of oversized branding', () => {
    expect(nicNacHeader).toContain('<NicNacGlyph size={20} />')
    expect(nicNacHeader).toContain('<span className={styles.title}>Nic-Nac</span>')
    expect(nicNacHeaderCss).toContain('min-height: 56px;')
    expect(nicNacHeaderCss).toContain('padding: 0 16px;')
    expect(nicNacHeaderCss).not.toContain('font-size: 28px')
  })

  it('opens Nic-Nac with an empty starter chat in workspace review mode', () => {
    expect(nicNacClient).toContain('showWorkspaceReviewState')
    expect(nicNacClient).toContain('Workspace review mode starts fresh')
    expect(nicNacClient).toContain('messages: []')
  })

  it('does not render post-chat suggestion chips', () => {
    expect(nicNacChatBody).not.toContain("from './Chips'")
    expect(nicNacChatBody).not.toContain('<Chips')
  })

  it('keeps mobile Nic-Nac launch affordances wired for quick actions', () => {
    expect(nicNacClient).toContain('pendingLaunchPrompt')
    expect(nicNacClient).toContain('setMobileOpen(true)')
    expect(nicNacClient).toContain('setDesktopOpen(true)')
    expect(nicNacClient).toContain('getLaunchPromptForWorkspaceAction')
    expect(dashboardPlaceholder).toContain('onLaunchNicNacAction')
    expect(dashboardPlaceholder).toContain("onLaunchAction={(action) => onLaunchNicNacAction?.(action)}")
    expect(nicNacChatBody).toContain('consumedLaunchPromptRef.current = null')
  })

  it('puts the trade request inbox after quick-add and dancer browsing in the workspace card', () => {
    expect(tradeBoardWorkspaceCardHtml.indexOf('Today&#x27;s trade work')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Quick add')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Browse dancers')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Request inbox')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Trade follow-up')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Fulfillment queue')).toBeGreaterThan(-1)
    expect(tradeBoardWorkspaceCardHtml.indexOf('Today&#x27;s trade work')).toBeLessThan(
      tradeBoardWorkspaceCardHtml.indexOf('Quick add'),
    )
    expect(tradeBoardWorkspaceCardHtml.indexOf('Quick add')).toBeLessThan(
      tradeBoardWorkspaceCardHtml.indexOf('Browse dancers'),
    )
    expect(tradeBoardWorkspaceCardHtml.indexOf('Browse dancers')).toBeLessThan(
      tradeBoardWorkspaceCardHtml.indexOf('Request inbox'),
    )
    expect(tradeBoardWorkspaceCardHtml.indexOf('Request inbox')).toBeLessThan(
      tradeBoardWorkspaceCardHtml.indexOf('Trade follow-up'),
    )
    expect(tradeBoardWorkspaceCardHtml.indexOf('Trade follow-up')).toBeLessThan(
      tradeBoardWorkspaceCardHtml.indexOf('Fulfillment queue'),
    )
  })

  it('prompts for received-piece intake after dashboard fulfillment completion', () => {
    expect(dashboardPlaceholder).toContain(
      'addToBoard: nextStatus === \'completed\'',
    )
    expect(dashboardPlaceholder).toContain('Promise.allSettled')
    expect(dashboardPlaceholder).toContain(
      'Fulfillment updated, but part of the workspace did not refresh.',
    )
    expect(dashboardPlaceholder).toContain(
      'Add the received dancer to your Dance Floor when you are ready.',
    )
  })

  it('keeps summary metrics out of board inventory', () => {
    const browseBoardStart = tradeBoardWorkspaceCardHtml.indexOf('Browse dancers')
    const requestInboxStart = tradeBoardWorkspaceCardHtml.indexOf('Request inbox')
    const browseBoardMarkup = tradeBoardWorkspaceCardHtml.slice(
      browseBoardStart,
      requestInboxStart,
    )

    expect(browseBoardMarkup).not.toContain('Active pieces')
    expect(browseBoardMarkup).not.toContain('Board MSRP')
    expect(browseBoardMarkup).not.toContain('Top type')
    expect(browseBoardMarkup).not.toContain('Pending requests')
    expect(browseBoardMarkup).not.toContain('pendingRequestCount')
  })

  it('uses search and filters to browse board inventory without a default full grid', () => {
    expect(tradeBoardWorkspaceCardQuietHtml).toContain(
      'Search the Dance Floor or open filters to find a live dancer.',
    )
    expect(tradeBoardWorkspaceCardQuietHtml).toContain('Jewelry Type')
    expect(tradeBoardWorkspaceCardQuietHtml).toContain('Collection')
    expect(tradeBoardWorkspaceCardQuietHtml).not.toContain('Request inbox')
    expect(tradeBoardWorkspaceCardQuietHtml).not.toContain('Trade follow-up')
    expect(tradeBoardWorkspaceCardQuietHtml).not.toContain('Fulfillment queue')
    expect(tradeBoardWorkspaceCardQuietHtml).not.toContain(
      'No pieces on your board yet. Add your first item above.',
    )
    expect(tradeBoardWorkspaceCardQuietHtml).not.toContain(
      'No board listings match this search yet.',
    )
  })

  it('keeps customer board previewing inside the workspace with only primary preview actions', () => {
    expect(dashboardPlaceholder).toContain('type WorkspacePreviewState')
    expect(dashboardPlaceholder).not.toContain('handleOpenLiveSitePreview')
    expect(dashboardPlaceholder).toContain('handleOpenTradeBoardPreview')
    expect(dashboardPlaceholder).toContain('Back to workspace')
    expect(dashboardPlaceholder).toContain('Open full site')
    expect(dashboardPlaceholder).not.toContain('Refresh preview')
    expect(dashboardPlaceholder).not.toContain('Open Nic-Nac')
    expect(dashboardPlaceholder).not.toContain('onOpenNicNac')
    expect(dashboardPlaceholder).not.toContain('previewNicNacSidecar')
    expect(dashboardPlaceholder).toContain('title="Sparkle Suite live site preview"')
    expect(dashboardPlaceholder).toContain('customerTradeBoardHref')
    expect(dashboardPlaceholder).toContain('Public Site')
    expect(dashboardPlaceholder).toContain('Your site is live')
    expect(dashboardPlaceholder).not.toContain('Preview site')
    expect(dashboardPlaceholder).not.toContain('Sparkle with us.')
    expect(nicNacClient).toContain('handleOpenNicNac')
    expect(nicNacClient).toContain('setMobileOpen(true)')
    expect(nicNacClient).toContain('setDesktopOpen(true)')
    expect(nicNacClient).toContain('<DashboardPlaceholder')
    expect(nicNacClient).not.toContain('onOpenNicNac={handleOpenNicNac}')
  })
})
