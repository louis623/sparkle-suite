/**
 * Halloween art used by Suite marketing peeks.
 *
 * The witch peek uses the theme hero plate. The older full-page rep-site
 * capture is no longer referenced. The Dance Floor hero sentence in
 * public/amethyst/trade.jsx reads "Planning a Dance Floor swap?".
 *
 * Cat remains the product hero motion, 966×710, including the left headlines.
 */
export const halloweenHeroMotion = {
  witch: {
    label: 'Halloween · Witch',
    poster: '/amethyst/skins/halloween-pumpkin-witch/hero-desktop.webp',
    posterWidth: 1672,
    posterHeight: 941,
    mp4: '/amethyst/skins/halloween-pumpkin-witch/hero-plate.mp4',
    width: 1672,
    height: 940,
  },
  cat: {
    label: 'Halloween · Cat',
    poster: '/sparkle-suite/landing/hero-halloween-cat-live.webp',
    posterWidth: 966,
    posterHeight: 710,
    mp4: '/sparkle-suite/landing/hero-halloween-cat-live.mp4',
    width: 966,
    height: 710,
  },
} as const
