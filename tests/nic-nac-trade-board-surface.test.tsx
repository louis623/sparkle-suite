import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TradeBoardWorkspaceCard } from '@/app/nic-nac/components/TradeBoardWorkspaceCard'

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSelectorBlock(css: string, selector: string) {
  return new RegExp(`${escapeForRegex(selector)}\\s*\\{[\\s\\S]*?\\}`).test(css)
}

function hasComposeAlias(
  css: string,
  localSelector: string,
  sharedSelector: string,
  source = './WorkspaceSurface.module.css',
) {
  return new RegExp(
    `${escapeForRegex(localSelector)}\\s*\\{[\\s\\S]*?composes:\\s*${escapeForRegex(
      sharedSelector,
    )}\\s+from\\s+'${escapeForRegex(source)}';[\\s\\S]*?\\}`,
  ).test(css)
}

function hasDeclaration(css: string, selector: string, declaration: string) {
  return new RegExp(
    `${escapeForRegex(selector)}\\s*\\{[\\s\\S]*?${escapeForRegex(
      declaration,
    )}\\s*;[\\s\\S]*?\\}`,
  ).test(css)
}

function hasNestedDeclaration(
  css: string,
  atRule: string,
  selector: string,
  declaration: string,
) {
  return new RegExp(
    `${escapeForRegex(atRule)}\\s*\\{[\\s\\S]*?${escapeForRegex(
      selector,
    )}[^{]*\\{[\\s\\S]*?${escapeForRegex(declaration)}\\s*;[\\s\\S]*?\\}[\\s\\S]*?\\}`,
  ).test(css)
}

