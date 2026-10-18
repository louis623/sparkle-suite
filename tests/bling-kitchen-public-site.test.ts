import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  loadAmethystPreviewTemplateData,
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
  type AmethystPreviewTemplateData,
} from '@/lib/amethyst/preview-template-data'
import {
  buildRenderedAmethystPublicMetadataForTest,
  buildTargetedAmethystPublicPageTextForTest,
} from '@/lib/amethyst/public-asset-response'
import { buildAmethystHomepageBootstrapScript } from '@/lib/amethyst/homepage-template-data'
import {
  buildAmethystPantryBootstrapScript,
  defaultAmethystPantryTemplateData,
} from '@/lib/amethyst/pantry-template-data'
import {
  BLING_KITCHEN_PROFILE,
  BLING_KITCHEN_RECIPE_COUNT,
} from '@/lib/bling-kitchen/profile'
import { recipes } from '@/lib/bling-kitchen/recipes'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import type { createAdminClient } from '@/lib/supabase/admin'

const blingKitchenSettings: SiteSettingsDashboardResult = {
  displayName: 'Heather',
  businessName: 'BlingKitchen',
  email: BLING_KITCHEN_PROFILE.email,
  phone: '',
  bannerText: BLING_KITCHEN_PROFILE.announcementText,
  bannerVisible: true,
  tickerText: BLING_KITCHEN_PROFILE.promoTickerText,
  tickerVisible: true,
  tagline: 'Serving Sparkle from the Heart of the Home',
  heroImageUrl: '',
  heroAnimationType: 'sparkle_rise',
  teamName: BLING_KITCHEN_PROFILE.teamName,
  joinTeamAccessEnabled: true,
  showJoinPage: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'amethyst',
  socialHandles: {
    tiktok: '@blingkitchen',
    facebook: BLING_KITCHEN_PROFILE.facebookVipUrl,
    instagram: '',
  },
}

const blingKitchenExtras = {
  shopLink: BLING_KITCHEN_PROFILE.shopUrl,
  streamingLinks: {
    tiktok: BLING_KITCHEN_PROFILE.tiktokUrl,
    facebook: BLING_KITCHEN_PROFILE.facebookVipUrl,
  },
}

function viCreateAdminClient() {
  return vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient
}

