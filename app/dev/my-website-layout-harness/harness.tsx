'use client'

import { useState } from 'react'
import {
  SiteSettingsCard,
  type SiteSettingsDraft,
} from '@/app/nic-nac/components/DashboardPlaceholder'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import type { SiteSectionId } from '@/app/nic-nac/components/site-settings-layout'

const reviewThemes = AMETHYST_SKIN_CARDS.filter(
  (card) => card.visibility === 'community' && card.selectable !== false,
)

const video = 'https://video.example/shorts/sample'
const shop = 'https://shop.example/sasha'

const sample: SiteSettingsDraft = {
  displayName: 'Sasha Sample',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparklebysasha.example',
  phone: '',
  shopLink: shop,
  bannerText: '',
  bannerVisible: false,
  tickerText: `Tonight’s reveal is live\nShop the [new drop](${shop})`,
  tickerVisible: true,
  tagline: 'Live jewelry, real sparkle.',
  heroHeadline: 'Real jewelry. Live reveals.',
  heroSubtitle: 'Come watch a live jewelry reveal with Sasha.',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow',
  heroMotionMode: 'choices',
  teamName: 'Sample Squad',
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
    instagram: 'https://example.com/instagram/sparklebysasha',
    facebook: 'https://example.com/facebook/sparklebysasha',
    tiktok: 'https://example.com/tiktok/sparklebysasha',
    youtube: 'https://example.com/youtube/sparklebysasha',
    whatnot: 'https://example.com/whatnot/sparklebysasha',
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
      imageUrl: '/dev/sample-portrait.svg',
      videoUrl: '',
      isVisible: true,
      sectionVisible: true,
    },
    { key: 'about_2', caption: 'Unboxing the new collection', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_3', caption: 'A favorite ring from last month', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_4', caption: 'The room just before go-live', imageUrl: '', videoUrl: video, isVisible: true },
  ],
}

function ReviewCard({
  title,
  saved,
  slug,
  openSections,
}: {
  title: string
  saved: SiteSettingsDraft
  slug?: string
  openSections?: SiteSectionId[]
}) {
  const [draft, setDraft] = useState(saved)
  return (
    <section aria-label={title} data-sample-slug={slug} style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '1.1rem' }}>{title}</h2>
      <SiteSettingsCard
        state={{ status: 'ready', settings: saved }}
        draft={draft}
        publicSiteUrl="https://sparklebysasha.example"
        publicSiteDisplay="sparklebysasha.example"
        canPreview
        previewThemeCards={reviewThemes}
        initialOpenSections={openSections}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onPreview={() => undefined}
        onDiscard={() => setDraft(saved)}
        onSave={() => undefined}
      />
    </section>
  )
}

export function MyWebsiteLayoutHarness({
  mode = 'gaps',
  openSection = null,
}: {
  mode?: 'gaps' | 'full' | 'states' | 'load-error'
  openSection?: SiteSectionId | null
}) {
  const [reloaded, setReloaded] = useState(false)
  const saved: SiteSettingsDraft =
    mode === 'full' || mode === 'states'
      ? sample
      : {
          ...sample,
          shopLink: 'shop.example/sasha',
          homepageMediaSlots: sample.homepageMediaSlots?.map((slot) =>
            slot.key === 'about_1' ? { ...slot, imageUrl: '' } : slot,
          ),
        }
  const [draft, setDraft] = useState(saved)
  if (mode === 'load-error') {
    return (
      <div data-testid="my-website-layout-harness" style={{ padding: '16px 16px 120px' }}>
        <p style={{ marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Signed-out review harness. Sample content only. It does not save, publish, or call a signed-in preview.
        </p>
        {reloaded ? (
          <p data-testid="settings-reloaded">Settings loaded.</p>
        ) : (
          <SiteSettingsCard
            state={{ status: 'error' }}
            onRetry={() => setReloaded(true)}
          />
        )}
      </div>
    )
  }
  if (mode === 'states') {
    return (
      <div data-testid="my-website-layout-harness" style={{ padding: '16px 16px 120px' }}>
        <p style={{ marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Signed-out review harness. Sample content only. It does not save, publish, or call a signed-in preview.
        </p>
        <ReviewCard
          title="Listed standard rep: no Hero control"
          saved={{ ...sample, heroMotionMode: 'theme', grandfatheredHeadlineFallback: false }}
          slug="sample-theme"
          openSections={['hero', 'footer']}
        />
        <ReviewCard
          title="Unlisted standard rep: Hero motion"
          saved={{ ...sample, heroMotionMode: 'choices', grandfatheredHeadlineFallback: false }}
          slug="sample-choices"
          openSections={['hero', 'footer']}
        />
        <ReviewCard
          title="Custom layout: Hero animation"
          saved={{ ...sample, heroMotionMode: 'switch', grandfatheredHeadlineFallback: true }}
          slug="sample-switch"
          openSections={['hero', 'footer']}
        />
      </div>
    )
  }
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
        previewThemeCards={reviewThemes}
        initialOpenSection={openSection}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onPreview={() => undefined}
        onDiscard={() => setDraft(saved)}
        onSave={() => undefined}
      />
    </div>
  )
}
