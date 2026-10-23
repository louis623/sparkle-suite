/** Complete customer-homepage recordings with original theme motion.
 * Lindsey's classic bespoke mountain/aurora/lake was visually approved by Louis.
 * Kim and Kelly were recaptured without painted controls; Brittany retains her
 * actual everyday Black Diamond recording. No saved customer theme was changed.
 * Capture provenance: docs/sparkle-suite/qa/2026-10-23-carousel-capture-manifest.json.
 */
export const portfolioMotion: Record<string, { poster: string; mp4: string; width: number; height: number }> = {
  'mile-high-fizz': {
    poster: '/marketing/rep-sites-v2/mile-high-fizz.webp',
    mp4: '/marketing/rep-sites-v2/mile-high-fizz.mp4',
    width: 1200, height: 856,
  },
  'go-for-the-bling': {
    poster: '/marketing/rep-sites-v2/go-for-the-bling.webp',
    mp4: '/marketing/rep-sites-v2/go-for-the-bling.mp4',
    width: 1200, height: 826,
  },
  'sparkly-butterflies': {
    poster: '/marketing/rep-sites-v2/sparkly-butterflies.webp',
    mp4: '/marketing/rep-sites-v2/sparkly-butterflies.mp4',
    width: 1200, height: 856,
  },
  'britt-with-bling': {
    poster: '/marketing/britt-with-bling-site-preview.webp',
    mp4: '/marketing/britt-with-bling-site-preview.mp4',
    width: 960, height: 724,
  },
}

// Home and portfolio share the exact bytes. Contain framing keeps full chrome.
export const portfolioCarouselMotion = portfolioMotion
