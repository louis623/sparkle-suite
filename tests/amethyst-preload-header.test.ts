import { expect, it } from 'vitest'
import { homepagePreloadHeader } from '@/lib/amethyst/homepage-preload-header'
it('preloads only fixed same-origin fonts and art, without guessing a responsive viewport', () => {
  const html = '<div data-server-rendered="true"></div><link rel="preload" as="font" href="/amethyst/fonts/a12.woff2"><link rel="preload" as="image" href="/amethyst/phone.webp" media="(max-width:600px)"><link rel="preload" as="image" href="/amethyst/desktop.webp" media="(min-width:601px)">'
  expect(homepagePreloadHeader(html)).toBe('</amethyst/fonts/a12.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin=anonymous')
  expect(homepagePreloadHeader(html.replace('/amethyst/desktop.webp','/amethyst/phone.webp'))).toContain('</amethyst/phone.webp>; rel=preload; as=image; fetchpriority=high')
  expect(homepagePreloadHeader(html.replace('data-server-rendered="true"',''))).toBe('')
})
