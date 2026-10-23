import type { CommunityCarouselThemeId } from './community-theme-site-preview'
export type CommunityThemeRecording = { poster: string; mp4: string; width: number; height: number; signature: string }
// Natural dimensions preserve the complete header and hero inside a stable well.
const recording = (id: CommunityCarouselThemeId, height: number, signature: string): CommunityThemeRecording => ({
  poster: `/marketing/community-sites-v2/${id}.webp`, mp4: `/marketing/community-sites-v2/${id}.mp4`, width: 1200, height, signature,
})
export const communityThemeMotion: Record<CommunityCarouselThemeId, CommunityThemeRecording> = {
  amethyst: recording('amethyst', 966, 'Unicorn entrance and glowing ribbons'),
  halloween_pumpkin_witch: recording('halloween_pumpkin_witch', 846, 'Witch flight and hovering sparkle'),
  halloween_pumpkin_cat: recording('halloween_pumpkin_cat', 880, 'Cat blink and tail sweep'),
  gilded_autumn: recording('gilded_autumn', 936, 'Falling and rotating golden leaves'),
  fall_owl_harvest_moon: recording('fall_owl_harvest_moon', 880, 'Owl blink and head turn'),
  gobble_and_fizz: recording('gobble_and_fizz', 880, 'Turkey blink and head tilt with moving bubbles'),
  pie_please: recording('pie_please', 880, 'Original gentle sunlight and bokeh'),
  midnight_rose: recording('midnight_rose', 936, 'Copper-blush glitter motion'),
  pearl_rose: recording('pearl_rose', 936, 'Pearl and rose hero motion'),
  rose_champagne: recording('rose_champagne', 936, 'Rose-copper shimmer and champagne bokeh'),
}
