'use client'

import { useState } from 'react'
import {
  SiteSettingsCard,
  getNormalizedSiteSettingsDraft,
  type SiteSettingsDraft,
} from '@/app/nic-nac/components/DashboardPlaceholder'
import { listSiteSettingsChanges } from '@/app/nic-nac/components/site-settings-save'

const saved: SiteSettingsDraft = {
  displayName: 'Fizz',
  businessName: 'Fizz Festival',
  email: 'fizz@example.com',
  phone: '',
  shopLink: 'https://shop.example/fizz',
  bannerText: '',
  bannerVisible: false,
  tickerText: 'Festival night',
  tickerVisible: true,
  tagline: 'Pop, fizz, sparkle.',
  heroHeadline: 'Fizz Festival',
  heroSubtitle: 'A night of reveals',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow',
  teamName: 'Festival Crew',
  showJoinPage: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'amethyst',
  socialHandles: { instagram: '@fizzfestival' },
  signupDiscountEnabled: false,
  signupDiscountCode: '',
  signupDiscountMessage: '',
}

const dirty: SiteSettingsDraft = {
  ...saved,
  displayName: 'Fizz Festival',
  email: 'hello@fizzfestival.example',
  tagline: 'Three fields, one bar.',
}

export function MyWebsiteSaveHarness({ clean = false }: { clean?: boolean }) {
  const [draft, setDraft] = useState(clean ? saved : dirty)
  const changes = listSiteSettingsChanges(
    getNormalizedSiteSettingsDraft(saved),
    getNormalizedSiteSettingsDraft(draft),
  )
  return (
    <div data-testid="my-website-save-harness" style={{ padding: '16px 16px 160px' }}>
      <p style={{ marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
        Signed-out review harness. It does not save, publish, or call a signed-in preview.
      </p>
      <SiteSettingsCard
        state={{ status: 'ready', settings: saved }}
        draft={draft}
        changes={changes}
        publicSiteUrl="https://fizzfestival.example"
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onDiscard={() => setDraft(saved)}
        onSave={() => undefined}
      />
      <div
        data-workspace-tab-bar=""
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-around',
          gap: 8,
          minHeight: 72,
          padding: '8px 12px calc(12px + env(safe-area-inset-bottom))',
          background: 'rgba(255,255,255,0.96)',
          borderTop: '1px solid rgba(67, 42, 116, 0.12)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 800,
        }}
      >
        <span>Home</span>
        <span>My Website</span>
        <span>More</span>
      </div>
    </div>
  )
}
