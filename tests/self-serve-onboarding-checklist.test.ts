import { describe, expect, it } from 'vitest'

import {
  SELF_SERVE_ONBOARDING_CHECKLIST,
  getSelfServeOnboardingChecklist,
} from '@/lib/services/self-serve-onboarding'

describe('self-serve onboarding checklist', () => {
  it('defines the first-run setup path Nic-Nac should guide after purchase', () => {
    expect(getSelfServeOnboardingChecklist()).toEqual(SELF_SERVE_ONBOARDING_CHECKLIST)
    expect(SELF_SERVE_ONBOARDING_CHECKLIST.map((item) => item.id)).toEqual([
      'business-profile',
      'skin-and-branding',
      'public-links',
      'site-copy',
      'shows',
      'trade-board',
      'calculator',
      'chrome-extension-live-queue',
      'publish-readiness',
    ])

    const combinedText = SELF_SERVE_ONBOARDING_CHECKLIST
      .flatMap((item) => [item.title, item.description, item.nicNacPrompt])
      .join(' ')

    expect(combinedText).toContain('Confirm business/profile basics')
    expect(combinedText).toContain('Confirm the Sparkle Suite/Morganite theme')
    expect(combinedText).not.toContain('Choose or confirm the customer-site skin')
    expect(combinedText).toContain('Add public links and social profiles')
    expect(combinedText).toContain('Adjust site copy')
    expect(combinedText).toContain('Add or update shows')
    expect(combinedText).toContain('Set up starter dance floor content')
    expect(combinedText).toContain('Learn the calculator')
    expect(combinedText).toContain('Understand the Chrome extension and Live Lineup')
    expect(combinedText).toContain('Review publish/share readiness')
  })
})
