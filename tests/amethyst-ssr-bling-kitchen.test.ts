import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { homepageSmokeReview, pantrySmokeReview } from '@/lib/amethyst/homepage-smoke-review'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { renderAmethystPantryFirstPaint } from '@/lib/amethyst/pantry-first-paint'
import { shouldUseRepRenderV2 } from '@/lib/amethyst/rep-render-version'
import { restrictPantryTemplateData } from '@/lib/bling-kitchen/pantry-access'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { buildAmethystPantryBootstrapScript, defaultAmethystPantryTemplateData as pantry } from '@/lib/amethyst/pantry-template-data'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: async (_admin: unknown, target: { publicSiteSlug: string }) => ({ id: 'fixture-' + target.publicSiteSlug, email: 'fixture@example.com' }) }))
vi.mock('@/lib/amethyst/customer-domain-site', () => ({ resolveCustomerDomainSiteState: async () => ({ kind: 'serve', host: 'otherrep.com', repId: 'fixture-otherrep', publicSiteSlug: 'otherrep' }) }))
vi.mock('@/lib/amethyst/preview-template-data', () => ({ loadAmethystPreviewTemplateData: async () => { throw new Error('Unexpected data read') } }))
vi.mock('@/lib/services/site-settings', () => ({ getSiteSettingsDashboard: async () => { throw new Error('Unexpected settings read') } }))
vi.mock('@/lib/services/site-recipes', () => ({ getPublicSiteRecipes: async () => { throw new Error('Unexpected recipe read') } }))

const original = { homepage, trade, join, appearancePreset: 'amethyst' as const }
const baseUrl = 'https://fixture.vercel.app/dudesfizzfest'
function smoke() {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pukemqiwlyqmyytxkdmo.supabase.co')
}
afterEach(() => vi.unstubAllEnvs())

function expectNoPantryMarkup(html: string) {
  // Runtime bundles and JSON bootstrap data may contain unrendered JSX strings.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
  for (const forbidden of ['>In the Pantry<', 'In the Pantry →', 'bk-home-pantry-callout',
    'href="/blingkitchen/in-the-pantry"', 'href="/amethyst/Pantry.html"']) {
    expect(markup).not.toContain(forbidden)
  }
}

async function render(page: 'homepage' | 'trade' | 'join', data: typeof original, slug = 'dudesfizzfest') {
  const runtime = { targeted: true, publicSiteSlug: slug }
  const bootstrap = page === 'homepage'
    ? buildAmethystHomepageBootstrapScript(data.homepage, [], data.appearancePreset, runtime)
    : page === 'trade' ? buildAmethystTradeBootstrapScript(data.trade, [], data.appearancePreset, runtime)
      : buildAmethystJoinBootstrapScript(data.join, data.appearancePreset, runtime)
  return renderAmethystPageFirstPaint(page, readFileSync(`lib/amethyst/legacy/assets/${{ homepage: 'Homepage', trade: 'Trade', join: 'Join' }[page]}.html`, 'utf8'), data, new URL(baseUrl), bootstrap)
}

it('renders the guarded kitchen fixture with framed, seasonal and cat heroes without Pantry or Live storage', async () => {
  smoke()
  for (const theme of ['amethyst', 'halloween_pumpkin_witch', 'halloween_pumpkin_cat']) {
    const data = homepageSmokeReview(original, new URL(baseUrl + `?ssrReviewTheme=${theme}&ssrReviewLayout=bling_kitchen`), 'dudesfizzfest')
    expect(data.homepage.aboutMediaSlots).toEqual([])
    for (const page of ['homepage', 'trade', 'join'] as const) {
      const html = await render(page, data as typeof original)
      expect(html).toContain('data-server-rendered="true"')
      expectNoPantryMarkup(html)
      expect(html).not.toContain('bqhzfkgkjyuhlsozpylf')
      if (page === 'homepage') {
        if (theme === 'halloween_pumpkin_cat') expect(html).toContain('data-ssr-hero="halloween_pumpkin_cat"')
        else {
          expect(html).toContain(`class="${theme === 'amethyst' ? 'bkf-hero' : 'bk-home-hero'}"`)
          expect(html).not.toContain('data-ssr-hero=')
          expect(html).not.toContain('<section class="hp-hero"')
        }
        expect(html).toContain('data-ssr-style="framed-hero.css"')
      } else {
        expect(html).toContain(`bk-${page}-page`)
        expect(html).not.toContain('data-ssr-hero=')
      }
    }
  }
})

