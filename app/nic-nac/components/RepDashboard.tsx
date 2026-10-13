'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { DanceFloorInsightsPanel } from '@/app/nic-nac/components/DanceFloorInsights'
import { ClickCue, DashboardLink } from '@/app/nic-nac/components/DashboardLink'
import { SiteVisitsPanel } from '@/app/nic-nac/components/SiteVisitsPanel'
import {
  birthdayTimingLabel,
  createEmptyRepDashboard,
  customerListHref,
  getShowCountdown,
  glanceRowSection,
  sharePercent,
  showInDaysLabel,
  workspaceSectionHref,
  type GlanceDirection,
  type RepDashboardPayload,
  type ShowCountdown,
  type UpcomingBirthday,
} from '@/lib/services/rep-dashboard-math'
import styles from './RepDashboard.module.css'

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

function isDashboardDestination(section: string): section is DashboardDestination {
  return (
    section === 'trade-board' ||
    section === 'show-calendar' ||
    section === 'customer-list' ||
    section === 'messages' ||
    section === 'team-management' ||
    section === 'recipes' ||
    section === 'live-queue'
  )
}

function CustomerTile({
  href,
  tone,
  value,
  share,
  name,
  detail,
  pending = false,
}: {
  href: string
  tone?: 'warn' | 'cream'
  value: string
  share?: number | null
  name: string
  detail: string
  pending?: boolean
}) {
  const toneClass = tone === 'warn' ? styles.customerTileWarn : tone === 'cream' ? styles.customerTileCream : ''
  return (
    <a className={[styles.customerTile, toneClass].filter(Boolean).join(' ')} href={href}>
      <span className={styles.tileHead}>
        <strong className={pending ? styles.tilePending : undefined}>
          {value}
          {share != null ? <span className={styles.tileShare}>{share}%</span> : null}
        </strong>
        <ClickCue />
      </span>
      <span className={styles.tileName}>{name}</span>
      <small>{detail}</small>
    </a>
  )
}

