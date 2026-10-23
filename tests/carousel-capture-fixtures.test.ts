import { describe, expect, it } from 'vitest'
import { buildCarouselCaptureFixture, type CaptureTheme } from '../scripts/prepare-carousel-capture-fixtures'

describe('local carousel capture fixture boundaries', () => {
  it('uses Lindsey’s bespoke renderer and original mountain video, independent of saved customer data', async () => {
    const fixture = await buildCarouselCaptureFixture('mile-high-fizz', 'http://127.0.0.1:4177')
    expect(fixture.payload).toMatchObject({
      businessName: 'Mile High Fizz', repName: 'Lindsey',
      publicSiteVariant: 'mile_high_fizz_hybrid', heroVideoUrl: '/mile-high-fizz/hero.mp4',
      heroSub: 'REVEALING SOMETHING MAGICAL TOGETHER', liveQueueEntries: [],
    })
    expect(fixture.preset).toBe('alpine_opal')
    expect(fixture.document).toContain('function MileHighFizzHomepage')
    expect(fixture.document).toContain('media-src http://127.0.0.1:4177/mile-high-fizz/hero.mp4;')
    expect(fixture.document).toContain("connect-src 'none'")
    expect(fixture.document).toContain("form-action 'none'")
    expect(fixture.document).not.toContain('data-template-src=')
    expect(fixture.document).toContain('window.__SPARKLE_LOCAL_CAPTURE__ = true')
    expect(fixture.document).toContain('window.AMETHYST_HOMEPAGE_EVENTS = [];')
    expect(Object.values(fixture.payload.streamLinks).every(value => !value || value === '#preview-action')).toBe(true)
  })

  it.each(['https://www.yoursparklesuite.com', 'http://localhost.evil.example', 'https://localhost:4177', 'http://user:password@localhost:4177', 'http://localhost:4177/path'])('rejects non-local or ambiguous origin %s before rendering', async origin => {
    await expect(buildCarouselCaptureFixture('mile-high-fizz', origin)).rejects.toThrow()
  })

  it('rejects arbitrary theme and batch selectors', async () => {
    await expect(buildCarouselCaptureFixture('all' as CaptureTheme, 'http://127.0.0.1:4177')).rejects.toThrow('Unknown capture theme')
    await expect(buildCarouselCaptureFixture('../../private' as CaptureTheme, 'http://127.0.0.1:4177')).rejects.toThrow('Unknown capture theme')
  })

  it.each([
    ['go-for-the-bling', 'gnome_garden', 'GofortheBling', 'Kim', 'A little wonder, a lot of sparkle.'],
    ['sparkly-butterflies', 'neon_butterfly', 'Sparkly Butterflies', 'Kelly', 'Your Sparkle, Taking Flight'],
  ])('replays the recorded customer identity with its actual everyday skin: %s', async (theme, preset, businessName, repName, heroHeadline) => {
    const fixture = await buildCarouselCaptureFixture(theme as CaptureTheme, 'http://127.0.0.1:4177')
    expect(fixture.preset).toBe(preset)
    expect(fixture.payload).toMatchObject({ businessName, repName, heroHeadline, liveQueueEntries: [] })
    expect(fixture.document).toContain('#skin-preview-notice{display:none!important}')
    expect(fixture.document).toContain('.au-controls button')
    if (theme === 'sparkly-butterflies') {
      expect(fixture.payload.streamLinks.whatnot).toBe('#preview-action')
      expect(fixture.payload.showFacebookVipHeroButton).toBe(true)
    }
  })
})
