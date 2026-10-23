'use client'
import type { CommunityCarouselThemeId } from '@/lib/sparkle-suite/community-theme-site-preview'
import { communityThemeMotion } from '@/lib/sparkle-suite/community-theme-motion'
import { ProductPeekVideo, type ProductPeekPlaybackProps } from './product-peek-video'
import styles from './community-theme-site-peek.module.css'

/** Real customer-homepage recordings; theme motion is in the source runtime. */
export function CommunityThemeSitePeek({ theme, title, ...playbackProps }: ProductPeekPlaybackProps & {
  theme: CommunityCarouselThemeId
  title: string
}) {
  return <div className={styles.peek} data-community-theme={theme}>
    <ProductPeekVideo {...communityThemeMotion[theme]} {...playbackProps}
      label={title} alt={`${title} customer website, with its header, Shop, and animated hero`} fit="contain" />
  </div>
}
