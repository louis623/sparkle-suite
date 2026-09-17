import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SocialMark } from '@/lib/amethyst/social-mark-icon'
import {
  isLiveSocialHref,
  resolveSocialPlatform,
  SOCIAL_PLATFORMS,
  socialMarkClassName,
  socialPlatformLabel,
} from '@/lib/amethyst/social-mark'

describe('customer social marks', () => {
  it('hides empty, hash, and placeholder hrefs', () => {
    expect(isLiveSocialHref(undefined)).toBe(false)
    expect(isLiveSocialHref('')).toBe(false)
    expect(isLiveSocialHref('   ')).toBe(false)
    expect(isLiveSocialHref('#')).toBe(false)
    expect(isLiveSocialHref('#watch-live')).toBe(false)
    expect(isLiveSocialHref('javascript:void(0)')).toBe(false)
    expect(isLiveSocialHref('about:blank')).toBe(false)
    expect(isLiveSocialHref('/')).toBe(false)
    expect(isLiveSocialHref('https://www.tiktok.com/@sparkle')).toBe(true)
    expect(isLiveSocialHref('//www.whatnot.com/user/sparkle')).toBe(true)
  })

  it('detects v1 platforms from keys, labels, and URL hosts', () => {
    expect(resolveSocialPlatform({ key: 'tt' })).toBe('tiktok')
    expect(resolveSocialPlatform({ key: 'wn' })).toBe('whatnot')
    expect(resolveSocialPlatform({ key: 'crown' })).toBe('website')
    expect(resolveSocialPlatform({ label: 'Facebook VIP' })).toBe('facebook')
    expect(resolveSocialPlatform({ shortLabel: 'IG' })).toBe('instagram')
    expect(
      resolveSocialPlatform({ href: 'https://www.youtube.com/@sparkle' }),
    ).toBe('youtube')
    expect(
      resolveSocialPlatform({
        key: 'web',
        href: 'https://www.instagram.com/sparkle',
      }),
    ).toBe('instagram')
    expect(
      resolveSocialPlatform({
        key: 'yt',
        href: 'https://www.tiktok.com/@sparkle',
      }),
    ).toBe('tiktok')
    expect(
      resolveSocialPlatform({ href: 'https://bombparty.com/?ref=sparkle' }),
    ).toBe('website')
    expect(resolveSocialPlatform({ key: 'yt', href: '#' })).toBe('youtube')
    expect(resolveSocialPlatform({ href: '#' })).toBeNull()
  })

  it('renders brand SVG marks instead of letter chips for every v1 platform', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      const html = renderToStaticMarkup(
        createElement(SocialMark, {
          platform,
          className: socialMarkClassName('jp-team-social-logo', platform),
        }),
      )

      expect(html).toContain('<svg')
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('jp-team-social-logo')
      expect(html).not.toContain('>TT<')
      expect(html).not.toContain('>FB<')
      expect(html).not.toContain('>IG<')
      expect(html).not.toContain('>YT<')
      expect(html).not.toContain('>WN<')
      expect(socialPlatformLabel(platform)).toBeTruthy()
    }

    expect(
      renderToStaticMarkup(
        createElement(SocialMark, {
          platform: 'instagram',
          className: socialMarkClassName('hp-footer-social-logo', 'instagram'),
        }),
      ),
    ).toContain('hp-footer-social-logo-stroke')
  })
})
