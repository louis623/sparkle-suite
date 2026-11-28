// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SiteSettingsCard, type SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import {
  buildSiteSetupChecklist,
  siteSectionStatus,
  siteSetupRemaining,
} from '@/app/nic-nac/components/site-settings-layout'
import { isMyWebsiteLayoutHarnessEnabled } from '@/app/dev/my-website-layout-harness/access'
import { getAmethystSkinCard } from '@/lib/amethyst/skin-cards'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const sections = [
  'top-bar',
  'hero',
  'about',
  'bomb-party',
  'signup',
  'footer',
] as const

const controls: Array<{ id: string; section: string; optional?: boolean }> = [
  { id: 'business-name', section: 'top-bar' },
  { id: 'display-name', section: 'top-bar' },
  { id: 'shop-link', section: 'top-bar' },
  { id: 'ticker-text', section: 'top-bar' },
  { id: 'ticker-emoji', section: 'top-bar' },
  { id: 'ticker-link-url', section: 'top-bar' },
  { id: 'link-selected-words', section: 'top-bar' },
  { id: 'plain-text-links', section: 'top-bar' },
  { id: 'show-announcements', section: 'top-bar' },
  { id: 'hero-headline', section: 'hero' },
  { id: 'hero-subtitle', section: 'hero' },
  { id: 'reveal-video', section: 'bomb-party' },
  { id: 'reveal-caption', section: 'bomb-party' },
  { id: 'about-title', section: 'about' },
  { id: 'about-story', section: 'about' },
  { id: 'about-photo', section: 'about' },
  { id: 'smart-frame', section: 'about' },
  { id: 'photo-caption', section: 'about' },
  { id: 'remove-photo', section: 'about' },
  { id: 'about-video', section: 'about' },
  { id: 'video-caption', section: 'about' },
  { id: 'remove-video', section: 'about' },
  { id: 'britt-about-section', section: 'about' },
  { id: 'signup-switch', section: 'signup' },
  { id: 'discount-code', section: 'signup' },
  { id: 'discount-offer', section: 'signup' },
  { id: 'discount-message', section: 'signup' },
  { id: 'tagline', section: 'footer' },
  { id: 'email', section: 'footer' },
  { id: 'social-link', section: 'footer' },
  { id: 'social-show-on-site', section: 'footer' },
  { id: 'social-show-in-hero', section: 'footer' },
  { id: 'member-team', section: 'footer' },
]

const video = 'https://www.youtube.com/shorts/abcdefghijk'

