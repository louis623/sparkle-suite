'use client'

import { useState } from 'react'
import {
  SiteSettingsCard,
  type SiteSettingsDraft,
} from '@/app/nic-nac/components/DashboardPlaceholder'
import type { SiteSectionId } from '@/app/nic-nac/components/site-settings-layout'

const video = 'https://www.youtube.com/shorts/abcdefghijk'

const sample: SiteSettingsDraft = {
  displayName: 'Sasha',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparklebysasha.example',
  phone: '',
  shopLink: 'https://bombparty.com/sasha',
  bannerText: '',
  bannerVisible: false,
  tickerText: 'Tonight’s reveal is live\nShop the [new drop](https://bombparty.com/sasha)',
  tickerVisible: true,
  tagline: 'Live jewelry, real sparkle.',
  heroHeadline: 'Real jewelry. Live reveals.',
  heroSubtitle: 'Come watch a live jewelry reveal with Sasha.',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow',
  teamName: 'Moonstone Squad',
  memberTeamName: 'Upline Gems',
  showJoinPage: true,
  joinTeamAccessEnabled: true,
  danceFloorVisible: true,
  liveLineupVisible: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'amethyst',
  signupDiscountEnabled: true,
  signupDiscountCode: 'SASHA10',
  signupDiscountMessage: 'Ten dollars off your first box.',
  aboutHeading: 'Meet Sasha',
  aboutNarrative:
    'Sasha hosts live jewelry reveals from her living room. She started with one Friday night show and now her regulars plan their week around the next box.',
  socialHandles: {
    instagram: 'https://instagram.com/sparklebysasha',
    facebook: 'https://facebook.com/sparklebysasha',
    tiktok: 'https://www.tiktok.com/@sparklebysasha',
    youtube: 'https://www.youtube.com/@sparklebysasha',
    whatnot: 'https://www.whatnot.com/user/sparklebysasha',
  },
  socialVisibility: {
    instagram: true,
    instagramHero: true,
    tiktok: true,
    tiktokHero: true,
  },
  homepageMediaSlots: [
    { key: 'showcase', caption: 'What a live reveal feels like', imageUrl: '', videoUrl: video, isVisible: true },
    {
      key: 'about_1',
      caption: 'Sasha before a Friday show',
      imageUrl: '/marketing/louis-headshot.webp',
      videoUrl: '',
      isVisible: true,
      sectionVisible: true,
    },
    { key: 'about_2', caption: 'Unboxing the new collection', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_3', caption: 'A favorite ring from last month', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_4', caption: 'The room just before go-live', imageUrl: '', videoUrl: video, isVisible: true },
  ],
}

export function MyWebsiteLayoutHarness({
  mode = 'gaps',
  openSection = null,
}: {
  mode?: 'gaps' | 'full'
  openSection?: SiteSectionId | null
}) {
  const saved: SiteSettingsDraft =
    mode === 'full'
      ? sample
      : {
          ...sample,
          shopLink: 'bombparty.com/sasha',
          homepageMediaSlots: sample.homepageMediaSlots?.map((slot) =>
            slot.key === 'about_1' ? { ...slot, imageUrl: '' } : slot,
          ),
        }
  const [draft, setDraft] = useState(saved)
  return (
    <div data-testid="my-website-layout-harness" style={{ padding: '16px 16px 120px' }}>
      <p style={{ marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
        Signed-out review harness. Sample content only. It does not save, publish, or call a signed-in preview.
      </p>
      <SiteSettingsCard
        state={{ status: 'ready', settings: saved }}
        draft={draft}
        publicSiteUrl="https://sparklebysasha.example"
        publicSiteDisplay="sparklebysasha.example"
        canPreview
        initialOpenSection={openSection}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onPreview={() => undefined}
        onDiscard={() => setDraft(saved)}
        onSave={() => undefined}
      />
    </div>
  )
}
