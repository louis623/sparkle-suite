import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { syncWorkspaceSectionSearch } from '@/app/nic-nac/components/DashboardPlaceholder'
import { LiveLineupHowToGuide } from '@/app/nic-nac/components/LiveLineupHowToGuide'
import { LIVE_LINEUP_RELEASE } from '@/lib/live-lineup/release'
import {
  LIVE_LINEUP_GUIDE_IMAGES,
  LIVE_LINEUP_HELP_BUTTON_LABEL,
  LIVE_LINEUP_HELP_RESOURCE_ID,
  LIVE_LINEUP_NEED_A_HAND,
  LIVE_LINEUP_STAY_AWAKE_IF_ASLEEP,
  LIVE_LINEUP_STAY_AWAKE_INTRO,
  LIVE_LINEUP_STAY_AWAKE_MAC_LINK,
  LIVE_LINEUP_STAY_AWAKE_MAC_STEPS,
  LIVE_LINEUP_STAY_AWAKE_NOTE,
  LIVE_LINEUP_STAY_AWAKE_TITLE,
  LIVE_LINEUP_STAY_AWAKE_WINDOWS_LINK,
  LIVE_LINEUP_STAY_AWAKE_WINDOWS_STEPS,
  LIVE_LINEUP_UPDATE_AUTOMATIC_NOTE,
  LIVE_LINEUP_UPDATE_DELAY_NOTE,
  LIVE_LINEUP_UPDATE_WARNING,
  liveLineupExtensionVersionLabel,
  liveLineupGuideContent,
  liveLineupHelpSteps,
  parseLiveLineupHelpDeepLink,
} from '@/lib/live-lineup/how-to-guide'
import { getHelpResources } from '@/lib/services/help-resources'

const PUBLISHED_AT = Date.parse('2026-11-22T13:13:00.000Z')

