import { describe, expect, it } from 'vitest'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import { groupThemeCards } from '@/lib/amethyst/theme-groups'
import {
  AUTOSAVE_WAIT_MS,
  autosaveTiming,
  draftHoldingInvalidFields,
  videoLinkFieldError,
} from '@/app/nic-nac/components/site-settings-save'
import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'

const saved = {
  shopLink: 'https://shop.example/sasha',
  email: 'hello@sparklebysasha.example',
  signupDiscountCode: 'SASHA10',
  signupDiscountEnabled: true,
  signupDiscountMessage: 'Ten dollars off',
  socialHandles: { instagram: 'https://example.com/instagram/sasha' },
} as SiteSettingsDraft

describe('My Website autosave', () => {
  it('waits 1.5s after text and saves a theme immediately', () => {
    expect(AUTOSAVE_WAIT_MS).toBe(1500)
    expect(autosaveTiming({ tagline: 'Live jewelry' })).toBe('debounce')
    expect(autosaveTiming({ appearancePreset: 'silver_bells' })).toBe('now')
    expect(autosaveTiming({ tickerVisible: false })).toBe('now')
  })

  it('leaves an invalid store link out of the save and keeps the other edits', () => {
    const ready = draftHoldingInvalidFields({
      ...saved,
      shopLink: 'not a url',
      tagline: 'A new tagline',
    }, saved)
    expect(ready.shopLink).toBe(saved.shopLink)
    expect(ready.tagline).toBe('A new tagline')
  })

  it('keeps the video links the server can save', () => {
    expect(videoLinkFieldError('https://vm.tiktok.com/ZMabcdef/')).toBeNull()
    expect(videoLinkFieldError('https://www.tiktok.com/t/ZMabcdef/')).toBeNull()
    expect(videoLinkFieldError('<blockquote cite="https://www.tiktok.com/@sparkle/video/1234567890123456789"></blockquote>')).toBeNull()
    expect(videoLinkFieldError('https://youtu.be/aBcDeF12')).toBeNull()
    expect(videoLinkFieldError('https://fb.watch/abc123/')).toBeNull()
    expect(videoLinkFieldError('this is not a video link')).toEqual(expect.any(String))
  })
})

describe('theme families', () => {
  it('puts Silver Bells in Christmas and Gobble and Fizz in Thanksgiving', () => {
    const offered = AMETHYST_SKIN_CARDS.filter((card) => card.selectable !== false && card.visibility === 'community')
    const groups = groupThemeCards(offered, [], 'amethyst', new Date('2026-11-24T18:00:00Z'))
    const christmas = groups.holiday.find((group) => group.series === 'christmas')
    const thanksgiving = groups.holiday.find((group) => group.series === 'thanksgiving')
    const fall = groups.holiday.find((group) => group.series === 'fall')
    expect(christmas?.themes.map((theme) => theme.id)).toEqual(expect.arrayContaining(['silver_bells', 'starlight_christmas_hollow']))
    expect(thanksgiving?.themes.map((theme) => theme.id)).toContain('gobble_and_fizz')
    expect(fall?.themes.map((theme) => theme.id)).toEqual(expect.arrayContaining(['pie_please', 'gilded_autumn', 'fall_owl_harvest_moon']))
    expect(groups.roseGold.map((theme) => theme.id)).toEqual(expect.arrayContaining(['rose_gold', 'sparkle_suite_morganite']))
    expect(groups.bombParty.map((theme) => theme.id)).toContain('amethyst')
    expect(groups.general.map((theme) => theme.id)).toContain('sunset_beach')
    expect(offered.some((card) => card.id === 'rose_quartz')).toBe(false)
    expect(christmas?.inSeason).toBe(true)
    expect(groups.holiday.findIndex((group) => group.series === 'halloween')).toBeGreaterThan(
      groups.holiday.findIndex((group) => group.series === 'christmas'),
    )
  })
})
