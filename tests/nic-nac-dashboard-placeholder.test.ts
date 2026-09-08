import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { File } from 'node:buffer'

import {
  AccountBillingCard,
  BusinessCalculatorCard,
  BusinessToolsCard,
  DashboardPlaceholder,
  HelpResourcesCard,
  JewelryLibraryCard,
  LiveQueueTool,
  MessagesCenterCard,
  ReferralProgramCard,
  RecipesCard,
  CustomerRosterCard,
  SiteSettingsCard,
  ShowCalendarCard,
  TeamManagementCard,
  WalletSummaryCard,
  WorkspaceAppHeader,
  WorkspaceAccessNotice,
  buildJoinTeamRosterSavePayload,
  buildJoinTeamRosterRemovalPayload,
  confirmJoinTeamRosterRemoval,
  getJoinTeamRosterDraft,
  moveJoinTeamRosterMember,
  buildShowCalendarCells,
  buildHomeNextShowSummary,
  buildCustomerSparkleSiteHref,
  createTradeRequestDecisionHandlers,
  getAutoRechargeAmountOptions,
  getAutoRechargeDraft,
  getAutoRechargeThresholdOptions,
  getInitialWorkspaceSection,
  getWorkspaceBackDestination,
  getVisibleWorkspaceSections,
  hasBlingKitchenRecipeWorkspaceAccess,
  hasPaidWorkspaceSubscription,
  isComingSoonWorkspaceSection,
  resolveWorkspaceSectionForAccess,
  shouldShowWorkspaceLoadingSkeleton,
  shouldShowWorkspaceAccessNotice,
  filterRosterCustomers,
  filterMessageCenterMessages,
  getSafeMessageActionUrl,
  getWalletBannerMessage,
  getWalletLoadOptions,
  getCustomerOutreachActions,
  getCustomerActions,
  getCustomerChannelStatuses,
  getCustomerDuplicateSummary,
  getVisibleContactValues,
  getCustomerRecoveryActions,
  getCustomerTimeline,
  parseCustomerImportFile,
  getEstimatedTextsRemaining,
  getCalendarEventDetailGroups,
  getShowCalendarMetrics,
  getSiteSettingsManualSaveStatusText,
  getSiteSettingsDraft,
  hasSiteSettingsUnsavedChanges,
  getWorkspaceSkinPreset,
  calculateBusinessCalculator,
  calculateSingleShowCalculator,
  buildTradeBoardFetchUrl,
  buildSiteRecipesFetchUrl,
  createTickerLinkFromSelection,
  makeTickerLinksPlainText,
  getRecipeDraft,
  getRecipeDraftSavePayload,
  getRecipeSaveStatusText,
  getJewelryLibrarySearchErrorMessage,
  type DashboardPlaceholderProps,
  type WorkspaceMessageSummary,
  formatHeaderRepName,
  formatHeaderRepShow,
  formatHeaderShowName,
  formatWalletAmount,
  needsFreshOptIn,
  sortRosterCustomers,
  searchRosterCustomers,
} from '@/app/nic-nac/components/DashboardPlaceholder'
import { TradeBoardWorkspaceCard } from '@/app/nic-nac/components/TradeBoardWorkspaceCard'
import { getHelpResources } from '@/lib/services/help-resources'