function visibleText(html: string) {
  return html
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

describe('Live Lineup how-to guide', () => {
  it('renders the guide sections and the four screenshots with their alt text', () => {
    const html = visibleText(
      renderToStaticMarkup(
        createElement(LiveLineupHowToGuide, {
          now: PUBLISHED_AT,
          onContactSupport: () => {},
        }),
      ),
    )

    expect(html).toContain("What's new")
    expect(html).toContain('Before you go live')
    expect(html).toContain('During your show')
    expect(html).toContain(LIVE_LINEUP_STAY_AWAKE_TITLE)
    expect(html).toContain("When you're done")
    expect(html.indexOf('During your show')).toBeLessThan(html.indexOf(LIVE_LINEUP_STAY_AWAKE_TITLE))
    expect(html.indexOf(LIVE_LINEUP_STAY_AWAKE_TITLE)).toBeLessThan(html.indexOf("When you're done"))
    expect(html).toContain('If your Workspace says your extension is out of date')
    expect(html).toContain('Need a hand?')
    expect(html).toContain(LIVE_LINEUP_UPDATE_WARNING)
    expect(html).toContain('chrome://extensions')
    expect(html).toContain('Developer mode')
    expect(html).toContain(LIVE_LINEUP_UPDATE_AUTOMATIC_NOTE)
    expect(html).toContain(LIVE_LINEUP_UPDATE_DELAY_NOTE)
    expect(html).toContain(LIVE_LINEUP_NEED_A_HAND)
    expect(html).toContain(LIVE_LINEUP_HELP_BUTTON_LABEL)
    expect(html).toContain('<button')
    expect(html).toContain(`Extension ${LIVE_LINEUP_RELEASE.version}`)
    expect(html).not.toContain('the newest version')
    expect(html).not.toContain('05-')
    expect(html).not.toContain('Sorry')

    for (const image of Object.values(LIVE_LINEUP_GUIDE_IMAGES)) {
      expect(html).toContain(image.alt)
      expect(html).toContain(image.caption)
      expect(html).toContain(`width="${image.width}"`)
      expect(html).toContain(`height="${image.height}"`)
      expect(html).toContain(encodeURIComponent(image.src))
      expect(html).toContain('loading="lazy"')
    }
  })

  it('tells the rep how to keep the computer awake, with official steps in a new tab', () => {
    const html = visibleText(
      renderToStaticMarkup(createElement(LiveLineupHowToGuide, { now: PUBLISHED_AT })),
    )

    expect(html).toContain(LIVE_LINEUP_STAY_AWAKE_INTRO)
    expect(html).toContain(LIVE_LINEUP_STAY_AWAKE_NOTE)
    expect(html).toContain('On a Mac:')
    expect(html).toContain('On Windows:')
    expect(html).toContain(LIVE_LINEUP_STAY_AWAKE_IF_ASLEEP)
    expect(html).toContain('Connected + Updating')
    expect(html).toContain('Live Party Orders')
    for (const step of [...LIVE_LINEUP_STAY_AWAKE_MAC_STEPS, ...LIVE_LINEUP_STAY_AWAKE_WINDOWS_STEPS]) {
      expect(html).toContain(step)
    }

    for (const link of [LIVE_LINEUP_STAY_AWAKE_MAC_LINK, LIVE_LINEUP_STAY_AWAKE_WINDOWS_LINK]) {
      expect(html).toContain(
        `href="${link.href}" target="_blank" rel="noopener"`,
      )
      expect(html).toContain(`${link.label}<span`)
      expect(html).toContain('(opens in a new tab)')
    }

    const duringDone = liveLineupGuideContent(PUBLISHED_AT)
    const doneStart = duringDone.beforeYouGoLive.length + duringDone.duringYourShow.length + 1
    expect(html).toContain(`start="${doneStart}"`)

    const helpSteps = liveLineupHelpSteps(PUBLISHED_AT)
    const duringIndex = helpSteps.indexOf(duringDone.duringYourShow.at(-1) ?? '')
    const doneIndex = helpSteps.indexOf(duringDone.whenYouAreDone[0])
    expect(duringIndex).toBeGreaterThanOrEqual(0)
    expect(doneIndex).toBeGreaterThan(duringIndex)
    for (const step of [
      LIVE_LINEUP_STAY_AWAKE_INTRO,
      LIVE_LINEUP_STAY_AWAKE_NOTE,
      ...LIVE_LINEUP_STAY_AWAKE_MAC_STEPS,
      ...LIVE_LINEUP_STAY_AWAKE_WINDOWS_STEPS,
      LIVE_LINEUP_STAY_AWAKE_IF_ASLEEP,
    ]) {
      const index = helpSteps.indexOf(step)
      expect(index).toBeGreaterThan(duringIndex)
      expect(index).toBeLessThan(doneIndex)
    }

    const resource = getHelpResources('', PUBLISHED_AT).find(
      (item) => item.id === LIVE_LINEUP_HELP_RESOURCE_ID,
    )
    expect(resource?.steps).toEqual(helpSteps)
  })

  it('renders Need a hand as text with no button in the support view', () => {
    const html = renderToStaticMarkup(
      createElement(LiveLineupHowToGuide, {
        now: PUBLISHED_AT,
        supportView: true,
        onContactSupport: () => {},
      }),
    )

    expect(visibleText(html)).toContain(LIVE_LINEUP_NEED_A_HAND)
    expect(html).not.toContain('<button')
    expect(html).not.toContain(LIVE_LINEUP_HELP_BUTTON_LABEL)
  })

  it('follows the published release rule for the extension version', () => {
    const release = {
      version: '9.9.9',
      publishedAt: '2026-11-22T13:13:00.000Z',
      rolloutEnabled: true,
    }
    expect(liveLineupExtensionVersionLabel(PUBLISHED_AT, release)).toBe('9.9.9')
    expect(liveLineupExtensionVersionLabel(PUBLISHED_AT - 1, release)).toBe('the newest version')
    expect(
      liveLineupExtensionVersionLabel(PUBLISHED_AT, { ...release, rolloutEnabled: false }),
    ).toBe('the newest version')
    expect(
      liveLineupExtensionVersionLabel(PUBLISHED_AT, { ...release, publishedAt: null }),
    ).toBe('the newest version')
    expect(liveLineupExtensionVersionLabel(PUBLISHED_AT)).toBe(LIVE_LINEUP_RELEASE.version)

    const unpublished = liveLineupGuideContent(PUBLISHED_AT - 1)
    expect(unpublished.beforeYouGoLive[1]).toContain('Extension the newest version')
    expect(unpublished.beforeYouGoLive[1]).not.toContain(LIVE_LINEUP_RELEASE.version)
    const html = visibleText(
      renderToStaticMarkup(createElement(LiveLineupHowToGuide, { now: PUBLISHED_AT - 1 })),
    )
    expect(html).toContain('Extension the newest version')
  })

  it('accepts only the exact Live Lineup guide deep-link values', () => {
    expect(parseLiveLineupHelpDeepLink('?section=help-resources&guide=live-lineup')).toEqual({
      part: null,
    })
    expect(
      parseLiveLineupHelpDeepLink('?section=help-resources&guide=live-lineup&part=update'),
    ).toEqual({ part: 'update' })
    expect(
      parseLiveLineupHelpDeepLink('guide=live-lineup&part=update&src=email'),
    ).toEqual({ part: 'update' })

    for (const search of [
      '',
      '?section=help-resources',
      '?guide=Live-Lineup',
      '?guide=live-lineup-extra',
      '?guide=live%20lineup',
      '?part=update',
      '?guide=live-lineup&part=Update',
      '?guide=live-lineup&part=updates',
      '?guide=live-lineup&part=',
      '?guide=live-lineup&part=update%20',
    ]) {
      expect(parseLiveLineupHelpDeepLink(search)).toBeNull()
    }
  })

  it('drops guide, part, and src when leaving Help & Resources', () => {
    const deepLink =
      '?section=help-resources&guide=live-lineup&part=update&src=email&review=token'

    expect(syncWorkspaceSectionSearch(deepLink, 'help-resources')).toBe(
      'section=help-resources&guide=live-lineup&part=update&src=email&review=token',
    )
    expect(syncWorkspaceSectionSearch(deepLink, 'site-settings')).toBe(
      'section=site-settings&review=token',
    )
    expect(syncWorkspaceSectionSearch(deepLink, 'home')).toBe('review=token')
    expect(
      syncWorkspaceSectionSearch(
        '?section=help-resources&guide=nope&part=nope&src=x',
        'account',
      ),
    ).toBe('section=account')
  })
})
