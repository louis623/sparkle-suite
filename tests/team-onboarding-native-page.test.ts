import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  officialResources,
  onboardingSteps,
  realityTips,
  supplyOptions,
} from '@/app/onboarding/onboarding-content'
import {
  buildSparkleRobots,
  buildSparkleSitemap,
} from '@/lib/seo/sparkle-crawl'

const appSource = readFileSync(
  'app/onboarding/[inviteSlug]/OnboardingExperience.tsx',
  'utf8',
)
const layoutSource = readFileSync('app/onboarding/layout.tsx', 'utf8')
const nextConfigSource = readFileSync('next.config.ts', 'utf8')
const proxySource = readFileSync('proxy.ts', 'utf8')

describe('native team onboarding page', () => {
  it('preserves the approved long-form checklist, resources, tips, and supply guide', () => {
    expect(onboardingSteps).toHaveLength(6)
    expect(onboardingSteps.map((step) => step.id)).toEqual([
      'start-strong-1',
      'start-strong-2',
      'start-strong-3',
      'start-strong-4',
      'start-strong-5',
      'start-strong-6',
    ])
    expect(officialResources.length).toBeGreaterThanOrEqual(7)
    expect(supplyOptions.length).toBeGreaterThanOrEqual(12)
    expect(realityTips).toHaveLength(5)
  })

  it('uses the owning workspace identity and contains no hard-coded rep name or business', () => {
    const nativeExperience = [
      appSource,
      JSON.stringify(onboardingSteps),
      JSON.stringify(supplyOptions),
    ].join('\n')

    expect(nativeExperience).toContain('state?.team.displayName')
    expect(nativeExperience).toContain('state?.team.businessName')
    expect(nativeExperience).not.toMatch(/Brittany|Britt With Bling/i)
  })

  it('keeps checklist progress and participant messages on the private-token APIs', () => {
    expect(appSource).toContain('/api/team-onboarding/access/progress?invite=')
    expect(appSource).toContain('/api/team-onboarding/access/messages?invite=')
    expect(appSource).toContain('/api/team-onboarding/access?invite=')
    expect(appSource).toContain("saveProgress(step.id, 'done')")
    expect(appSource).toContain('clientRequestId: crypto.randomUUID()')
  })

  it('excludes onboarding routes from search, caching, referrers, and the sitemap', () => {
    expect(layoutSource).toContain('index: false')
    expect(layoutSource).toContain('follow: false')
    expect(nextConfigSource).toContain("source: '/onboarding/:path*'")
    expect(nextConfigSource).toContain('noindex, nofollow, noarchive')
    expect(nextConfigSource).toContain('private, no-store, max-age=0')
    expect(nextConfigSource).toContain("value: 'no-referrer'")
    expect(proxySource).toContain("startsWith('/onboarding/')")
    expect(proxySource).toContain('noindex, nofollow, noarchive')

    const robots = buildSparkleRobots()
    expect(JSON.stringify(robots)).toContain('/onboarding/')
    expect(
      buildSparkleSitemap().some((entry) =>
        new URL(entry.url).pathname.startsWith('/onboarding'),
      ),
    ).toBe(false)
  })
})
