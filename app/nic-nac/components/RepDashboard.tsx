'use client'

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { DanceFloorInsightsPanel } from '@/app/nic-nac/components/DanceFloorInsights'
import { SiteVisitsPanel } from '@/app/nic-nac/components/SiteVisitsPanel'
import {
  createEmptyRepDashboard,
  getShowCountdown,
  type GlanceDirection,
  type RepDashboardPayload,
  type ShowCountdown,
} from '@/lib/services/rep-dashboard-math'
import styles from './RepDashboard.module.css'

const SECTION_STORAGE_KEY = 'sparkle-rep-dashboard-sections'

type SectionKey = 'now' | 'visitors' | 'danceFloor' | 'more'

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  now: true,
  visitors: true,
  danceFloor: true,
  more: false,
}

type DashboardDestination =
  | 'trade-board'
  | 'show-calendar'
  | 'customer-list'
  | 'messages'
  | 'team-management'
  | 'recipes'
  | 'live-queue'

type LoadStatus = 'loading' | 'ready' | 'error'

function formatShowTime(iso: string, timeZone: string) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return 'Time to be announced'
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function countdownFace(countdown: ShowCountdown) {
  if (countdown.isPast) return { value: 'Now', label: 'starting' }
  if (countdown.days > 0) {
    return { value: String(countdown.days), label: countdown.days === 1 ? 'day' : 'days' }
  }
  if (countdown.hours > 0) {
    return { value: String(countdown.hours), label: countdown.hours === 1 ? 'hour' : 'hours' }
  }
  return {
    value: String(countdown.minutes),
    label: countdown.minutes === 1 ? 'minute' : 'minutes',
  }
}

function countdownDetail(countdown: ShowCountdown) {
  if (countdown.isPast) return 'It is time'
  if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
  if (countdown.hours > 0) return `${countdown.hours}h ${countdown.minutes}m`
  return `${countdown.minutes}m ${countdown.seconds}s`
}

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

function CountdownRing({ countdown }: { countdown: ShowCountdown }) {
  const gradientId = useId().replace(/:/g, '')
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, Math.max(0, countdown.ringProgress))
  const face = countdownFace(countdown)
  return (
    <div className={styles.ringWrap}>
      <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4cae" />
            <stop offset="48%" stopColor="#e2198f" />
            <stop offset="100%" stopColor="#7345ca" />
          </linearGradient>
        </defs>
        <circle className={styles.ringTrack} cx="60" cy="60" r={radius} />
        <circle
          className={styles.ringValue}
          cx="60"
          cy="60"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className={styles.ringCenter}>
        <strong>{face.value}</strong>
        <span>{face.label}</span>
      </div>
    </div>
  )
}

function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const gradientId = useId().replace(/:/g, '')
  const width = 128
  const height = 40
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : index * step
    const y = height - 6 - (value / max) * (height - 12)
    return `${x},${y}`
  })
  const line = points.join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  const summary = labels
    .map((label, index) => `${label} ${values[index] ?? 0}`)
    .join(', ')
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Monthly additions, oldest to newest: ${summary}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7345ca" />
          <stop offset="100%" stopColor="#e2198f" />
        </linearGradient>
      </defs>
      <polygon className={styles.sparkArea} points={area} />
      <polyline className={styles.sparkLine} points={line} stroke={`url(#${gradientId})`} />
    </svg>
  )
}

function useDashboardSections() {
  const [open, setOpen] = useState(DEFAULT_SECTIONS)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SECTION_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>
      setOpen({
        now: typeof parsed.now === 'boolean' ? parsed.now : DEFAULT_SECTIONS.now,
        visitors: typeof parsed.visitors === 'boolean' ? parsed.visitors : DEFAULT_SECTIONS.visitors,
        danceFloor: typeof parsed.danceFloor === 'boolean' ? parsed.danceFloor : DEFAULT_SECTIONS.danceFloor,
        more: typeof parsed.more === 'boolean' ? parsed.more : DEFAULT_SECTIONS.more,
      })
    } catch {
      setOpen(DEFAULT_SECTIONS)
    }
  }, [])

  function toggle(key: SectionKey) {
    setOpen((current) => {
      const next = { ...current, [key]: !current[key] }
      try {
        window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Private browsing can block storage. The section still toggles for this visit.
      }
      return next
    })
  }

  return { open, toggle }
}

