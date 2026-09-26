import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SocialHandlesSettings } from '@/app/nic-nac/components/SocialHandlesSettings'

function render(props: Parameters<typeof SocialHandlesSettings>[0]) {
  return renderToStaticMarkup(createElement(SocialHandlesSettings, props))
}

describe('Workspace social handle cards', () => {
  it('hides placement toggles until a real URL is present', () => {
    const html = render({
      socialHandles: {
        instagram: '',
        facebook: 'https://example.com/not-facebook',
        tiktok: '   ',
        youtube: '#',
        whatnot: '',
      },
    })

    expect(html).toContain('VIP group or page')
    expect(html).toContain('Add a link to choose footer and hero.')
    expect(html).toContain('Use a real Facebook link to choose footer and hero.')
    expect(html).not.toContain('Show on site')
    expect(html).not.toContain('Show in hero')
    expect(html).not.toContain('role="switch"')
    expect(html.match(/data-social-platform="/g)).toHaveLength(5)
  })

  it('shows both toggles and the live outcome once a platform URL is real', () => {
    const html = render({
      socialHandles: {
        instagram: '@sparkle',
        facebook: 'https://www.facebook.com/groups/vip',
        tiktok: '',
        youtube: '',
        whatnot: '',
      },
      socialVisibility: {
        facebook: false,
        facebookVipHero: true,
        instagramHero: true,
      },
    })

    expect(html).toContain('aria-label="Show Instagram on site"')
    expect(html).toContain('aria-label="Show Instagram in hero"')
    expect(html).toContain('aria-label="Show Facebook on site"')
    expect(html).toContain('aria-label="Show Facebook in hero"')
    expect(html).toContain('Footer · Hero')
    expect(html).toContain('Hero')
    expect(html).not.toContain('Show Facebook VIP button in the landing hero')

    const instagram = html.slice(html.indexOf('data-social-platform="instagram"'), html.indexOf('data-social-platform="facebook"'))
    const facebook = html.slice(html.indexOf('data-social-platform="facebook"'), html.indexOf('data-social-platform="tiktok"'))
    expect(instagram).toContain('Footer · Hero')
    expect(instagram.match(/checked=""/g)).toHaveLength(2)
    expect(facebook).toContain('>Hero<')
    expect(facebook).not.toContain('Footer · Hero')
    expect(facebook.match(/checked=""/g)).toHaveLength(1)
    expect(facebook).toContain('aria-label="Show Facebook in hero" checked=""')
  })

  it('reports footer-only and hidden without treating a missing key as off', () => {
    const html = render({
      socialHandles: { youtube: 'https://www.youtube.com/@sparkle', whatnot: 'sparkle' },
      socialVisibility: { whatnot: false, whatnotHero: false },
    })
    const youtube = html.slice(html.indexOf('data-social-platform="youtube"'), html.indexOf('data-social-platform="whatnot"'))
    const whatnot = html.slice(html.indexOf('data-social-platform="whatnot"'))
    expect(youtube).toContain('>Footer<')
    expect(youtube).toContain('aria-label="Show YouTube on site"')
    expect(whatnot).toContain('>Hidden<')
  })
})