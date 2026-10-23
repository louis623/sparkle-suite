/** Read-only recordings of real rep sites, October 20, 2026.
 * Each frame includes the site header through the bottom of its hero.
 * Mile High Fizz is in Alpine Opal, Britt with Bling in Black Diamond,
 * Go for the Bling in Gnome Forest, and Sparkly Butterflies in Neon Butterfly.
 * Recordings are examples, not a claim about current live-show activity.
 * No saved theme was changed.
 */
export const portfolioMotion: Record<string, {poster:string;mp4:string;width:number;height:number}> = {
  "mile-high-fizz": {
    "poster": "/marketing/mile-high-fizz-site-preview.webp",
    "mp4": "/marketing/mile-high-fizz-site-preview.mp4",
    "width": 960,
    "height": 724
  },
  "go-for-the-bling": {
    "poster": "/marketing/go-for-the-bling-site-preview.webp",
    "mp4": "/marketing/go-for-the-bling-site-preview.mp4",
    "width": 960,
    "height": 618
  },
  "sparkly-butterflies": {
    "poster": "/marketing/sparkly-butterflies-site-preview.webp",
    "mp4": "/marketing/sparkly-butterflies-site-preview.mp4",
    "width": 960,
    "height": 668
  },
  "britt-with-bling": {
    "poster": "/marketing/britt-with-bling-site-preview.webp",
    "mp4": "/marketing/britt-with-bling-site-preview.mp4",
    "width": 960,
    "height": 724
  }
}

/** Portfolio wells are 1200×850. Wider recordings are extended to that
 * ratio so cover keeps the logo and Shop button edge to edge. Home cards
 * keep the original recordings above. The Gnome Forest and Neon Butterfly
 * recordings have the theme's own Pause pill painted out, so the player
 * control is the only Pause/Play on those slides. */
export const portfolioCarouselMotion: typeof portfolioMotion = {
  ...portfolioMotion,
  "go-for-the-bling": {
    poster: "/marketing/portfolio-frame/go-for-the-bling-site-preview.webp",
    mp4: "/marketing/portfolio-frame/go-for-the-bling-site-preview.mp4",
    width: 960,
    height: 680,
  },
  "sparkly-butterflies": {
    poster: "/marketing/portfolio-frame/sparkly-butterflies-site-preview.webp",
    mp4: "/marketing/portfolio-frame/sparkly-butterflies-site-preview.mp4",
    width: 960,
    height: 680,
  },
}