function DashboardSection({
  title,
  description,
  sectionKey,
  open,
  onToggle,
  children,
  testId,
}: {
  title: string
  description?: string
  sectionKey: SectionKey
  open: boolean
  onToggle: (key: SectionKey) => void
  children: ReactNode
  testId: string
}) {
  return (
    <section className={styles.section} data-testid={testId}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-expanded={open}
        onClick={() => onToggle(sectionKey)}
      >
        <span>
          <span className={styles.sectionTitle}>{title}</span>
          {description ? <span className={styles.muted}>{description}</span> : null}
        </span>
        <span className={styles.sectionChevron} data-open={open ? 'true' : 'false'} aria-hidden="true" />
      </button>
      <div className={styles.sectionBody} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

function DirectionMark({ direction }: { direction: GlanceDirection }) {
  if (direction === 'none') return <span className={styles.directionNone}>–</span>
  const label = direction === 'up' ? 'Up from last snapshot' : direction === 'down' ? 'Down from last snapshot' : 'Same as last snapshot'
  return (
    <span className={direction === 'up' ? styles.directionUp : direction === 'down' ? styles.directionDown : styles.directionFlat} aria-label={label}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {direction === 'flat' ? (
          <path d="M3 8h10" />
        ) : (
          <path d={direction === 'up' ? 'M8 12V4M4.5 7.5 8 4l3.5 3.5' : 'M8 4v8M4.5 8.5 8 12l3.5-3.5'} />
        )}
      </svg>
    </span>
  )
}

export function RepDashboard({
  onOpenSection,
  reviewMode = false,
  data,
  now,
}: {
  onOpenSection: (section: DashboardDestination) => void
  reviewMode?: boolean
  data?: RepDashboardPayload
  now?: Date
}) {
  const [status, setStatus] = useState<LoadStatus>(data || reviewMode ? 'ready' : 'loading')
  const [payload, setPayload] = useState<RepDashboardPayload | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [clock, setClock] = useState(() => now ?? new Date())
  const sections = useDashboardSections()
  const reviewDashboard = useMemo(
    () => (reviewMode ? createEmptyRepDashboard(now) : null),
    [reviewMode, now],
  )
  const view = data ?? reviewDashboard ?? payload
  const visibleStatus: LoadStatus = data || reviewMode ? 'ready' : status

  useEffect(() => {
    if (data || reviewMode) return
    const controller = new AbortController()
    fetch('/api/nic-nac/rep-dashboard', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('dashboard request failed')
        return (await response.json()) as RepDashboardPayload
      })
      .then((next) => {
        setPayload(next)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setStatus('error')
      })
    return () => controller.abort()
  }, [data, reviewMode, reloadKey])

  useEffect(() => {
    if (now || !view?.nextShow) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setInterval(() => setClock(new Date()), reduceMotion ? 60_000 : 1_000)
    return () => window.clearInterval(timer)
  }, [now, view?.nextShow])

  if (visibleStatus === 'loading' || !view) {
    return (
      <section className={styles.dashboard} aria-busy="true" aria-label="Your dashboard">
        <p className={styles.loadingText}>Loading your dashboard</p>
        <div className={styles.hero}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
        <div className={styles.stats}>
          <div className={styles.skeletonShort} />
          <div className={styles.skeletonShort} />
          <div className={styles.skeletonShort} />
          <div className={styles.skeletonShort} />
        </div>
      </section>
    )
  }

  if (visibleStatus === 'error') {
    return (
      <section className={styles.dashboard} aria-label="Your dashboard">
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>Your dashboard</h2>
          <p className={styles.muted}>Your dashboard couldn&apos;t load. Your tools are still in the list.</p>
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              setStatus('loading')
              setReloadKey((value) => value + 1)
            }}
          >
            Try again
          </button>
        </article>
      </section>
    )
  }

  const countdown = view.nextShow
    ? getShowCountdown(view.nextShow.eventTime, now ?? clock)
    : null
  const visibleBirthdays = view.birthdays.slice(0, 6)
  const hiddenBirthdays = view.birthdays.length - visibleBirthdays.length

  return (
    <section className={styles.dashboard} aria-label="Your dashboard" data-testid="rep-dashboard">
      <header className={styles.header}>
        <p className={styles.kicker}>Workspace</p>
        <h2 className={styles.title}>Your dashboard</h2>
        <p className={styles.lede}>A quick read on shows, customers, and the Dance Floor.</p>
      </header>
      {view.partial ? (
        <p className={styles.partial} role="status">
          Some cards couldn&apos;t load. The rest of your dashboard is here.
        </p>
      ) : null}

      <DashboardSection
        title="Right now"
        description="Your next show, unread messages, and the numbers that change what you do today."
        sectionKey="now"
        open={sections.open.now}
        onToggle={sections.toggle}
        testId="dashboard-section-now"
      >
      <div className={styles.hero}>
        <article className={styles.showCard} aria-label="Next show">
          <div className={styles.showCopy}>
            <p className={styles.kickerLight}>Next show</p>
            {view.nextShow && countdown ? (
              <>
                <h3 className={styles.showTitle}>{view.nextShow.title}</h3>
                <p className={styles.showMeta}>
                  <span className={styles.platform}>{view.nextShow.platform}</span>
                  <span>{formatShowTime(view.nextShow.eventTime, view.nextShow.timeZone)}</span>
                </p>
                <p className={styles.countdownDetail}>{countdownDetail(countdown)}</p>
              </>
            ) : (
              <>
                <h3 className={styles.showTitle}>No show on the books</h3>
                <p className={styles.showEmpty}>
                  Ask Nic-Nac to put your next show on the calendar.
                </p>
              </>
            )}
            {view.nextShow ? (
              <button type="button" className={styles.actionLight} onClick={() => onOpenSection('show-calendar')}>
                Open calendar
              </button>
            ) : null}
          </div>
          {countdown ? <CountdownRing countdown={countdown} /> : null}
        </article>
      </div>

      <div className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <h3>Customers</h3>
            {view.customers.addedThisMonth > 0 ? (
              <span className={styles.pill}>+{formatCount(view.customers.addedThisMonth)} this month</span>
            ) : null}
          </div>
          <p className={styles.statValue}>{formatCount(view.customers.total)}</p>
          <p className={styles.muted}>{formatCount(view.customers.reachable)} reachable</p>
          <Sparkline values={view.customers.monthly} labels={view.customers.monthLabels} />
          {view.customers.total === 0 ? (
            <button type="button" className={styles.textAction} onClick={() => onOpenSection('customer-list')}>
              Add your first customer
            </button>
          ) : (
            <button type="button" className={styles.textAction} onClick={() => onOpenSection('customer-list')}>
              Open customer list
            </button>
          )}
        </article>

        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <h3>Dance Floor</h3>
            {view.danceFloor.addedThisMonth > 0 ? (
              <span className={styles.pill}>+{formatCount(view.danceFloor.addedThisMonth)} this month</span>
            ) : null}
          </div>
          <p className={styles.statValue}>{formatCount(view.danceFloor.activeListings)}</p>
          <p className={styles.muted}>Active listings</p>
          <Sparkline values={view.danceFloor.monthly} labels={view.danceFloor.monthLabels} />
          <button type="button" className={styles.textAction} onClick={() => onOpenSection('trade-board')}>
            {view.danceFloor.activeListings === 0 ? 'Add your first piece' : 'Open Dance Floor'}
          </button>
        </article>

        <article className={styles.statCard} data-testid="pending-trades">
          <div className={styles.statTop}>
            <h3>Pending trades</h3>
            {view.pendingTrades.count > 0 ? <span className={styles.pulse} data-pulse="true" aria-label="Waiting on you" /> : null}
          </div>
          <p className={styles.statValue}>{formatCount(view.pendingTrades.count)}</p>
          <p className={styles.muted}>
            {view.pendingTrades.count > 0 ? 'Waiting on your Dance Floor.' : 'You are all caught up.'}
          </p>
          <button type="button" className={styles.textAction} onClick={() => onOpenSection('trade-board')}>
            Open Dance Floor
          </button>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <h3>Unread messages</h3>
          </div>
          {view.unreadMessages ? (
            <>
              <p className={styles.statValue}>{formatCount(view.unreadMessages.count)}</p>
              <p className={styles.muted}>
                {view.unreadMessages.latestTitle
                  ? view.unreadMessages.latestTitle
                  : 'You are caught up.'}
              </p>
            </>
          ) : (
            <p className={styles.muted}>Messages couldn&apos;t load just now.</p>
          )}
          <button type="button" className={styles.textAction} onClick={() => onOpenSection('messages')}>
            Open Message Center
          </button>
        </article>
      </div>
      </DashboardSection>

      <DashboardSection
        title="Site visitors"
        description="Visits, the busy hour, QR scans, and a map of US states."
        sectionKey="visitors"
        open={sections.open.visitors}
        onToggle={sections.toggle}
        testId="dashboard-section-visitors"
      >
        <SiteVisitsPanel visits={view.siteVisits} />
      </DashboardSection>

      <DashboardSection
        title="Dance Floor"
        description="What's sitting, what's moving, and where the floor is heavy."
        sectionKey="danceFloor"
        open={sections.open.danceFloor}
        onToggle={sections.toggle}
        testId="dashboard-section-dance-floor"
      >
        <DanceFloorInsightsPanel
          insights={view.danceFloorInsights}
          onOpenDanceFloor={() => onOpenSection('trade-board')}
        />
      </DashboardSection>

      <DashboardSection
        title="More"
        description="Birthdays, platforms, and last month."
        sectionKey="more"
        open={sections.open.more}
        onToggle={sections.toggle}
        testId="dashboard-section-more"
      >
      <article className={styles.card}>
        <p className={styles.kicker}>Coming up</p>
        <h3 className={styles.cardTitle}>Birthdays</h3>
        {visibleBirthdays.length > 0 ? (
          <ul className={styles.birthdayList}>
            {visibleBirthdays.map((birthday) => (
              <li key={`${birthday.initials}-${birthday.month}-${birthday.day}-${birthday.daysUntil}`}>
                <span className={styles.avatar} aria-hidden="true">{birthday.initials}</span>
                <span>
                  <strong>{birthday.initials}</strong>
                  <small>
                    {birthday.isToday ? 'Today' : birthday.dateLabel}
                    {birthday.observedLeapDay ? ' · Feb 29 birthday' : ''}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No birthdays in the next 30 days. You are clear to plan shows.</p>
        )}
        {hiddenBirthdays > 0 ? (
          <p className={styles.muted}>{hiddenBirthdays} more in the next 30 days.</p>
        ) : null}
      </article>

      <div className={styles.secondary}>
        <article className={styles.card}>
          <p className={styles.kicker}>Last 90 days</p>
          <h3 className={styles.cardTitle}>Platform mix</h3>
          {view.platformMix.length > 0 ? (
            <ul className={styles.mixList}>
              {view.platformMix.map((slice) => {
                const max = view.platformMix[0]?.count || 1
                return (
                  <li key={slice.platform}>
                    <span>{slice.platform}</span>
                    <span className={styles.barTrack} aria-hidden="true">
                      <span className={styles.barFill} style={{ width: `${Math.max(8, (slice.count / max) * 100)}%` }} />
                    </span>
                    <strong>{formatCount(slice.count)}</strong>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.muted}>Shows from the last 90 days will fill this in.</p>
          )}
        </article>

        <article className={styles.card}>
          <p className={styles.kicker}>Last month at a glance</p>
          <h3 className={styles.cardTitle}>
            {view.monthAtAGlance.periodLabel || 'Monthly snapshot'}
          </h3>
          <p className={styles.muted}>
            {view.monthAtAGlance.comparedToLabel
              ? `Arrows compare with your ${view.monthAtAGlance.comparedToLabel} snapshot.`
              : 'Arrows show up once an earlier monthly snapshot is saved.'}
          </p>
          {view.monthAtAGlance.rows.length > 0 ? (
            <ul className={styles.glanceList}>
              {view.monthAtAGlance.rows.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <strong>{row.value === null ? '—' : formatCount(row.value)}</strong>
                  <DirectionMark direction={row.direction} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Your monthly snapshot will land here.</p>
          )}
        </article>
      </div>

      {view.team || view.recipes || view.liveLineup ? (
        <div className={styles.conditional}>
          {view.team && view.team.count > 0 ? (
            <button type="button" className={styles.conditionalCard} onClick={() => onOpenSection('team-management')}>
              <span>Team</span>
              <strong>{formatCount(view.team.count)}</strong>
              <span className={styles.textAction}>Open Team Management</span>
            </button>
          ) : null}
          {view.recipes && view.recipes.count > 0 ? (
            <button type="button" className={styles.conditionalCard} onClick={() => onOpenSection('recipes')}>
              <span>Recipes</span>
              <strong>{formatCount(view.recipes.count)}</strong>
              <span className={styles.textAction}>Open Bling Kitchen</span>
            </button>
          ) : null}
          {view.liveLineup && view.liveLineup.count > 0 ? (
            <button type="button" className={styles.conditionalCard} onClick={() => onOpenSection('live-queue')}>
              <span>Live Lineup shows</span>
              <strong>{formatCount(view.liveLineup.count)}</strong>
              <span className={styles.textAction}>Open Live Lineup</span>
            </button>
          ) : null}
        </div>
      ) : null}
      </DashboardSection>
    </section>
  )
}