function getTradeBoardSectionLabels(html: string) {
  return Array.from(
    html.matchAll(
      />(Dance Floor Management|Today(?:&#x27;|')s trade work|Quick add|Browse dancers|Request inbox|Trade follow-up|Fulfillment queue)</g,
    ),
    (match) => match[1].replace('&#x27;', "'"),
  )
}

const TRADE_BOARD_READY_STATE = {
  status: 'ready' as const,
  board: {
    summary: {
      totalPieces: 2,
      availableDancerCount: 2,
      newDancersTodayCount: 1,
      totalMsrp: 78,
      typeBreakdown: { RG: 1, NK: 0, ER: 0, ST: 1, BR: 0 },
      pendingRequestCount: 0,
    },
    listings: [
      {
        id: 'listing-1',
        rep_id: 'rep-1',
        status: 'available' as const,
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
          type_prefix: 'RG' as const,
          collection: { id: 'collection-1', name: 'Birthday' },
        },
      },
      {
        id: 'listing-2',
        rep_id: 'rep-1',
        status: 'available' as const,
        rep_notes: null,
        trade_preferences: null,
        listing_photo_url: null,
        uses_canonical_photo: true,
        listed_at: '2026-05-06T12:00:00Z',
        removal_reason: null,
        deleted_at: null,
        created_at: '2026-05-06T12:00:00Z',
        updated_at: '2026-05-06T12:00:00Z',
        design: {
          id: 'design-2',
          item_number: 'ST200',
          design_name: 'Rose Quartz Stack',
          material: 'Rose gold',
          main_stone: 'Quartz',
          bp_msrp: 39,
          canonical_photo_url: null,
          type_prefix: 'ST' as const,
          collection: { id: 'collection-2', name: 'OG' },
        },
      },
    ],
  },
}

describe('Nic-Nac dance floor surface reset', () => {
  it('uses shared workspace primitives instead of DashboardPlaceholder shell styles', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/TradeBoardWorkspaceCard.tsx',
      ),
      'utf8',
    )

    expect(source).toContain(
      "import surfaceStyles from './WorkspaceSurface.module.css'",
    )
    expect(source).not.toContain("from './DashboardPlaceholder.module.css'")
  })

  it('keeps dance floor-private surface structure out of WorkspaceSurface', () => {
    const workspaceSurfaceCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/WorkspaceSurface.module.css',
      ),
      'utf8',
    )
    const tradeBoardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/TradeBoardWorkspaceCard.module.css',
      ),
      'utf8',
    )

    for (const selector of [
      '.boardInventoryGridShell',
      '.boardInventoryPieceCard',
      '.tradeScreenshotLink',
      '.imagePreviewMask',
      '.tradeRow',
    ]) {
      expect(hasSelectorBlock(workspaceSurfaceCss, selector)).toBe(false)
      expect(hasSelectorBlock(tradeBoardCss, selector)).toBe(true)
    }
  })

  it('keeps DashboardPlaceholder message rows local while aliasing shared surface primitives', () => {
    const placeholderSource = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.tsx',
      ),
      'utf8',
    )
    const placeholderCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )
    const workspaceSurfaceCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/WorkspaceSurface.module.css',
      ),
      'utf8',
    )
    const tradeBoardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/TradeBoardWorkspaceCard.module.css',
      ),
      'utf8',
    )

    expect(placeholderSource).not.toContain('styles.tradeList')
    expect(placeholderSource).not.toContain('styles.tradeRow')
    expect(placeholderSource).not.toContain('styles.tradeIdentity')
    expect(placeholderSource).toContain('styles.messageList')
    expect(placeholderSource).toContain('styles.messageCard')
    expect(placeholderSource).toContain('styles.customerIdentity')

    expect(placeholderCss).not.toContain('.tradeList')
    expect(placeholderCss).not.toContain('.tradeRow')
    expect(placeholderCss).not.toContain('.tradeIdentity')
    expect(hasSelectorBlock(placeholderCss, '.messageList')).toBe(true)
    expect(hasSelectorBlock(placeholderCss, '.messageCard')).toBe(true)

    for (const selector of [
      'cardTitle',
      'cardSubtitle',
      'cardFill',
      'rosterTag',
      'searchField',
      'searchLabel',
      'searchInput',
      'actionRow',
      'actionButton',
      'helperButton',
      'helperLink',
      'emptyState',
      'actionError',
      'helperMessage',
      'helperNote',
      'walletSettingsTitle',
      'loadingLine',
      'loadingLineShort',
    ]) {
      expect(
        hasComposeAlias(placeholderCss, `.${selector}`, selector),
      ).toBe(true)
    }

    for (const selector of ['.entityTitle', '.entityMeta', '.warningBadge']) {
      expect(hasSelectorBlock(workspaceSurfaceCss, selector)).toBe(true)
    }

    expect(hasComposeAlias(tradeBoardCss, '.customerName', 'entityTitle')).toBe(
      true,
    )
    expect(hasComposeAlias(tradeBoardCss, '.customerDate', 'entityMeta')).toBe(
      true,
    )
    expect(
      hasComposeAlias(tradeBoardCss, '.statusBadgeWarning', 'warningBadge'),
    ).toBe(true)

    expect(
      hasComposeAlias(placeholderCss, '.customerName', 'entityTitle'),
    ).toBe(true)
    expect(
      hasComposeAlias(placeholderCss, '.customerDate', 'entityMeta'),
    ).toBe(true)
    expect(
      hasComposeAlias(placeholderCss, '.customerContact', 'entityMeta'),
    ).toBe(true)
    expect(
      hasComposeAlias(placeholderCss, '.statusBadgeWarning', 'warningBadge'),
    ).toBe(true)

    expect(
      hasSelectorBlock(
        workspaceSurfaceCss,
        ":global(.main[data-workspace-skin='black_diamond']) .entityTitle",
      ),
    ).toBe(true)
    expect(
      hasSelectorBlock(
        workspaceSurfaceCss,
        ":global(.main[data-workspace-skin='black_diamond']) .entityMeta",
      ),
    ).toBe(true)
    for (const localOverride of [
      ".main[data-workspace-skin='black_diamond'] .cardTitle",
      ".main[data-workspace-skin='black_diamond'] .cardSubtitle",
      ".main[data-workspace-skin='black_diamond'] .searchLabel",
      ".main[data-workspace-skin='black_diamond'] .helperNote",
      ".main[data-workspace-skin='black_diamond'] .walletSettingsTitle",
      ".main[data-workspace-skin='black_diamond'] .actionButton",
      ".main[data-workspace-skin='black_diamond'] .helperButton",
      ".main[data-workspace-skin='black_diamond'] .helperLink",
      ".main[data-workspace-skin='black_diamond'] .loadingLine",
      ".main[data-workspace-skin='black_diamond'] .loadingLineShort",
    ]) {
      expect(placeholderCss).not.toContain(localOverride)
    }

    for (const sharedSkinLeak of [
      ".main[data-workspace-skin='black_diamond'] .rosterTag",
      ".main[data-workspace-skin='black_diamond'] .emptyState",
      ".main[data-workspace-skin='black_diamond'] .searchInput,",
      ".main[data-workspace-skin='black_diamond'] .searchInput::placeholder",
      ".main[data-workspace-skin='black_diamond'] .searchInput:focus",
    ]) {
      expect(placeholderCss).not.toContain(sharedSkinLeak)
    }
  })

  it('keeps today, quick add, and browse as the first surfaced sections before queue detail', () => {
    const html = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: TRADE_BOARD_READY_STATE,
        tradeRequestsState: {
          status: 'ready',
          requests: [
            {
              id: 'request-1',
              customerName: 'Jamie Lane',
              customerDescription: 'Swap in the sapphire ring instead.',
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
        fulfillmentQueueState: {
          status: 'ready',
          items: [
            {
              fulfillmentId: 'fulfillment-1',
              requestId: 'request-1',
              status: 'approved',
              customerName: 'Jamie Lane',
              itemNumber: 'RG100',
              designName: 'Sapphire Halo',
              daysSinceLastUpdate: 1,
            },
          ],
        },
        tradeSwapCleanupState: {
          status: 'ready',
          items: [
            {
              swapId: 'swap-1',
              customerName: 'Jamie Lane',
              revealedItemNumber: 'RG200',
              replacementStatus: 'needs_ring_size',
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
    expect(getTradeBoardSectionLabels(html)).toEqual([
      'Dance Floor Management',
      "Today's trade work",
      'Quick add',
      'Browse dancers',
      'Request inbox',
      'Trade follow-up',
      'Fulfillment queue',
    ])
    expect(html).toContain('Dancers on the Floor')
    expect(html).toContain('New dancers today')
    expect(html).toContain('2 live dancers')
  })

  it('locks the first screen into a mobile container contract instead of desktop spreadsheet grids', () => {
    const tradeBoardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/TradeBoardWorkspaceCard.module.css',
      ),
      'utf8',
    )

    expect(hasDeclaration(tradeBoardCss, '.stack', 'container-type: inline-size')).toBe(
      true,
    )
    expect(
      hasDeclaration(
        tradeBoardCss,
        '.summaryStats',
        'grid-template-columns: repeat(5, minmax(0, 1fr))',
      ),
    ).toBe(true)
    expect(
      hasDeclaration(
        tradeBoardCss,
        '.quickAddRow',
        'grid-template-columns: minmax(0, 1fr) auto',
      ),
    ).toBe(true)
    expect(
      hasDeclaration(
        tradeBoardCss,
        '.filterGrid',
        'grid-template-columns: repeat(2, minmax(0, 1fr))',
      ),
    ).toBe(true)
    expect(
      hasDeclaration(tradeBoardCss, '.tradeRow', 'flex-direction: column'),
    ).toBe(true)
    expect(
      hasNestedDeclaration(
        tradeBoardCss,
        '@container (max-width: 760px)',
        '.summaryStats',
        'grid-template-columns: 1fr',
      ),
    ).toBe(false)
    expect(
      hasNestedDeclaration(
        tradeBoardCss,
        '@container (max-width: 560px)',
        '.quickAddRow',
        'grid-template-columns: 1fr',
      ),
    ).toBe(true)
    expect(
      hasNestedDeclaration(
        tradeBoardCss,
        '@container (max-width: 560px)',
        '.filterGrid',
        'grid-template-columns: 1fr',
      ),
    ).toBe(true)
    expect(
      hasNestedDeclaration(
        tradeBoardCss,
        '@container (max-width: 520px)',
        '.boardInventoryGrid',
        'grid-template-columns: 1fr',
      ),
    ).toBe(true)
  })
})
