import { createElement, type ReactElement, type ReactNode } from 'react'

import {
  type SocialPlatform,
  socialMarkClassName,
} from './social-mark'

const TIKTOK_PATH =
  'M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z'

const FACEBOOK_PATH =
  'M14.2 8.1V6.6c0-.7.5-.9.9-.9h2.3V2.2L14.2 2c-3.2 0-4.8 1.9-4.8 5.1v1H7v3.8h2.4V22h4.2V11.9h3.1l.5-3.8h-3Z'

const YOUTUBE_PATH =
  'M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z'

const WHATNOT_PATH =
  'M3.1 5.2h3.6l2.5 8.7 2.4-8.7h3.6l2.4 8.7 2.5-8.7h3.6L18.4 18.8h-4.1L12 9.6l-2.3 9.2H5.6L3.1 5.2Z'

export function SocialMark({
  platform,
  className = 'jp-team-social-logo',
}: {
  platform: SocialPlatform
  className?: string
}): ReactElement {
  const markClass = socialMarkClassName(className, platform)

  return createElement(
    'svg',
    {
      className: markClass,
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      focusable: false,
    },
    markChildren(platform),
  )
}

function markChildren(platform: SocialPlatform): ReactNode {
  if (platform === 'tiktok') {
    return createElement('path', { d: TIKTOK_PATH })
  }

  if (platform === 'facebook') {
    return createElement('path', { d: FACEBOOK_PATH })
  }

  if (platform === 'instagram') {
    return [
      createElement('rect', { key: 'frame', x: 4, y: 4, width: 16, height: 16, rx: 4.5 }),
      createElement('circle', { key: 'lens', cx: 12, cy: 12, r: 3.4 }),
      createElement('circle', { key: 'flash', cx: 17, cy: 7, r: 1 }),
    ]
  }

  if (platform === 'youtube') {
    return createElement('path', { d: YOUTUBE_PATH })
  }

  if (platform === 'whatnot') {
    return createElement('path', { d: WHATNOT_PATH })
  }

  return [
    createElement('circle', { key: 'globe', cx: 12, cy: 12, r: 10 }),
    createElement('path', { key: 'equator', d: 'M2 12h20' }),
    createElement('path', {
      key: 'meridian',
      d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
    }),
  ]
}