const ready = {
  displayName: 'Sasha',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparklebysasha.com',
  phone: '',
  shopLink: 'https://bombparty.com/sasha',
  bannerText: '',
  bannerVisible: false,
  tickerText: '[Live tonight](https://bombparty.com/live)\nShop the [new drop](https://bombparty.com/sasha)',
  tickerVisible: true,
  tagline: 'Live sparkle, zero stress.',
  heroHeadline: 'Real jewelry. Live reveals.',
  heroSubtitle: 'Come watch a reveal with Sasha.',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow' as const,
  teamName: 'Moonstone Squad',
  memberTeamName: 'Upline Gems',
  showJoinPage: true,
  joinTeamAccessEnabled: true,
  danceFloorVisible: true,
  liveLineupVisible: true,
  customerSiteTemplate: 'amethyst' as const,
  appearancePreset: 'amethyst' as const,
  signupDiscountEnabled: true,
  signupDiscountCode: 'SASHA10',
  signupDiscountMessage: 'Ten dollars off your first box.',
  aboutHeading: 'Meet Sasha',
  aboutNarrative: 'Sasha started hosting live jewelry reveals for her neighborhood.',
  socialHandles: {
    instagram: 'https://instagram.com/sparklebysasha',
    facebook: 'https://facebook.com/sparklebysasha',
    tiktok: 'https://www.tiktok.com/@sparklebysasha',
    youtube: 'https://www.youtube.com/@sparklebysasha',
    whatnot: 'https://www.whatnot.com/user/sparklebysasha',
  },
  socialVisibility: {
    instagram: true,
    facebook: true,
    tiktok: true,
    youtube: true,
    whatnot: true,
    instagramHero: true,
    facebookVipHero: true,
  },
  homepageMediaSlots: [
    { key: 'showcase' as const, caption: 'A live reveal', imageUrl: '', videoUrl: video, isVisible: true },
    {
      key: 'about_1' as const,
      caption: 'Sasha at a show',
      imageUrl: 'https://example.com/sasha.jpg',
      videoUrl: '',
      isVisible: true,
      sectionVisible: true,
    },
    { key: 'about_2' as const, caption: 'First short video', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_3' as const, caption: 'Second short video', imageUrl: '', videoUrl: video, isVisible: true },
    { key: 'about_4' as const, caption: 'Third short video', imageUrl: '', videoUrl: video, isVisible: true },
  ],
}

function gapsDraft(): SiteSettingsDraft {
  return {
    ...ready,
    shopLink: 'bombparty.com/x',
    homepageMediaSlots: ready.homepageMediaSlots.map((slot) =>
      slot.key === 'about_1' ? { ...slot, imageUrl: '' } : slot,
    ),
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function renderCard(draft: SiteSettingsDraft, extra: {
  britt?: boolean
  savedPreset?: SiteSettingsDraft['appearancePreset']
  lookPreview?: SiteSettingsDashboardResult['lookPreview']
} = {}) {
  await act(async () => {
    root.render(
      createElement(SiteSettingsCard, {
        state: {
          status: 'ready',
          settings: {
            ...draft,
            appearancePreset: extra.savedPreset ?? draft.appearancePreset,
            joinTeamAccessEnabled: true,
            lookPreview: extra.lookPreview,
          },
        },
        draft,
        publicSiteUrl: 'https://sparklebysasha.example',
        isBrittWithBling: extra.britt === true,
      }),
    )
  })
}

describe('Look tile preview', () => {
  const draft = { ...ready, appearancePreset: 'silver_bells' } as const
  const poster = getAmethystSkinCard(draft.appearancePreset).thumb
  const stored = { status: 'ready', desktopUrl: '/old-desktop.webp', phoneUrl: '/old-phone.webp' } as const
  const captured = { status: 'ready', desktopUrl: '/new-desktop.webp', phoneUrl: '/new-phone.webp' } as const
  const tile = () => host.querySelector('[data-tile-art="look"]')!

  it('shows the current poster before saving and through a failed recapture', async () => {
    await renderCard(ready, { lookPreview: stored })
    const oldShot = tile().querySelector<HTMLImageElement>('picture img')!
    Object.defineProperty(oldShot, 'naturalWidth', { value: 1440 })
    await act(async () => { oldShot.dispatchEvent(new Event('load')) })
    expect(tile().getAttribute('data-look-source')).toBe('shot')

    await renderCard(draft, { savedPreset: ready.appearancePreset, lookPreview: stored })
    expect(tile().querySelector('img')?.getAttribute('src')).toBe(poster)
    expect(tile().querySelector('picture')).toBeNull()

    for (const status of ['updating', 'failed'] as const) {
      await renderCard(draft, { lookPreview: { ...stored, status } })
      expect(tile().querySelector('img')?.getAttribute('src')).toBe(poster)
      expect(tile().querySelector('picture')).toBeNull()
    }
  })

  it('shows the current theme label when there is no poster', async () => {
    const theme = getAmethystSkinCard('rose_gold')
    expect(theme.thumb).toBeNull()
    await renderCard({ ...ready, appearancePreset: 'rose_gold' }, { lookPreview: { ...stored, status: 'failed' } })
    expect(tile().textContent).toBe(theme.label)
    expect(tile().querySelector('img')).toBeNull()
  })

  it('swaps to decoded ready URLs even if the give-up callback changes mid-load', async () => {
    await renderCard(draft, { lookPreview: { ...stored, status: 'updating' } })
    await renderCard(draft, { lookPreview: captured })
    const picture = tile().querySelector('picture')!
    const image = picture.querySelector('img')!
    const decoded = Promise.withResolvers<void>()
    Object.defineProperties(image, {
      naturalWidth: { value: 1440 },
      decode: { value: () => decoded.promise },
    })
    await act(async () => { image.dispatchEvent(new Event('load')) })
    expect(picture.hidden).toBe(true)
    expect(tile().querySelector('img')?.getAttribute('src')).toBe(poster)

    await renderCard(draft, { lookPreview: captured })
    await act(async () => { decoded.resolve() })
    expect(picture.hidden).toBe(false)
    expect(tile().getAttribute('data-look-source')).toBe('shot')
    expect(tile().querySelector('img')?.getAttribute('src')).toBe(captured.desktopUrl)
    expect(picture.querySelector('source')?.getAttribute('srcset')).toBe(captured.phoneUrl)
  })

  it('keeps the poster visible when a ready screenshot fails to load', async () => {
    await renderCard(draft, { lookPreview: captured })
    expect(tile().textContent).toContain('Updating preview')
    await act(async () => { tile().querySelector('picture img')!.dispatchEvent(new Event('error')) })
    expect(tile().textContent).not.toContain('Updating preview')
    expect(tile().querySelector('picture')?.hidden).toBe(true)
    expect(tile().querySelector('img')?.getAttribute('src')).toBe(poster)
  })
})

describe('site settings layout map', () => {
  it('keeps every current control in one homepage section, in customer scroll order', async () => {
    await renderCard(ready, { britt: true })
    expect(
      [...host.querySelectorAll('[data-site-section]')].map((node) => node.getAttribute('data-site-section')),
    ).toEqual([...sections])

    for (const control of controls) {
      const nodes = [...host.querySelectorAll(`[data-site-control="${control.id}"]`)]
      expect(nodes.length, control.id).toBeGreaterThan(0)
      const found = new Set(
        nodes.map((node) => node.closest('[data-site-section]')?.getAttribute('data-site-section')),
      )
      expect(found, control.id).toEqual(new Set([control.section]))
    }

    for (const id of ['team-i-manage']) {
      const nodes = [...host.querySelectorAll(`[data-site-control="${id}"]`)]
      expect(nodes).toHaveLength(1)
      expect(nodes[0]?.getAttribute('data-chunk')).toBe('4')
    }

    const legendFields = new Set(['email', 'tagline', 'member-team', 'team-i-manage', 'about-title', 'about-story', 'about-photo', 'photo-caption', 'smart-frame', 'reveal-video', 'reveal-caption', 'about-video', 'video-caption'])
    const fields = [...host.querySelectorAll('[data-site-field]')]
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) {
      const id = field.getAttribute('data-site-field') ?? ''
      if (legendFields.has(id) || id.startsWith('social-')) continue
      expect(field.textContent, id).toContain('Shows on your site:')
    }
    expect(host.textContent).toContain('Shows on your site: Every Shop button on your site')
    expect(host.textContent).toContain('Your email shows on the Join page. The tagline and team line appear in small print on your site.')
    expect(host.textContent).not.toContain('Open Calendar')
    expect(host.textContent).toContain('What they get')
    expect(host.textContent).toContain('Sign-up discount')
    expect(host.querySelector('[data-site-control="team-settings"]')?.getAttribute('href')).toBe(
      '/nic-nac?section=team-management',
    )
    expect(host.textContent).toContain('Make existing links plain text')
    expect(host.textContent).toContain('This fixes an older ticker link that made a whole message clickable.')
    expect(host.textContent).toContain('Pages on your site')
    expect(host.textContent).toContain('Live pages show on your website. Hidden pages stay in your workspace until you turn them back on.')
    expect(host.textContent).toContain('Socials and Contact Info')
    expect(host.textContent).toContain('Your email, tagline, and social links.')
    expect(host.textContent).toContain('Your email, footer tagline, and social links.')
    expect(host.textContent).toContain('Paste a link, then choose On site or In hero. The preview shows what customers will see.')
    expect(host.textContent).toContain('Customer preview')
    expect(host.textContent).toContain('Your footer, hero buttons, and Watch on TikTok when a TikTok link is saved. It updates as you type.')
    expect(host.textContent).not.toContain('This is what customers use to reach you, plus the short line under your site.')
    expect(host.textContent).not.toContain('Links & other pages')

    const linksDialog = host.querySelector('#site-links-title')?.closest('dialog')
    const lookDialog = host.querySelector('#site-look-title')?.closest('dialog')
    expect(linksDialog?.querySelector('[data-site-control="dance-floor"]')).toBeNull()
    expect(linksDialog?.querySelector('[data-site-control="join-team"]')).toBeNull()
    expect(linksDialog?.querySelector('[data-site-control="live-lineup"]')).toBeNull()
    expect(linksDialog?.querySelector('[data-site-control="show-announcements"]')).toBeNull()
    expect(lookDialog?.querySelector('[data-site-control="show-announcements"]')).not.toBeNull()
    for (const id of ['dance-floor', 'join-team', 'live-lineup', 'team-settings']) {
      const nodes = [...host.querySelectorAll(`[data-site-control="${id}"]`)]
      expect(nodes.length, id).toBeGreaterThan(0)
      for (const node of nodes) expect(node.closest('[data-page-strip]'), id).not.toBeNull()
    }
    const css = readFileSync('app/nic-nac/components/DashboardPlaceholder.module.css', 'utf8')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(css).toContain('@media (min-width: 640px)')
    expect(css).toContain('grid-template-columns: 110px minmax(0, 1fr)')
    expect(css).not.toMatch(/\.siteHomeGrid \{ display: grid; grid-template-columns: repeat\(4/)
  })

  it('counts seven checklist items and opens the store link when two are left', async () => {
    const draft = gapsDraft()
    const items = buildSiteSetupChecklist(draft)
    expect(items).toHaveLength(7)
    expect(items.map((item) => item.label)).toEqual([
      'Business name',
      'Your first name',
      'Store link',
      'Big headline',
      'About story',
      'About photo',
      'At least one social link',
    ])
    expect(siteSetupRemaining(items).map((item) => item.id)).toEqual(['store-link', 'about-photo'])
    expect(siteSectionStatus({ section: 'top-bar', checklist: items, draft })).toBe('Fix 1')
    expect(siteSectionStatus({ section: 'about', checklist: items, draft })).toBe('Add photo')

    await renderCard(draft)
    expect(host.textContent).toContain('2 of 4 ready')
    expect(host.textContent).toContain('Needs 1 thing')
    expect(host.querySelector('#site-section-top-bar #my-website-shop-link')).not.toBeNull()
    expect(host.querySelector('#site-section-about')).not.toBeNull()
  })

  it('hides the plain-text cleanup until an old link exists, and keeps the Britt switch Britt-only', async () => {
    await renderCard({ ...ready, tickerText: 'Live tonight' }, { britt: false })
    expect(host.querySelector('[data-site-control="plain-text-links"]')).toBeNull()
    expect(host.querySelector('[data-site-control="britt-about-section"]')).toBeNull()
    expect(host.textContent).not.toContain('Show the About Brittany and Sparkle Moments section')
  })

  it('sends a page switch through the same draft save and keeps the early-access Join gate', async () => {
    const seen: Array<Partial<SiteSettingsDraft>> = []
    function Harness() {
      const [draft, setDraft] = useState<SiteSettingsDraft>({ ...ready, joinTeamAccessEnabled: false })
      return createElement(SiteSettingsCard, {
        state: { status: 'ready', settings: { ...ready, joinTeamAccessEnabled: false } },
        draft,
        onDraftChange: (patch) => {
          seen.push(patch)
          setDraft((current) => ({ ...current, ...patch }))
        },
      })
    }
    await act(async () => {
      root.render(createElement(Harness))
    })
    const dance = host.querySelector('[data-site-control="dance-floor"]') as HTMLInputElement
    const join = host.querySelector('[data-site-control="join-team"]') as HTMLInputElement
    expect(join.disabled).toBe(true)
    await act(async () => {
      dance.click()
    })
    expect(seen.at(-1)).toMatchObject({ danceFloorVisible: false })
    expect(host.querySelector('[data-site-control="dance-floor"]')).toBeTruthy()
  })

  it('gates the signed-out layout harness to development and Smoke', () => {
    expect(isMyWebsiteLayoutHarnessEnabled({ NODE_ENV: 'development' })).toBe(true)
    expect(isMyWebsiteLayoutHarnessEnabled({ NODE_ENV: 'production', SPARKLE_ENVIRONMENT: 'smoke' })).toBe(true)
    expect(isMyWebsiteLayoutHarnessEnabled({ NODE_ENV: 'production', SPARKLE_ENVIRONMENT: 'live' })).toBe(false)
    const page = readFileSync('app/dev/my-website-layout-harness/page.tsx', 'utf8')
    expect(page).toContain('isMyWebsiteLayoutHarnessEnabled')
    expect(page).toContain('notFound')
  })
})