function BirthdayRow({ birthday }: { birthday: UpcomingBirthday }) {
  const content = (
    <span className={styles.birthdayCopy}>
      <strong>{birthday.name}</strong>
      <small>
        {birthday.dateLabel}
        {' · '}
        {birthdayTimingLabel(birthday.daysUntil)}
        {birthday.observedLeapDay ? ' · Feb 29 birthday' : ''}
      </small>
    </span>
  )
  if (!birthday.recordHref) {
    return <span className={styles.birthdayLink}>{content}</span>
  }
  return (
    <a className={styles.birthdayLink} href={birthday.recordHref}>
      {content}
      <ClickCue />
    </a>
  )
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
  publicSiteHref = null,
}: {
  onOpenSection: (section: DashboardDestination) => void
  reviewMode?: boolean
  data?: RepDashboardPayload
  now?: Date
  publicSiteHref?: string | null
}) {
  const [status, setStatus] = useState<LoadStatus>(data || reviewMode ? 'ready' : 'loading')
  const [payload, setPayload] = useState<RepDashboardPayload | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [clock, setClock] = useState(() => now ?? new Date())
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
        <div className={styles.subjectStack}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeletonShort} />
          <div className={styles.skeleton} />
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
  const showInDays = countdown ? showInDaysLabel(countdown.days) : null
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

      <section className={styles.subjectCard} data-testid="shows-card" aria-label="Your shows">
        <DashboardLink
          className={styles.customerTop}
          href={workspaceSectionHref('show-calendar')}
          onOpen={() => onOpenSection('show-calendar')}
        >
          <div>
            <p className={styles.kicker}>Shows</p>
            <h3 className={styles.cardTitle}>Your shows</h3>
            <p className={styles.customerExplainer}>
              The next one on your calendar, the platforms you have been live on, and Live Lineup when you have shows there.
            </p>
          </div>
          <ClickCue />
        </DashboardLink>
        <div className={styles.subjectStack}>
          <DashboardLink
            className={styles.showCard}
            href={workspaceSectionHref('show-calendar')}
            onOpen={() => onOpenSection('show-calendar')}
            testId="next-show"
          >
            <div className={styles.showCopy}>
              <div className={styles.cueRow}>
                <p className={styles.kickerLight}>Next show</p>
                <ClickCue />
              </div>
              {view.nextShow && countdown ? (
                <>
                  <h3 className={styles.showTitle}>{view.nextShow.title}</h3>
                  <p className={styles.showMeta}>
                    <span className={styles.platform}>{view.nextShow.platform}</span>
                    <span>{formatShowTime(view.nextShow.eventTime, view.nextShow.timeZone)}</span>
                  </p>
                  <p className={styles.countdownDetail}>
                    {showInDays ? <span>{showInDays}</span> : null}
                    <span>{countdownDetail(countdown)}</span>
                  </p>
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
                <span className={styles.actionLight}>Open calendar</span>
              ) : null}
            </div>
            {countdown ? <CountdownRing countdown={countdown} /> : null}
          </DashboardLink>
          <div className={styles.subjectPair}>
            <DashboardLink
              className={styles.card}
              href={workspaceSectionHref('show-calendar')}
              onOpen={() => onOpenSection('show-calendar')}
              testId="platform-mix"
            >
              <div className={styles.cueRow}>
                <div>
                  <p className={styles.kicker}>Last 90 days</p>
                  <h3 className={styles.cardTitle}>Platform mix</h3>
                </div>
                <ClickCue />
              </div>
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
            </DashboardLink>
            {view.liveLineup && view.liveLineup.count > 0 ? (
              <DashboardLink
                className={styles.statCard}
                href={workspaceSectionHref('live-queue')}
                onOpen={() => onOpenSection('live-queue')}
                testId="live-lineup"
              >
                <div className={styles.statTop}>
                  <h3>Live Lineup shows</h3>
                  <ClickCue />
                </div>
                <p className={styles.statValue}>{formatCount(view.liveLineup.count)}</p>
                <span className={styles.textAction}>Open Live Lineup</span>
              </DashboardLink>
            ) : null}
          </div>
        </div>
      </section>

      {visibleBirthdays.length > 0 ? (
        <article className={styles.subjectCard} data-testid="birthdays-card">
          <DashboardLink
            className={styles.customerTop}
            href={customerListHref()}
            onOpen={() => onOpenSection('customer-list')}
          >
            <div>
              <p className={styles.kicker}>Coming up</p>
              <h3 className={styles.cardTitle}>Birthdays</h3>
            </div>
            <ClickCue />
          </DashboardLink>
          <ul className={styles.birthdayList}>
            {visibleBirthdays.map((birthday, index) => (
              <li key={`${birthday.customerId ?? birthday.name}-${birthday.month}-${birthday.day}-${index}`}>
                <BirthdayRow birthday={birthday} />
              </li>
            ))}
          </ul>
          {hiddenBirthdays > 0 ? (
            <p className={styles.muted}>{hiddenBirthdays} more in the next 30 days.</p>
          ) : null}
        </article>
      ) : (
        <DashboardLink
          className={styles.subjectCard}
          href={customerListHref()}
          onOpen={() => onOpenSection('customer-list')}
          testId="birthdays-card"
        >
          <div className={styles.customerTop}>
            <div>
              <p className={styles.kicker}>Coming up</p>
              <h3 className={styles.cardTitle}>Birthdays</h3>
            </div>
            <ClickCue />
          </div>
          <p className={styles.muted}>No birthdays in the next 30 days. You are clear to plan shows.</p>
        </DashboardLink>
      )}

      <section className={styles.customerCard} data-testid="customers-card" aria-label="Your customers">
        <DashboardLink
          className={styles.customerTop}
          href={customerListHref()}
          onOpen={() => onOpenSection('customer-list')}
        >
          <div>
            <p className={styles.kicker}>Customers</p>
            <h3 className={styles.cardTitle}>Your customers</h3>
            <p className={styles.customerTotal}>{formatCount(view.customers.total)}</p>
            <p className={styles.customerExplainer}>
              Everyone on your customer list, from shows, your site, and Nic-Nac.
            </p>
          </div>
          <ClickCue />
        </DashboardLink>
        <div className={styles.customerGroup}>
          <p className={styles.groupLabel}>How you can reach them</p>
          <div className={styles.customerTiles}>
            <CustomerTile
              href={customerListHref('email_reachable')}
              value={formatCount(view.customers.ableToEmail)}
              share={sharePercent(view.customers.ableToEmail, view.customers.total)}
              name="Able to receive email"
              detail="Have an email address and haven't unsubscribed."
            />
            <CustomerTile
              href={customerListHref('sms_reachable')}
              value={formatCount(view.customers.ableToText)}
              share={sharePercent(view.customers.ableToText, view.customers.total)}
              name="Able to receive texts"
              detail="Have a phone number and said yes to texts."
            />
            <CustomerTile
              href={customerListHref('missing_contact')}
              tone="warn"
              value={formatCount(view.customers.missingContact)}
              name="Missing contact info"
              detail="No email or phone yet. Ask them at your next show."
            />
          </div>
        </div>
        <div className={styles.customerGroup}>
          <p className={styles.groupLabel}>How active they are</p>
          <div className={styles.customerTiles}>
            <CustomerTile
              href={customerListHref('new_this_month', view.customers.monthStartIso)}
              tone="cream"
              value={`+${formatCount(view.customers.addedThisMonth)}`}
              name="New this month"
              detail={`Customers added since ${view.customers.monthStartLabel}.`}
            />
            <CustomerTile
              href={customerListHref(
                'ordered_during_live_90',
                view.customers.liveOrderActivity.windowStartIso,
              )}
              tone="cream"
              pending={!view.customers.liveOrderActivity.available}
              value={
                view.customers.liveOrderActivity.available
                  ? formatCount(view.customers.liveOrderActivity.orderedDuringLiveLast90Days ?? 0)
                  : 'Not available yet'
              }
              name="Ordered during a LIVE in the last 90 days"
              detail="Orders during your LIVE shows in the last 90 days. This count is from LIVE shows only."
            />
            <CustomerTile
              href={customerListHref('gone_quiet', view.customers.liveOrderActivity.windowStartIso)}
              tone="warn"
              pending={!view.customers.liveOrderActivity.available}
              value={
                view.customers.liveOrderActivity.available
                  ? formatCount(view.customers.liveOrderActivity.goneQuiet ?? 0)
                  : 'Not available yet'
              }
              name="Gone quiet"
              detail="Ordered during a LIVE show before, but not in the last 90 days. This count is from LIVE shows only."
            />
          </div>
        </div>
      </section>

      <section className={styles.subjectCard} data-testid="dance-floor-insights" aria-labelledby="dance-floor-title">
        <DashboardLink
          className={styles.customerTop}
          href={workspaceSectionHref('trade-board')}
          onOpen={() => onOpenSection('trade-board')}
        >
          <div>
            <p className={styles.kicker}>Dance Floor</p>
            <h3 id="dance-floor-title" className={styles.cardTitle}>Your Dance Floor</h3>
            <p className={styles.customerExplainer}>
              What is still listed, what already left, and which pieces have been waiting. Use it to decide what to feature in your next live.
            </p>
          </div>
          <ClickCue />
        </DashboardLink>
        <div className={styles.subjectPair}>
          <DashboardLink
            className={styles.statCard}
            href={workspaceSectionHref('trade-board')}
            onOpen={() => onOpenSection('trade-board')}
            testId="dance-floor-card"
          >
            <div className={styles.statTop}>
              <h3>Dance Floor</h3>
              <span className={styles.cueCluster}>
                {view.danceFloor.addedThisMonth > 0 ? (
                  <span className={styles.pill}>+{formatCount(view.danceFloor.addedThisMonth)} this month</span>
                ) : null}
                <ClickCue />
              </span>
            </div>
            <p className={styles.statValue}>{formatCount(view.danceFloor.activeListings)}</p>
            <p className={styles.muted}>Active listings</p>
            <Sparkline values={view.danceFloor.monthly} labels={view.danceFloor.monthLabels} />
            <span className={styles.textAction}>
              {view.danceFloor.activeListings === 0 ? 'Add your first piece' : 'Open Dance Floor'}
            </span>
          </DashboardLink>

          <DashboardLink
            className={styles.statCard}
            href={workspaceSectionHref('trade-board')}
            onOpen={() => onOpenSection('trade-board')}
            testId="pending-trades"
          >
            <div className={styles.statTop}>
              <h3>Pending trades</h3>
              <span className={styles.cueCluster}>
                {view.pendingTrades.count > 0 ? <span className={styles.pulse} data-pulse="true" aria-label="Waiting on you" /> : null}
                <ClickCue />
              </span>
            </div>
            <p className={styles.statValue}>{formatCount(view.pendingTrades.count)}</p>
            <p className={styles.muted}>
              {view.pendingTrades.count > 0 ? 'Waiting on your Dance Floor.' : 'You are all caught up.'}
            </p>
            <span className={styles.textAction}>Open Dance Floor</span>
          </DashboardLink>
        </div>
        <DanceFloorInsightsPanel
          insights={view.danceFloorInsights}
          onOpenDanceFloor={() => onOpenSection('trade-board')}
        />
      </section>

      <section className={styles.subjectCard} data-testid="messages-card" aria-label="Messages">
        <DashboardLink
          className={styles.customerTop}
          href={workspaceSectionHref('messages')}
          onOpen={() => onOpenSection('messages')}
        >
          <div>
            <p className={styles.kicker}>Messages</p>
            <h3 className={styles.cardTitle}>Messages</h3>
            <p className={styles.customerExplainer}>
              Unread notes from Sparkle Suite, with the latest one named when there is something waiting.
            </p>
          </div>
          <ClickCue />
        </DashboardLink>
        <DashboardLink
          className={styles.statCard}
          href={workspaceSectionHref('messages')}
          onOpen={() => onOpenSection('messages')}
          testId="unread-messages"
        >
          <div className={styles.statTop}>
            <h3>Unread messages</h3>
            <ClickCue />
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
          <span className={styles.textAction}>Open Message Center</span>
        </DashboardLink>
      </section>

      <SiteVisitsPanel visits={view.siteVisits} siteHref={publicSiteHref} />

      <section className={styles.subjectCard} data-testid="month-at-a-glance" aria-label="Last month at a glance">
        <div className={styles.customerTop}>
          <div>
            <p className={styles.kicker}>Last month at a glance</p>
            <h3 className={styles.cardTitle}>
              {view.monthAtAGlance.periodLabel || 'Monthly snapshot'}
            </h3>
            <p className={styles.customerExplainer}>
              {view.monthAtAGlance.comparedToLabel
                ? `Arrows compare with your ${view.monthAtAGlance.comparedToLabel} snapshot.`
                : 'Arrows show up once an earlier monthly snapshot is saved.'}
            </p>
          </div>
        </div>
        {view.monthAtAGlance.rows.length > 0 ? (
          <ul className={styles.glanceList}>
            {view.monthAtAGlance.rows.map((row) => {
              const section = glanceRowSection(row.key)
              const body = (
                <>
                  <span>{row.label}</span>
                  <strong>{row.value === null ? '—' : formatCount(row.value)}</strong>
                  <DirectionMark direction={row.direction} />
                </>
              )
              return (
                <li key={row.key}>
                  {section && isDashboardDestination(section) ? (
                    <DashboardLink
                      className={styles.glanceLink}
                      href={workspaceSectionHref(section)}
                      onOpen={() => onOpenSection(section)}
                    >
                      {body}
                      <ClickCue />
                    </DashboardLink>
                  ) : body}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.muted}>Your monthly snapshot will land here.</p>
        )}
      </section>

      {view.team?.count || view.recipes?.count ? (
        <div className={styles.subjectPair}>
          {view.team && view.team.count > 0 ? (
            <DashboardLink
              className={styles.subjectCard}
              href={workspaceSectionHref('team-management')}
              onOpen={() => onOpenSection('team-management')}
              testId="team-card"
            >
              <div className={styles.customerTop}>
                <div>
                  <p className={styles.kicker}>Team</p>
                  <h3 className={styles.cardTitle}>Your team</h3>
                  <p className={styles.customerTotal}>{formatCount(view.team.count)}</p>
                </div>
                <ClickCue />
              </div>
              <span className={styles.textAction}>Open Team Management</span>
            </DashboardLink>
          ) : null}
          {view.recipes && view.recipes.count > 0 ? (
            <DashboardLink
              className={styles.subjectCard}
              href={workspaceSectionHref('recipes')}
              onOpen={() => onOpenSection('recipes')}
              testId="recipes-card"
            >
              <div className={styles.customerTop}>
                <div>
                  <p className={styles.kicker}>Recipes</p>
                  <h3 className={styles.cardTitle}>Your recipes</h3>
                  <p className={styles.customerTotal}>{formatCount(view.recipes.count)}</p>
                </div>
                <ClickCue />
              </div>
              <span className={styles.textAction}>Open Bling Kitchen</span>
            </DashboardLink>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
