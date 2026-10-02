import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SocialHandlesSettings } from '@/app/nic-nac/components/SocialHandlesSettings'
import styles from '@/app/nic-nac/components/SocialHandlesSettings.module.css'

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
    expect(instagram).toContain(styles.placement)
    expect(instagram.indexOf(styles.toggles)).toBeLessThan(instagram.indexOf('Footer · Hero'))
    expect(instagram.indexOf('aria-label="Show Instagram in hero"')).toBeLessThan(instagram.indexOf('Footer · Hero'))
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

  it('keeps cards content-sized with the two switches on one compact row', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/SocialHandlesSettings.module.css'),
      'utf8',
    )
    const grid = css.slice(css.indexOf('.grid {'), css.indexOf('.card {'))
    const card = css.slice(css.indexOf('.card {'), css.indexOf('.card p {'))
    const toggles = css.slice(css.indexOf('.toggles {'), css.indexOf('.toggle {'))
    const control = css.slice(css.indexOf('.control {'), css.indexOf('.control input {'))

    expect(grid).toContain('align-items: start')
    expect(grid).toContain('align-content: start')
    expect(card).not.toContain('min-height')
    expect(card).not.toContain('justify-content: space-between')
    expect(toggles).toContain('display: flex')
    expect(toggles).not.toContain('display: grid')
    expect(control).toContain('display: inline-flex')
    expect(control).toContain('align-items: center')
  })
})