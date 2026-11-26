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
/** Browser-only stand-in. The test browser fulfills this URL; nothing is stored. */
export const STAND_IN_PORTRAIT_URL = 'https://stand-in.test/portrait.jpg'

const sample: SiteSettingsDraft = {
  displayName: 'Sasha Sample',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparkle.sample',
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
  appearancePreset: 'sparkle_suite_morganite',
  signupDiscountEnabled: true,
  signupDiscountCode: 'WELCOME10',
  signupDiscountOffer: '10% off',
  signupDiscountMessage: "Thanks for joining! Here's 10% off your next order.",
  aboutHeading: 'Meet Sasha',
  aboutNarrative:
    'Sasha hosts live jewelry reveals from her living room. She started with one Friday night show and now her regulars plan their week around the next box.',
  socialHandles: {
    instagram: 'https://instagram.com/sparkle.sample',
    facebook: 'https://facebook.com/sparkle.sample',
    tiktok: 'https://www.tiktok.com/@sparkle.sample',
    youtube: '',
    whatnot: '',
  },
  socialVisibility: {
    instagramHero: true,
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

function SampleNotice() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <p data-testid="harness-notice" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      margin: '0 0 8px',
      padding: '4px 8px 4px 12px',
      borderRadius: 999,
      background: '#fff3d4',
      color: '#7a4b12',
      font: '700 0.78rem/1.2 "DM Sans", sans-serif',
    }}>
      Sample only. Nothing here saves.
      <button type="button" aria-label="Dismiss sample notice" onClick={() => setOpen(false)} style={{
        width: 32,
        height: 32,
        border: 0,
        borderRadius: 999,
        background: 'transparent',
        cursor: 'pointer',
      }}>×</button>
    </p>
  )
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
        nextShow={{ month: 'DEC', day: '12', name: 'Friday night reveal', time: '7:00 PM' }}
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
  openDialog = null,
  coverPhoto = false,
}: {
  mode?: 'gaps' | 'full' | 'states' | 'load-error' | 'no-photo'
  openSection?: SiteSectionId | null
  openDialog?: 'signup' | 'links' | null
  /** Test browser only. Points the About photo at STAND_IN_PORTRAIT_URL. */
  coverPhoto?: boolean
}) {
  const [reloaded, setReloaded] = useState(false)
  const saved: SiteSettingsDraft =
    mode === 'full' || mode === 'states'
      ? sample
      : mode === 'no-photo'
        ? {
            ...sample,
            homepageMediaSlots: sample.homepageMediaSlots?.map((slot) =>
              slot.key === 'about_1' ? { ...slot, imageUrl: '', caption: '' } : slot,
            ),
          }
        : {
            ...sample,
            shopLink: 'shop.example/sasha',
            ...(coverPhoto
              ? {
                  homepageMediaSlots: sample.homepageMediaSlots?.map((slot) =>
                    slot.key === 'about_1'
                      ? { ...slot, imageUrl: STAND_IN_PORTRAIT_URL, portraitFocusX: 50, portraitFocusY: 18 }
                      : slot,
                  ),
                }
              : {}),
          }
  const [draft, setDraft] = useState(saved)
  if (mode === 'load-error') {
    return (
      <div data-testid="my-website-layout-harness" style={{ padding: '16px 16px 120px' }}>
        <SampleNotice />
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
        <SampleNotice />
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
      <SampleNotice />
      <SiteSettingsCard
        state={{ status: 'ready', settings: saved }}
        draft={draft}
        publicSiteUrl="https://sparklebysasha.example"
        publicSiteDisplay="sparklebysasha.example"
        canPreview
        previewThemeCards={reviewThemes}
        nextShow={{ month: 'DEC', day: '12', name: 'Friday night reveal', time: '7:00 PM' }}
        initialOpenSection={openSection}
        initialDialog={openDialog}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onPreview={() => undefined}
        onDiscard={() => setDraft(saved)}
        onSave={() => undefined}
      />
    </div>
  )
}
