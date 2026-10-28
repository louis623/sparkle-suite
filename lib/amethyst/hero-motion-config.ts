import type { AmethystAppearancePresetId } from './appearance-presets'

export interface HeroMotionConfig {
  kind: 'video' | 'decoration' | 'sparkle'
  css: string[]
  script?: string
  scene?: string
  poster?: string
  src?: string
  mediaClass?: string
  posterClass?: string
  videoClass?: string
  controlClass?: string
  controlsClass?: string
  frameAttribute?: string
  host?: boolean
  sound?: string
  width?: number
  height?: number
}

const sparkle = (): HeroMotionConfig => ({ kind: 'sparkle', css: [] })
const video = (folder: string, prefix: string, options: Partial<HeroMotionConfig> = {}): HeroMotionConfig => ({
  kind: 'video', css: [folder + '.css'], script: folder + '.js',
  poster: `/amethyst/skins/${folder}/hero-poster.webp`, src: `/amethyst/skins/${folder}/hero-loop.mp4`,
  mediaClass: prefix + '-media', posterClass: prefix + '-poster', videoClass: prefix + '-video',
  controlClass: prefix + '-toggle', frameAttribute: `data-${prefix}-has-frame`, width: 1280, height: 720,
  ...options,
})

// One exhaustive contract supplies both server selection and the hydrated hero.
// Saved motion settings are deliberately absent: visitor Pause alone owns playback.
export const HERO_MOTION_THEMES: Record<AmethystAppearancePresetId, HeroMotionConfig> = {
  amethyst: video('am01-unicorn', 'au', { scene: 'unicorn', mediaClass: 'au-art', src: '/amethyst/skins/am01-unicorn/hero-motion.mp4', frameAttribute: 'data-video', controlsClass: 'au-controls', sound: 'sound', width: 1310, height: 704 }),
  sparkle_suite_morganite: sparkle(),
  black_diamond: sparkle(),
  moonstone: sparkle(),
  alpine_opal: sparkle(),
  emerald_garden: sparkle(),
  gnome_garden: { kind: 'decoration', scene: 'gnome', css: ['gnome-garden.css'] },
  neon_butterfly: { kind: 'decoration', scene: 'butterfly', css: ['neon-butterfly.css'], script: 'neon-butterfly.js' },
  halloween_pumpkin_witch: { kind: 'decoration', scene: 'witch', css: ['halloween-pumpkin-witch.css'], script: 'halloween-pumpkin-witch.js' },
  halloween_pumpkin_cat: video('halloween-pumpkin-cat', 'hpc', { scene: 'pumpkin', mediaClass: 'hpc-art', posterClass: 'hpc-poster', controlClass: 'hpc-motion-control', frameAttribute: 'data-playing', poster: '/amethyst/skins/halloween-pumpkin-cat/hero-desktop.webp', src: '/amethyst/skins/halloween-pumpkin-cat/hero-desktop-motion.mp4', width: 1672, height: 941 }),
  gilded_autumn: video('gilded-autumn', 'ga', { mediaClass: 'ga-art', src: '/amethyst/skins/gilded-autumn/hero-motion.mp4', controlClass: 'ga-motion-control', frameAttribute: 'data-playing', width: 1204, height: 764 }),
  rose_gold: sparkle(),
  midnight_rose: video('midnight-rose', 'mdr'),
  fall_owl_harvest_moon: video('fall-owl', 'fow', { host: true, controlsClass: 'fow-controls', sound: 'autumn sounds' }),
  gobble_and_fizz: video('gobble-and-fizz', 'tg', { host: true, frameAttribute: 'data-has-frame', script: 'thanksgiving-motion.js' }),
  pie_please: video('pie-please', 'tg', { host: true, frameAttribute: 'data-has-frame', script: 'thanksgiving-motion.js', poster: '/amethyst/skins/pie-please/hero-poster-v4.webp', src: '/amethyst/skins/pie-please/hero-loop-v4.mp4' }),
  pearl_rose: video('pearl-rose', 'prl'),
  sunset_beach: video('sunset-beach', 'beach', { host: true, mediaClass: 'beach-motion-layer', videoClass: 'beach-video', frameAttribute: 'data-playing', controlsClass: 'beach-motion-controls', sound: 'wave sound' }),
  rose_champagne: video('rose-champagne', 'rgc'),
  garnet: sparkle(),
  amber: sparkle(),
  velvet: sparkle(),
  rose_quartz: sparkle(),
}