function getTradeBoardSectionLabels(html: string) {
  return Array.from(
    html.matchAll(
      />(Dance Floor|Today(?:&#x27;|')s trade work|Quick add|Browse dancers|Request inbox|Trade follow-up|Fulfillment queue)</g,
    ),
    (match) => match[1].replace('&#x27;', "'"),
  )
}

const READY_STATE = {
  status: 'ready' as const,
  summary: {
    totalCustomers: 3,
    smsReachableCount: 1,
    emailReachableCount: 2,
    marketingConsentCount: 2,
    smsOptedOutCount: 1,
    emailOptedOutCount: 0,
    addedLast30DaysCount: 2,
  },
  customers: [
    {
      id: 'aud-1',
      name: 'Jamie Lane',
      phone: '+15555550101',
      email: 'jamie@example.com',
      birthday: '10-12',
      favoriteGemOrStone: 'Opal',
      favoriteMaterial: 'Silver',
      favoriteCut: 'Oval',
      favoriteCollection: 'Simply Stunning',
      smsConsent: true,
      emailConsent: true,
      marketingConsent: true,
      canReceiveSms: true,
      canReceiveEmail: true,
      consentDate: '2026-05-05T12:00:00Z',
      createdAt: '2026-05-05T12:00:00Z',
      smsOptedOutAt: null,
      emailOptedOutAt: null,
      stopKeywordReceivedAt: null,
    },
    {
      id: 'aud-2',
      name: 'Morgan Lee',
      phone: '+15555550102',
      email: null,
      birthday: '03-04',
      favoriteGemOrStone: 'Turquoise',
      favoriteMaterial: 'Gold',
      favoriteCut: 'Round',
      favoriteCollection: 'Glamour',
      smsConsent: true,
      emailConsent: false,
      marketingConsent: false,
      canReceiveSms: false,
      canReceiveEmail: false,
      consentDate: '2026-05-04T12:00:00Z',
      createdAt: '2026-05-04T12:00:00Z',
      smsOptedOutAt: '2026-05-05T14:00:00Z',
      emailOptedOutAt: null,
      stopKeywordReceivedAt: '2026-05-05T14:00:00Z',
    },
    {
      id: 'aud-3',
      name: 'Taylor Brooks',
      phone: null,
      email: 'taylor@example.com',
      smsConsent: false,
      emailConsent: true,
      marketingConsent: true,
      canReceiveSms: false,
      canReceiveEmail: true,
      consentDate: '2026-05-03T12:00:00Z',
      createdAt: '2026-05-03T12:00:00Z',
      smsOptedOutAt: null,
      emailOptedOutAt: null,
      stopKeywordReceivedAt: null,
    },
  ],
}

describe('workspace request error copy', () => {
  it('keeps jewelry library search failures plain-English for reps', () => {
    expect(getJewelryLibrarySearchErrorMessage(500)).toBe(
      'Unable to search the jewelry library right now. Try again in a minute, or ask Nic-Nac to help look up the piece.',
    )
    expect(getJewelryLibrarySearchErrorMessage(401)).not.toContain('401')
    expect(getJewelryLibrarySearchErrorMessage(500)).not.toContain(
      'jewelry library request failed',
    )
  })
})

describe('Dance Floor add retry keys', () => {
  it('persists pending mutation keys across a page refresh and clears them only after success', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('window.localStorage.getItem(storageKey)')
    expect(source).toContain('window.localStorage.setItem(storageKey, mutationKey)')
    expect(source).toContain('getOrCreateTradeAddMutationKey(logicalMutation)')
    expect(source).toContain('clearTradeAddMutationKey(logicalMutation)')
    expect(source).toContain('window.localStorage.removeItem(')
    expect(source).toContain('payload?.result?.mutationReplayed')
    expect(source).toContain('No new copy was added. Tap Add again')
    expect(source).toContain('body: JSON.stringify({\n          designId,')

    const quickAddSource = source.slice(
      source.indexOf('async function handleQuickAddListing()'),
      source.indexOf('async function handleRemoveTradeListing'),
    )
    expect(quickAddSource.indexOf('await refreshTradeWorkspace()')).toBeLessThan(
      quickAddSource.indexOf('clearTradeAddMutationKey(logicalMutation)'),
    )

    const libraryAddSource = source.slice(
      source.indexOf('async function handleAddFromLibrary'),
      source.indexOf('async function patchMessageDelivery'),
    )
    expect(libraryAddSource.indexOf('await Promise.all([')).toBeLessThan(
      libraryAddSource.indexOf('clearTradeAddMutationKey(logicalMutation)'),
    )
  })
})

const DUPLICATE_CUSTOMERS = [
  {
    id: 'dup-1',
    name: 'Jamie Lane',
    phone: '+15555550101',
    email: 'jamie@example.com',
    smsConsent: true,
    emailConsent: true,
    marketingConsent: true,
    canReceiveSms: true,
    canReceiveEmail: true,
    consentDate: '2026-05-05T12:00:00Z',
    createdAt: '2026-05-05T12:00:00Z',
    smsOptedOutAt: null,
    emailOptedOutAt: null,
    stopKeywordReceivedAt: null,
  },
  {
    id: 'dup-2',
    name: 'Jamie Lane Alt',
    phone: '+1 (555) 555-0101',
    email: 'JAMIE@example.com',
    smsConsent: true,
    emailConsent: true,
    marketingConsent: true,
    canReceiveSms: true,
    canReceiveEmail: true,
    consentDate: '2026-05-04T12:00:00Z',
    createdAt: '2026-05-04T12:00:00Z',
    smsOptedOutAt: null,
    emailOptedOutAt: null,
    stopKeywordReceivedAt: null,
  },
]

const WALLET_READY_STATE = {
  status: 'ready' as const,
  summary: {
    balanceMils: 24991,
    balanceUsd: 24.991,
    estimatedTextsRemaining: 2776,
    messagesSentThisMonth: 7,
    messagesSpendThisMonthMils: 63,
    messagesSpendThisMonthUsd: 0.063,
    autoRechargeEnabled: true,
    autoRechargePending: false,
    autoRechargeThresholdMils: 5000,
    autoRechargeThresholdUsd: 5,
    autoRechargeAmountMils: 25000,
    autoRechargeAmountUsd: 25,
    minimumLoadAmountMils: 25000,
    minimumLoadAmountUsd: 25,
    lastLoadedAt: '2026-05-05T12:00:00Z',
    recentTransactions: [
      {
        id: 'tx-1',
        type: 'load' as const,
        amountMils: 25000,
        description: 'Wallet load',
        createdAt: '2026-05-05T12:00:00Z',
      },
      {
        id: 'tx-2',
        type: 'sms_charge' as const,
        amountMils: 9,
        description: 'SMS send',
        createdAt: '2026-05-05T14:00:00Z',
      },
    ],
  },
}

const CALENDAR_READY_STATE = {
  status: 'ready' as const,
  summary: {
    upcomingEvents: [
      {
        id: 'show-1',
        repId: 'rep-1',
        platform: 'Facebook Live',
        eventTime: '2026-05-15T19:00:00.000Z',
        timeZone: 'America/New_York',
        durationMinutes: 60,
        title: 'Thursday reveal',
        description: null,
        discountCodes: [],
        featuredCollections: null,
        isRecurring: true,
        recurrenceGroupId: 'group-1',
        recurrenceRule: 'FREQ=WEEKLY',
        status: 'scheduled' as const,
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
      {
        id: 'show-2',
        repId: 'rep-1',
        platform: 'TikTok Live',
        eventTime: '2026-05-18T20:30:00.000Z',
        timeZone: 'America/New_York',
        durationMinutes: 90,
        title: '',
        description: 'Sunday party',
        discountCodes: [],
        featuredCollections: null,
        isRecurring: false,
        recurrenceGroupId: null,
        recurrenceRule: null,
        status: 'scheduled' as const,
        createdAt: '2026-05-02T10:00:00.000Z',
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ],
    recentEvents: [
      {
        id: 'show-3',
        repId: 'rep-1',
        platform: 'Facebook Live',
        eventTime: '2026-05-05T19:00:00.000Z',
        timeZone: 'America/New_York',
        durationMinutes: 60,
        title: 'Launch party',
        description: null,
        discountCodes: [],
        featuredCollections: null,
        isRecurring: false,
        recurrenceGroupId: null,
        recurrenceRule: null,
        status: 'completed' as const,
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-05T21:00:00.000Z',
      },
    ],
  },
}

const SITE_SETTINGS_READY_STATE = {
  status: 'ready' as const,
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
    heroAnimationType: 'soft_glow' as const,
    teamName: 'Moonstone Squad',
    showJoinPage: true,
    customerSiteTemplate: 'amethyst' as const,
    appearancePreset: 'amethyst' as const,
    socialHandles: {
      instagram: '@sparklebysasha',
      facebook: 'sparklebysasha',
    },
  },
}

const RECIPES_READY_STATE = {
  status: 'ready' as const,
  recipes: [
    {
      id: 'recipe-1',
      repId: 'rep-1',
      title: 'Bling Kitchen Chicken Dip',
      slug: 'bling-kitchen-chicken-dip',
      description: 'Creamy party dip for live night.',
      category: 'Appetizer',
      prepTime: '30 min',
      servings: 8,
      imageUrl: 'https://cdn.example.com/chicken-dip.jpg',
      imageAlt: 'Chicken dip in a baking dish',
      imagePosition: 'center',
      modalImageUrl: 'https://cdn.example.com/chicken-dip-large.jpg',
      modalImagePosition: 'center',
      tiktokUrl: 'https://www.tiktok.com/@blingkitchen/video/123',
      ingredients: ['Chicken', 'Cream cheese', 'Ranch'],
      steps: ['Mix everything', 'Bake until bubbly'],
      note: 'Serve warm.',
      sortOrder: 0,
      isVisible: true,
      sourceRecipeId: 'source-1',
      recipeSourceImageUrls: ['https://cdn.example.com/chicken-card.jpg'],
      createdAt: '2026-06-19T12:00:00.000Z',
      updatedAt: '2026-06-19T12:00:00.000Z',
    },
    {
      id: 'recipe-2',
      repId: 'rep-1',
      title: 'Hidden Draft Dessert',
      slug: 'hidden-draft-dessert',
      description: 'Draft recipe copy.',
      category: 'Dessert',
      prepTime: '15 min',
      servings: null,
      imageUrl: '',
      imageAlt: '',
      imagePosition: 'center',
      modalImageUrl: '',
      modalImagePosition: 'center',
      tiktokUrl: '',
      ingredients: ['Chocolate'],
      steps: ['Chill'],
      note: '',
      sortOrder: 1,
      isVisible: false,
      sourceRecipeId: 'source-2',
      recipeSourceImageUrls: [],
      createdAt: '2026-06-19T12:00:00.000Z',
      updatedAt: '2026-06-19T12:00:00.000Z',
    },
  ],
}

const ACCOUNT_BILLING_READY_STATE = {
  status: 'ready' as const,
  summary: {
    stripeConfigured: true,
    checkoutMode: 'standard' as const,
    subscription: {
      status: 'active' as const,
      planType: 'monthly' as const,
      currentPeriodEnd: '2026-06-01T00:00:00Z',
      cancelAtPeriodEnd: true,
      cancelledAt: null,
      livemode: false,
    },
    paymentMethod: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
    },
    invoices: [
      {
        id: 'in_1',
        createdAt: '2026-05-01T12:00:00Z',
        amountPaidCents: 9900,
        currency: 'usd',
        status: 'paid',
        hostedInvoiceUrl: 'https://stripe.test/in_1',
        invoicePdfUrl: 'https://stripe.test/in_1.pdf',
      },
    ],
    referral: {
      code: 'SS-K7M4Q9',
      link: 'https://sparkle-suite.example/start?ref=SS-K7M4Q9',
      pendingCount: 2,
      earnedCount: 1,
      creditedCount: 3,
    },
    grandfatheredCheckout: null,
    canStartSubscription: false,
    canManageBilling: true,
  },
}

const TRADE_BOARD_READY_STATE = {
  status: 'ready' as const,
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

describe('DashboardPlaceholder', () => {
  it('keeps only the membership team in the workspace header', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceAppHeader, {
        repName: 'Sasha',
        showName: 'Sparkle by Sasha',
        memberTeamName: 'North Star Team',
        publicSiteUrl: null,
        publicSiteDisplay: 'Not set',
        unreadMessageCount: 0,
        onOpenPublicSite: () => {},
        onOpenMessages: () => {},
        onGoHome: () => {},
      }),
    )

    expect(html).toContain('Team I belong to')
    expect(html).toContain('North Star Team')
    expect(html).not.toContain('Team I manage')
  })

  it('keeps help resources out of old first-run checklist framing', () => {
    const helpText = getHelpResources()
      .flatMap((resource) => [
        resource.title,
        resource.summary,
        resource.body,
        ...resource.quickActions,
      ])
      .join(' ')

    expect(helpText).not.toContain('after checkout')
    expect(helpText).not.toContain('setup checklist')
    expect(helpText).not.toContain('Start setup checklist')
  })

  it('renders the Sparkle Suite Nic-Nac workspace shell', () => {
    const html = renderToStaticMarkup(createElement(DashboardPlaceholder))
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(html).toContain('Hi there, how can I help you today?')
    expect(html).not.toContain('Ask Nic-Nac anything...')
    expect(html).not.toContain('aria-label="Notifications"')
    expect(html).toContain('Sparkle Suite')
    expect(html).toContain('Workspace')
    expect(html).toContain('Rep info loading')
    expect(html).toContain('Live show name loading')
    expect(html).not.toContain('>Rep<')
    expect(html).not.toContain('>Show<')
    expect(html).not.toContain('Secret Rep ID Number')
    expect(source).toContain('function WorkspaceAppHeader')
    expect(html).not.toContain('Saved here for future extension setup.')
    expect(html).not.toContain('Checking workspace access')
    expect(html).toContain('Add a dancer')
    expect(html).not.toContain('Check my board')
    expect(html).toContain('Add a show')
    expect(source).toContain('styles.railLaunchAction')
    expect(source).not.toContain('styles.heroQuickActions')
    expect(html).toContain('Trade Info')
    expect(html).toContain('aria-label="Trade info at a glance"')
    expect(html).toContain('Trade requests')
    expect(html).toContain('Trade follow-up')
    expect(html).toContain('Fulfillment')
    expect(html).toContain('Open Trade Workspace')
    expect(html).not.toContain('Active Board')
    expect(html).not.toContain('View board')
    expect(html.match(/Upcoming Show/g)).toHaveLength(1)
    expect(html).toContain('No upcoming shows')
    expect(html).toContain('Add a show')
    expect(html).toContain('Public Site')
    expect(html).toContain('Site setup in progress')
    expect(html).not.toContain('Sparkle with us.')
    expect(html).toContain('Need help?')
    expect(html).not.toContain('Trade history')
    expect(html).toContain('Nic-Nac')
    expect(html).toContain('Dance Floor')
    expect(html).not.toContain('Jewelry Library')
    expect(html).toContain('Calendar')
    expect(html).toContain('Tools')
    expect(html).not.toContain('Setup Checklist')
    expect(html).not.toContain('Confirm business/profile basics')
    expect(html).not.toContain('Understand the Chrome extension and Live Queue')
  })

  it('keeps the SMS wallet out of Account until customer messaging launches', () => {
    const html = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        initialSectionOverride: 'account',
      }),
    )

    expect(html).toContain('Billing')
    expect(html).not.toContain('SMS Wallet')
    expect(html).not.toContain('Monitor text balance, reloads, and auto-recharge')
  })

  it('treats a rep-targeted customer site as live even without a vanity slug', () => {
    const html = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        repIdOverride: 'rep-1',
      }),
    )

    expect(html).toContain('Your site is live')
    expect(html).toContain('Open site')
    expect(html).not.toContain('Site setup in progress')
    expect(html).toContain('/amethyst/Homepage.html?c=rep-1')
  })

  it('formats the next upcoming show for the workspace glance card', () => {
    expect(
      buildHomeNextShowSummary([
        {
          id: 'show-1',
          repId: 'rep-1',
          platform: 'TikTok Live',
          eventTime: '2026-07-14T23:00:00.000Z',
          timeZone: 'America/New_York',
          durationMinutes: 180,
          title: 'Tuesday Night Sparkle Party',
          description: null,
          discountCodes: [],
          featuredCollections: null,
          isRecurring: false,
          recurrenceGroupId: null,
          recurrenceRule: null,
          status: 'scheduled',
          createdAt: '2026-07-01T12:00:00.000Z',
          updatedAt: '2026-07-01T12:00:00.000Z',
        },
      ]),
    ).toEqual({
      title: 'Tuesday Night Sparkle Party',
      weekday: 'Tuesday',
      date: 'Jul 14, 2026',
      time: '7:00 PM',
      timeZone: 'EDT',
    })
  })

  it('does not render fake workspace preview thumbnails', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const html = renderToStaticMarkup(
      createElement(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        initialSiteSettings: SITE_SETTINGS_READY_STATE.settings,
      }),
    )

    expect(source).not.toContain('/nic-nac/concept-trade-card.png')
    expect(source).not.toContain('/nic-nac/concept-board-gold.png')
    expect(source).not.toContain('/nic-nac/concept-board-silver.png')
    expect(source).not.toContain('/nic-nac/concept-public-site.png')
    expect(source).not.toContain('boardPreviewImageUrl')
    expect(source).not.toContain('publicSitePreviewImageUrl')
    expect(html).not.toContain('https://cdn.example.com/hero.jpg')
    expect(html).not.toContain('/nic-nac/concept-')
    expect(html).toContain('Hi Louis, how can I help you today?')
  })

  it('renders Finder-matching jewelry library search controls and board actions', () => {
    const html = renderToStaticMarkup(
      createElement(JewelryLibraryCard, {
        state: {
          status: 'ready',
          results: [
            {
              designId: 'design-1',
              itemNumber: 'RG100',
              designName: 'Aurora Diamond Ring',
              material: 'Rose gold',
              mainStone: 'Pink opal',
              bpMsrp: 19.95,
              canonicalPhotoUrl: 'https://cdn.example.com/aurora.jpg',
              typePrefix: 'RG',
              collectionName: 'Birthday',
              collectionYear: 2026,
              searchTags: ['diamond', 'garden'],
              isOnMyBoard: false,
              activeListingsCount: 2,
            },
            {
              designId: 'design-2',
              itemNumber: 'NK200',
              designName: 'Moonlit Necklace',
              material: 'Silver',
              mainStone: 'Moonstone',
              bpMsrp: 24.95,
              canonicalPhotoUrl: null,
              typePrefix: 'NK',
              collectionName: 'Celestial',
              collectionYear: 2025,
              searchTags: [],
              isOnMyBoard: true,
              activeListingsCount: 1,
            },
          ],
          facets: {
            collections: [{ value: 'Birthday', count: 1 }],
            materials: [{ value: 'Rose gold', count: 1 }],
            stones: [{ value: 'Pink opal', count: 1 }],
            types: [{ value: 'ring', count: 1 }],
            labels: [{ value: 'diamond', count: 1 }],
            years: [{ value: '2026', count: 1 }],
          },
        },
        searchQuery: 'aurora',
        filters: {
          q: 'aurora',
          type: 'ring',
          collection: '',
          material: '',
          stone: '',
          label: '',
          year: '',
          limit: 24,
        },
        onSearchQueryChange: () => {},
        onSearch: () => {},
        onFilterChange: () => {},
        onClear: () => {},
        onAddToBoard: () => {},
        actionState: { pendingKey: null, error: null, helperMessage: null },
      }),
    )

    expect(html).toContain('Master Jewelry Library')
    expect(html).toContain('Search the Jewelry Library')
    expect(html).toContain('Try a stone, collection, item number, or piece name')
    expect(html).toContain('Not sure what it is called? Ask Nic-Nac from here.')
    expect(html).toContain('Ask Nic-Nac')
    expect(html).toContain('Clear')
    expect(html).toContain('Selected filters')
    expect(html).toContain('Search: aurora')
    expect(html).toContain('Type: ring')
    expect(html).toContain('Filters')
    expect(html).toContain('2 active')
    expect(html).toContain('Collections')
    expect(html).toContain('Materials')
    expect(html).toContain('Stone / gem')
    expect(html).toContain('Label')
    expect(html).toContain('Year')
    expect(html).toContain('Aurora Diamond Ring')
    expect(html).toContain('2 available')
    expect(html).toContain('Add dancer')
    expect(html).toContain('Already listed')
  })

  it('renders Help & Resources as a workflow playbook with a secondary feature index', () => {
    const html = renderToStaticMarkup(
      createElement(HelpResourcesCard, {
        state: { status: 'ready', resources: getHelpResources() },
        hasPaidWorkspace: true,
      }),
    )

    expect(html).toContain('Pick what you are trying to do')
    expect(html).toContain('Workflow Playbook')
    expect(html).toContain('Start here: Learn your Sparkle Suite workspace')
    expect(html).toContain('Add a dancer to your Dance Floor')
    expect(html).toContain('Goal')
    expect(html).toContain('Use this when')
    expect(html).toContain('Before you start')
    expect(html).toContain('Good result')
    expect(html).toContain('Ask Nic-Nac')
    expect(html).toContain('Still stuck')
    expect(html).toContain('Feature Index')
    expect(html).toContain('Support Path')
    expect(html).not.toContain('Choose your look')
    expect(html).not.toContain('Customer Site Looks')
    expect(html).not.toContain('Full skin gallery')
    expect(html).not.toContain('Classic Sparkle')
  })

  it('places learning resources and help behind one accessible tab switcher', () => {
    const html = renderToStaticMarkup(
      createElement(HelpResourcesCard, {
        state: { status: 'ready', resources: getHelpResources() },
        hasPaidWorkspace: true,
        initialTab: 'learn',
        learningContent: createElement('div', null, 'Video tiles'),
      }),
    )

    expect(html).toContain('>Resources<')
    expect(html).toContain('Watch a quick how-to')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('>Learn<')
    expect(html).toContain('>Help<')
    expect(html).toContain('Video tiles')
    expect(html).not.toContain('Workflow Playbook')
  })

  it('keeps Help & Resources scannable with collapsed section disclosures', () => {
    const html = renderToStaticMarkup(
      createElement(HelpResourcesCard, {
        state: { status: 'ready', resources: getHelpResources() },
        hasPaidWorkspace: true,
      }),
    )

    expect(html).toContain('<details class="')
    expect(html).toContain('Setup')
    expect(html).toContain('Live Shows')
    expect(html).toContain('Feature Index')
    expect(html).toContain('Support Path')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Open section')
    expect(html).not.toContain('<section class="')
  })

  it('deep-links workspace sections without self-serve-started first-run routing', () => {
    expect(getInitialWorkspaceSection('?section=account')).toBe('account')
    expect(getInitialWorkspaceSection('?section=trade-board')).toBe('trade-board')
    expect(getInitialWorkspaceSection('?section=jewelry-library')).toBe('jewelry-library')
    expect(getInitialWorkspaceSection('?section=live-queue')).toBe('live-queue')
    expect(getInitialWorkspaceSection('?section=recipes')).toBe('recipes')
    expect(getInitialWorkspaceSection('?section=business-tools')).toBe(
      'business-tools',
    )
    expect(getInitialWorkspaceSection('?section=business-calculator')).toBe(
      'business-tools',
    )
    expect(getInitialWorkspaceSection('?section=team-management')).toBe('team-management')
    expect(getInitialWorkspaceSection('?section=collection-intake')).toBe('more')
    expect(getInitialWorkspaceSection('?section=customer-list')).toBe('customer-list')
    expect(getInitialWorkspaceSection('?section=messages')).toBe('messages')
    expect(getInitialWorkspaceSection('?section=resources')).toBe('resources')
    expect(getInitialWorkspaceSection('?section=unknown')).toBe('home')
    expect(getInitialWorkspaceSection('?onboarding=self-serve-started')).toBe(
      'home',
    )
  })

  it('keeps the primary dashboard section list streamlined for unlocked workspace reps', () => {
    expect(hasPaidWorkspaceSubscription(null)).toBe(false)
    expect(
      hasPaidWorkspaceSubscription({
        ...ACCOUNT_BILLING_READY_STATE.summary,
        subscription: null,
      }),
    ).toBe(false)
    expect(
      hasPaidWorkspaceSubscription({
        ...ACCOUNT_BILLING_READY_STATE.summary,
        subscription: {
          ...ACCOUNT_BILLING_READY_STATE.summary.subscription!,
          status: 'active',
        },
      }),
    ).toBe(true)
    expect(getVisibleWorkspaceSections(false, false).map((section) => section.key)).toEqual([
      'home',
      'trade-board',
      'show-calendar',
      'more',
    ])
    expect(getVisibleWorkspaceSections(false, true).map((section) => section.key)).not.toContain('recipes')
    expect(resolveWorkspaceSectionForAccess('trade-board', false)).toBe('trade-board')
    expect(resolveWorkspaceSectionForAccess('help-resources', false)).toBe('help-resources')
    expect(isComingSoonWorkspaceSection('business-tools')).toBe(false)
    expect(isComingSoonWorkspaceSection('team-management')).toBe(false)
    expect(isComingSoonWorkspaceSection('collection-intake')).toBe(true)
    expect(isComingSoonWorkspaceSection('customer-list')).toBe(false)
    expect(isComingSoonWorkspaceSection('messages')).toBe(false)
    expect(isComingSoonWorkspaceSection('resources')).toBe(false)
    expect(isComingSoonWorkspaceSection('jewelry-library')).toBe(false)
    expect(isComingSoonWorkspaceSection('recipes')).toBe(false)
    expect(resolveWorkspaceSectionForAccess('recipes', true, false)).toBe(
      'more',
    )
    expect(resolveWorkspaceSectionForAccess('recipes', true, true)).toBe(
      'recipes',
    )
    expect(resolveWorkspaceSectionForAccess('business-tools', true)).toBe(
      'business-tools',
    )
    expect(resolveWorkspaceSectionForAccess('team-management', true)).toBe(
      'team-management',
    )
    expect(resolveWorkspaceSectionForAccess('collection-intake', true)).toBe('more')
    expect(resolveWorkspaceSectionForAccess('customer-list', true)).toBe('customer-list')
    expect(resolveWorkspaceSectionForAccess('resources', true)).toBe('resources')
  })

  it('only shows Recipes for Heather BlingKitchen workspaces', () => {
    expect(
      hasBlingKitchenRecipeWorkspaceAccess({
        repId: 'rep-1',
        publicSiteSlug: 'sparklebysasha',
      }),
    ).toBe(false)
    expect(
      hasBlingKitchenRecipeWorkspaceAccess({
        repId: '9a971c05-3631-443e-bcb8-4e9a26e15885',
        publicSiteSlug: null,
      }),
    ).toBe(true)
    expect(
      hasBlingKitchenRecipeWorkspaceAccess({
        repId: 'rep-1',
        publicSiteSlug: 'blingkitchen',
      }),
    ).toBe(true)

    const genericHtml = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        repIdOverride: 'rep-1',
        publicSiteSlugOverride: 'sparklebysasha',
        initialSectionOverride: 'more',
      }),
    )
    const blingKitchenHtml = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        repIdOverride: '9a971c05-3631-443e-bcb8-4e9a26e15885',
        publicSiteSlugOverride: 'blingkitchen',
        initialSectionOverride: 'more',
      }),
    )

    expect(genericHtml).not.toContain('>Recipes<')
    expect(blingKitchenHtml).toContain('>Recipes<')
  })

  it('shows account access guidance instead of a blank panel for locked workspace sections', () => {
    expect(shouldShowWorkspaceAccessNotice('trade-board', false)).toBe(true)
    expect(shouldShowWorkspaceAccessNotice('trade-board', false, true)).toBe(false)
    expect(shouldShowWorkspaceAccessNotice('show-calendar', false)).toBe(true)
    expect(shouldShowWorkspaceAccessNotice('recipes', false)).toBe(true)
    expect(shouldShowWorkspaceAccessNotice('help-resources', false)).toBe(false)
    expect(shouldShowWorkspaceAccessNotice('messages', false)).toBe(false)
    expect(shouldShowWorkspaceAccessNotice('account', false)).toBe(false)
    expect(shouldShowWorkspaceAccessNotice('trade-board', true)).toBe(false)
    expect(shouldShowWorkspaceLoadingSkeleton('trade-board', true)).toBe(true)
    expect(shouldShowWorkspaceLoadingSkeleton('account', true)).toBe(false)
    expect(shouldShowWorkspaceLoadingSkeleton('help-resources', true)).toBe(false)
    expect(shouldShowWorkspaceLoadingSkeleton('messages', true)).toBe(false)
    expect(shouldShowWorkspaceLoadingSkeleton('trade-board', false)).toBe(false)

    const html = renderToStaticMarkup(
      createElement(WorkspaceAccessNotice, {
        sectionLabel: 'Dance Floor',
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            paymentMethod: null,
            invoices: [],
            canStartSubscription: true,
            canManageBilling: true,
          },
        },
        agreementAccepted: false,
      }),
    )

    expect(html).toContain('Dance Floor needs account setup')
    expect(html).toContain('Your account page has the current checkout or billing step.')
    expect(html).toContain('Open account')
    expect(html).toContain('Stripe Billing and Payments')
  })

  it('starts workspace section data loading without waiting on billing access data', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const loadEffectStart = source.indexOf('void loadPaidWorkspaceData(controller.signal)')
    const loadEffectSource = source.slice(
      source.lastIndexOf('useEffect(() => {', loadEffectStart),
      source.indexOf('}, [operatorSupportMode, reviewWorkspaceMode])', loadEffectStart),
    )

    expect(loadEffectStart).toBeGreaterThan(-1)
    expect(loadEffectSource).not.toContain("accountBillingState.status !== 'ready'")
    expect(loadEffectSource).not.toContain('hasPaidWorkspaceSubscription(accountBillingState.summary)')
  })

  it('lazy-loads Pantry recipes only when the Recipes workspace opens', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const paidLoaderStart = source.indexOf('async function loadPaidWorkspaceData')
    const paidLoaderSource = source.slice(
      paidLoaderStart,
      source.indexOf('  useEffect(() => {', paidLoaderStart),
    )

    expect(buildSiteRecipesFetchUrl()).toBe('/api/nic-nac/site-recipes')
    expect(source).toContain("activeSection !== 'recipes'")
    expect(source).toContain('void loadSiteRecipes(controller.signal)')
    expect(paidLoaderSource).not.toContain('loadSiteRecipes')
  })

  it('keeps the Pantry recipe fetch alive after switching from idle to loading', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const recipesEffectStart = source.indexOf("if (activeSection !== 'recipes') return")
    const recipesEffectSource = source.slice(
      source.lastIndexOf('useEffect(() => {', recipesEffectStart),
      source.indexOf('\n  useEffect(() => {', recipesEffectStart + 1),
    )

    expect(recipesEffectSource).toContain("if (activeSection !== 'recipes') return")
    expect(recipesEffectSource).toContain("recipesState.status !== 'idle'")
    expect(recipesEffectSource).toContain('void loadSiteRecipes(controller.signal)')
    expect(recipesEffectSource).toContain('return () => controller.abort()')
    expect(recipesEffectSource).toContain('}, [activeSection])')
    expect(recipesEffectSource).not.toContain('}, [activeSection, recipesState.status])')
  })

  it('renders Team Management as coming soon without SMS invite tooling', () => {
    const html = renderToStaticMarkup(
      createElement(TeamManagementCard, {
        state: {
          status: 'locked',
          access: { enabled: false, status: 'not_enabled', source: null },
        },
      }),
    )

    expect(html).toContain('Team Management')
    expect(html).toContain('Coming soon')
    expect(html).toContain('Team Management is coming soon.')
    expect(html).not.toContain('Stripe upgrade')
    expect(html).toContain('Private onboarding actions')
    expect(html).not.toContain('Send text')
    expect(html).not.toContain('SMS')
  })

  it('renders beta Team Management as a managed-team invite and tracking workspace', () => {
    const html = renderToStaticMarkup(
      createElement(TeamManagementCard, {
        state: {
          status: 'ready',
          access: { enabled: true, status: 'manual_beta', source: 'manual_beta' },
          participants: [
            {
              id: 'participant-1',
              joinTeamMemberId: 'member-lindsey',
              displayName: 'Lindsey',
              contactEmail: 'lindsey@example.com',
              status: 'started',
              accessUrl:
                'https://brittwithbling-start-strong.louis526569.chatgpt.site/?invite=token',
              progress: { completed: 3, needsHelp: 1, total: 8 },
              unreadMessageCount: 1,
              lastActivityAt: '2026-07-02T12:20:00.000Z',
              createdAt: '2026-07-02T12:00:00.000Z',
              workspaceConversationId: '11111111-1111-4111-8111-111111111111',
              latestMessagePreview: 'Can you help me choose my first show date?',
            },
          ],
          publicTeamRoster: [
            {
              id: 'member-lindsey',
              repId: 'rep-britt',
              displayName: 'Lindsey',
              businessName: 'Mile High Fizz',
              state: 'Colorado',
              city: 'Denver',
              initials: 'L',
              photoUrl: '/britt-with-bling/team/lindsey.jpg',
              photoAlt: 'Lindsey from Mile High Fizz',
              imageClassName: '',
              bio: '',
              links: {},
              sortOrder: 0,
              isVisible: true,
              createdAt: '2026-07-02T12:00:00.000Z',
              updatedAt: '2026-07-02T12:00:00.000Z',
            },
          ],
        },
        teamName: 'Moonstone Squad',
        onCreateParticipant: () => {},
        onRefreshInvite: () => {},
        onCopyInvite: () => {},
        onArchiveParticipant: () => {},
        onOpenMessages: () => {},
      }),
    )

    expect(html).toContain('Replace link')
    expect(html).toContain('Team I manage')
    expect(html).toContain('Moonstone Squad')
    expect(html).toContain('Private onboarding')
    expect(html).toContain('Workspace only')
    expect(html).toContain('Private onboarding link')
    expect(html).toContain('Copy link')
    expect(html).not.toContain('Email with my email app')
    expect(html).toContain('Lindsey')
    expect(html).toContain('3 of 8 steps completed')
    expect(html).toContain('Needs help')
    expect(html).toContain('1 new')
    expect(html).toContain('Open in Messages')
    expect(html).toContain('Latest: Can you help me choose my first show date?')
    expect(html).not.toContain('Reply composer')
    expect(html).not.toContain('Send reply')
    expect(html).toContain('Archive')
    expect(html).not.toContain('Send text')
    expect(html).not.toContain('Sparkle Suite SMS')
  })

  it('keeps Team Management top actions in balanced panels without a forced empty grid row', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(css).toMatch(
      /\.teamManagementGrid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
    )
    expect(css).toContain('align-items: stretch;')
    expect(css).toContain(
      '.teamManagementGrid > .teamManagementPanel:first-child',
    )
    expect(css).toContain('.teamPublicCardsPanel {')
    expect(css).not.toContain('grid-row: span 2;')
  })

  it('renders private onboarding controls inside each public team card workspace record', () => {
    const html = renderToStaticMarkup(
      createElement(TeamManagementCard, {
        state: {
          status: 'ready',
          access: { enabled: true, status: 'manual_beta', source: 'manual_beta' },
          participants: [],
          publicTeamRoster: [
            {
              id: 'member-lindsey',
              repId: 'rep-britt',
              displayName: 'Lindsey',
              businessName: 'Mile High Fizz',
              state: 'Colorado',
              city: 'Denver',
              initials: 'L',
              photoUrl: '/britt-with-bling/team/lindsey.jpg',
              photoAlt: 'Lindsey from Mile High Fizz',
              imageClassName: '',
              bio: 'Mountain sparkle energy.',
              links: {
                tiktok: 'https://www.tiktok.com/@milehighfizz',
                facebook: 'https://www.facebook.com/groups/milehighfizz',
                website: 'https://milehighfizz.example',
              },
              sortOrder: 0,
              isVisible: true,
              createdAt: '2026-07-02T12:00:00.000Z',
              updatedAt: '2026-07-02T12:00:00.000Z',
            },
          ],
        },
        publicTeamDraft: {
          displayName: 'Rayna',
          businessName: 'Queen of Blingy Thingz',
          photoUrl: '/team/rayna.jpg',
          tiktok: 'https://www.tiktok.com/@queenofblingythingz',
          facebook: '',
          instagram: '',
          website: '',
          youtube: '',
          isVisible: true,
        },
        onPublicTeamDraftChange: () => {},
        onSavePublicTeamMember: () => {},
        onEditPublicTeamMember: () => {},
        onTogglePublicTeamMember: () => {},
        onMovePublicTeamMember: () => {},
        onRemovePublicTeamMember: () => {},
      }),
    )

    expect(html).toContain('Public Team Cards')
    expect(html).toContain('Add team member card')
    expect(html).toContain('Save team member card')
    expect(html).toContain('First name')
    expect(html).toContain('Show name')
    expect(html).toContain('Profile photo process')
    expect(html).toContain('Save or download the team member&#x27;s profile photo')
    expect(html).toContain('I have permission to publish this team member&#x27;s photo')
    expect(html).toContain('Upload profile photo')
    expect(html).not.toContain('Photo URL or saved path (optional fallback)')
    expect(html).toContain('accept="image/jpeg,image/png,image/webp"')
    expect(html).toContain('Mile High Fizz')
    expect(html).toContain('Lindsey')
    expect(html).toContain('Private onboarding')
    expect(html).toContain('Create onboarding link')
    expect(html).toContain('Private links never appear on the customer-facing site.')
    expect(html).toContain('Visible on Join Team page')
    expect(html).toContain('Preview Join Team page')
    expect(html).toContain('Before you share the Join Team page')
    expect(html).toContain('At least one public team card is visible.')
    expect(html).toContain('current official starter-pack link')
    expect(html).toContain('new rep&#x27;s first name and your lead identity')
    expect(html).toContain('Message Center')
    expect(html).not.toContain('Optional email')
    expect(html).not.toContain('Send text')

    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    expect(source).toContain("fetch('/api/nic-nac/join-team-roster/photo'")
    expect(source).toContain('TEAM_PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024')
  })

  it('requires explicit UI confirmation and sends the confirmed hard-delete contract', () => {
    const confirmRemoval = vi.fn<(message: string) => boolean>(() => false)
    expect(
      confirmJoinTeamRosterRemoval(
        { displayName: 'Alex' },
        confirmRemoval,
      ),
    ).toBe(false)
    expect(confirmRemoval).toHaveBeenCalledWith(
      expect.stringContaining('Remove Alex'),
    )
    expect(confirmRemoval.mock.calls[0][0]).toContain(
      'onboarding history will be preserved',
    )
    expect(buildJoinTeamRosterRemovalPayload('member-alex')).toEqual({
      action: 'remove',
      memberId: 'member-alex',
      confirmed: true,
    })
  })

  it('keeps onboarding usable if public team cards fail to load', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const loaderStart = source.indexOf('async function loadTeamManagement')
    const loaderSource = source.slice(
      loaderStart,
      source.indexOf('  async function loadResources', loaderStart),
    )

    expect(loaderSource).toContain('let publicTeamRoster: JoinTeamMember[] = []')
    expect(loaderSource).toContain('try {')
    expect(loaderSource).toContain('publicTeamRoster = await loadJoinTeamRoster(signal)')
    expect(loaderSource).toContain('catch')
    expect(loaderSource).toContain('participants: payload.participants ?? []')
    expect(loaderSource).toContain('publicTeamRoster')
    expect(loaderSource).not.toContain('const roster = await loadJoinTeamRoster(signal)')
  })

  it('builds public team card save payloads with trimmed social links', () => {
    expect(
      buildJoinTeamRosterSavePayload({
        id: 'member-rayna',
        displayName: ' Rayna ',
        businessName: ' Queen of Blingy Thingz ',
        photoUrl: ' /team/rayna.jpg ',
        tiktok: ' https://www.tiktok.com/@queenofblingythingz ',
        facebook: '',
        instagram: '   ',
        website: ' https://rayna.example ',
        youtube: '',
        isVisible: false,
      }),
    ).toEqual({
      id: 'member-rayna',
      displayName: 'Rayna',
      businessName: 'Queen of Blingy Thingz',
      photoUrl: '/team/rayna.jpg',
      photoAlt: 'Rayna team profile photo',
      links: {
        tiktok: 'https://www.tiktok.com/@queenofblingythingz',
        website: 'https://rayna.example',
      },
      isVisible: false,
    })
  })

  it('moves public team card ids one slot at a time for reorder saves', () => {
    const members = [
      { id: 'member-a' },
      { id: 'member-b' },
      { id: 'member-c' },
    ]

    expect(moveJoinTeamRosterMember(members, 'member-b', 'up')).toEqual([
      'member-b',
      'member-a',
      'member-c',
    ])
    expect(moveJoinTeamRosterMember(members, 'member-b', 'down')).toEqual([
      'member-a',
      'member-c',
      'member-b',
    ])
    expect(moveJoinTeamRosterMember(members, 'member-a', 'up')).toEqual([
      'member-a',
      'member-b',
      'member-c',
    ])
  })

  it('turns an existing public roster card into an editable draft', () => {
    expect(
      getJoinTeamRosterDraft({
        id: 'member-lindsey',
        repId: 'rep-britt',
        displayName: 'Lindsey',
        businessName: 'Mile High Fizz',
        state: 'Colorado',
        city: 'Denver',
        initials: 'L',
        photoUrl: '/team/lindsey.jpg',
        photoAlt: 'Lindsey profile',
        imageClassName: 'object-top',
        bio: 'Mountain sparkle energy.',
        links: {
          tiktok: 'https://www.tiktok.com/@milehighfizz',
          facebook: 'https://www.facebook.com/groups/milehighfizz',
        },
        sortOrder: 0,
        isVisible: true,
        createdAt: null,
        updatedAt: null,
      }),
    ).toEqual({
      id: 'member-lindsey',
      displayName: 'Lindsey',
      businessName: 'Mile High Fizz',
      state: 'Colorado',
      city: 'Denver',
      initials: 'L',
      photoUrl: '/team/lindsey.jpg',
      photoAlt: 'Lindsey profile',
      imageClassName: 'object-top',
      bio: 'Mountain sparkle energy.',
      sortOrder: 0,
      tiktok: 'https://www.tiktok.com/@milehighfizz',
      facebook: 'https://www.facebook.com/groups/milehighfizz',
      instagram: '',
      website: '',
      youtube: '',
      whatnot: '',
      isVisible: true,
    })
  })

  it('preserves unshown public team card fields in edit save payloads', () => {
    expect(
      buildJoinTeamRosterSavePayload({
        id: 'member-lindsey',
        displayName: 'Lindsey',
        businessName: 'Mile High Fizz',
        state: 'Colorado',
        city: 'Denver',
        initials: 'L',
        photoUrl: '/team/lindsey.jpg',
        photoAlt: 'Lindsey profile',
        imageClassName: 'object-top',
        bio: 'Mountain sparkle energy.',
        sortOrder: 3,
        tiktok: 'https://www.tiktok.com/@milehighfizz',
        facebook: '',
        instagram: '',
        website: '',
        youtube: '',
        whatnot: 'https://www.whatnot.com/user/milehighfizz',
        isVisible: false,
      }),
    ).toEqual({
      id: 'member-lindsey',
      displayName: 'Lindsey',
      businessName: 'Mile High Fizz',
      state: 'Colorado',
      city: 'Denver',
      initials: 'L',
      photoUrl: '/team/lindsey.jpg',
      photoAlt: 'Lindsey profile',
      imageClassName: 'object-top',
      bio: 'Mountain sparkle energy.',
      sortOrder: 3,
      links: {
        tiktok: 'https://www.tiktok.com/@milehighfizz',
        whatnot: 'https://www.whatnot.com/user/milehighfizz',
      },
      isVisible: false,
    })
  })

  it('formats the workspace header rep/show label without deriving sync codes from rep ids', () => {
    expect(formatHeaderRepShow('Louis', 'Sparkle by Sasha')).toBe(
      'Louis / Sparkle by Sasha',
    )
    expect(formatHeaderRepShow('', 'Sparkle by Sasha')).toBe('Sparkle by Sasha')
    expect(formatHeaderRepShow(undefined, undefined)).toBe('Rep info loading')
    expect(formatHeaderRepName('Louis')).toBe('Louis')
    expect(formatHeaderRepName(undefined)).toBe('Rep info loading')
    expect(formatHeaderShowName('Sparkle by Sasha')).toBe('Sparkle by Sasha')
    expect(formatHeaderShowName('Louis Chapman', 'Louis Chapman')).toBe(
      'Live show name not set',
    )
    expect(formatHeaderShowName('louis chapman', 'Louis Chapman')).toBe(
      'Live show name not set',
    )
    expect(formatHeaderShowName(undefined, 'Louis Chapman')).toBe(
      'Live show name not set',
    )
    expect(formatHeaderShowName(undefined, 'Louis Chapman', true)).toBe(
      'Live show name loading',
    )
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    expect(source).not.toContain('formatExtensionRepId(')
  })

  it('keeps a compact workspace app header without the duplicate Nic-Nac search', () => {
    const html = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        repIdOverride: 'rep-1',
        publicSiteSlugOverride: 'milehighfizz',
        liveQueueSyncCodeOverride: 'MHF-7342',
      }),
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(html).toContain('Hi there, how can I help you today?')
    expect(html).not.toContain('Ask Nic-Nac anything...')
    expect(html).not.toContain('aria-label="Notifications"')
    expect(html).toContain('Public site')
    expect(html).toContain('yoursparklesuite.com/milehighfizz')
    expect(html).toContain('aria-label="Copy public site address"')
    expect(html).toContain('Live Queue code')
    expect(html).toContain('MHF-7342')
    expect(html).toContain('aria-label="Open Message Center, 4 unread messages"')
    expect(html).toContain('title="Message Center"')
    expect(html).not.toContain('Secret Rep ID Number')
    expect(html).not.toContain('>Rep<')
    expect(html).not.toContain('>Show<')
    expect(html).not.toContain('Rep / show')
    expect(html).not.toContain('Saved here for future extension setup.')
    expect(html).not.toContain('Extension code')
    expect(html).not.toContain('Live Queue sync code')
    expect(css).toContain('.appHeader')
    expect(css).toContain('.appBrand')
    expect(css).toContain('.appHeaderReferences')
    expect(css).toContain('.appHeaderCopyButton')
    expect(css).toContain('.appMessageButton')
    expect(css).toContain('.appMessageBadge')
    expect(css).toContain('.appProfile')
    expect(css).not.toContain('.appSearch')
    expect(css).not.toContain('.appSearchInput')
    expect(css).not.toContain('grid-template-columns: minmax(180px, 0.8fr) minmax(280px, 1.35fr) minmax(220px, 0.9fr);')
  })

  it('renders one friendly Message Center with unified category views', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const messages: WorkspaceMessageSummary[] = [
      {
        id: 'delivery-report',
        deliveryId: 'delivery-report',
        title: 'Your July report',
        summary: 'A quick look at last month and August birthdays.',
        body: [
          { type: 'heading', text: 'Last month at a glance' },
          { type: 'metric', label: 'New customers', value: 8 },
          { type: 'list', items: ['Jamie — August 12', 'Morgan — August 28'] },
        ],
        category: 'monthly_report',
        priority: 'important',
        actionLabel: 'Open customer list',
        actionUrl: '/nic-nac?section=customer-list',
        isRead: false,
        readAt: null,
        archivedAt: null,
        deliveredAt: '2026-08-01T12:00:00.000Z',
      },
      {
        id: 'delivery-video',
        deliveryId: 'delivery-video',
        messageType: 'announcement',
        direction: 'nr_to_rep',
        subject: 'New video resource',
        body: 'Watch the new customer follow-up walkthrough.',
        category: 'video',
        priority: 'normal',
        actionLabel: 'Watch video',
        actionUrl: 'https://www.yoursparklesuite.com/resources/customer-follow-up',
        isRead: true,
        readAt: '2026-08-03T13:00:00.000Z',
        archivedAt: '2026-08-04T13:00:00.000Z',
        createdAt: '2026-08-03T12:00:00.000Z',
      },
    ]
    const html = renderToStaticMarkup(
      createElement(MessagesCenterCard, {
        state: {
          status: 'ready',
          inbox: { unreadCount: 1, messages },
        },
        actionState: { pendingKey: null, error: null, helperMessage: null },
        onUpdatePublication: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Message Center')
    expect(html).toContain('Team conversations, rep connections, Support, and Sparkle Suite updates')
    expect(html).toContain('aria-label="Message Center views"')
    expect(html).toContain('>All<')
    expect(html).toContain('>Team<')
    expect(html).toContain('>Rep Network<')
    expect(html).toContain('>Support<')
    expect(html).toContain('>Sparkle Suite<')
    expect(html).toContain('>Archived<')
    expect(html).toContain('Your July report')
    expect(html).toContain('A quick look at last month and August birthdays.')
    expect(html).toContain('Official update')
    expect(html).toContain('New message')
    expect(html).not.toContain('Backup support request')
    expect(html).not.toContain('Send support request')
    expect(source).not.toContain('create_support_request')
    expect(source).toContain("method: 'PATCH'")
    expect(source).toContain('body: JSON.stringify({ deliveryId, ...patch })')
  })

  it('shows one combined Resources & Help workspace tool', () => {
    const toolsHtml = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        initialSectionOverride: 'more',
      }),
    )
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(toolsHtml).toContain('Resources &amp; Help')
    expect(source).toContain("key: 'resources'")
    expect(source).toContain("activeSection === 'resources'")
    expect(source).toContain("activeSection === 'help-resources'")
    expect(source).toContain('<WorkspaceResourceLibrary />')
  })

  it('opens the combined resource hub on Learn for the Resources deep link', () => {
    const html = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        reviewWorkspaceMode: true,
        initialSectionOverride: 'resources',
      }),
    )

    expect(html).toContain('>Resources<')
    expect(html).toContain('>Learn<')
    expect(html).toContain('>Help<')
    expect(html).toContain('aria-selected="true"')
  })

  it('filters inbox categories and accepts only safe message actions', () => {
    const baseMessage: WorkspaceMessageSummary = {
      id: 'delivery-base',
      messageType: 'announcement',
      direction: 'nr_to_rep',
      subject: 'Update',
      body: 'Update body',
      isRead: true,
      readAt: '2026-08-01T12:00:00.000Z',
      createdAt: '2026-08-01T12:00:00.000Z',
    }
    const messages: WorkspaceMessageSummary[] = [
      { ...baseMessage, id: 'report', category: 'monthly_report', isRead: false },
      { ...baseMessage, id: 'help', category: 'help_update' },
      { ...baseMessage, id: 'blog', category: 'blog' },
      { ...baseMessage, id: 'archived', category: 'video', archivedAt: '2026-08-02T00:00:00.000Z' },
    ]

    expect(filterMessageCenterMessages(messages, 'all').map((message) => message.id)).toEqual([
      'report',
      'help',
      'blog',
    ])
    expect(filterMessageCenterMessages(messages, 'unread').map((message) => message.id)).toEqual([
      'report',
    ])
    expect(filterMessageCenterMessages(messages, 'reports').map((message) => message.id)).toEqual([
      'report',
    ])
    expect(filterMessageCenterMessages(messages, 'updates').map((message) => message.id)).toEqual([
      'help',
    ])
    expect(filterMessageCenterMessages(messages, 'resources').map((message) => message.id)).toEqual([
      'blog',
    ])
    expect(filterMessageCenterMessages(messages, 'archived').map((message) => message.id)).toEqual([
      'archived',
    ])

    expect(getSafeMessageActionUrl('/nic-nac?section=customer-list')).toBe(
      '/nic-nac?section=customer-list',
    )
    expect(getSafeMessageActionUrl('https://www.yoursparklesuite.com/resources')).toBe(
      'https://www.yoursparklesuite.com/resources',
    )
    expect(getSafeMessageActionUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeMessageActionUrl('http://example.com')).toBeNull()
    expect(getSafeMessageActionUrl('//example.com/path')).toBeNull()
  })

  it('keeps the workspace shell on the Morganite Sparkle Suite skin regardless of saved or draft appearance rows', () => {
    expect(getWorkspaceSkinPreset()).toBe('sparkle_suite_morganite')
    expect(
      getWorkspaceSkinPreset({
        ...SITE_SETTINGS_READY_STATE.settings,
        appearancePreset: 'velvet',
      }),
    ).toBe('sparkle_suite_morganite')
    expect(
      getWorkspaceSkinPreset(
        {
          ...SITE_SETTINGS_READY_STATE.settings,
          appearancePreset: 'rose_gold',
        },
        {
          ...SITE_SETTINGS_READY_STATE.settings,
          appearancePreset: 'black_diamond',
        },
      ),
    ).toBe('sparkle_suite_morganite')
    expect(
      getWorkspaceSkinPreset({
        ...SITE_SETTINGS_READY_STATE.settings,
        appearancePreset: 'softGlam' as never,
      }),
    ).toBe('sparkle_suite_morganite')
  })

  it('marks the workspace shell with the normalized site appearance preset', () => {
    const html = renderToStaticMarkup(
      createElement<DashboardPlaceholderProps>(DashboardPlaceholder, {
        initialSiteSettings: {
          ...SITE_SETTINGS_READY_STATE.settings,
          appearancePreset: 'velvet',
        },
      }),
    )

    expect(html).toContain('data-workspace-skin="concept-one"')
    expect(html).toContain('data-customer-site-skin="sparkle_suite_morganite"')
    expect(html).not.toContain('data-nic-nac-skin="velvet"')
  })

  it('keeps workspace skin tokens scoped away from Nic-Nac brand tokens', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const styles = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )

    expect(source).toContain('data-workspace-skin="concept-one"')
    expect(source).toContain('data-customer-site-skin={workspaceSkinPreset}')
    expect(styles).toContain(".main[data-workspace-skin='velvet']")
    expect(styles).toContain('--workspace-accent')
    expect(styles).not.toContain('--nic-nac-accent: #9333EA')
    expect(styles).not.toContain(".main[data-workspace-skin='velvet'] .nic")
  })

  it('refreshes an open live-site preview after saving site settings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('refreshLiveSitePreviewAfterSiteSettingsSave')
    expect(source).toContain("workspacePreview.mode === 'live_site_preview'")
    expect(source).toContain('setPreviewFrameKey((current) => current + 1)')
  })

  it('keeps Black Diamond workspace surfaces readable with dark-theme overrides', () => {
    const dashboardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )
    const shellCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.module.css'),
      'utf8',
    )
    const tabsCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.module.css'),
      'utf8',
    )

    const siteSettingsBaseIndex = dashboardCss.indexOf('.siteSettingsTextarea:focus')
    const blackDiamondSiteSettingsIndex = dashboardCss.lastIndexOf(
      ".main[data-workspace-skin='black_diamond'] .siteSettingsSection",
    )

    expect(blackDiamondSiteSettingsIndex).toBeGreaterThan(
      siteSettingsBaseIndex,
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .topbar",
    )
    expect(shellCss).toContain('--workspace-surface: rgba(255, 255, 255, 0.94);')
    expect(shellCss).toContain(
      ":global([data-workspace-skin='black_diamond']) .tabsWrap",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .timelineItem",
    )
    expect(dashboardCss).not.toContain(
      ".main[data-workspace-skin='black_diamond'] .rosterTag",
    )
    expect(tabsCss).toContain(
      ":global([data-workspace-skin='black_diamond']) .tabActive",
    )
    expect(dashboardCss).not.toContain(
      ".main[data-workspace-skin='black_diamond'] .emptyState",
    )
    expect(dashboardCss).not.toContain(
      ".main[data-workspace-skin='black_diamond'] .searchInput",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .sortSelect",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .siteSettingsTextarea",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .siteSettingsPreviewNote",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .customerSiteLooks",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .accountDetailRow",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .referralCodePanel",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .playbookGroup",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .supportPath",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .supportReportChoice",
    )
    expect(dashboardCss).toContain(
      ".main[data-workspace-skin='black_diamond'] .supportReportTextarea",
    )
    expect(dashboardCss).toContain('#15110f')
    expect(dashboardCss).toContain('#211c18')
    expect(dashboardCss).toContain('color: #f8efe4')
    expect(dashboardCss).toContain('color: #d8cbbd')
  })

  it('uses light utility shell surfaces and avoids espresso-heavy active tabs', () => {
    const dashboardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )
    const shellCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.module.css'),
      'utf8',
    )
    const tabsCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.module.css'),
      'utf8',
    )

    expect(shellCss).toContain('--workspace-shell-bg: #f8f5ff;')
    expect(shellCss).toContain('--workspace-surface: rgba(255, 255, 255, 0.94);')
    expect(shellCss).toContain('--workspace-surface-border: rgba(67, 42, 116, 0.12);')
    expect(shellCss).toContain('--workspace-surface-shadow: 0 16px 44px rgba(48, 30, 92, 0.08);')
    expect(shellCss).toContain('--workspace-tab-active-bg: #fff0f8;')
    expect(shellCss).toContain('bottom: 0;')
    expect(shellCss).toContain('env(safe-area-inset-bottom)')
    expect(shellCss).toContain('border-radius: 24px;')
    expect(shellCss).toContain('backdrop-filter: blur(18px);')
    expect(tabsCss).not.toContain('linear-gradient(145deg, #402924 0%, #36221d 100%)')
    expect(tabsCss).toContain('min-height: 54px;')
    expect(tabsCss).toContain('background: transparent;')
    expect(tabsCss).toContain('justify-content: space-around;')
    expect(tabsCss).toContain('scroll-snap-align: start;')
    expect(dashboardCss).toContain('.workspacePanel,')
    expect(dashboardCss).toContain('.librarySearchCard {')
    expect(dashboardCss).toContain(
      'linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(255, 250, 247, 0.90));',
    )
    expect(dashboardCss).toContain('border: 1px solid rgba(64, 41, 36, 0.10);')
    expect(dashboardCss).not.toContain(
      'linear-gradient(145deg, #402924 0%, #36221d 100%);',
    )
    expect(dashboardCss).toContain(".main[data-workspace-skin='black_diamond'] :where(")
  })

  it('ships a mobile-first workspace bottom nav treatment for the section rail', () => {
    const tabsSource = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.tsx'),
      'utf8',
    )
    const tabsCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.module.css'),
      'utf8',
    )

    expect(tabsSource).toContain('role="tablist"')
    expect(tabsSource).toContain('aria-label="Workspace sections"')
    expect(tabsSource).toContain('role="tab"')
    expect(tabsSource).toContain('aria-selected={active}')
    expect(tabsSource).toContain('tabIndex={active ? 0 : -1}')
    expect(tabsSource).toContain('tab.shortLabel')
    expect(tabsSource).not.toContain('workspaceNavStatusTag')
    expect(tabsSource).not.toContain('tab.subtitle')
    expect(tabsSource).not.toContain('subtitle: string')
    expect(tabsCss).toContain('scroll-snap-type: x proximity;')
    expect(tabsCss).toContain('overscroll-behavior-x: contain;')
    expect(tabsCss).toContain('border-radius: 18px;')
    expect(tabsCss).toContain('min-height: 54px;')
    expect(tabsCss).not.toContain('min-height: 58px;')
    expect(tabsCss).toContain('.tabs::-webkit-scrollbar')
    expect(tabsCss).toContain('.labelShort')
  })

  it('keeps the extracted dance floor surfaces light instead of reverting to espresso-heavy cards', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/TradeBoardWorkspaceCard.module.css',
      ),
      'utf8',
    )

    expect(css).toContain('.heroCard')
    expect(css).toContain('.summaryCard')
    expect(css).toContain('.sectionCard')
    expect(css).toContain('linear-gradient(180deg, rgba(255, 255, 255')
    expect(css).toContain('box-shadow:')
    expect(css).not.toContain('linear-gradient(145deg, #402924 0%, #36221d 100%)')
    expect(css).not.toContain('rgba(32, 24, 20, 0.96)')
    expect(css).not.toContain('rgba(21, 17, 15, 0.94)')
  })

  it('keeps the workspace Nic-Nac glyph backed by the shared mark', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/NicNacGlyph.tsx'),
      'utf8',
    )

    expect(source).toContain("from '@/app/_components/nic-nac-mark'")
    expect(source).toContain('NicNacMark')
  })

  it('uses compact shared workspace marks instead of an oversized fake Nic-Nac hero logo', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(source).toContain('styles.nicNacHeroBadge')
    expect(source).not.toContain('styles.nicNacHeroMark')
    expect(css).toContain('.nicNacHeroBadge')
    expect(css).toContain('background: #e2198f;')
    expect(css).not.toContain('.nicNacHeroMark')
  })

  it('uses a compact two-line Sparkle Suite workspace brand in the app header', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(source).toContain('styles.appBrandText')
    expect(source).toContain('styles.appBrandName')
    expect(source).toContain('styles.appBrandSubtitle')
    expect(source).toContain('Workspace')
    expect(source).not.toContain('styles.appSearch')
    expect(css).toContain('.appBrandSeal')
    expect(css).toContain('.appBrandSubtitle')
  })

  it('wires idle refresh hooks for the trade workspace', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('TRADE_WORKSPACE_REFRESH_MS')
    expect(source).toContain("activeSection !== 'trade-board'")
    expect(source).toContain("document.addEventListener('visibilitychange'")
    expect(source).toContain("window.addEventListener('focus'")
    expect(source).toContain('window.setInterval(')
    expect(source).toContain('refreshIfTradeBoardActive')
  })

  it('wires Nic-Nac mutation refresh events into the workspace views', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('NIC_NAC_WORKSPACE_REFRESH_EVENT')
    expect(source).toContain('refreshAfterNicNacMutation')
    expect(source).toContain("topic === 'trade'")
    expect(source).toContain("topic === 'site'")
    expect(source).toContain("topic === 'calendar'")
    expect(source).toContain('void refreshTradeWorkspace()')
    expect(source).toContain('void loadCalendar().catch')
    expect(source).toContain('/api/nic-nac/calendar-summary?upcoming=180&history=60')
    expect(source).toContain("topic === 'site' && activeSection === 'recipes'")
    expect(source).toContain('void loadSiteRecipes(undefined, {')
    expect(source).toContain('preferredRecipeId: selectedRecipeId')
    expect(source).toContain('Unable to refresh site recipes right now.')
    expect(source).toContain('setPreviewFrameKey')
    expect(source).toContain('window.addEventListener(')
    expect(source).toContain('NIC_NAC_WORKSPACE_REFRESH_EVENT')
    expect(source).not.toContain("if (activeSection !== 'trade-board') return\n\n    const refreshAfterNicNacMutation")
  })

  it('keeps customer board previews inside the Nic-Nac workspace shell', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('type WorkspacePreviewState')
    expect(source).not.toContain('handleOpenLiveSitePreview')
    expect(source).toContain('handleOpenTradeBoardPreview')
    expect(source).toContain('workspacePreview.mode === \'live_site_preview\'')
    expect(source).toContain('Live Site Preview')
    expect(source).toContain('Back to workspace')
    expect(source).not.toContain('Refresh preview')
    expect(source).toContain('<iframe')
    expect(source).toContain('title="Sparkle Suite live site preview"')
    expect(source).not.toContain('Preview site')
    expect(source).not.toContain('Sparkle with us.')
    expect(source).not.toContain('href={customerSparkleSiteHref}\n              target="_blank"')
  })

  it('provides a consistent back path for primary and nested tool sections', () => {
    expect(getWorkspaceBackDestination('home')).toBeNull()
    expect(getWorkspaceBackDestination('trade-board')).toEqual({
      section: 'home',
      label: 'Nic-Nac',
    })
    expect(getWorkspaceBackDestination('more')).toEqual({
      section: 'home',
      label: 'Nic-Nac',
    })
    expect(getWorkspaceBackDestination('collection-intake')).toEqual({
      section: 'more',
      label: 'Tools',
    })
    expect(getWorkspaceBackDestination('jewelry-library')).toEqual({
      section: 'more',
      label: 'Tools',
    })
    expect(getWorkspaceBackDestination('live-queue')).toEqual({
      section: 'more',
      label: 'Tools',
    })
    expect(getWorkspaceBackDestination('account')).toEqual({
      section: 'more',
      label: 'Tools',
    })
  })

  it('keeps the live preview focused on the site with two centered actions', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(source).toContain('styles.previewWorkbench')
    expect(source).toContain('desktopChat')
    expect(source).toContain('Open full site')
    expect(source).toContain('Back to workspace')
    expect(source).not.toContain('Open Nic-Nac')
    expect(source).not.toContain('Close Nic-Nac')
    expect(source).not.toContain('Refresh preview')
    expect(source).not.toContain('aria-controls="nic-nac-workspace-chat"')
    expect(source).not.toContain('previewNicNacOpen')
    expect(source).not.toContain('showPreviewNicNacSidecar')
    expect(source).not.toContain('onOpenNicNac')
    expect(css).toContain('.previewFocusActions')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(150px, 1fr));')
    expect(css).toContain('.previewAction')
    expect(css).toContain('min-height: 44px;')
    expect(css).not.toContain('.previewAction:nth-child(2)')
    expect(css).toContain('.previewWorkbench')
    expect(css).not.toContain('.previewWorkbenchWithSidecar')
    expect(css).not.toContain('.previewNicNacSidecar')
    expect(css).not.toContain('.previewNicNacDrawerToggle')
  })

  it('keeps live site focus preview available on narrow workspaces', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(source).toContain('styles.previewFocusFrame')
    expect(source).toContain('Open full site')
    expect(source).not.toContain('LIVE_SITE_PREVIEW_MIN_WIDTH_QUERY')
    expect(source).not.toContain('canUseEmbeddedLiveSitePreview')
    expect(source).not.toContain('Use a wider screen to preview and edit the live site with Nic-Nac side by side.')
    expect(css).not.toMatch(/\.previewFrame\s*{[^}]*display:\s*none/s)
    expect(css).toContain('min-height: 68vh')
  })

  it('renders board inventory piece cards after active search with a customer preview link', () => {
    const html = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: TRADE_BOARD_READY_STATE,
        tradeRequestsState: { status: 'ready', requests: [] },
        fulfillmentQueueState: { status: 'ready', items: [] },
        tradeBoardSearchQuery: 'RG',
        onTradeBoardSearchQueryChange: () => {},
        quickAddItemNumber: '',
        onQuickAddItemNumberChange: () => {},
        actionState: { pendingKey: null, error: null, helperMessage: null },
        onQuickAddListing: () => {},
        onRemoveListing: () => {},
        onApproveRequest: () => {},
        onRejectRequest: () => {},
        onAdvanceFulfillment: () => {},
        customerBoardHref: '/amethyst/Trade.html?c=rep-1',
      }),
    )

    expect(html).toContain('Customer view')
    expect(html).toContain('href="/amethyst/Trade.html?c=rep-1"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('src="https://cdn.example.com/sapphire-halo.jpg"')
    expect(html).toContain('Open image preview for Sapphire Halo')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Filtered active dancers"')
    expect(html).toContain('alt="Sapphire Halo"')
    expect(html).toContain('Sapphire Halo')
    expect(html).toContain('RG100 · Sterling · Sapphire')
    expect(html).toContain('Showing 1-1 of 1')
    expect(html).toContain('Remove')
    expect(html).toContain('Reset')
    expect(html).not.toContain('Rose Quartz Stack')
  })

  it('keeps board inventory quiet by default while still showing browse filters', () => {
    const html = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: TRADE_BOARD_READY_STATE,
        tradeRequestsState: { status: 'ready', requests: [] },
        fulfillmentQueueState: { status: 'ready', items: [] },
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

    expect(getTradeBoardSectionLabels(html)).toEqual([
      'Dance Floor',
      "Today's trade work",
      'Quick add',
      'Browse dancers',
    ])
    expect(html).toContain('Jewelry Type')
    expect(html).toContain('Collection')
    expect(html).toContain(
      'Everything is caught up. New requests, trade follow-up, and fulfillment work will land here.',
    )
    expect(html).toContain('Know the item number? Add a dancer in one step.')
    expect(html).toContain(
      'Start with search. Open filters only when you need a tighter match.',
    )
    expect(html).toContain('More filters')
    expect(html).toContain(
      'Search by item number, design, or collection to pull up a live dancer fast.',
    )
    expect(html).not.toContain('Default landing section')
    expect(html).not.toContain('Request inbox')
    expect(html).not.toContain('Trade follow-up')
    expect(html).not.toContain('Fulfillment queue')
    expect(html).not.toContain('Load more')
    expect(html).not.toContain('Loading board pieces...')
  })

  it('renders trade follow-up items in the Dance Floor workspace', () => {
    const html = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: TRADE_BOARD_READY_STATE,
        tradeRequestsState: { status: 'ready', requests: [] },
        fulfillmentQueueState: { status: 'ready', items: [] },
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

    expect(html).toContain('Trade follow-up')
    expect(html).toContain('1 to finish')
    expect(html).toContain(
      'Approved trades stay here until the missing ring size or catalog details are finished.',
    )
    expect(html).toContain('Revealed item number: ER00001')
    expect(html).toContain(
      'Finish catalog details after the show to put this reveal back on the Dance Floor.',
    )
  })

  it('routes trade-board approve and reject actions through the dashboard decision handler', () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const handleTradeRequestDecision = vi.fn()
    const handlers = createTradeRequestDecisionHandlers(handleTradeRequestDecision)

    expect(dashboardSource).toContain('/api/nic-nac/trade-swap-cleanup')
    expect(dashboardSource).toMatch(
      /const tradeRequestDecisionHandlers = createTradeRequestDecisionHandlers\(\s*handleTradeRequestDecision,\s*\)/,
    )
    expect(dashboardSource).toContain(
      'onApproveRequest={tradeRequestDecisionHandlers.onApproveRequest}',
    )
    expect(dashboardSource).toContain(
      'onRejectRequest={tradeRequestDecisionHandlers.onRejectRequest}',
    )
    handlers.onApproveRequest('request-1', {
      revealedItemNumber: 'RG200',
      revealedRingSize: '8',
    })
    handlers.onRejectRequest('request-2')

    expect(handleTradeRequestDecision).toHaveBeenNthCalledWith(1, 'request-1', 'approve', {
      revealedItemNumber: 'RG200',
      revealedRingSize: '8',
    })
    expect(handleTradeRequestDecision).toHaveBeenNthCalledWith(
      2,
      'request-2',
      'reject',
    )
    expect(dashboardSource).toContain(
      'Trade approved. Added the revealed dancer back to your Dance Floor.',
    )
    expect(dashboardSource).toContain(
      'I saved the item number to this swap; finish the catalog details after the show.',
    )
    expect(dashboardSource).toContain(
      'Trade approved. Add the revealed dancer later with Nic-Nac when you are ready.',
    )
  })

  it('does not render the retired trade-history Top design metric', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).not.toContain('Top design')
    expect(source).not.toContain('topDesign')
  })

  it('builds active dance floor fetch URLs with limit and offset', () => {
    expect(buildTradeBoardFetchUrl()).toBe(
      '/api/nic-nac/trade-board?status=available&limit=12',
    )
    expect(buildTradeBoardFetchUrl({ offset: 24 })).toBe(
      '/api/nic-nac/trade-board?status=available&limit=12&offset=24',
    )
  })

  it('keeps removed listings out of the active dance floor cards', () => {
    const html = renderToStaticMarkup(
      createElement(TradeBoardWorkspaceCard, {
        tradeBoardState: {
          status: 'ready',
          board: {
            ...TRADE_BOARD_READY_STATE.board,
            listings: [
              ...TRADE_BOARD_READY_STATE.board.listings,
              {
                ...TRADE_BOARD_READY_STATE.board.listings[0],
                id: 'listing-removed',
                status: 'removed' as const,
                design: {
                  ...TRADE_BOARD_READY_STATE.board.listings[0].design,
                  item_number: 'RG999',
                  design_name: 'Removed Clutter Piece',
                },
              },
            ],
          },
        },
        tradeRequestsState: { status: 'ready', requests: [] },
        fulfillmentQueueState: { status: 'ready', items: [] },
        tradeBoardSearchQuery: 'RG',
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

    expect(html).not.toContain('Removed Clutter Piece')
    expect(html).not.toContain('RG999')
  })

  it('builds the rep customer-facing Sparkle Suite homepage link', () => {
    expect(buildCustomerSparkleSiteHref()).toBe('/amethyst/Homepage.html')
    expect(buildCustomerSparkleSiteHref('rep-1')).toBe(
      '/amethyst/Homepage.html?c=rep-1',
    )
  })

  it('allows required setup review mode to preview the claimed public show link', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('publicSiteSlugOverride?: string | null')
    expect(source).toContain('publicSiteSlug: publicSiteSlugOverride ?? null')
    expect(source).toContain(
      'publicSiteSlug: publicSiteSlugOverride ?? repProfileState.publicSiteSlug',
    )
  })

  it('filters the roster down to opted-out customers', () => {
    expect(filterRosterCustomers(READY_STATE.customers, 'opted_out')).toEqual([
      READY_STATE.customers[1],
    ])
  })

  it('searches the roster across name, phone, and email', () => {
    expect(searchRosterCustomers(READY_STATE.customers, 'jamie')).toEqual([
      READY_STATE.customers[0],
    ])
    expect(searchRosterCustomers(READY_STATE.customers, '55550102')).toEqual([
      READY_STATE.customers[1],
    ])
    expect(searchRosterCustomers(READY_STATE.customers, 'taylor@example')).toEqual([
      READY_STATE.customers[2],
    ])
  })

  it('parses CSV contact imports without sending blank columns as profile updates', async () => {
    const contacts = await parseCustomerImportFile(
      new File([
        'Name,Email,Favorite Material,Birthday,Tags\nJamie Lane,jamie@example.com,Silver,10/12/1990,"VIP, local"',
      ], 'customers.csv', { type: 'text/csv' }),
    )

    expect(contacts).toEqual([
      {
        name: 'Jamie Lane',
        email: 'jamie@example.com',
        favoriteMaterial: 'Silver',
        birthday: '10-12',
        tags: ['VIP', 'local'],
      },
    ])
  })

  it('sorts the roster by dates, names, and saved customer preferences', () => {
    expect(
      sortRosterCustomers(READY_STATE.customers, 'newest').map((customer) => customer.id),
    ).toEqual(['aud-1', 'aud-2', 'aud-3'])
    expect(
      sortRosterCustomers(READY_STATE.customers, 'oldest').map((customer) => customer.id),
    ).toEqual(['aud-3', 'aud-2', 'aud-1'])
    expect(
      sortRosterCustomers(READY_STATE.customers, 'name_asc').map((customer) => customer.id),
    ).toEqual(['aud-1', 'aud-2', 'aud-3'])
    expect(
      sortRosterCustomers(READY_STATE.customers, 'birthday_asc').map((customer) => customer.id),
    ).toEqual(['aud-2', 'aud-1', 'aud-3'])
    expect(
      sortRosterCustomers(READY_STATE.customers, 'favorite_material').map((customer) => customer.id),
    ).toEqual(['aud-2', 'aud-1', 'aud-3'])
  })

  it('renders a useful customer roster with statuses and contact details', () => {
    const html = renderToStaticMarkup(
      createElement(CustomerRosterCard, {
        state: READY_STATE,
        activeFilter: 'all',
        onFilterChange: () => {},
        searchQuery: '',
        sortOrder: 'newest',
        activeComposerAudienceId: 'aud-1',
        composerSubject: 'Your order is ready',
        composerBody: 'Pickup is available now.',
      }),
    )

    expect(html).toContain('Filter roster')
    expect(html).toContain('Customer List')
    expect(html).toContain('Add customer')
    expect(html).toContain('Download full list (CSV)')
    expect(html).toContain('/api/nic-nac/customer-audience?format=csv')
    expect(html).toContain('Search customers')
    expect(html).toContain('Sort roster')
    expect(html).toContain('Newest first')
    expect(html).toContain('Birthday (month and day)')
    expect(html).toContain('Favorite collection A-Z')
    expect(html).toContain('Copy visible SMS')
    expect(html).toContain('Copy visible emails')
    expect(html).toContain('Jamie Lane')
    expect(html).toContain('+15555550101')
    expect(html).toContain('jamie@example.com')
    expect(html).toContain('SMS opted in')
    expect(html).toContain('Email reachable')
    expect(html).toContain('STOP received')
    expect(html).toContain('Joined 2026-05-05')
    expect(html).toContain('Unsubscribe SMS')
    expect(html).toContain('Unsubscribe email')
    expect(html).toContain('Edit details')
    expect(html).toContain('Email customer')
    expect(html).toContain('Open signup form')
    expect(html).toContain('Copy signup link')
    expect(html).toContain('Fresh consent must come from the customer.')
    expect(html).toContain('SMS status')
    expect(html).toContain('Email status')
    expect(html).toContain('Favorite gem or stone')
    expect(html).toContain('Opal')
    expect(html).toContain('Favorite material')
    expect(html).toContain('Silver')
    expect(html).toContain('SMS opted in')
    expect(html).toContain('Opted out')
    expect(html).toContain('Consent captured 2026-05-04')
    expect(html).toContain('STOP received 2026-05-05')
    expect(html).toContain('Email subject')
    expect(html).toContain('Email message')
    expect(html).toContain('Send email')
    expect(html).toContain('Cancel')
  })

  it('shows an empty message when a filter has no matching customers', () => {
    const html = renderToStaticMarkup(
      createElement(CustomerRosterCard, {
        state: READY_STATE,
        activeFilter: 'email_reachable',
        onFilterChange: () => {},
        customersOverride: [],
        searchQuery: 'nobody',
        sortOrder: 'newest',
      }),
    )

    expect(html).toContain('No customers match this filter yet.')
  })

  it('only offers unsubscribe actions for channels that are still active', () => {
    expect(getCustomerActions(READY_STATE.customers[0])).toEqual([
      { channel: 'sms', label: 'Unsubscribe SMS' },
      { channel: 'email', label: 'Unsubscribe email' },
    ])
    expect(getCustomerActions(READY_STATE.customers[1])).toEqual([])
    expect(getCustomerActions(READY_STATE.customers[2])).toEqual([
      { channel: 'email', label: 'Unsubscribe email' },
    ])
  })

  it('only offers email outreach actions for customers who can still receive email', () => {
    expect(getCustomerOutreachActions(READY_STATE.customers[0])).toEqual([
      { kind: 'email', label: 'Email customer' },
    ])
    expect(getCustomerOutreachActions(READY_STATE.customers[1])).toEqual([])
    expect(getCustomerOutreachActions(READY_STATE.customers[2])).toEqual([
      { kind: 'email', label: 'Email customer' },
    ])
  })

  it('flags customers who need a fresh opt-in helper', () => {
    expect(needsFreshOptIn(READY_STATE.customers[0])).toBe(false)
    expect(needsFreshOptIn(READY_STATE.customers[1])).toBe(true)
    expect(getCustomerRecoveryActions(READY_STATE.customers[1])).toEqual([
      { kind: 'open_signup', label: 'Open signup form' },
      { kind: 'copy_signup', label: 'Copy signup link' },
    ])
  })

  it('derives clear per-channel statuses and timeline entries', () => {
    expect(getCustomerChannelStatuses(READY_STATE.customers[0])).toEqual({
      sms: 'SMS opted in',
      email: 'Reachable',
    })
    expect(getCustomerChannelStatuses(READY_STATE.customers[1])).toEqual({
      sms: 'Opted out',
      email: 'No consent',
    })
    expect(getCustomerChannelStatuses(READY_STATE.customers[2])).toEqual({
      sms: 'No consent',
      email: 'Reachable',
    })

    expect(getCustomerTimeline(READY_STATE.customers[1])).toEqual([
      'Consent captured 2026-05-04',
      'STOP received 2026-05-05',
    ])
  })

  it('derives export-ready visible contacts by channel', () => {
    expect(getVisibleContactValues(READY_STATE.customers, 'sms')).toEqual([
      '+15555550101',
    ])
    expect(getVisibleContactValues(READY_STATE.customers, 'email')).toEqual([
      'jamie@example.com',
      'taylor@example.com',
    ])
  })

  it('flags likely duplicate audience rows by shared phone or email', () => {
    expect(
      getCustomerDuplicateSummary(DUPLICATE_CUSTOMERS[0], DUPLICATE_CUSTOMERS),
    ).toBe('Possible duplicate: shares phone or email with 1 other record.')

    const html = renderToStaticMarkup(
      createElement(CustomerRosterCard, {
        state: {
          ...READY_STATE,
          customers: DUPLICATE_CUSTOMERS,
        },
        activeFilter: 'all',
        onFilterChange: () => {},
        searchQuery: '',
        sortOrder: 'newest',
      }),
    )

    expect(html).toContain('Possible duplicate')
    expect(html).toContain('shares phone or email with 1 other record')
  })

  it('renders a wallet summary card with balance, recharge status, and recent transactions', () => {
    const html = renderToStaticMarkup(
      createElement(WalletSummaryCard, {
        state: WALLET_READY_STATE,
        statusMessage: null,
        autoRechargeDraft: getAutoRechargeDraft(WALLET_READY_STATE.summary),
      }),
    )

    expect(html).toContain('Current balance')
    expect(html).toContain('SMS Wallet')
    expect(html).toContain('Monitor text balance, reloads, and auto-recharge')
    expect(html).toContain('$24.99')
    expect(html).toContain('Texts left')
    expect(html).toContain('2776')
    expect(html).toContain('Tracked texts this month')
    expect(html).toContain('7')
    expect(html).toContain('SMS spend')
    expect(html).toContain('$0.06')
    expect(html).toContain('Auto-recharge on')
    expect(html).toContain('Threshold $5.00')
    expect(html).toContain('Reload $25.00')
    expect(html).toContain('Load $25')
    expect(html).toContain('Load $50')
    expect(html).toContain('Load $100')
    expect(html).toContain('Wallet load')
    expect(html).toContain('Auto-recharge settings')
    expect(html).toContain('Enable auto-recharge')
    expect(html).toContain('Threshold trigger')
    expect(html).toContain('Reload amount')
    expect(html).toContain('Save settings')
    expect(html).toContain('Billing reference')
    expect(html).toContain('Approved SMS sends cost $0.009')
    expect(html).toContain('Minimum wallet load is $25.00')
    expect(html).toContain('Reload history')
  })

  it('maps recipe drafts to line-based save payloads for Nic-Nac recipe editing', () => {
    const draft = getRecipeDraft(RECIPES_READY_STATE.recipes[0])

    expect(draft.ingredientsText).toBe('Chicken\nCream cheese\nRanch')
    expect(draft.stepsText).toBe('Mix everything\nBake until bubbly')
    expect(getRecipeDraftSavePayload({
      ...draft,
      servings: '8',
      ingredientsText: 'Chicken\n\n Cream cheese ',
      stepsText: 'Mix\n Bake ',
    })).toMatchObject({
      id: 'recipe-1',
      title: 'Bling Kitchen Chicken Dip',
      slug: 'bling-kitchen-chicken-dip',
      servings: 8,
      ingredients: ['Chicken', 'Cream cheese'],
      steps: ['Mix', 'Bake'],
      isVisible: true,
    })
    expect(
      getRecipeSaveStatusText({
        pendingKey: 'save',
        error: null,
        helperMessage: null,
      }),
    ).toBe('Saving recipe changes...')
  })

  it('renders the Recipes manager with presentation and multi-photo recipe sources', () => {
    const html = renderToStaticMarkup(
      createElement(RecipesCard, {
        state: RECIPES_READY_STATE,
        draft: {
          ...getRecipeDraft(RECIPES_READY_STATE.recipes[0]),
          recipeCardImageUrls: ['https://cdn.example.com/chicken-card.jpg'],
        },
        actionState: {
          pendingKey: null,
          error: null,
          helperMessage: 'Recipe saved.',
        },
        statusMessage: 'Recipe saved.',
        initialTab: 'upload',
      }),
    )

    expect(html).toContain('Recipes')
    expect(html).toContain('Current recipes')
    expect(html).toContain('Upload new recipe')
    expect(html).not.toContain('Edit current recipes')
    expect(html).not.toContain('Pantry order')
    expect(html).not.toContain('Add recipe')
    expect(html).toContain('Bling Kitchen Chicken Dip')
    expect(html).toContain('Recipe editor')
    expect(html).toContain('Category')
    expect(html).toContain('Choose a category')
    expect(html).toContain('Drinks &amp; Extras')
    expect(html).toContain('Prep time')
    expect(html).toContain('Servings')
    expect(html).toContain('Outside food photo for Pantry card')
    expect(html).toContain('Inside food photo for recipe view')
    expect(html).toContain('Uploaded to Sparkle storage')
    expect(html).toContain('Recipe-source photos')
    expect(html).toContain('Upload recipe source')
    expect(html).toContain('Read and format recipe')
    expect(html).toContain('Recipe Preview')
    expect(html).not.toContain('Advanced edit')
    expect(html).toContain('Visible in Pantry')
    expect(html).toContain('Chicken')
    expect(html).toContain('Bake until bubbly')
    expect(html).toContain('https://cdn.example.com/chicken-card.jpg')
    expect(html).toContain('Replace photo')
    expect(html).toContain('Remove photo')
    expect(html).not.toContain('Upload image')
    expect(html).not.toContain('Choose a recipe to edit')
    expect(html).not.toContain('TikTok URL')
    expect(html).toContain('Save to live site')
    expect(html.match(/Save to live site/g)).toHaveLength(1)
    expect(html.indexOf('recipes-read-and-format-button')).toBeLessThan(
      html.indexOf('recipes-save-live-button'),
    )
    expect(html).not.toContain('Remove recipe')
    expect(html).toContain('data-testid="recipes-save-status"')
  })

  it('renders the existing-recipe editor with its current photos and narrative fields', () => {
    const html = renderToStaticMarkup(
      createElement(RecipesCard, {
        state: RECIPES_READY_STATE,
        draft: getRecipeDraft(RECIPES_READY_STATE.recipes[0]),
        initialEditorMode: 'manual',
        actionState: {
          pendingKey: null,
          error: null,
          helperMessage: null,
        },
      }),
    )

    expect(html).toContain('Recipe editor')
    expect(html).toContain('Current recipes')
    expect(html).toContain('Upload new recipe')
    expect(html).not.toContain('Edit current recipes')
    expect(html).toContain('Back to current recipes')
    expect(html).toContain('Editing Bling Kitchen Chicken Dip')
    expect(html).not.toContain('Hidden Draft Dessert')
    expect(html).toContain('Title')
    expect(html).toContain('Category')
    expect(html).toContain('Prep time')
    expect(html).toContain('Servings')
    expect(html).toContain('Slug')
    expect(html).toContain('Visible in Pantry')
    expect(html).toContain('Description')
    expect(html).toContain('Ingredients')
    expect(html).toContain('Steps')
    expect(html).toContain('Note')
    expect(html).toContain('Image alt text')
    expect(html).toContain('Card crop position')
    expect(html).toContain('Modal crop position')
    expect(html).toContain('TikTok URL')
    expect(html).toContain('Outside food photo for Pantry card')
    expect(html).toContain('Inside food photo for recipe view')
    expect(html).toContain('Recipe-source photos')
    expect(html).toContain('https://cdn.example.com/chicken-card.jpg')
    expect(html).toContain('Read source photos and replace details')
    expect(html).toContain('rebuild this draft before you save it to the Pantry')
    expect(html).toContain('Save to live site')
    expect(html.match(/Save to live site/g)).toHaveLength(1)
    expect(html.indexOf('recipes-read-and-format-button')).toBeLessThan(
      html.indexOf('recipes-save-live-button'),
    )
    expect(html).toContain('Remove recipe')
    expect(html).not.toContain('Yes, remove recipe')
    expect(html).not.toContain('Advanced edit')
    expect(html).not.toContain('New manual recipe')
    expect(html).not.toContain('Recipe Preview')
    expect(html).not.toContain('Build recipe with Nic-Nac')
  })

  it('lets the workspace return an open recipe editor to current recipes', () => {
    const html = renderToStaticMarkup(
      createElement(RecipesCard, {
        state: RECIPES_READY_STATE,
        draft: getRecipeDraft(RECIPES_READY_STATE.recipes[0]),
        initialEditorMode: 'manual',
        activeTab: 'current',
      }),
    )

    expect(html).toContain('Recipes on your site')
    expect(html).toContain('Edit this recipe')
    expect(html).not.toContain('Editing Bling Kitchen Chicken Dip')
  })

  it('renders a current-recipes view that opens each recipe for editing', () => {
    const html = renderToStaticMarkup(
      createElement(RecipesCard, {
        state: RECIPES_READY_STATE,
        draft: getRecipeDraft(),
        initialTab: 'current',
      }),
    )

    expect(html).toContain('Recipes on your site')
    expect(html).toContain('Choose a recipe to review its current photo and story')
    expect(html).toContain('Bling Kitchen Chicken Dip')
    expect(html).toContain('Hidden Draft Dessert')
    expect(html).toContain('Edit this recipe')
    expect(html.match(/Edit this recipe/g)).toHaveLength(2)
    expect(html).toContain('Audited')
    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).not.toContain('Edit current recipes')
  })

  it('renders the site settings card with profile, copy, and social controls', () => {
    const html = renderToStaticMarkup(
      createElement(SiteSettingsCard, {
        state: SITE_SETTINGS_READY_STATE,
        draft: SITE_SETTINGS_READY_STATE.settings,
        hasUnsavedChanges: false,
        statusMessage: 'No unsaved changes.',
      }),
    )
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(html).toContain('Profile basics')
    expect(html).toContain('Display name')
    expect(html).toContain('Show name')
    expect(html).toContain('Bomb Party rep store link')
    expect(html).toContain('This powers the Shop buttons across your customer-facing site.')
    expect(html).not.toContain('Business name')
    expect(html).not.toContain('Phone</span>')
    expect(html).toContain('Announcement ticker and Join Team page')
    expect(html).not.toContain('Banner and ticker')
    expect(html).not.toContain('Banner text')
    expect(html).not.toContain('Banner visible')
    expect(html).toContain('Announcement ticker messages')
    expect(html).not.toContain('Hero image URL')
    expect(html).toContain('Hero motion')
    expect(html).toContain('Hero title')
    expect(html).toContain('Hero subtitle')
    expect(html).toContain('Site tagline')
    expect(html).toContain('Sparkle rise')
    expect(html).toContain('Soft glow')
    expect(html).toContain('Still')
    expect(html).toContain('Customer-facing site theme')
    expect(html).not.toContain('Customer Site Looks')
    expect(html).not.toContain('Morganite is locked in for every Sparkle Suite workspace and Amethyst customer site.')
    expect(html).not.toContain('Reference polished customer-site looks')
    expect(html).not.toContain('Recommended first picks')
    expect(html).not.toContain('Full skin gallery')
    expect(html).not.toContain('Site template')
    expect(html).toContain('Amethyst')
    expect(html).toContain('Sparkle Suite/Morganite')
    expect(html).toContain('Black Diamond')
    expect(html).toContain('Rose Gold')
    expect(html).toContain('Garnet')
    expect(html).toContain('Amber')
    expect(html).toContain('Velvet')
    expect(html).toContain('Rose Quartz')
    expect(html).not.toContain('Editorial')
    expect(html).not.toContain('Soft Glam')
    expect(html).not.toContain('Sparkle Party')
    expect(html).not.toContain('Maximum')
    expect(html).toContain(
      'Applies only to your public customer-facing site.',
    )
    expect(html).toContain('Join Team: Coming soon.')
    expect(html).not.toContain('Show the “Join My Team” recruiting page on your public site')
    expect(html).toContain('Announcement ticker messages')
    expect(html).toContain('Use one announcement per line. Add emojis, then highlight only the words you want to link.')
    expect(html).toContain('Add an emoji')
    expect(html).toContain('Link selected words')
    expect(html).toContain('Highlight the exact words in your announcement first.')
    expect(html).toContain('Paste the destination link')
    expect(source).toContain('linkSelectedTickerWords')
    expect(source).toContain('First highlight the exact words you want customers to click.')
    expect(source).toContain('makeTickerLinksPlainText')
    expect(source).toContain('Make existing links plain text')
    expect(html).toContain('Homepage photos and videos')
    expect(html).toContain('About section narrative')
    expect(html).toContain('Build this with Nic-Nac: share your story')
    expect(html).toContain('publishes the approved narrative directly to your customer-facing site.')
    expect(html).toContain('Write with Nic-Nac')
    expect(html).not.toContain('Your saved About narrative will appear here.')
    expect(html).toContain('Showcase video')
    expect(html).toContain('About portrait photo')
    expect(html).toContain('About short video 1')
    expect(html).toContain('About short video 3')
    expect(html.match(/Video link or embed/g)).toHaveLength(4)
    expect(html.match(/Upload photo/g)).toHaveLength(1)
    expect(html).toContain('Video links and embeds')
    expect(html).not.toContain('<summary>')
    expect(html).toContain('public TikTok, YouTube Short, Instagram Reel, or Facebook Reel/video')
    expect(html).toContain('TikTok and YouTube play muted, loop, and do not show a pause control.')
    expect(html).toContain('Instagram')
    expect(html).toContain('Facebook')
    expect(html).toContain('Customer-facing site setup')
    expect(html).toContain('Save site settings')
    expect(html).toContain('Preview customer site')
    expect(html).toContain('No unsaved changes.')
    expect(html).toContain('data-testid="site-settings-save-status"')
    expect(html).not.toContain('Brittany custom media')
  })

  it('renders Brittany custom media controls without removing standard theme controls', () => {
    const settings = {
      ...SITE_SETTINGS_READY_STATE.settings,
      appearancePreset: 'black_diamond' as const,
      homepageMediaSlots: [
        {
          key: 'showcase' as const,
          caption: '',
          imageUrl: '',
          videoUrl: 'https://www.tiktok.com/@brittwithbling/photo/7680907837425388814',
        },
        { key: 'about_1' as const, caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_2' as const, caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_3' as const, caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_4' as const, caption: '', imageUrl: '', videoUrl: '' },
      ],
    }
    const draft = getSiteSettingsDraft(settings, { isBrittWithBling: true })
    expect(
      draft.homepageMediaSlots?.find((slot) => slot.key === 'about_1')
        ?.sectionVisible,
    ).toBe(true)
    const html = renderToStaticMarkup(
      createElement(SiteSettingsCard, {
        state: { status: 'ready', settings },
        draft,
        isBrittWithBling: true,
      }),
    )

    expect(html).toContain('Brittany custom media')
    expect(html).toContain('What is a Bomb Party? showcase video')
    expect(html).toContain('About Brittany portrait')
    expect(html).toContain('Sparkle moment 1')
    expect(html).toContain('Sparkle moment 3')
    expect(html).toContain('Show the About Brittany and Sparkle Moments section')
    expect(html).toContain('Hero and “The Rise of Her” stay managed for this custom site.')
    expect(html).toContain('Customer-facing site theme')
    expect(html).toContain('Rose Gold')
    expect(html).toContain('Remove video')
    expect(html).toContain('7602795836380073229')
    expect(html).toContain('https://www.yoursparklesuite.com/britt-with-bling/hero.jpeg')
    expect(html).not.toContain('7680907837425388814')
  })

  it('links only the selected ticker words and can recover old whole-message links', () => {
    const tickerText = '✨ I am live now — shop tonight!'
    const selectionStart = tickerText.indexOf('shop tonight')
    const selectionEnd = selectionStart + 'shop tonight'.length

    expect(
      createTickerLinkFromSelection({
        tickerText,
        selectionStart,
        selectionEnd,
        destination: 'https://shop.example.com/drop',
      }),
    ).toBe('✨ I am live now — [shop tonight](https://shop.example.com/drop)!')
    expect(
      createTickerLinkFromSelection({
        tickerText,
        selectionStart,
        selectionEnd,
        destination: 'javascript:alert(1)',
      }),
    ).toBeNull()
    expect(
      makeTickerLinksPlainText(
        '[Shop the live drop](https://shop.example.com/drop)\n✨ New reveals tonight',
      ),
    ).toBe('Shop the live drop\n✨ New reveals tonight')
  })

  it('keeps the portrait beside one desktop stack containing all four video controls', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.module.css'),
      'utf8',
    )

    expect(source).toContain('styles.homepagePortraitMediaCard')
    expect(source).toContain('styles.homepageVideoMediaCard')
    expect(source).toContain('<div className={styles.homepageMediaGrid}>\n          <aside className={styles.homepageMediaHelp}')
    expect(source).not.toContain('<details className={styles.homepageMediaHelp}>')
    expect(css).toContain('grid-template-rows: repeat(5, auto)')
    expect(css).toMatch(/\.homepagePortraitMediaCard\s*\{[\s\S]*?grid-row:\s*1\s*\/\s*span 5;/)
    expect(css).toMatch(/\.homepageVideoMediaCard\s*\{[\s\S]*?grid-column:\s*2;/)
    expect(css).toMatch(/\.homepageMediaHelp\s*\{[\s\S]*?grid-column:\s*2;/)
  })

  it('shows the Site Settings header save action without auto-save copy', () => {
    const html = renderToStaticMarkup(
      createElement(SiteSettingsCard, {
        state: SITE_SETTINGS_READY_STATE,
        draft: {
          ...SITE_SETTINGS_READY_STATE.settings,
          tagline: 'Fresh draft tagline',
        },
        actionState: { pending: false, error: null, helperMessage: null },
        hasUnsavedChanges: true,
        statusMessage: 'Unsaved changes.',
        canPreview: true,
        onPreview: () => undefined,
        onSave: () => undefined,
      }),
    )

    expect(html).not.toContain('Changes will auto-save.')
    expect(html).toContain('Unsaved changes.')
    expect(html).toContain('Preview customer site')
    expect(html).toContain('Save site settings')
    expect(html).not.toContain('No unsaved changes')
    expect(html).not.toMatch(/class="[^"]*siteSettingsPreviewButton[^"]*" disabled/)
    expect(html).not.toMatch(/class="[^"]*siteSettingsSaveButton[^"]*" disabled/)
  })

  it('derives manual site settings save status text', () => {
    expect(
      getSiteSettingsManualSaveStatusText({
        settings: SITE_SETTINGS_READY_STATE.settings,
        draft: SITE_SETTINGS_READY_STATE.settings,
        actionState: { pending: false, error: null, helperMessage: null },
      }),
    ).toBe('No unsaved changes.')
    expect(
      hasSiteSettingsUnsavedChanges({
        settings: SITE_SETTINGS_READY_STATE.settings,
        draft: {
          ...SITE_SETTINGS_READY_STATE.settings,
          tagline: 'Fresh draft tagline',
        },
      }),
    ).toBe(true)
    expect(
      getSiteSettingsManualSaveStatusText({
        settings: SITE_SETTINGS_READY_STATE.settings,
        draft: {
          ...SITE_SETTINGS_READY_STATE.settings,
          tagline: 'Fresh draft tagline',
        },
        actionState: { pending: false, error: null, helperMessage: null },
      }),
    ).toBe('Unsaved changes.')
    expect(
      getSiteSettingsManualSaveStatusText({
        settings: SITE_SETTINGS_READY_STATE.settings,
        draft: SITE_SETTINGS_READY_STATE.settings,
        actionState: { pending: true, error: null, helperMessage: null },
      }),
    ).toBe('Saving changes...')
    expect(
      getSiteSettingsManualSaveStatusText({
        settings: SITE_SETTINGS_READY_STATE.settings,
        draft: SITE_SETTINGS_READY_STATE.settings,
        actionState: {
          pending: false,
          error: 'Unable to save settings.',
          helperMessage: null,
        },
      }),
    ).toBe('Changes need attention.')
  })

  it('renders the manual Site Settings save action only on the Site Settings screen', () => {
    const previousWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { search: '?section=site-settings' } },
    })

    try {
      const html = renderToStaticMarkup(
        createElement(DashboardPlaceholder, {
          reviewWorkspaceMode: true,
          initialSiteSettings: SITE_SETTINGS_READY_STATE.settings,
          repIdOverride: 'rep-1',
          publicSiteSlugOverride: 'sparkle-test',
          liveQueueSyncCodeOverride: 'LCH-5032',
        }),
      )

      expect(html).toContain('data-testid="site-settings-save-status"')
      expect(html).toContain('Save site settings')
      expect(html).toContain('Preview customer site')
      expect(html).toContain('No unsaved changes.')
      expect(html).toContain('siteSettingsSaveActions')
      expect(html).not.toContain('siteSettingsAutoSaveStatus')
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      })
    }
  })

  it('keeps the manual save action inside Site Settings and strips out auto-save wiring', () => {
    const styles = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.tsx',
      ),
      'utf8',
    )

    expect(styles).not.toContain('.workspaceSaveDock')
    expect(styles).toContain('.siteSettingsSaveActions')
    expect(styles).toContain('.siteSettingsSaveButton')
    expect(styles).toContain('.siteSettingsPreviewButton')
    expect(styles).not.toContain('.siteSettingsSaveFooter')
    expect(styles).not.toContain('.siteSettingsAutoSaveStatus')
    expect(styles).not.toContain('.siteSettingsSaveBar')
    expect(styles).not.toContain('calc(96px + env(safe-area-inset-bottom))')
    expect(source).not.toContain('siteSettingsAutosaveTimerRef')
    expect(source).not.toContain('void saveSiteSettingsDraft(normalizedDraft)')
    expect(source).toContain('function handleSaveSiteSettings()')
  })

  it('routes active account billing to Stripe without duplicating billing details', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: ACCOUNT_BILLING_READY_STATE,
        statusMessage: 'Opened Stripe billing portal.',
      }),
    )

    expect(html).toContain('Billing, payment methods, invoices, and cancellations are managed in Stripe.')
    expect(html).toContain('Account')
    expect(html).toContain('Active')
    expect(html).toContain('Stripe Billing and Payments')
    expect(html).not.toContain('Scheduled to end')
    expect(html).not.toContain('visa ending in 4242')
    expect(html).not.toContain('Expires 12/2028')
    expect(html).not.toContain('Billing history')
    expect(html).not.toContain('$99.00')
    expect(html).not.toContain('Manage billing and cancel')
    expect(html).toContain('Opened Stripe billing portal.')
  })

  it('renders the referral program card with code, link, and status counts', () => {
    const html = renderToStaticMarkup(
      createElement(ReferralProgramCard, {
        referral: ACCOUNT_BILLING_READY_STATE.summary.referral,
      }),
    )

    expect(html).toContain('Referral program')
    expect(html).toContain('SS-K7M4Q9')
    expect(html).toContain('https://sparkle-suite.example/start?ref=SS-K7M4Q9')
    expect(html).toContain('2 pending')
    expect(html).toContain('1 earned')
    expect(html).toContain('3 credited')
    expect(html).toContain('Copy code')
    expect(html).toContain('Copy link')
  })

  it('renders terms acceptance before subscription checkout can start', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            paymentMethod: null,
            invoices: [],
            canStartSubscription: true,
            canManageBilling: true,
          },
        },
        agreementAccepted: false,
      }),
    )

    expect(html).toContain('Setup fee + monthly plan')
    expect(html).toContain('Before checkout')
    expect(html).toContain('Review your Sparkle Suite plan')
    expect(html).toContain('$49.99 setup fee + $74.99 first month = $124.98')
    expect(html).toContain('These charges are due only when you complete Stripe checkout')
    expect(html).toContain('$74.99/month after the first checkout until cancelled.')
    expect(html).toContain('Cancel anytime from billing.')
    expect(html).toContain('After checkout unlocks')
    expect(html).toContain('Customer-facing site')
    expect(html).toContain('Dance Floor / dance floor')
    expect(html).toContain('Checkout alone does not send customer texts')
    expect(html).toContain(
      'Review the Sparkle Suite Terms and Conditions (optional).',
    )
    expect(html).toContain('Read Terms and Conditions')
    expect(html).toContain(
      'I understand the charge at checkout, the monthly renewal, and the cancel policy',
    )
    expect(html).toContain('I accept the Sparkle Suite Terms and Conditions.')
    expect(html).toContain('_termsLink_')
    expect(html).toContain(
      'href="/terms-and-conditions?returnTo=%2Fnic-nac%3Fsection%3Daccount"',
    )
    expect(html).not.toContain('target="_blank"')
    expect(html).toContain('Stripe Billing and Payments')
    expect(html).not.toContain('Manage billing and cancel')
    expect(html).toContain('disabled=""')
  })

  it('shows real account billing status while disabling payment mutations in support mode', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            canStartSubscription: true,
            canManageBilling: true,
          },
        },
        agreementAccepted: true,
        mutationsDisabled: true,
      }),
    )

    expect(html).toContain('Review your Sparkle Suite plan')
    expect(html).toContain('Stripe Billing and Payments')
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the assigned founder rate for twelve months before the standard step-up', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            canStartSubscription: true,
            canManageBilling: true,
            pricing: {
              tier: 'founder',
              founderSequence: 1,
              setupFeeCents: 4999,
              monthlyAmountCents: 4999,
              founderRateMonths: 12,
              standardMonthlyAmountCents: 7499,
            },
          },
        },
      }),
    )

    expect(html).toContain('Founding rep #1')
    expect(html).toContain('$49.99 setup fee + $49.99 first month = $99.98')
    expect(html).toContain('Months 2–12: $49.99/month')
    expect(html).toContain('Month 13 onward: $74.99/month')
    expect(html).toContain('At checkout')
    expect(html).not.toContain('Due today')
  })

  it('renders Brianna\'s grandfathered Stripe link without the standard build-fee checkout', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            grandfatheredCheckout: {
              href: 'https://buy.stripe.com/eVq00l4TT7Xu0nX7sod7q02?client_reference_id=2b5a27c5-9c05-4014-8d0b-754e19815bf6',
              monthlyAmountCents: 3900,
              buildFeeCents: 0,
            },
          },
        },
      }),
    )

    expect(html).toContain('$39/month grandfathered plan - no setup fee')
    expect(html).toContain('Grandfathered Sparkle Suite membership')
    expect(html).toContain('$39.00 per month with no setup fee')
    expect(html).toContain('eVq00l4TT7Xu0nX7sod7q02')
    expect(html).not.toContain('Setup fee + monthly plan')
    expect(html).not.toContain('Payment method')
    expect(html).not.toContain('Billing history')
    expect(html).not.toContain('No card on file yet.')
    expect(html).not.toContain('Renews through')
  })

  it('shows captions only for the About portrait photo', () => {
    const html = renderToStaticMarkup(
      createElement(SiteSettingsCard, {
        state: SITE_SETTINGS_READY_STATE,
        draft: {
          ...SITE_SETTINGS_READY_STATE.settings,
          homepageMediaSlots: [
            { key: 'showcase', caption: '', imageUrl: '', videoUrl: '' },
            {
              key: 'about_1',
              caption: '',
              imageUrl: '',
              videoUrl: '',
            },
            {
              key: 'about_2',
              caption: '',
              imageUrl: '',
              videoUrl: 'https://www.tiktok.com/@sparkle/video/7412345678901234567',
            },
          ],
        },
        actionState: { pending: false, error: null, helperMessage: null },
        hasUnsavedChanges: true,
        statusMessage: 'Unsaved changes.',
      }),
    )

    expect(html).toContain('Photo caption')
    expect(html.match(/Photo caption<\/span>/g)).toHaveLength(1)
  })

  it('shows the five-day trial deadline and preserved-work expiry message', () => {
    const activeHtml = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            paymentMethod: null,
            invoices: [],
            workspaceAccess: {
              hasFullAccess: true,
              source: 'trial',
              status: 'trial_active',
              subscriptionStatus: null,
              trialStartsAt: '2026-08-02T14:00:00.000Z',
              trialEndsAt: '2026-08-07T14:00:00.000Z',
            },
            canStartSubscription: true,
            canManageBilling: false,
          },
        },
      }),
    )
    const expiredHtml = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            workspaceAccess: {
              hasFullAccess: false,
              source: 'none',
              status: 'trial_expired',
              subscriptionStatus: null,
              trialStartsAt: '2026-08-02T14:00:00.000Z',
              trialEndsAt: '2026-08-07T14:00:00.000Z',
            },
            canStartSubscription: true,
            canManageBilling: false,
          },
        },
      }),
    )

    expect(activeHtml).toContain('5-day trial active')
    expect(activeHtml).toContain('full Sparkle Suite trial is active through')
    expect(activeHtml).toContain('keep your workspace and customer site')
    expect(expiredHtml).toContain('Your five-day trial has ended.')
    expect(expiredHtml).toContain('Your work is saved')
  })

  it('hides empty billing admin states during unpaid checkout review', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            subscription: null,
            paymentMethod: null,
            invoices: [],
            canStartSubscription: true,
            canManageBilling: true,
          },
        },
        agreementAccepted: false,
      }),
    )

    expect(html).toContain('Review your Sparkle Suite plan')
    expect(html).not.toContain('Subscription</span>')
    expect(html).not.toContain('Payment method')
    expect(html).not.toContain('Billing history')
    expect(html).not.toContain('No card on file yet.')
    expect(html).not.toContain('Billing history will appear after your first Stripe invoice.')
  })

  it('does not render first-run checklist rows from the unlocked dashboard', () => {
    const html = renderToStaticMarkup(createElement(DashboardPlaceholder))

    expect(html).not.toContain('Locked until checkout')
    expect(html).not.toContain('Ready after checkout')
    expect(html).not.toContain('Continue in Site Settings')
    expect(html).not.toContain('After checkout')
    expect(html).toContain('Hi there, how can I help you today?')
  })

  it('keeps customer site looks in Site Settings instead of Help & Resources', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardPlaceholder, { initialSectionOverride: 'help-resources' }),
    )

    expect(html).toContain('Help &amp; Resources')
    expect(html).not.toContain('Choose your look')
    expect(html).not.toContain('Customer Site Looks')
    expect(html).not.toContain('Full skin gallery')
    expect(html).not.toContain('Classic Sparkle')
    expect(html).not.toContain('Guided first-start')
    expect(html).not.toContain('after checkout')
    expect(html).not.toContain('Ready after checkout')
  })

  it('renders local test buyer checkout pricing when the billing summary is in test mode', () => {
    const html = renderToStaticMarkup(
      createElement(AccountBillingCard, {
        state: {
          status: 'ready',
          summary: {
            ...ACCOUNT_BILLING_READY_STATE.summary,
            checkoutMode: 'test_buyer',
            subscription: null,
            paymentMethod: null,
            invoices: [],
            canStartSubscription: true,
            canManageBilling: false,
          },
        },
        agreementAccepted: false,
      }),
    )

    expect(html).toContain('50 cents in Stripe test mode. No real money moves.')
    expect(html).toContain(
      'Use this local-only path to feel the buyer flow before real checkout is turned on.',
    )
    expect(html).toContain(
      '50 cents per month in Stripe test mode until cancelled.',
    )
  })

  it('syncs Stripe billing when returning from subscription checkout', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("params.get('billing') !== 'subscription-success'")
    expect(source).toContain("params.get('session_id')?.trim()")
    expect(source).toContain("fetch('/api/stripe/sync'")
    expect(source).toContain('body: JSON.stringify({ sessionId })')
    expect(source).toContain('await loadAccountBilling()')
  })

  it('keeps customer-facing skin selection separate from workspace skin state', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(source).toContain('Customer-facing site theme')
    expect(source).toContain('WORKSPACE_APPEARANCE_PRESET')
    expect(source).toContain('AMETHYST_SKIN_CARDS')
    expect(source).not.toContain('Full skin gallery')
    expect(source).toContain('skin.code')
    expect(source).toContain('normalizeAmethystAppearancePreset')
  })

  it('calculates show and monthly take-home estimates from manual inputs', () => {
    const result = calculateBusinessCalculator({
      averageShowSales: 1200,
      commissionRate: 25,
      showsPerMonth: 8,
      perShowExpenses: 30,
      monthlyExpenses: 150,
      monthlyProfitGoal: 2500,
    })

    expect(result.grossSalesPerMonth).toBe(9600)
    expect(result.takeHomePerShowBeforeMonthlyExpenses).toBe(270)
    expect(result.estimatedMonthlyTakeHome).toBe(2010)
    expect(result.salesNeededPerMonthForGoal).toBe(11560)
    expect(result.salesNeededPerShowForGoal).toBe(1445)
    expect(result.estimatedMarginPercent).toBe(20.94)
  })

  it('calculates a single show take-home estimate', () => {
    const result = calculateSingleShowCalculator({
      showSales: 1600,
      commissionRate: 25,
      showExpenses: 45,
    })

    expect(result.grossCommission).toBe(400)
    expect(result.estimatedShowTakeHome).toBe(355)
    expect(result.expenseImpactPercent).toBe(11.25)
    expect(result.estimatedMarginPercent).toBe(22.19)
  })

  it('renders the business calculator with inputs and strategic outputs', () => {
    const html = renderToStaticMarkup(createElement(BusinessCalculatorCard))

    expect(html).toContain('Business Calculator')
    expect(html).toContain('Monthly Planner')
    expect(html).toContain('Single Show')
    expect(html).toContain('Average show sales')
    expect(html).toContain('Shows per month')
    expect(html).toContain('Estimated monthly take-home')
    expect(html).toContain('Sales needed per show')
  })

  it('renders business tools with Wispr Flow guidance and coming-soon placeholders', () => {
    const html = renderToStaticMarkup(createElement(BusinessToolsCard))

    expect(html).toContain('Business Tools')
    expect(html).toContain('Business Calculator')
    expect(html).toContain('Wispr Flow')
    expect(html).toContain('Business Cards')
    expect(html.match(/Coming Soon/g) ?? []).toHaveLength(2)
    expect(html).toContain('https://wisprflow.ai/r?LOUIS20696')
    expect(html).toContain('Talk to Nic-Nac without typing during a live show')
    expect(html).toContain('Open Louis&#x27;s Wispr Flow invite')
    expect(html).not.toContain('Monthly Planner')
    expect(html).not.toContain('Average show sales')
    expect(html).not.toContain('BP dashboard number import')
  })

  it('renders a plain-English Live Queue setup and verification tool', () => {
    const html = renderToStaticMarkup(
      createElement(LiveQueueTool, {
        liveQueueSyncCode: 'TDF-8535',
        customerSiteHref:
          '/amethyst/Homepage.html?c=ac3e643a-6ccf-4400-8230-662f63a07f3e',
        onOpenHelp: () => {},
      }),
    )

    expect(html).toContain('Live Queue')
    expect(html).toContain('Install the Chrome extension')
    expect(html).toContain(
      'https://chromewebstore.google.com/detail/sparkle-suite-live-queue/kmodgfffflplfdlkkhadgimmobplhoih',
    )
    expect(html).toContain('https://myoffice.bombparty.com/live-party-orders')
    expect(html).toContain('TDF-8535')
    expect(html).toContain('Copy code')
    expect(html).toContain('Keep this code private')
    expect(html).toContain('Set it up step by step')
    expect(html).toContain('Make sure everything is working')
    expect(html).toContain('How Live Queue works')
    expect(html).toContain('oldest unrevealed customer first')
    expect(html).toContain('Open customer site')
    expect(html).toContain('Open Help &amp; Resources')
  })

  it('does not invent a Live Queue code when one is not assigned', () => {
    const html = renderToStaticMarkup(
      createElement(LiveQueueTool, {
        liveQueueSyncCode: null,
        customerSiteHref: null,
        onOpenHelp: () => {},
      }),
    )

    expect(html).toContain('Code not assigned yet')
    expect(html).toContain(
      'Ask Nic-Nac or support to retrieve your assigned code',
    )
    expect(html).toContain('disabled=""')

    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    expect(source).toContain('liveQueueSyncCode={currentLiveQueueSyncCode}')
    expect(source).not.toContain(
      'liveQueueSyncCode={repProfileState.liveQueueSyncCode ?? null}',
    )
  })

  it('formats wallet amounts and estimated texts for display', () => {
    expect(formatWalletAmount(25000)).toBe('$25.00')
    expect(formatWalletAmount(9)).toBe('$0.009')
    expect(getEstimatedTextsRemaining(24991)).toBe(2776)
  })

  it('derives wallet load options and banner messages from wallet state', () => {
    expect(getWalletLoadOptions(WALLET_READY_STATE.summary)).toEqual([
      { amountCents: 2500, label: 'Load $25' },
      { amountCents: 5000, label: 'Load $50' },
      { amountCents: 10000, label: 'Load $100' },
    ])
    expect(getWalletBannerMessage('wallet=success')).toBe(
      'Wallet load completed. Your balance will refresh in a moment.',
    )
    expect(getWalletBannerMessage('wallet=cancelled')).toBe(
      'Wallet load was cancelled.',
    )
    expect(getWalletBannerMessage('foo=bar')).toBe(null)
  })

  it('derives auto-recharge form defaults and safe option lists from wallet state', () => {
    expect(getAutoRechargeDraft(WALLET_READY_STATE.summary)).toEqual({
      enabled: true,
      thresholdCents: 500,
      amountCents: 2500,
    })

    expect(getAutoRechargeThresholdOptions(WALLET_READY_STATE.summary)).toEqual([
      { amountCents: 500, label: 'Recharge below $5' },
      { amountCents: 1000, label: 'Recharge below $10' },
      { amountCents: 1500, label: 'Recharge below $15' },
      { amountCents: 2000, label: 'Recharge below $20' },
    ])

    expect(getAutoRechargeAmountOptions(WALLET_READY_STATE.summary, 500)).toEqual([
      { amountCents: 2500, label: 'Reload $25' },
      { amountCents: 5000, label: 'Reload $50' },
      { amountCents: 10000, label: 'Reload $100' },
    ])
  })

  it('renders the show calendar card with a month grid and event summaries', () => {
    const html = renderToStaticMarkup(
      createElement(ShowCalendarCard, {
        state: CALENDAR_READY_STATE,
        referenceDate: new Date('2026-05-10T12:00:00.000Z'),
      }),
    )

    expect(html).toContain('Upcoming')
    expect(html).toContain('May 2026')
    expect(html).toContain('Read-only here. Ask Nic-Nac to add or edit shows.')
    expect(html).toContain('Thursday reveal')
    expect(html).toContain('Sunday party')
    expect(html).toContain('aria-label="Previous month"')
    expect(html).toContain('aria-label="Current month"')
    expect(html).toContain('aria-label="Next month"')
    expect(html).toContain('Recently wrapped')
    expect(html).toContain('Launch party')
    expect(html).toContain('Recurring')
    expect(html).toContain('aria-label="View details for Thursday reveal"')
    expect(html).toContain('aria-label="View details for Sunday party"')
  })

  it('builds complete show detail rows for the calendar event dialog', () => {
    const details = getCalendarEventDetailGroups({
      id: 'show-july-4',
      repId: 'rep-1',
      platform: 'TikTok',
      eventTime: '2026-07-05T00:00:00.000Z',
      timeZone: 'America/New_York',
      durationMinutes: 180,
      title: 'Fireworks Fizzing',
      description: null,
      discountCodes: [
        { code: 'fire15', description: '15% off entire cart' },
        { code: 'sparkle3', description: 'free shipping on 3 items' },
      ],
      featuredCollections: ['July Bday', 'Summer Stack'],
      isRecurring: false,
      recurrenceGroupId: null,
      recurrenceRule: null,
      status: 'scheduled' as const,
      createdAt: '2026-07-03T10:00:00.000Z',
      updatedAt: '2026-07-03T10:00:00.000Z',
    })

    expect(details).toContainEqual({ label: 'Title', value: 'Fireworks Fizzing' })
    expect(details).toContainEqual({ label: 'Platform', value: 'TikTok' })
    expect(details).toContainEqual({
      label: 'Date and time',
      value: 'Jul 4 at 8:00 PM EDT',
    })
    expect(details).toContainEqual({ label: 'End time', value: '11:00 PM EDT' })
    expect(details).toContainEqual({ label: 'Duration', value: '3 hours' })
    expect(details).toContainEqual({ label: 'Recurrence', value: 'One-time show' })
    expect(details).toContainEqual({
      label: 'Discount codes',
      items: ['fire15: 15% off entire cart', 'sparkle3: free shipping on 3 items'],
    })
    expect(details).toContainEqual({
      label: 'Featured collections',
      items: ['July Bday', 'Summer Stack'],
    })
    expect(details).toContainEqual({ label: 'Description', value: 'No description' })
  })

  it('renders rep calendar event times in the event timezone instead of UTC', () => {
    const html = renderToStaticMarkup(
      createElement(ShowCalendarCard, {
        state: {
          status: 'ready',
          summary: {
            upcomingEvents: [
              {
                id: 'show-eastern',
                repId: 'rep-1',
                platform: 'TikTok Live',
                eventTime: '2026-06-07T00:00:00.000Z',
                timeZone: 'America/New_York',
                durationMinutes: 60,
                title: 'Eastern smoke show',
                description: null,
                discountCodes: [],
                featuredCollections: null,
                isRecurring: false,
                recurrenceGroupId: null,
                recurrenceRule: null,
                status: 'scheduled' as const,
                createdAt: '2026-06-01T10:00:00.000Z',
                updatedAt: '2026-06-01T10:00:00.000Z',
              },
            ],
            recentEvents: [],
          },
        },
        referenceDate: new Date('2026-06-10T12:00:00.000Z'),
      }),
    )

    expect(html).toContain('Eastern smoke show')
    expect(html).toContain('8:00 PM')
    expect(html).toMatch(/EDT|Eastern/)
  })

  it('labels live, scheduled, completed, and cancelled calendar shows distinctly', () => {
    const show = CALENDAR_READY_STATE.summary.upcomingEvents[0]
    const recentShow = CALENDAR_READY_STATE.summary.recentEvents[0]
    const html = renderToStaticMarkup(
      createElement(ShowCalendarCard, {
        state: {
          status: 'ready',
          summary: {
            upcomingEvents: [
              {
                ...show,
                id: 'show-live',
                title: 'Live tray sale',
                status: 'live' as const,
              },
              {
                ...show,
                id: 'show-scheduled',
                title: 'Scheduled sparkle drop',
                status: 'scheduled' as const,
                isRecurring: false,
              },
            ],
            recentEvents: [
              {
                ...recentShow,
                id: 'show-completed',
                title: 'Completed tray sale',
                status: 'completed' as const,
              },
              {
                ...recentShow,
                id: 'show-cancelled',
                title: 'Cancelled tray sale',
                status: 'cancelled' as const,
              },
            ],
          },
        },
        referenceDate: new Date('2026-05-10T12:00:00.000Z'),
      }),
    )

    expect(html).toContain('Live now')
    expect(html).toContain('Scheduled')
    expect(html).toContain('Completed')
    expect(html).toContain('Cancelled')
  })

  it('builds a five-week calendar grid anchored to the reference month', () => {
    const cells = buildShowCalendarCells(
      CALENDAR_READY_STATE.summary.upcomingEvents,
      new Date('2026-05-10T12:00:00.000Z'),
    )

    expect(cells).toHaveLength(35)
    expect(cells[0].isoDate).toBe('2026-04-26')
    expect(cells[34].isoDate).toBe('2026-05-30')
    expect(cells.find((cell) => cell.isoDate === '2026-05-15')?.events).toHaveLength(1)
  })

  it('can render recently wrapped shows on the visible month grid', () => {
    const cells = buildShowCalendarCells(
      CALENDAR_READY_STATE.summary.recentEvents,
      new Date('2026-05-10T12:00:00.000Z'),
    )

    expect(cells.find((cell) => cell.isoDate === '2026-05-05')?.events).toHaveLength(1)
  })

  it('derives the calendar metrics from upcoming and recent shows', () => {
    expect(
      getShowCalendarMetrics(
        CALENDAR_READY_STATE.summary.upcomingEvents,
        CALENDAR_READY_STATE.summary.recentEvents,
        new Date('2026-05-10T12:00:00.000Z'),
      ),
    ).toEqual({
      monthLabel: 'May 2026',
      upcomingCount: 2,
      thisMonthCount: 2,
      recurringCount: 1,
      recentCount: 1,
    })
  })
})
