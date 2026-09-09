'use client'

import type { SiteSettingsDashboardResult, UpdateSiteSettingsDashboardInput } from '@/lib/services/types'
import styles from './PublicSiteVisibility.module.css'

export function PublicSiteVisibility({ settings, joinTeamAccessEnabled, onChange }: {
  settings: Pick<SiteSettingsDashboardResult, 'tickerVisible' | 'showJoinPage' | 'danceFloorVisible' | 'liveLineupVisible'>
  joinTeamAccessEnabled: boolean
  onChange?: (patch: UpdateSiteSettingsDashboardInput) => void
}) {
  const switches = [
    { key: 'tickerVisible', label: 'Announcements', description: 'Show your scrolling announcement messages.', checked: settings.tickerVisible },
    { key: 'showJoinPage', label: 'Join Team', description: joinTeamAccessEnabled ? 'Show your recruiting page and its website links.' : 'Available to selected early-access team leaders.', checked: joinTeamAccessEnabled && settings.showJoinPage, disabled: !joinTeamAccessEnabled },
    { key: 'danceFloorVisible', label: 'Dance Floor', description: 'Show Dance Floor highlights and website links. Existing direct links still work.', checked: settings.danceFloorVisible !== false },
    { key: 'liveLineupVisible', label: 'Live Lineup', description: 'Show the live lineup on your customer-facing pages.', checked: settings.liveLineupVisible !== false },
  ] as const

  return <section className={styles.section} aria-labelledby="public-site-visibility-title">
    <h3 id="public-site-visibility-title">Show on your website</h3>
    <p>Turning a section off only hides it from your website. Your saved content and Workspace tools stay available. Turn it back on whenever you’re ready.</p>
    <div className={styles.grid}>
      {switches.map((item) => <label key={item.key} className={styles.row}>
        <span><strong>{item.label}</strong><span id={`visibility-${item.key}-help`} className={styles.description}>{item.description}</span></span>
        <span className={styles.control}>
          <input type="checkbox" role="switch" aria-label={item.label} aria-describedby={`visibility-${item.key}-help`} checked={item.checked} disabled={'disabled' in item && item.disabled} onChange={(event) => onChange?.({ [item.key]: event.target.checked })} />
          <span className={styles.track} aria-hidden="true" />
          <span className={styles.status} aria-hidden="true">{item.checked ? 'On' : 'Off'}</span>
        </span>
      </label>)}
    </div>
  </section>
}
