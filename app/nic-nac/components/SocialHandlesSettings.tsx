'use client'

import { SocialMark } from '@/lib/amethyst/social-mark-icon'
import { describeSocialPlacement } from '@/lib/public-site/social-hero'
import {
  socialHeroFlagKey,
  SOCIAL_PLATFORMS,
  type SocialPlatformKey,
  type SocialVisibility,
} from '@/lib/public-site/social-visibility'

import surface from './DashboardPlaceholder.module.css'
import styles from './SocialHandlesSettings.module.css'

const PLACEHOLDERS: Partial<Record<SocialPlatformKey, string>> = {
  facebook: 'VIP group or page',
}

export function SocialHandlesSettings({
  socialHandles,
  socialVisibility,
  onSocialHandleChange,
  onSocialVisibilityChange,
}: {
  socialHandles: Record<string, string>
  socialVisibility?: SocialVisibility
  onSocialHandleChange?: (platform: SocialPlatformKey, value: string) => void
  onSocialVisibilityChange?: (socialVisibility: SocialVisibility) => void
}) {
  return (
    <div className={styles.grid}>
      {SOCIAL_PLATFORMS.map((platform) => {
        const rawUrl = socialHandles[platform.key] ?? ''
        const placement = describeSocialPlacement(platform.key, rawUrl, socialVisibility)
        const hasUrl = placement.href.length > 0
        const hint = rawUrl.trim()
          ? `Use a real ${platform.label} link to choose footer and hero.`
          : 'Add a link to choose footer and hero.'

        return (
          <section
            key={platform.key}
            className={styles.card}
            data-social-platform={platform.key}
          >
            <div className={styles.heading}>
              <SocialMark platform={platform.key} className="social-handle-mark" />
              <span className={surface.searchLabel}>{platform.label}</span>
            </div>
            <label className={surface.searchField}>
              <span className={styles.srOnly}>{platform.label} link</span>
              <input
                className={surface.searchInput}
                placeholder={PLACEHOLDERS[platform.key]}
                value={rawUrl}
                onChange={(event) => onSocialHandleChange?.(platform.key, event.target.value)}
              />
            </label>
            {hasUrl ? (
              <div className={styles.toggles}>
                <PlacementSwitch
                  label="Show on site"
                  ariaLabel={`Show ${platform.label} on site`}
                  checked={placement.showOnSite}
                  onChange={(checked) =>
                    onSocialVisibilityChange?.({
                      ...socialVisibility,
                      [platform.key]: checked,
                    })
                  }
                />
                <PlacementSwitch
                  label="Show in hero"
                  ariaLabel={`Show ${platform.label} in hero`}
                  checked={placement.showInHero}
                  onChange={(checked) =>
                    onSocialVisibilityChange?.({
                      ...socialVisibility,
                      [socialHeroFlagKey(platform.key)]: checked,
                    })
                  }
                />
              </div>
            ) : (
              <p className={surface.siteSettingsPreviewNote}>{hint}</p>
            )}
            {hasUrl ? (
              <p className={`${surface.siteSettingsPreviewNote} ${styles.outcome}`}>
                {placement.summary}
              </p>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function PlacementSwitch({
  label,
  ariaLabel,
  checked,
  onChange,
}: {
  label: string
  ariaLabel: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <span className={styles.control}>
        <input
          type="checkbox"
          role="switch"
          aria-label={ariaLabel}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className={styles.track} aria-hidden="true" />
        <span className={styles.status} aria-hidden="true">{checked ? 'On' : 'Off'}</span>
      </span>
    </label>
  )
}
