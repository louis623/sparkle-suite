// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SiteSettingsCard, type SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import { SocialPhonePreview } from '@/app/nic-nac/components/SocialPhonePreview'

const draft = {
  displayName: 'Sasha Sample',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparkle.sample',
  phone: '',
  shopLink: 'https://bombparty.com/sasha',
  bannerText: '',
  bannerVisible: false,
  tickerText: '',
  tickerVisible: true,
  tagline: 'Live jewelry, real sparkle.',
  heroHeadline: '',
  heroSubtitle: '',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow' as const,
  teamName: 'Sample Squad',
  memberTeamName: 'Upline Gems',
  showJoinPage: false,
  joinTeamAccessEnabled: false,
  danceFloorVisible: true,
  liveLineupVisible: true,
  customerSiteTemplate: 'amethyst' as const,
  appearancePreset: 'amethyst' as const,
  signupDiscountEnabled: false,
  signupDiscountCode: '',
  signupDiscountMessage: '',
  aboutHeading: '',
  aboutNarrative: '',
  socialHandles: {
    instagram: 'https://instagram.com/sparkle.sample',
    facebook: 'https://facebook.com/sparkle.sample',
    tiktok: '',
    youtube: '',
    whatnot: '',
  },
  socialVisibility: { instagramHero: true },
  homepageMediaSlots: [],
} satisfies SiteSettingsDraft

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.matchMedia = (() => ({
    matches: false,
    media: '',
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

describe('socials phone preview', () => {
  it('shows the saved footer, hero button, and omits empty socials', () => {
    act(() => {
      root.render(createElement(SocialPhonePreview, {
        businessName: draft.businessName,
        displayName: draft.displayName,
        tagline: draft.tagline,
        socialHandles: draft.socialHandles,
        socialVisibility: draft.socialVisibility,
      }))
    })
    expect(host.textContent).toContain('Customer preview')
    expect(host.textContent).toContain('Sparkle by Sasha')
    expect(host.textContent).toContain('Sasha')
    expect(host.querySelector('[data-social-preview="tagline"]')?.textContent).toBe('Live jewelry, real sparkle.')
    expect(host.querySelector('[data-social-preview="hero"]')?.textContent).toContain('Instagram')
    expect(host.querySelector('[data-social-preview="hero"]')?.textContent).not.toContain('Facebook')
    expect(host.querySelector('[data-social-preview="footer"]')?.querySelectorAll('i')).toHaveLength(2)
  })

  it('updates the phone preview as the tagline changes', async () => {
    function Harness() {
      const [current, setCurrent] = useState(draft)
      return createElement(SiteSettingsCard, {
        state: { status: 'ready', settings: { ...current, joinTeamAccessEnabled: true } },
        draft: current,
        onDraftChange: (patch) => setCurrent((value) => ({ ...value, ...patch })),
      })
    }
    await act(async () => {
      root.render(createElement(Harness))
    })
    const tagline = host.querySelector('[data-site-control="tagline"]') as HTMLInputElement
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      set?.call(tagline, 'New footer line')
      tagline.dispatchEvent(new Event('input', { bubbles: true }))
      tagline.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(host.querySelector('[data-social-preview="tagline"]')?.textContent).toBe('New footer line')
  })

  it('uses a quiet empty cover when the rep has no name, email, or socials', async () => {
    const empty = {
      ...draft,
      displayName: '',
      businessName: 'Sparkle by Sasha',
      email: '',
      tagline: '',
      socialHandles: { instagram: '', facebook: '', tiktok: '', youtube: '', whatnot: '' },
    }
    await act(async () => {
      root.render(createElement(SiteSettingsCard, {
        state: { status: 'ready', settings: { ...empty, joinTeamAccessEnabled: false } },
        draft: empty,
      }))
    })
    const cover = host.querySelector('[data-cover="empty"]')
    expect(cover?.textContent).toContain('S')
    expect(cover?.textContent).toContain('Add your email')
    expect(cover?.textContent).toContain('Add a social link')
    expect(cover?.textContent).not.toContain('hello@')
    expect(cover?.textContent).not.toContain('instagram.com')
  })
})
