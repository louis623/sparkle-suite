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

const PLACEHOLDERS: Record<SocialPlatformKey, string> = {
  instagram: 'Paste an Instagram link',
  facebook: 'VIP group or page',
  tiktok: 'Paste a TikTok link',
  youtube: 'Paste a YouTube link',
  whatnot: 'Paste a Whatnot link',
}

export function SocialHandlesSettings({
  socialHandles,
  socialVisibility,
  onSocialHandleChange,
  onSocialVisibilityChange,
  errors,
  onBlur,
}: {
  socialHandles: Record<string, string>
  socialVisibility?: SocialVisibility
  onSocialHandleChange?: (platform: SocialPlatformKey, value: string) => void
  onSocialVisibilityChange?: (socialVisibility: SocialVisibility) => void
  errors?: Partial<Record<SocialPlatformKey, string | null>>
  onBlur?: (platform: SocialPlatformKey) => void
}) {
  return (
    <div className={styles.grid}>
      {SOCIAL_PLATFORMS.map((platform) => {
        const rawUrl = socialHandles[platform.key] ?? ''
        const placement = describeSocialPlacement(platform.key, rawUrl, socialVisibility)
        const hasUrl = placement.href.length > 0
        const error = errors?.[platform.key] ?? null
        const fieldId = `my-website-social-${platform.key}`
        return (
          <section
            key={platform.key}
            className={hasUrl ? styles.card : `${styles.card} ${styles.cardEmpty}`}
            data-social-platform={platform.key}
          >
            <span className={styles.mark} data-brand={platform.key} aria-hidden="true">
              <SocialMark platform={platform.key} className={styles.markIcon} />
            </span>
            <div className={styles.meta}>
              <span className={surface.searchLabel}>{platform.label}</span>
              {!hasUrl ? (
                <span className={styles.emptyHint}>
                  {rawUrl.trim() ? `Use a real ${platform.label} link to choose footer and hero.` : 'Not added yet'}
                </span>
              ) : null}
              <label className={surface.searchField} data-site-field={`social-${platform.key}`}>
                <span className={styles.srOnly}>{platform.label} link</span>
                <input
                  id={fieldId}
                  data-site-control="social-link"
                  className={surface.searchInput}
                  placeholder={PLACEHOLDERS[platform.key]}
                  value={rawUrl}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`${platform.label} link`}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  onBlur={() => onBlur?.(platform.key)}
                  onChange={(event) => onSocialHandleChange?.(platform.key, event.target.value)}
                />
                {error ? (
                  <span id={`${fieldId}-error`} className={surface.fieldError}>
                    <span role="img" aria-label="Error">!</span> {error}
                  </span>
                ) : null}
              </label>
            </div>
            {hasUrl ? (
              <div className={styles.pills}>
                <PlacementSwitch
                  label="On site"
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
                  label="In hero"
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
    <label
      className={styles.toggle}
      data-site-control={label === 'On site' ? 'social-show-on-site' : 'social-show-in-hero'}
    >
      <input
        className={styles.pillInput}
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}
