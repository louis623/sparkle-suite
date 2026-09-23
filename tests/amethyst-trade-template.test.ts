import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildAmethystTradeBootstrapScript,
  buildAmethystTradeTweakDefaults,
  defaultAmethystTradeTemplateData,
} from '@/lib/amethyst/trade-template-data'
import {
  mapTradeListingToAmethystTradeBoardListing,
  parseAmethystPublicNetRows,
  type AmethystTradeBoardListing,
} from '@/lib/amethyst/trade-board-listings'
import type { TradeListingWithDesign } from '@/lib/services/types'

function makeTradeListing(
  overrides: Partial<TradeListingWithDesign> = {},
): TradeListingWithDesign {
  return {
    id: 'listing-1',
    rep_id: 'rep-1',
    status: 'available',
    rep_notes: 'Diamond-worthy shimmer for birthday trades.',
    trade_preferences: 'Item-for-item only.',
    listing_photo_url: 'https://cdn.example.com/listing-photo.jpg',
    uses_canonical_photo: false,
    listed_at: '2026-05-05T12:00:00.000Z',
    removal_reason: null,
    deleted_at: null,
    created_at: '2026-05-05T12:00:00.000Z',
    updated_at: '2026-05-05T12:00:00.000Z',
    design: {
      id: 'design-1',
      item_number: 'RG31452',
      design_name: 'Diamond Birthday Bloom',
      material: 'Sterling silver',
      main_stone: 'Diamond accent',
      bp_msrp: 88,
      canonical_photo_url: 'https://cdn.example.com/canonical-photo.jpg',
      type_prefix: 'RG',
      collection: { id: 'collection-1', name: 'Birthday' },
    },
    ...overrides,
  }
}