describe('BlingKitchen hybrid public site contract', () => {
  it('maps Heather to the standard homepage with Pantry preserved', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )

    expect(homepage.publicSiteVariant).toBeUndefined()
    expect(homepage.repName).toBe('Heather')
    expect(homepage.businessName).toBe('BlingKitchen')
    expect(homepage.teamName).toBe('Opal Sparkling Gems')
    expect(homepage.heroHeadline).toBe('Real jewelry. Live reveals. Pure sparkle.')
    expect(homepage.heroSub).toContain('live reveals')
    expect(homepage.heroImageUrl).toBeUndefined()
    expect(homepage.pantryPageUrl).toBe('/amethyst/Pantry.html')
    expect(homepage.footerLinks.joinTeam).toBe('/amethyst/Join.html')
    expect(homepage.streamLinks.tiktok).toBe(BLING_KITCHEN_PROFILE.tiktokUrl)
  })

  it('serializes Heather Pantry access without triggering the BlingKitchen homepage branch', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )
    const script = buildAmethystHomepageBootstrapScript(homepage)

    expect(script).not.toContain('"publicSiteVariant":"bling_kitchen_hybrid"')
    expect(script).toContain('"pantryPageUrl":"/amethyst/Pantry.html"')
  })

  it('keeps Dance Floor and Join mechanics standard while linking Heather Pantry', () => {
    const trade = mapPreviewSettingsToTradeTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )
    const join = mapPreviewSettingsToJoinTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )

    expect(trade.publicSiteVariant).toBeUndefined()
    expect(trade.tradeHeroTitle).toBe('Find the dancer you wanted to love.')
    expect(trade.tradeRules).toContain('Item-for-item only.')
    expect(trade.pantryPageUrl).toBe('/amethyst/Pantry.html')
    expect(join.publicSiteVariant).toBeUndefined()
    expect(join.teamName).toBe('Opal Sparkling Gems')
    expect(join.pantryPageUrl).toBe('/amethyst/Pantry.html')
    expect(join.bpReferralUrl).toBe('')
    expect(join.hasRecruitingLink).toBe(false)
  })

  it('preserves source recipes as structured Pantry content', () => {
    expect(BLING_KITCHEN_RECIPE_COUNT).toBe(26)
    expect(defaultAmethystPantryTemplateData.recipeCount).toBe(26)
    expect(defaultAmethystPantryTemplateData.recipes).toHaveLength(26)
    expect(defaultAmethystPantryTemplateData.categoryOrder).toContain(
      'Baking & Sweets',
    )
    expect(defaultAmethystPantryTemplateData.categoryOrder).not.toContain('Dessert')
    expect(defaultAmethystPantryTemplateData.categoryOrder).not.toContain('No-Bake Treats')
    expect(defaultAmethystPantryTemplateData.featuredCategoryGroups[0]?.categories).toEqual([
      'Baking & Sweets',
    ])
    expect(recipes.map((recipe) => recipe.title)).toEqual(
      expect.arrayContaining([
        'Chocolate-Dipped Strawberries',
        'Homemade Coffee Creamer',
        'Family Pasta Sauce',
      ]),
    )
    expect(recipes[0]).toMatchObject({
      category: 'Baking',
      tiktokUrl: expect.stringContaining('tiktok.com/@blingkitchen/video/'),
    })
    expect(defaultAmethystPantryTemplateData.recipes[0]).toMatchObject({
      category: 'Baking & Sweets',
    })
    expect(
      defaultAmethystPantryTemplateData.recipes.find(
        (recipe) => recipe.title === 'Sweet & Salty Clusters',
      ),
    ).toMatchObject({ category: 'Baking & Sweets' })
  })

  it('serializes Pantry recipes and route links for the runtime page', () => {
    const script = buildAmethystPantryBootstrapScript(
      defaultAmethystPantryTemplateData,
      {
        targeted: true,
        repId: 'rep-bling-kitchen',
        publicSiteSlug: 'blingkitchen',
      },
    )

    expect(script).toContain('window.AMETHYST_PANTRY_TEMPLATE_DATA')
    expect(script).toContain('"recipeCount":26')
    expect(script).toContain('"title":"Chocolate-Dipped Strawberries"')
    expect(script).toContain('"publicSiteSlug":"blingkitchen"')
  })

  it('rewrites standard public links and Pantry for the BlingKitchen slug', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-bling-kitchen',
      publicSiteSlug: 'blingkitchen',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: viCreateAdminClient(),
        resolveAmethystPreviewRep: async () => ({
          id: 'rep-bling-kitchen',
          email: BLING_KITCHEN_PROFILE.email,
          shop_link: BLING_KITCHEN_PROFILE.shopUrl,
          streaming_links: blingKitchenExtras.streamingLinks,
        }),
        getSiteSettingsDashboard: async () => blingKitchenSettings,
        getJoinTeamRoster: async () => [],
        getRequiredSetupState: async () => ({
          id: 'setup-bling-kitchen',
          repId: 'rep-bling-kitchen',
          status: 'dashboard_unlocked',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: REQUIRED_SETUP_STEPS,
          answers: {},
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: '2026-06-19T12:00:00.000Z',
          createdAt: null,
          updatedAt: null,
          nextStep: null,
          canUnlockDashboard: true,
        }),
      },
    })

    expect(data.homepage.footerLinks.home).toBe('/blingkitchen')
    expect(data.homepage.footerLinks.tradeBoard).toBe('/blingkitchen/trade')
    expect(data.homepage.footerLinks.joinTeam).toBe('/blingkitchen/join')
    expect(data.homepage.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
    expect(data.homepage.publicSiteVariant).toBeUndefined()
    expect(data.trade.footerLinks.tradeBoard).toBe('/blingkitchen/trade')
    expect(data.trade.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
    expect(data.join.footerLinks.joinTeam).toBe('/blingkitchen/join')
    expect(data.join.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
  })

  it('renders standard shells with optional Pantry navigation', () => {
    const homepageJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const tradeJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const joinJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const pantryJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/pantry.jsx'),
      'utf8',
    )
    const pantryHtml = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Pantry.html'),
      'utf8',
    )
    const pantryCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/pantry.css'),
      'utf8',
    )

    expect(homepageJsx).toContain('function SparkleSuiteHeaderStack')
    expect(homepageJsx).toContain('CONTENT.pantryPageUrl')
    expect(homepageJsx).toContain('In the Pantry')
    expect(tradeJsx).toContain('const PANTRY_HREF = CONTENT.pantryPageUrl || ""')
    expect(joinJsx).toContain('const PANTRY_HREF = CONTENT.pantryPageUrl || ""')
    expect(pantryJsx).toContain('function PantryPage')
    expect(pantryJsx).toContain('AMETHYST_PANTRY_TEMPLATE_DATA')
    expect(pantryJsx).toContain('appearancePreset')
    expect(pantryJsx).toContain('recipe.tiktokUrl')
    expect(pantryJsx).toContain('function TikTokRecipePlayer')
    expect(pantryJsx).toContain("What You'll Need")
    expect(pantryJsx).toContain('How to Make It')
    expect(pantryJsx).toContain("Watch Heather make it")
    expect(pantryJsx).toContain('bk-recipe-detail-grid')
    expect(pantryJsx).toContain('const ungroupedRecipes')
    expect(pantryJsx).toContain("More from Heather's Pantry")
    expect(pantryJsx).toContain('https://www.tiktok.com/player/v1/${videoId}')
    expect(pantryJsx).toContain('autoplay=1&muted=1&loop=1&controls=0')
    expect(pantryJsx).toContain('new IntersectionObserver')
    expect(pantryJsx).toContain('type: nextMuted ? "mute" : "unMute"')
    expect(pantryHtml).toContain('class="bk-pantry-page"')
    expect(pantryHtml).toContain('data-template-src="/api/amethyst/pantry-template"')
    expect(pantryHtml).toContain('pantry.jsx?v=20260817-baking-and-sweets')
    expect(pantryHtml).toContain(
      'pantry.css?v=20260817-recipe-card-footer-alignment',
    )
    expect(pantryCss).toContain(
      'body.bg-moonstone-charcoal .bk-filter-bar button:not(.is-active)',
    )
    expect(pantryCss).toContain('body.surface-silver-pearl .bk-recipe-body > p')
    expect(pantryCss).toContain('body.surface-silver-pearl .bk-recipe-meta span')
    expect(pantryCss).toContain('.bk-recipe-detail-grid')
    expect(pantryCss).toContain('.bk-recipe-body .bk-recipe-meta')
  })

  it('uses standard public SEO text for Home/Trade/Join and Pantry-specific text for Pantry', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )
    const trade = mapPreviewSettingsToTradeTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )
    const join = mapPreviewSettingsToJoinTemplateData(
      blingKitchenSettings,
      blingKitchenExtras,
    )
    const templateData: AmethystPreviewTemplateData = {
      appearancePreset: 'amethyst',
      homepage,
      trade,
      join,
    }

    expect(
      buildTargetedAmethystPublicPageTextForTest('homepage', templateData).title,
    ).toBe('BlingKitchen - Live jewelry reveals')
    expect(
      buildTargetedAmethystPublicPageTextForTest('pantry', templateData).title,
    ).toBe('In the Pantry - BlingKitchen')
    expect(
      buildTargetedAmethystPublicPageTextForTest('homepage', templateData)
        .description,
    ).toContain('Shop live jewelry reveals')
    expect(
      buildTargetedAmethystPublicPageTextForTest('join', templateData).title,
    ).toBe('Join Opal Sparkling Gems')
    expect(join.businessName).toBe('BlingKitchen')
    expect(join.teamName).toBe('Opal Sparkling Gems')
    const metadata = buildRenderedAmethystPublicMetadataForTest(
      'join',
      'https://goforthebling.com',
      templateData,
      '/join',
    )
    expect(metadata.title).toBe('Join Opal Sparkling Gems')
    expect(metadata.openGraph.siteName).toBe('BlingKitchen')
  })
})