it('keeps Heather standard-layout pantry navigation and personal Join copy, and removes other reps pantry links', async () => {
  const seed = { ...original, appearancePreset: 'halloween_pumpkin_witch' as const,
    homepage: { ...homepage, repName: 'Heather', businessName: 'BlingKitchen', pantryPageUrl: '/blingkitchen/in-the-pantry' },
    trade: { ...trade, pantryPageUrl: '/blingkitchen/in-the-pantry' },
    join: { ...join, repName: 'Heather', businessName: 'BlingKitchen', pantryPageUrl: '/blingkitchen/in-the-pantry' },
  }
  for (const slug of ['blingkitchen', 'otherrep']) {
    const data = restrictPantryTemplateData(seed, { publicSiteSlug: slug })
    for (const page of ['homepage', 'trade', 'join'] as const) {
      const html = await render(page, data as typeof original, slug)
      if (slug === 'otherrep') expectNoPantryMarkup(html)
      else if (page === 'homepage') {
        expect(html.match(/>In the Pantry</g)?.length).toBeGreaterThanOrEqual(3)
        expect(html).toContain('data-ssr-hero="halloween_pumpkin_witch"')
      } else if (page === 'join') expect(html).toContain('Find your place with Heather')
    }
  }
})

it('gates Pantry SSR on both the rep render list and the pantry allowlist', () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'blingkitchen,milehighfizz,otherrep')
  for (const key of ['publicSiteSlugOverride', 'renderGateSlug']) {
    expect(shouldUseRepRenderV2(['Pantry.html'], { [key]: 'blingkitchen' })).toBe(true)
    for (const slug of ['milehighfizz', 'otherrep', 'dudesfizzfest']) expect(shouldUseRepRenderV2(['Pantry.html'], { [key]: slug })).toBe(false)
  }
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
  expect(shouldUseRepRenderV2(['Pantry.html'], { publicSiteSlugOverride: 'blingkitchen' })).toBe(false)
})

it('server renders the Pantry recipes with the unchanged Morganite fallback and compiled hydration', async () => {
  smoke()
  const data = pantrySmokeReview({ ...pantry, appearancePreset: 'halloween_pumpkin_witch' }, 'blingkitchen')
  const html = await renderAmethystPantryFirstPaint(readFileSync('lib/amethyst/legacy/assets/Pantry.html', 'utf8'), buildAmethystPantryBootstrapScript(data), data)
  expect(html).toContain('data-server-rendered="true"')
  expect(html).toContain('<body class="bk-pantry-page bg-suite-paper surface-warm-paper btn-suite-lift">')
  expect(html).toContain('<h1>In the Pantry</h1>')
  for (const recipe of data.recipes) expect(html).toContain(recipe.title.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;'))
  for (const forbidden of ['unpkg', 'babel', 'text/babel', 'data-template-src=', 'bqhzfkgkjyuhlsozpylf']) expect(html).not.toContain(forbidden)
  expect(html).toContain('<script defer src="/amethyst/compiled/pantry.js"></script>')
  expect(html).toContain('data-ssr-fonts')
  for (const name of ['tokens.css', 'components.css', 'pantry.css']) expect(html).toContain(`data-ssr-style="${name}"`)
})

it('replaces every Live pantry image only under the exact Smoke environment and Heather slug', () => {
  smoke()
  const data = pantrySmokeReview(pantry, 'blingkitchen')
  expect(JSON.stringify(data)).not.toContain('bqhzfkgkjyuhlsozpylf')
  expect(data.heroImageUrl).toBe('/amethyst/bling-kitchen/homepage-hero-pendant.jpg')
  expect(data.recipes[0].image).toBe('/amethyst/bling-kitchen/tile-wall.webp')
  for (const slug of ['otherrep', 'dudesfizzfest', undefined]) expect(pantrySmokeReview(pantry, slug)).toBe(pantry)
  for (const [key, value] of [['VERCEL_ENV', 'production'], ['VERCEL_PROJECT_ID', 'other'], ['NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'live'], ['NEXT_PUBLIC_SUPABASE_URL', 'https://other.supabase.co']]) {
    const saved = process.env[key]; vi.stubEnv(key, value)
    expect(pantrySmokeReview(pantry, 'blingkitchen')).toBe(pantry)
    vi.stubEnv(key, saved)
  }
})

it('keeps both pantry routes at 404 for listed otherrep and dudesfizzfest before renderer data reads', async () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'otherrep,dudesfizzfest')
  const { GET: slugRoute } = await import('@/app/[publicSiteSlug]/in-the-pantry/route')
  const { GET: customerRoute } = await import('@/app/customer-site/[page]/route')
  for (const slug of ['otherrep', 'dudesfizzfest']) {
    const slugResponse = await slugRoute(new Request(`https://fixture.vercel.app/${slug}/in-the-pantry`), { params: Promise.resolve({ publicSiteSlug: slug }) })
    const customerResponse = await customerRoute(new Request(`https://${slug}.com/customer-site/in-the-pantry`, { headers: { host: slug + '.com' } }), { params: Promise.resolve({ page: 'in-the-pantry' }) })
    for (const response of [slugResponse, customerResponse]) {
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not found')
    }
  }
})
