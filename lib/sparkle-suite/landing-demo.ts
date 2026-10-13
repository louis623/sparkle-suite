import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { AMETHYST_APPEARANCE_PRESETS } from '@/lib/amethyst/appearance-presets'
import { communityLandingThemes, exactLandingTheme, type LandingDemo } from './landing-demo-model'

export function landingDemoSlug(env: NodeJS.ProcessEnv = process.env) {
  const smoke = env.SPARKLE_ENVIRONMENT === 'smoke' && env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
  // Live needs its own explicit configuration when its release is approved.
  const slug = (env.SPARKLE_LANDING_DEMO_SLUG || (smoke ? 'dudesfizzfest' : '')).trim()
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) ? slug : null
}

export async function loadLandingDemo(slug: string, admin = createAdminClient()): Promise<LandingDemo> {
  const signal = AbortSignal.timeout(1500)
  const [repResult, catalog] = await Promise.all([
    admin.from('reps').select('id, business_name').eq('public_site_slug', slug).eq('status', 'active').abortSignal(signal).maybeSingle(),
    admin.from('amethyst_skin_catalog').select('skin_id, visibility').eq('visibility', 'community').abortSignal(signal),
  ])
  if (repResult.error || !repResult.data) throw new Error('Landing demo unavailable')
  const settings = await admin.from('site_settings').select('appearance_preset, hero_headline, hero_subtitle, ticker_text')
    .eq('rep_id', repResult.data.id).abortSignal(signal).maybeSingle()
  const theme = exactLandingTheme(settings.data?.appearance_preset)
  if (settings.error || !theme) throw new Error('Landing demo theme unavailable')
  // A catalog failure never broadens the public choices to the code inventory.
  return {
    slug, businessName: repResult.data.business_name || 'Demo site', theme,
    themeLabel: AMETHYST_APPEARANCE_PRESETS[theme].label,
    headline: settings.data?.hero_headline || '',
    subtitle: settings.data?.hero_subtitle || '',
    ticker: settings.data?.ticker_text || '',
    themes: catalog.error ? [] : communityLandingThemes(catalog.data || []),
  }
}

const cachedDemo = unstable_cache(
  async (slug: string, environment: string) => { void environment; return loadLandingDemo(slug) },
  ['landing-demo-v3'], { revalidate: 30 },
)
export async function readLandingDemo(): Promise<LandingDemo | null> {
  const slug = landingDemoSlug()
  if (!slug) return null
  try { return await cachedDemo(slug, process.env.NEXT_PUBLIC_SUPABASE_URL || '') } catch { return null }
}
