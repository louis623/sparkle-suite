'use client'

import type { MouseEvent } from 'react'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import { SHOWS_ON } from './site-settings-layout'
import styles from './PublicSiteVisibility.module.css'

const SHOWS = {
  tickerVisible: SHOWS_ON.showAnnouncements,
  showJoinPage: SHOWS_ON.joinTeam,
  danceFloorVisible: SHOWS_ON.danceFloor,
  liveLineupVisible: SHOWS_ON.liveLineup,
} as const

const CONTROLS = {
  tickerVisible: 'show-announcements',
  showJoinPage: 'join-team',
  danceFloorVisible: 'dance-floor',
  liveLineupVisible: 'live-lineup',
} as const

export function PublicSiteVisibility({
  settings,
  joinTeamAccessEnabled,
  onChange,
  part = 'all',
  onWorkspaceLink,
}: {
  settings: Pick<SiteSettingsDashboardResult, 'tickerVisible' | 'showJoinPage' | 'danceFloorVisible' | 'liveLineupVisible'>
  joinTeamAccessEnabled: boolean
  onChange?: (patch: Partial<Pick<SiteSettingsDashboardResult, 'tickerVisible' | 'showJoinPage' | 'danceFloorVisible' | 'liveLineupVisible'>>) => void
  part?: 'all' | 'announcements' | 'pages'
  onWorkspaceLink?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const switches = [
    { key: 'tickerVisible' as const, label: part === 'announcements' ? 'Show announcements' : 'Announcements', description: 'Show your scrolling announcement messages.', checked: settings.tickerVisible },
    { key: 'showJoinPage' as const, label: 'Join Team', description: joinTeamAccessEnabled ? 'Show your recruiting page and its website links.' : 'Available to selected early-access team leaders.', checked: joinTeamAccessEnabled && settings.showJoinPage, disabled: !joinTeamAccessEnabled },
    { key: 'danceFloorVisible' as const, label: 'Dance Floor', description: 'Show Dance Floor highlights and website links. Existing direct links still work.', checked: settings.danceFloorVisible !== false },
    { key: 'liveLineupVisible' as const, label: 'Live Lineup', description: 'Show the live lineup on your customer-facing pages.', checked: settings.liveLineupVisible !== false },
  ].filter((item) => {
    if (part === 'announcements') return item.key === 'tickerVisible'
    if (part === 'pages') return item.key !== 'tickerVisible'
    return true
  })

  return <section className={part === 'announcements' ? styles.inline : styles.section} aria-labelledby={part === 'announcements' ? undefined : 'public-site-visibility-title'}>
    {part === 'announcements' ? null : <>
      <h3 id="public-site-visibility-title">Show on your website</h3>
      <p>Turning a section off only hides it from your website. Your saved content and Workspace tools stay available. Turn it back on whenever you’re ready.</p>
    </>}
    <div className={styles.grid}>
      {switches.map((item) => <div key={item.key} className={styles.item} data-site-field={CONTROLS[item.key]}>
        <label className={styles.row}>
          <span>
            <strong>{item.label}</strong>
            <span id={`visibility-${item.key}-help`} className={styles.description}>{item.description}</span>
            <span id={`visibility-${item.key}-shows`} className={styles.showsOn} data-shows-on="">Shows on your site: {SHOWS[item.key]}</span>
          </span>
          <span className={styles.control}>
            <input type="checkbox" role="switch" data-site-control={CONTROLS[item.key]} aria-label={item.label} aria-describedby={`visibility-${item.key}-help visibility-${item.key}-shows`} checked={item.checked} disabled={'disabled' in item && item.disabled} onChange={(event) => onChange?.({ [item.key]: event.target.checked })} />
            <span className={styles.track} aria-hidden="true" />
            <span className={styles.status} aria-hidden="true">{item.checked ? 'On' : 'Off'}</span>
          </span>
        </label>
        {part === 'pages' && item.key === 'showJoinPage' ? (
          <a className={styles.teamLink} data-site-control="team-settings" href="/nic-nac?section=team-management" onClick={onWorkspaceLink}>Team settings</a>
        ) : null}
      </div>)}
    </div>
  </section>
}

type CustomerPageSettings = Pick<SiteSettingsDashboardResult, 'showJoinPage' | 'danceFloorVisible' | 'liveLineupVisible'>

const PAGE_STRIP = [
  {
    key: 'danceFloorVisible' as const,
    label: 'Dance Floor',
    control: 'dance-floor',
    live: (settings: CustomerPageSettings, _access: boolean) => settings.danceFloorVisible !== false,
  },
  {
    key: 'showJoinPage' as const,
    label: 'Join Team',
    control: 'join-team',
    live: (settings: CustomerPageSettings, access: boolean) => access && settings.showJoinPage === true,
  },
  {
    key: 'liveLineupVisible' as const,
    label: 'Live Lineup',
    control: 'live-lineup',
    live: (settings: CustomerPageSettings, _access: boolean) => settings.liveLineupVisible !== false,
  },
]

type CustomerPageStripProps = {
  settings: CustomerPageSettings
  joinTeamAccessEnabled: boolean
  onChange?: (patch: Partial<CustomerPageSettings>) => void
  onWorkspaceLink?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function CustomerPageStrip({
  settings,
  joinTeamAccessEnabled,
  onChange,
  onWorkspaceLink,
}: CustomerPageStripProps) {
  return (
    <section className={styles.pageStrip} data-page-strip="" aria-labelledby="pages-on-your-site">
      <h2 id="pages-on-your-site" className={styles.pageStripTitle}>Pages on your site</h2>
      <p className={styles.pageStripLine}>Live pages show on your website. Hidden pages stay in your workspace until you turn them back on.</p>
      <div className={styles.pageStripGrid}>
        {PAGE_STRIP.map((item) => {
          const locked = item.key === 'showJoinPage' && !joinTeamAccessEnabled
          const live = item.live(settings, joinTeamAccessEnabled)
          return (
            <div key={item.key} className={styles.pageCell}>
              <label className={styles.pageLabel}>
                <span className={styles.pageName}>{item.label}</span>
                <span className={live ? styles.pageChipLive : styles.pageChipHidden} aria-hidden="true">{live ? 'Live' : 'Hidden'}</span>
                <span className={styles.control}>
                  <input
                    type="checkbox"
                    role="switch"
                    data-site-control={item.control}
                    aria-label={item.label}
                    aria-describedby={locked ? 'join-team-early-access' : undefined}
                    checked={live}
                    disabled={locked}
                    onChange={(event) => onChange?.({ [item.key]: event.target.checked })}
                  />
                  <span className={styles.track} aria-hidden="true" />
                </span>
              </label>
              {locked ? <p id="join-team-early-access" className={styles.pageHint}>Available to selected early-access team leaders.</p> : null}
              {item.key === 'showJoinPage' ? (
                <a className={styles.teamLink} data-site-control="team-settings" href="/nic-nac?section=team-management" onClick={onWorkspaceLink}>Team settings</a>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
