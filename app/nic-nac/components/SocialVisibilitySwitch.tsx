'use client'

import styles from './PublicSiteVisibility.module.css'

export function SocialVisibilitySwitch({ platform, checked, onChange }: {
  platform: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return <label className={styles.row}>
    <span><strong>Show {platform}</strong><span className={styles.description}>Show this link on your website. Turning it off keeps your saved link.</span></span>
    <span className={styles.control}>
      <input type="checkbox" role="switch" aria-label={`Show ${platform}`} checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className={styles.track} aria-hidden="true" />
      <span className={styles.status} aria-hidden="true">{checked ? 'On' : 'Off'}</span>
    </span>
  </label>
}