describe('Amethyst trade page template wiring', () => {
  it('does not cap the full customer Dance Floor inventory', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/amethyst/trade-board-listings.ts'),
      'utf8',
    )

    expect(source).toContain('const limit = options.limit')
    expect(source).not.toContain('options.limit ?? 18')
  })

  it('keeps desktop Dance Floor controls sticky while mobile controls scroll with the page', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(css).toMatch(/\.tp-filters\s*\{[\s\S]*?position:\s*sticky;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*900px\)[\s\S]*?\.tp-drawer,[\s\S]*?\.tp-filters\s*\{[\s\S]*?position:\s*static;/)
    expect(css).toMatch(/@media\s+\(pointer:\s*coarse\)[\s\S]*?\.tp-filter-pill[\s\S]*?min-height:\s*44px;/)
    expect(css).toMatch(/@media\s+\(pointer:\s*coarse\)[\s\S]*?\.tp-card-close[\s\S]*?min-width:\s*44px;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.tp-card-expand-mask[\s\S]*?animation:\s*none\s*!important;/)
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.tp-card-expand-cta[\s\S]*?transition:\s*none\s*!important;/)
    expect(css).toMatch(/\.tp-hero-title\s*\{[\s\S]*?line-height:\s*1\.1;/)
    expect(css).toMatch(/\.tp-hero-title\s*\{[\s\S]*?padding-block:\s*0\.04em 0\.12em;/)
    expect(css).toMatch(/\.tp-hero-title\s*\{[\s\S]*?overflow:\s*visible;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-title[\s\S]*?font-size:\s*clamp\(32px,\s*9\.6vw,\s*44px\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-inner[\s\S]*?width:\s*100vw;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-inner[\s\S]*?margin-inline:\s*calc\(50% - 50vw\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-title[\s\S]*?max-width:\s*10ch;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-title[\s\S]*?padding-block:\s*0\.04em 0\.12em;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-title[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-sub[\s\S]*?width:\s*100%;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-sub[\s\S]*?max-width:\s*24ch;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.tp-hero-sub[\s\S]*?overflow-wrap:\s*anywhere;/)
  })

  it('maps structured editable content into the locked trade-page tweak defaults', () => {
    const defaults = buildAmethystTradeTweakDefaults(
      defaultAmethystTradeTemplateData,
    )

    expect(defaults.repName).toBe(defaultAmethystTradeTemplateData.repName)
    expect(defaults.businessName).toBe(
      defaultAmethystTradeTemplateData.businessName,
    )
    expect(defaults.tickerTopText).toBe(
      defaultAmethystTradeTemplateData.tickerTopText,
    )
    expect(defaults.tradeHeroTitle).toBe(
      defaultAmethystTradeTemplateData.tradeHeroTitle,
    )
    expect(defaults.tradeHeroSub).toBe(
      defaultAmethystTradeTemplateData.tradeHeroSub,
    )
  })

  it('serializes the full editable trade payload for the locked export runtime', () => {
    const script = buildAmethystTradeBootstrapScript(
      defaultAmethystTradeTemplateData,
    )

    expect(script).toContain('window.AMETHYST_TRADE_TEMPLATE_DATA')
    expect(script).toContain('window.AMETHYST_RUNTIME_CONTEXT')
    expect(script).toContain('window.AMETHYST_TRADE_BOARD_LISTINGS')
    expect(script).toContain('"tradeRules"')
    expect(script).toContain('"faqAnswers"')
    expect(script).toContain('"legalDisclaimer"')
    expect(script).toContain('"shopUrl"')
    expect(script).toContain('"socialLinks"')
    expect(script).toContain('"footerLinks"')
    expect(script).toContain('window.AMETHYST_TRADE_BOARD_LISTINGS = []')
    expect(script).toContain('"/amethyst/Homepage.html"')
    expect(script).toContain('"/amethyst/Join.html"')
  })

  it('serializes public-site identity into the targeted runtime context', () => {
    const script = buildAmethystTradeBootstrapScript(
      defaultAmethystTradeTemplateData,
      [],
      undefined,
      {
        publicSiteSlug: 'louisfizzfest',
        repId: 'rep-louis',
        targeted: true,
      },
    )

    expect(script).toContain(
      'window.AMETHYST_RUNTIME_CONTEXT = {"targeted":true,"repId":"rep-louis","publicSiteSlug":"louisfizzfest"};',
    )
  })

  it('keeps the trade hero subcopy concise without pay-difference fine print', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(defaultAmethystTradeTemplateData.tradeHeroSub).toBe(
      'The Dance Floor is for item-for-item swaps only. Requests must stay within the same collection and the same jewelry type.',
    )
    expect(jsx).toContain(
      'The Dance Floor is for item-for-item swaps only. Requests must stay within the same collection and the same jewelry type.',
    )
    expect(defaultAmethystTradeTemplateData.tradeHeroSub).not.toContain(
      'with no pay-the-difference and no credit payouts',
    )
  })

  it('frames customer trades as live reveal swaps instead of offered-piece trades', () => {
    expect(defaultAmethystTradeTemplateData.faqAnswers.howTradeWorks).toContain(
      'just revealed',
    )
    expect(defaultAmethystTradeTemplateData.faqAnswers.howTradeWorks).toContain(
      'item number',
    )
    expect(defaultAmethystTradeTemplateData.faqAnswers.howTradeWorks).not.toContain(
      'offered piece',
    )
  })

  it('does not render the customer-facing Trade rules section', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(jsx).not.toContain('function Faq')
    expect(jsx).not.toContain('<Faq />')
    expect(jsx).not.toContain('Trade rules.')
    expect(jsx).not.toContain('The short version. Read once, trade cleanly.')
    expect(jsx).not.toContain('TweakToggle label="FAQ"')
    expect(css).not.toContain('.tp-faq')
  })

  it('maps service-layer trade listings into customer-facing trade card data', () => {
    const mapped = mapTradeListingToAmethystTradeBoardListing(makeTradeListing())

    expect(mapped).toMatchObject<Partial<AmethystTradeBoardListing>>({
      id: 'listing-1',
      name: 'Diamond Birthday Bloom',
      collection: 'Birthday',
      type: 'Ring',
      material: 'Sterling silver',
      stone: 'Diamond accent',
      msrp: 88,
      tier: 'everyday',
      photoUrl: 'https://cdn.example.com/listing-photo.jpg',
      photoSource: 'listing',
      quantityAvailable: 1,
    })
    expect(mapped.note).toContain('Item-for-item only')
  })

  it('uses only explicit rarity classification for Diamond and Unicorn tiers', () => {
    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({ rarity_classification: 'diamond' }),
      ).tier,
    ).toBe('diamond')
    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({ rarity_classification: 'unicorn' }),
      ).tier,
    ).toBe('unicorn')
  })

  it('keeps same-item-number finish/stone dancers on their own photos', () => {
    // August 25: exact catalog identity is designId. Amethyst cards must
    // not collapse Gold vs Rhodium NK88350 onto one item-number hero.
    const gold = mapTradeListingToAmethystTradeBoardListing(
      makeTradeListing({
        id: 'listing-nk88350-gold',
        listing_photo_url: 'https://cdn.example.com/nk88350-gold-jewelry.jpg',
        uses_canonical_photo: false,
        design: {
          id: 'design-nk88350-gold',
          item_number: 'NK88350',
          design_name: 'Half Moon Crescent',
          material: 'Gold Plating',
          main_stone: 'Lapis Magnesite',
          bp_msrp: 132,
          canonical_photo_url: 'https://cdn.example.com/nk88350-gold-canonical.jpg',
          type_prefix: 'NK',
          collection: { id: 'collection-og', name: 'Original Necklace' },
        },
      }),
    )
    const rhodium = mapTradeListingToAmethystTradeBoardListing(
      makeTradeListing({
        id: 'listing-nk88350-rhodium',
        listing_photo_url: null,
        uses_canonical_photo: true,
        design: {
          id: 'design-nk88350-rhodium',
          item_number: 'NK88350',
          design_name: 'Half Moon Crescent',
          material: 'Rhodium Plating',
          main_stone: 'Malachite Magnesite',
          bp_msrp: 132,
          canonical_photo_url:
            'https://cdn.example.com/nk88350-rhodium-own-canonical.jpg',
          type_prefix: 'NK',
          collection: { id: 'collection-og', name: 'Original Necklace' },
        },
      }),
    )

    expect(gold.id).not.toBe(rhodium.id)
    expect(gold.material).toBe('Gold Plating')
    expect(rhodium.material).toBe('Rhodium Plating')
    expect(gold.stone).toBe('Lapis Magnesite')
    expect(rhodium.stone).toBe('Malachite Magnesite')
    expect(gold.photoUrl).toBe('https://cdn.example.com/nk88350-gold-jewelry.jpg')
    expect(gold.photoSource).toBe('listing')
    expect(rhodium.photoUrl).toBe(
      'https://cdn.example.com/nk88350-rhodium-own-canonical.jpg',
    )
    expect(rhodium.photoSource).toBe('canonical')
    expect(gold.photoUrl).not.toBe(rhodium.photoUrl)
  })

  it('applies the same variant photo contract to every rep Dance Floor', () => {
    const firstRep = mapTradeListingToAmethystTradeBoardListing(
      makeTradeListing({
        id: 'listing-rep-a-gold',
        rep_id: 'rep-a',
        listing_photo_url: 'https://cdn.example.com/rep-a-gold.jpg',
        uses_canonical_photo: false,
        design: {
          id: 'design-rep-a-gold',
          item_number: 'NK88350',
          design_name: 'Half Moon Crescent',
          material: 'Gold Plating',
          main_stone: 'Lapis Magnesite',
          bp_msrp: 132,
          canonical_photo_url: 'https://cdn.example.com/rep-a-gold-canonical.jpg',
          type_prefix: 'NK',
          collection: { id: 'collection-og', name: 'Original Necklace' },
        },
      }),
    )
    const secondRep = mapTradeListingToAmethystTradeBoardListing(
      makeTradeListing({
        id: 'listing-rep-b-rhodium',
        rep_id: 'rep-b',
        listing_photo_url: null,
        uses_canonical_photo: true,
        design: {
          id: 'design-rep-b-rhodium',
          item_number: 'NK88350',
          design_name: 'Half Moon Crescent',
          material: 'Rhodium Plating',
          main_stone: 'Malachite Magnesite',
          bp_msrp: 132,
          canonical_photo_url: 'https://cdn.example.com/rep-b-rhodium-canonical.jpg',
          type_prefix: 'NK',
          collection: { id: 'collection-og', name: 'Original Necklace' },
        },
      }),
    )

    expect(firstRep.photoUrl).toBe('https://cdn.example.com/rep-a-gold.jpg')
    expect(secondRep.photoUrl).toBe(
      'https://cdn.example.com/rep-b-rhodium-canonical.jpg',
    )
    expect(firstRep.photoUrl).not.toBe(secondRep.photoUrl)
    expect(firstRep.material).toBe('Gold Plating')
    expect(secondRep.material).toBe('Rhodium Plating')
  })

  it('maps trade listing ring size to the customer-facing board size', () => {
    const mapped = mapTradeListingToAmethystTradeBoardListing(
      makeTradeListing({ ring_size: '8' }),
    )

    expect(mapped.size).toBe('8')
  })

  it('maps grouped physical copies as a visible available quantity', () => {
    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({ quantity_available: 2 }),
      ).quantityAvailable,
    ).toBe(2)
  })

  it('maps only the pending-adjusted quantity onto the public Dance Floor', () => {
    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({ quantity_available: 2 }),
        1,
      ).quantityAvailable,
    ).toBe(1)
  })

  it('fails closed on malformed or duplicate atomic customer quantity rows', () => {
    expect(
      parseAmethystPublicNetRows([
        { listing_id: 'listing-2', net_quantity: 2 },
        { listing_id: 'listing-1', net_quantity: 1 },
      ]),
    ).toEqual([
      { listingId: 'listing-2', netQuantity: 2 },
      { listingId: 'listing-1', netQuantity: 1 },
    ])
    expect(() =>
      parseAmethystPublicNetRows([
        { listing_id: 'listing-1', net_quantity: 1 },
        { listing_id: 'listing-1', net_quantity: 1 },
      ]),
    ).toThrow(/invalid/i)
    expect(() =>
      parseAmethystPublicNetRows([{ listing_id: 'listing-1', net_quantity: 0 }]),
    ).toThrow(/invalid/i)
  })

  it('sends one stable browser UUID with JSON and multipart trade-request retries', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(jsx).toContain('useState(() => crypto.randomUUID())')
    expect(jsx).toContain('form.append("submissionId", payload.submissionId)')
    expect(jsx).toContain('submissionId: payload.submissionId')
    expect(jsx).toContain('submissionId,')
  })

  it('maps non-item-number trade listings as ordinary customer-facing cards', () => {
    const mapped = mapTradeListingToAmethystTradeBoardListing({
      ...makeTradeListing(),
      id: 'manual-listing-1',
      listing_source: 'non_item_number',
      design: null,
      manual_type_prefix: 'RG',
      manual_collection_family: 'Birthday',
      manual_collection_name: 'July Birthday 2026',
      manual_size: '7',
      manual_photo_url: 'https://cdn.example.com/manual-ring.jpg',
      listing_photo_url: 'https://cdn.example.com/manual-ring.jpg',
      uses_canonical_photo: false,
      ring_size: null,
      rep_notes: '(non-item number piece)',
      trade_preferences: null,
    } as unknown as TradeListingWithDesign)

    expect(mapped).toMatchObject<Partial<AmethystTradeBoardListing>>({
      id: 'manual-listing-1',
      name: 'July Birthday 2026 Ring - Size 7',
      collection: 'July Birthday 2026',
      type: 'Ring',
      msrp: null,
      size: '7',
      photoUrl: 'https://cdn.example.com/manual-ring.jpg',
      photoSource: 'listing',
    })
    expect(JSON.stringify(mapped)).not.toMatch(
      /legacy|miscellaneous|grab bag|unknown|undocumented|Board Pieces|non-item number|piece without item number/i,
    )
    expect(mapped.note).toBe(
      'Item-for-item only. Requests must stay within the same collection and the same jewelry type.',
    )
    expect(mapped.photoSource).toBe('listing')
    expect(mapped.photoUrl).not.toBeNull()
  })

  it('marks canonical and missing photo source without exposing internal labels on the customer card', () => {
    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({
          listing_photo_url: null,
          uses_canonical_photo: true,
        }),
      ),
    ).toMatchObject({
      photoUrl: 'https://cdn.example.com/canonical-photo.jpg',
      photoSource: 'canonical',
    })

    expect(
      mapTradeListingToAmethystTradeBoardListing(
        makeTradeListing({
          listing_photo_url: null,
          uses_canonical_photo: true,
          design: {
            ...makeTradeListing().design!,
            canonical_photo_url: null,
          },
        }),
      ),
    ).toMatchObject({
      photoUrl: null,
      photoSource: 'missing',
    })
  })

  it('loads the runtime bootstrap script before the locked trade-page export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(html).toContain(
      '<script src="template-loader.js" data-template-src="/api/amethyst/trade-template"></script>',
    )
    expect(html.indexOf('template-loader.js')).toBeLessThan(
      html.indexOf('trade.jsx'),
    )
  })

  it('ships crawl and sharing metadata with the locked trade export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(html).toContain(
      '<meta name="description" content="Browse Sparkle by Sasha\'s Dance Floor dancers and request fair jewelry trades from live reveal customers." />',
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/amethyst/Trade.html" />',
    )
    expect(html).toContain('<meta name="robots" content="index,follow" />')
    expect(html).toContain(
      '<meta property="og:title" content="Sparkle by Sasha - Dance Floor" />',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('uses shared route wiring, real listing payloads, and filter wiring on the locked trade export', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(jsx).toContain('className="hp-header-nav"')
    expect(jsx).toContain('function SocialLogo')
    expect(jsx).toContain('<SocialLogo {...social} />')
    expect(jsx).toContain('aria-label={social.label}')
    expect(jsx).toContain('Proud member of the {CONTENT.memberTeamName} team')
    expect(jsx).not.toContain('className="hp-footer-social">{social.shortLabel}</a>')
    expect(jsx).toContain('window.AMETHYST_TRADE_BOARD_LISTINGS')
    expect(jsx).toContain('deriveTradeBoardFilterOptions')
    expect(jsx).toContain('filterTradeBoardListings')
    expect(jsx).toContain('collectionSearch')
    expect(jsx).toContain('tp-filter-primary-grid')
    expect(jsx).toContain('tp-filters-row-collections')
    expect(jsx).toContain('options.collections.map((collection) => (')
    expect(jsx).toContain('new URLSearchParams(window.location.search)')
    expect(jsx).toContain('More filters')
    expect(jsx).toContain('"/amethyst/Homepage.html"')
    expect(jsx).toContain('function ComingSoonNavItem')
    expect(jsx).toContain('className="hp-header-link hp-header-link-disabled"')
    expect(jsx).not.toContain('className="tp-hero-eyebrow"')
    expect(jsx).not.toContain('Matching is based on same collection and same jewelry type')
    expect(jsx).not.toContain('function RulesStrip')
    expect(jsx).not.toContain('<RulesStrip />')
    expect(jsx).not.toContain('tp-rules-strip')
    expect(jsx).toContain('piece.material')
    expect(jsx).toContain('{piece.material} · {piece.stone}')
    expect(jsx).toContain('piece.photoUrl')
    expect(jsx).toContain('same collection')
    expect(jsx).toContain('same jewelry type')
    expect(jsx).not.toContain('Buy Now')
    expect(jsx).not.toContain('Next to reveal')
    expect(jsx).not.toContain('Rare finds')
    expect(css).not.toMatch(/(^|\n)\.tp-hero-eyebrow\s*\{/)
    expect(css).not.toContain('.tp-hero .tp-card-rep')
    expect(css).not.toContain('.tp-rules-strip')
    expect(css).toMatch(/\.tp-filters\s*\{[\s\S]*?border-radius:\s*var\(--hp-radius-card\);/)
    expect(css).toMatch(/\.tp-filter-primary-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*0\.85fr\)\s+minmax\(0,\s*1fr\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*700px\)[\s\S]*?\.tp-filter-primary-grid[\s\S]*?grid-template-columns:\s*1fr;/)
    expect(css).toContain('.tp-filters-row-collections')
    expect(css).toContain('.tp-filter-panel')
    expect(css).toContain('.tp-filter-search')
  })

  it('ships mobile scanning affordances for filtering the customer dance floor', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(jsx).toContain('Search or filter the Dance Floor')
    expect(jsx).toContain('className="tp-mobile-filter-cue"')
    expect(jsx).toContain('aria-controls="trade-filter-panel"')
    expect(jsx).toContain('id="trade-filter-panel"')
    expect(css).toContain('.tp-mobile-filter-cue')
    expect(css).toMatch(/@media\s+\(max-width:\s*700px\)[\s\S]*?\.tp-mobile-filter-cue[\s\S]*?display:\s*flex;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*900px\)[\s\S]*?\.tp-drawer,[\s\S]*?\.tp-filters\s*\{[\s\S]*?position:\s*static;/)
  })

  it('limits large dance floors with search, sort, lazy images, and load-more rendering', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(jsx).toContain('const BOARD_PAGE_SIZE = 24')
    expect(jsx).toContain('boardSearch')
    expect(jsx).toContain('searchTradeBoardListings')
    expect(jsx).toContain('sortTradeBoardListings')
    expect(jsx).toContain('const visibleTradeBoardPieces = filtered.slice(0, visibleCount)')
    expect(jsx).toContain('setVisibleCount((count) => count + BOARD_PAGE_SIZE)')
    expect(jsx).toContain('Search by dancer, collection, size')
    expect(jsx).toContain('Sort dancers')
    expect(jsx).toContain('Load more')
    expect(jsx).toContain('loading="lazy"')
    expect(jsx).toContain('decoding="async"')
    expect(css).toContain('.tp-board-search-row')
    expect(css).toContain('.tp-board-search')
    expect(css).toContain('.tp-board-sort')
    expect(css).toContain('.tp-board-showing')
    expect(css).toContain('.tp-load-more')
    expect(css).toMatch(/@media\s+\(max-width:\s*700px\)[\s\S]*?\.tp-board-search-row[\s\S]*?grid-template-columns:\s*1fr;/)
  })

  it('does not ship corrupted visible characters in the trade runtime copy', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(jsx).not.toMatch(/[�ï¿½]/)
    expect(jsx).not.toContain('Shop ?')
    expect(jsx).toContain('Shop live')
    expect(jsx).toContain('OG Halo Bloom Ring')
    expect(jsx).toContain('{tr.name} - {tr.type || "Jewelry"} - {tr.collection || "Collection pending"}')
    expect(jsx).toContain('Dancers will appear after this rep adds them to the Dance Floor.')
  })

  it('uses the shared sticky live reveal queue strip and modal trigger on trade', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function LiveQueueStrip')
    expect(jsx).toContain('function LiveQueueModal')
    expect(jsx).toContain('View full lineup')
    expect(jsx).toContain('entries.map((entry) =>')
    expect(jsx).not.toContain('entries.slice(0, 4)')
    expect(jsx).toContain('const LIVE_QUEUE_NAMES = [')
    expect(jsx).toContain('"Nicole V."')
    expect(jsx).not.toContain('function LRQRail')
    expect(jsx).not.toContain('function MobileDrawer')
    expect(jsx).not.toContain('tp-lrq-rail')
    expect(jsx).not.toContain('tp-drawer')
    expect(jsx).not.toContain('Ã‚')
    expect(jsx).not.toContain('Ãƒ')
    expect(css).toContain('.hp-queue-modal-mask')
    expect(css).toContain('@keyframes hp-modal-rise')
    expect(css).toContain('.hp-trade-preview-link:active')
  })

  it('ships the Sparkle Suite/Morganite skin in the local trade preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(jsx).toContain('sparkle_suite_morganite')
    expect(jsx).toContain('Sparkle Suite/Morganite')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the Black Diamond skin in the local trade preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(jsx).toContain('black_diamond')
    expect(jsx).toContain('Black Diamond')
    expect(jsx).toContain('moonstone')
    expect(jsx).toContain('Moonstone')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the Rose Gold skin in the local trade preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(jsx).toContain('rose_gold')
    expect(jsx).toContain('Rose Gold')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the approved batch skins in the local trade preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Trade.html'),
      'utf8',
    )

    expect(jsx).toContain('garnet')
    expect(jsx).toContain('Garnet')
    expect(jsx).toContain('amber')
    expect(jsx).toContain('Amber')
    expect(jsx).toContain('alpine_opal')
    expect(jsx).toContain('Alpine Opal')
    expect(jsx).toContain('emerald_garden')
    expect(jsx).toContain('Emerald Garden')
    expect(jsx).toContain('velvet')
    expect(jsx).toContain('Velvet')
    expect(jsx).toContain('rose_quartz')
    expect(jsx).toContain('Rose Quartz')
    expect(html).toContain('Bitter')
    expect(html).toContain('Nunito')
    expect(html).toContain('Great+Vibes')
    expect(html).toContain('Cormorant+Garamond')
    expect(html).toContain('Lato')
  })

  it('does not ship legacy placeholder skins in the local trade preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(jsx).not.toContain('value: "editorial"')
    expect(jsx).not.toContain('value: "softGlam"')
    expect(jsx).not.toContain('value: "sparkleParty"')
    expect(jsx).not.toContain('value: "maximum", label: "Maximum"')
    expect(jsx).not.toContain('label: "Editorial"')
    expect(jsx).not.toContain('label: "Soft Glam"')
    expect(jsx).not.toContain('label: "Sparkle Party"')
  })

  it('wires the customer trade request submission flow without a trade checkbox', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(jsx).toContain('function RequestSheet')
    expect(jsx).toContain('<label>Your name</label>')
    expect(jsx).toContain('<label>What did you just reveal?</label>')
    expect(jsx).toContain('placeholder="Example: July Birthday 2026 necklace"')
    expect(jsx).toContain('Collection family you revealed')
    expect(jsx).toContain('Jewelry type you revealed')
    expect(jsx).toContain('screenTradeOfferRequest')
    expect(jsx).toContain('Ask my rep to review anyway')
    expect(jsx).toContain('Available dancers that may fit your reveal')
    expect(jsx).toContain('<label>Screenshot of your reveal (recommended, optional)</label>')
    expect(jsx).toContain('Crop out personal and order information before uploading.')
    expect(jsx).toContain('success?.warning')
    expect(jsx).toContain('View request status')
    expect(jsx).toContain('new FormData()')
    expect(jsx).toContain('form.append("revealScreenshot", payload.revealScreenshot)')
    expect(jsx).toContain('form.append("offeredFamily", payload.offeredFamily || "")')
    expect(jsx).toContain('form.append("manualReviewRequested", String(payload.manualReviewRequested))')
    expect(jsx).toContain(
      'const TRADE_REQUEST_ENDPOINT = withCurrentSearch("/api/amethyst/trade-requests")',
    )
    expect(jsx).toContain(
      'const TRADE_BOARD_ENDPOINT = withCurrentSearch("/api/amethyst/trade-board")',
    )
    expect(jsx).toContain('function fetchTradeBoardListings')
    expect(jsx).toContain('void refreshTradeBoardListings().catch(() => {})')
    expect(jsx).toContain('TRADE_BOARD_REFRESH_MS')
    expect(jsx).toContain('window.setInterval(refreshIfVisible')
    expect(jsx).toContain('window.clearInterval')
    expect(jsx).not.toContain('clickwrapAcknowledged')
    expect(jsx).not.toContain('acceptedTerms')
    expect(jsx).not.toContain('tp-sheet-consent')
    expect(jsx).toContain('setSubmittedListingIds')
    expect(jsx).toContain('type="file"')
  })

  it('keeps the Dance Floor screenshot reminder readable on every skin', () => {
    const css = readFileSync(resolve(process.cwd(), 'public/amethyst/trade.css'), 'utf8')
    const tip = css.slice(css.indexOf('.tp-screenshot-tip {'), css.indexOf('\n}', css.indexOf('.tp-screenshot-tip {')))
    expect(tip).toContain('background: var(--hp-tip-surface);')
    expect(tip).toContain('color: var(--hp-tip-ink);')
  })

  it('keeps trade request success and error sheets visible after board refreshes', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )

    expect(jsx).toContain('setSuccess(true)')
    expect(jsx).toContain('<h3 className="tp-sheet-success-title">Request sent.</h3>')
    expect(jsx).toContain('setRequestError(error?.message || DEFAULT_TRADE_REQUEST_ERROR)')
    expect(jsx).not.toContain('}, [availableSamples, t.demoSheet]);')
    expect(jsx).toContain('}, [t.demoSheet]);')
  })
})
