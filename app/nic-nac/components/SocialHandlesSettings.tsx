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
import { SHOWS_ON } from './site-settings-layout'

const PLACEHOLDERS: Partial<Record<SocialPlatformKey, string>> = {
  facebook: 'VIP group or page',
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
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${fieldId}-error ${fieldId}-shows` : `${fieldId}-shows`}
                onBlur={() => onBlur?.(platform.key)}
                onChange={(event) => onSocialHandleChange?.(platform.key, event.target.value)}
              />
              {error ? (
                <span id={`${fieldId}-error`} className={surface.fieldError}>
                  <span role="img" aria-label="Error">!</span> {error}
                </span>
              ) : null}
              <span id={`${fieldId}-shows`} className={surface.showsOn} data-shows-on="">
                Shows on your site: {SHOWS_ON.social}
              </span>
            </label>
            {!hasUrl && !error ? <p className={surface.siteSettingsPreviewNote}>{hint}</p> : null}
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
            ) : null}
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
    <label
      className={styles.toggle}
      data-site-control={label === 'Show on site' ? 'social-show-on-site' : 'social-show-in-hero'}
    >
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
