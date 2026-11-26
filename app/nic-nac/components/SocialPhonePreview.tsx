'use client'

import { SocialMark } from '@/lib/amethyst/social-mark-icon'
import { describeSocialPlacement } from '@/lib/public-site/social-hero'
import { SOCIAL_PLATFORMS, type SocialVisibility } from '@/lib/public-site/social-visibility'

import styles from './DashboardPlaceholder.module.css'

function firstName(displayName?: string | null) {
  const name = displayName?.trim()
  if (!name) return ''
  return name.split(/\s+/)[0] || ''
}

export function SocialPhonePreview({
  businessName,
  displayName,
  tagline,
  socialHandles,
  socialVisibility,
}: {
  businessName?: string | null
  displayName?: string | null
  tagline?: string | null
  socialHandles?: Record<string, string> | null
  socialVisibility?: SocialVisibility | null
}) {
  const name = firstName(displayName)
  const kicker = businessName?.trim() || ''
  const footerLine = tagline?.trim() || ''
  const placed = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    placement: describeSocialPlacement(platform.key, socialHandles?.[platform.key], socialVisibility),
  }))
  const footer = placed.filter((item) => item.placement.showOnSite)
  const hero = placed.filter((item) => item.placement.showInHero)

  return (
    <aside className={styles.socialPhoneCol} aria-label="Preview">
      <p className={styles.socialPhoneKicker}>Customer preview</p>
      <div className={styles.socialDevice}>
        <div className={styles.socialDeviceNotch} aria-hidden="true" />
        <div className={styles.socialDeviceScreen}>
          <div className={styles.socialDeviceHero}>
            {kicker ? <div className={styles.socialDeviceEy}>{kicker}</div> : null}
            {name ? <h3 className={styles.socialDeviceName}>{name}</h3> : null}
            {hero.length ? (
              <div className={styles.socialDeviceHeroBtns} data-social-preview="hero">
                {hero.map(({ platform }) => (
                  <span key={platform.key}>
                    <i data-brand={platform.key} aria-hidden="true">
                      <SocialMark platform={platform.key} className={styles.socialDeviceGlyph} />
                    </i>
                    {platform.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className={styles.socialDeviceMid} aria-hidden="true" />
          <div className={styles.socialDeviceFoot}>
            {footerLine ? <p className={styles.socialDeviceTag} data-social-preview="tagline">{footerLine}</p> : null}
            {footer.length ? (
              <div className={styles.socialDeviceIcons} data-social-preview="footer">
                {footer.map(({ platform }) => (
                  <i key={platform.key} data-brand={platform.key} title={platform.label}>
                    <SocialMark platform={platform.key} className={styles.socialDeviceGlyph} />
                  </i>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className={styles.socialPhoneCap}>Your footer, and any hero buttons you turn on. It updates as you type.</p>
    </aside>
  )
}
