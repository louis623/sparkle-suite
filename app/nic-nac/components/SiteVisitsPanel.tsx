'use client'

import { useEffect, useId, useState } from 'react'
import { workspaceSectionHref } from '@/lib/services/rep-dashboard-math'
import { US_STATE_HEX, US_STATE_NAMES } from '@/lib/services/site-visit-summary'
import {
  ABOUT_NUMBERS_COPY,
  bucketGa4Sources,
  buildTrafficMonthBars,
  calendarDayKey,
  dailyChartAxisLabels,
  GA4_PROCESSING_COPY,
  GA4_SOURCE_ORDER,
  joinComparisonCopy,
  joinOpenedSentence,
  NEW_SITE_COPY,
  PAGE_VIEWS_NOTE,
  pageViewComparisonCopy,
  peopleSinceLabel,
  pickSiteTrafficTakeaway,
  plainDeviceName,
  resolveTrafficPeriod,
  SITE_TRAFFIC_HISTORY_LABEL,
  SITE_TRAFFIC_HISTORY_START,
  SITE_TRAFFIC_INFO,
  siteAgeDays,
  siteTrafficAnalyticsKey,
  stateFromRegionLabel,
  summarizeTrafficPeriod,
  takeawayHeading,
  thisMonthTakeawayFacts,
  trafficIntro,
  type SiteTrafficLedger,
  type TrafficPeriodId,
} from '@/lib/services/site-traffic'
import { zonedCalendarDay } from '@/lib/services/rep-dashboard-math'
import { ClickCue } from './DashboardLink'
import { SubjectCardTip } from './SubjectCardTip'
import styles from './RepDashboard.module.css'

const MAP_COLORS = ['#f4eefc', '#d9c8f3', '#a07ad8', '#6f2bd0', '#2a1248'] as const

type ColorBand = {
  min: number
  max: number
  color: string
  label: string
}

type Breakdown = { label: string; value: number }

export type SiteTrafficGa4State =
  | {
      status: 'loading' | 'not_set_up' | 'unavailable' | 'processing'
      realtimeUsers?: number | null
    }
  | {
      status: 'ready'
      sources: Breakdown[]
      regions: Breakdown[]
      cities: Breakdown[]
      devices: Breakdown[]
      newVisitors: number | null
      returningVisitors: number | null
      realtimeUsers: number | null
    }

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

function visitWord(count: number) {
  return count === 1 ? 'visit' : 'visits'
}

function rangeLabel(min: number, max: number) {
  const span = min === max ? formatCount(min) : `${formatCount(min)}\u2013${formatCount(max)}`
  return `${span} ${min === 1 && max === 1 ? 'visit' : 'visits'}`
}

export function stateVisitColorBands(max: number): ColorBand[] {
  const bands: ColorBand[] = [{ min: 0, max: 0, color: MAP_COLORS[0], label: rangeLabel(0, 0) }]
  if (max <= 0) return bands
  const positiveColors = MAP_COLORS.slice(1)
  const steps = Math.min(positiveColors.length, max)
  let cursor = 1
  for (let index = 0; index < steps; index += 1) {
    const remaining = max - cursor + 1
    const slots = steps - index
    const size = Math.ceil(remaining / slots)
    const end = cursor + size - 1
    const colorIndex = positiveColors.length - steps + index
    bands.push({
      min: cursor,
      max: end,
      color: positiveColors[colorIndex],
      label: rangeLabel(cursor, end),
    })
    cursor = end + 1
  }
  return bands
}

function bandForCount(count: number, bands: ColorBand[]) {
  for (let index = bands.length - 1; index >= 0; index -= 1) {
    const band = bands[index]
    if (count >= band.min && count <= band.max) return band
  }
  return bands[0]
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM'
  const face = hour % 12 === 0 ? 12 : hour % 12
  return `${face} ${suffix}`
}

function heatColor(count: number, max: number) {
  if (count <= 0 || max <= 0) return '#f6f1fd'
  const mix = Math.max(0.18, count / max)
  return `color-mix(in srgb, #e2198f ${Math.round(mix * 100)}%, #f1eafd)`
}

function regionsToStates(rows: Breakdown[]) {
  const counts = new Map<string, { code: string; name: string; count: number }>()
  for (const row of rows) {
    const state = stateFromRegionLabel(row.label)
    if (!state || row.value <= 0) continue
    const current = counts.get(state.code)
    if (current) current.count += row.value
    else counts.set(state.code, { code: state.code, name: state.name, count: row.value })
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
}

function StateMap({ states }: { states: Array<{ code: string; name: string; count: number }> }) {
  const counts = new Map(states.map((state) => [state.code, state.count]))
  const max = Math.max(...states.map((state) => state.count), 0)
  const bands = stateVisitColorBands(max)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const activeCode = pinned ?? hovered
  const activeCount = activeCode ? counts.get(activeCode) ?? 0 : 0
  const activeName = activeCode ? US_STATE_NAMES[activeCode] : null
  const radius = 18
  const width = 11 * radius * 1.72 + 36
  const height = 8 * radius * 1.55 + 36
  const topStates = states.slice(0, 5)

  return (
    <div>
      <p className={styles.why}>Darker states sent you more visitors.</p>
      <p className={styles.mapReadout} role="status" data-testid="state-visit-readout">
        {activeName
          ? `${activeName} · ${formatCount(activeCount)} ${visitWord(activeCount)}`
          : 'Hover or tap a state to see its name and visit count.'}
      </p>
      <div className={styles.mapLayout}>
        <svg className={styles.stateMap} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Visits by US state. Darker states sent more visitors.">
          {US_STATE_HEX.map((state) => {
            const count = counts.get(state.code) ?? 0
            const band = bandForCount(count, bands)
            const onDark = band.color === MAP_COLORS[3] || band.color === MAP_COLORS[4]
            const name = US_STATE_NAMES[state.code]
            const cx = 22 + state.col * radius * 1.72 + (state.row % 2) * radius * 0.86
            const cy = 22 + state.row * radius * 1.55
            const points = Array.from({ length: 6 }, (_, point) => {
              const angle = (Math.PI / 180) * (60 * point - 30)
              return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
            }).join(' ')
            const selected = activeCode === state.code
            return (
              <g key={state.code}>
                <polygon
                  className={styles.stateShape}
                  points={points}
                  fill={band.color}
                  stroke={selected ? '#171034' : '#ffffff'}
                  strokeWidth={selected ? 3 : 2}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}, ${formatCount(count)} ${visitWord(count)}`}
                  aria-pressed={selected}
                  onMouseEnter={() => setHovered(state.code)}
                  onMouseLeave={() => setHovered((current) => (current === state.code ? null : current))}
                  onFocus={() => setHovered(state.code)}
                  onBlur={() => setHovered((current) => (current === state.code ? null : current))}
                  onClick={() => setPinned((current) => (current === state.code ? null : state.code))}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    setPinned((current) => (current === state.code ? null : state.code))
                  }}
                >
                  <title>{`${name}: ${formatCount(count)} ${visitWord(count)}`}</title>
                </polygon>
                <text x={cx} y={cy + 3} textAnchor="middle" className={onDark ? styles.stateCodeOnDark : styles.stateCode}>
                  {state.code}
                </text>
              </g>
            )
          })}
        </svg>
        <div>
          <h4 className={styles.mapListTitle}>Top 5 states</h4>
          {topStates.length > 0 ? (
            <ol className={styles.topStates} data-testid="top-states">
              {topStates.map((state) => (
                <li key={state.code}>
                  <span>{state.name}</span>
                  <strong>{formatCount(state.count)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>No state visits in this period yet.</p>
          )}
        </div>
      </div>
      <div className={styles.mapLegend} data-testid="state-color-legend">
        <p className={styles.mapScale}>Light = few visits. Dark = most visits.</p>
        <ul className={styles.mapSwatches}>
          {bands.map((band) => (
            <li key={band.label}>
              <i style={{ background: band.color }} />
              <span>{band.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Teach({
  id,
  copy,
}: {
  id: string
  copy: { means: string; matters: string; try: string }
}) {
  return (
    <div className={styles.trafficTeach} id={id}>
      <p><b>What this means</b> {copy.means}</p>
      <p><b>Why it matters</b> {copy.matters}</p>
      <p><b>What to try</b> {copy.try}</p>
    </div>
  )
}

function InfoButton({
  cardId,
  label,
  openId,
  onToggle,
}: {
  cardId: string
  label: string
  openId: string | null
  onToggle: (id: string) => void
}) {
  const open = openId === cardId
  return (
    <button
      type="button"
      className={open ? styles.infoButtonOpen : styles.infoButton}
      aria-expanded={open}
      aria-controls={`${cardId}-details`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(cardId)
      }}
    >
      <span aria-hidden="true">i</span>
      <span className={styles.srOnly}>{open ? `Hide what ${label} means` : `What ${label} means`}</span>
    </button>
  )
}

function CardHead({
  title,
  cardId,
  openId,
  onToggle,
  testId,
}: {
  title: string
  cardId: string
  openId: string | null
  onToggle: (id: string) => void
  testId?: string
}) {
  return (
    <div className={styles.trafficHead}>
      <h3 className={styles.pieceTitle} data-testid={testId}>{title}</h3>
      <InfoButton cardId={cardId} label={title} openId={openId} onToggle={onToggle} />
    </div>
  )
}

function DailyChart({
  bars,
}: {
  bars: Array<{ key: string; label: string; pageViews: number; showDay: boolean }>
}) {
  const max = Math.max(...bars.map((bar) => bar.pageViews), 1)
  const axis = dailyChartAxisLabels(bars.map((bar) => bar.label))
  const summary = bars.map((bar) => `${bar.label} ${bar.pageViews}`).join(', ')
  return (
    <div>
      <div className={styles.trafficChart} role="img" aria-label={`Daily page views: ${summary || 'none yet'}`}>
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={bar.showDay ? styles.trafficBarShow : styles.trafficBar}
            style={{ height: `${Math.max(4, Math.round((bar.pageViews / max) * 100))}%` }}
            title={`${bar.label}: ${bar.pageViews}`}
          />
        ))}
      </div>
      {axis.length > 0 ? (
        <div className={styles.trafficAxis} data-testid="traffic-axis">
          {axis.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
      ) : null}
      <div className={styles.trafficLegend}>
        <span><i className={styles.legendShow} /> Show day</span>
        <span><i className={styles.legendOther} /> Other day</span>
      </div>
    </div>
  )
}

function ShareRows({ rows }: { rows: Array<{ label: string; value: number; qr?: boolean }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return (
    <ul className={styles.trafficRows}>
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
        return (
          <li key={row.label}>
            <span>{row.label}</span>
            <span className={styles.trafficTrack}>
              <span
                className={row.qr ? styles.trafficFillQr : styles.trafficFill}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={styles.trafficNum}>{pct}%</span>
          </li>
        )
      })}
    </ul>
  )
}

function ga4StatusLine(status: SiteTrafficGa4State['status']) {
  if (status === 'processing') return GA4_PROCESSING_COPY
  if (status === 'not_set_up') return 'Analytics not set up yet.'
  if (status === 'unavailable') return 'Analytics will show up here when the connection is ready.'
  return 'Loading where your visitors are.'
}

function realtimeSentence(users: number) {
  if (users <= 0) return 'No one on your site this minute.'
  if (users === 1) return '1 person on your site right now'
  return `${formatCount(users)} people on your site right now`
}

function readGa4Body(body: {
  ga4Status?: string
  status?: string
  trafficSources?: Breakdown[]
  regions?: Breakdown[]
  cities?: Breakdown[]
  deviceMix?: Breakdown[]
  newVisitors?: number | null
  returningVisitors?: number | null
  realtimeUsers?: number | null
}): SiteTrafficGa4State {
  const realtimeUsers = typeof body.realtimeUsers === 'number' ? body.realtimeUsers : null
  if (body.ga4Status === 'ready') {
    return {
      status: 'ready',
      sources: body.trafficSources ?? [],
      regions: body.regions ?? [],
      cities: body.cities ?? [],
      devices: body.deviceMix ?? [],
      newVisitors: body.newVisitors ?? null,
      returningVisitors: body.returningVisitors ?? null,
      realtimeUsers,
    }
  }
  if (body.ga4Status === 'processing') return { status: 'processing', realtimeUsers }
  if (body.ga4Status === 'not_set_up') return { status: 'not_set_up', realtimeUsers }
  return { status: 'unavailable', realtimeUsers }
}

export function SiteVisitsPanel({
  traffic,
  siteHref = null,
  now,
  ga4 = undefined,
  initialPeriod = 'this-month',
}: {
  traffic: SiteTrafficLedger
  siteHref?: string | null
  now?: Date
  ga4?: SiteTrafficGa4State
  initialPeriod?: TrafficPeriodId
}) {
  const clock = now ?? new Date()
  const zone = traffic?.timeZone
  const todayKey = calendarDayKey(zonedCalendarDay(clock, zone))
  const [periodId, setPeriodId] = useState<TrafficPeriodId>(initialPeriod)
  const [customStart, setCustomStart] = useState(SITE_TRAFFIC_HISTORY_START)
  const [customEnd, setCustomEnd] = useState(todayKey)
  const [openId, setOpenId] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [remoteGa4, setRemoteGa4] = useState<SiteTrafficGa4State>({ status: 'loading' })
  const guideId = useId()
  const ledger = traffic ?? {
    status: 'unavailable' as const,
    historyStart: SITE_TRAFFIC_HISTORY_START,
    timeZone: 'America/New_York',
    uniqueCounting: false,
    uniqueSince: null,
    showDays: [],
    days: [],
  }
  const period = resolveTrafficPeriod({
    period: periodId,
    now: clock,
    timeZone: ledger.timeZone,
    customStart,
    customEnd,
  })
  const summary = summarizeTrafficPeriod(ledger, period)
  const months = buildTrafficMonthBars(ledger, clock, ledger.timeZone)
  const view = ga4 ?? remoteGa4
  const ga4Ready = view.status === 'ready'
  const buckets = ga4Ready ? bucketGa4Sources(view.sources) : null
  const takeaway = pickSiteTrafficTakeaway(thisMonthTakeawayFacts({
    ledger,
    now: clock,
    timeZone: ledger.timeZone,
    period,
    ga4Processing: !ga4Ready,
    knownSessions: buckets?.knownSessions ?? 0,
    topSourceLabel: buckets?.topSourceLabel ?? null,
    topSourceSessions: buckets?.topSourceSessions ?? 0,
  }))
  const peopleSince = peopleSinceLabel(summary.peopleSince)
  const publicSiteHref = siteHref?.trim() || null
  const young = siteAgeDays(clock, ledger.timeZone) < 7
  const rangeStart = calendarDayKey(period.start)
  const rangeEnd = calendarDayKey(period.end)
  const analyticsKey = siteTrafficAnalyticsKey({
    ga4Provided: ga4 !== undefined,
    countable: period.countable,
    startKey: rangeStart,
    endKey: rangeEnd,
  })

  useEffect(() => {
    if (!analyticsKey) return undefined
    const controller = new AbortController()
    let active = true
    setRemoteGa4({ status: 'loading' })
    const [start, end] = analyticsKey.split(':')
    fetch(`/api/nic-nac/site-analytics?start=${start}&end=${end}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return { status: 'unavailable' as const }
        return readGa4Body(await response.json())
      })
      .then((next) => {
        if (active) setRemoteGa4(next)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRemoteGa4({ status: 'unavailable' })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [analyticsKey])

  const toggleInfo = (id: string) => setOpenId((current) => (current === id ? null : id))
  const sourceValue = (label: (typeof GA4_SOURCE_ORDER)[number]) =>
    buckets?.sources.find((row) => row.label === label)?.value ?? 0
  const ga4SourceCount = ga4Ready
    ? GA4_SOURCE_ORDER.reduce((sum, label) => sum + sourceValue(label), 0)
    : 0
  const sourceRows = ga4Ready && ga4SourceCount > 0
    ? [
        { label: 'TikTok', value: sourceValue('TikTok') },
        { label: 'QR cards', value: summary.qrVisits, qr: true },
        { label: 'Google', value: sourceValue('Google') },
        { label: 'Facebook / IG', value: sourceValue('Facebook / IG') },
        { label: 'Direct / other', value: sourceValue('Direct / other') },
      ].filter((row) => row.value > 0)
    : []
  const readyGa4 = view.status === 'ready' ? view : null
  const states = readyGa4 ? regionsToStates(readyGa4.regions) : []
  const realtime = view.realtimeUsers
  const heatMax = Math.max(...summary.heatmap.flat(), 0)
  const heatOrder = [1, 2, 3, 4, 5, 6, 0]
  const qrShare = summary.pageViews > 0 ? Math.round((summary.qrVisits / summary.pageViews) * 100) : null

  return (
    <SubjectCardTip tip="visitors" testId="site-visitors" ariaLabelledBy="site-visitors-title">
      <header className={styles.customerTop}>
        <div>
          <p className={styles.kicker}>Website</p>
          <h3 id="site-visitors-title" className={styles.cardTitle}>Site traffic</h3>
          <p className={styles.customerExplainer} id={guideId}>
            {trafficIntro(period)} New to this?{' '}
            <a
              href="/nic-nac?section=resources&resource=how-to-read-your-site-traffic"
              data-testid="site-traffic-guide-slot"
            >
              Read the guide
            </a>
          </p>
        </div>
      </header>

      <div className={styles.periodBar} role="group" aria-label="Site traffic dates">
        {(
          [
            ['this-month', 'This month'],
            ['last-month', 'Last month'],
            ['last-7', '7 days'],
            ['custom', 'Dates'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={periodId === id ? styles.periodOn : styles.periodButton}
            aria-pressed={periodId === id}
            onClick={() => setPeriodId(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {periodId === 'custom' ? (
        <div className={styles.customDates}>
          <label>
            From
            <input
              type="date"
              min={SITE_TRAFFIC_HISTORY_START}
              max={todayKey}
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              min={SITE_TRAFFIC_HISTORY_START}
              max={todayKey}
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <section className={styles.trafficTakeaway} data-testid="site-traffic-takeaway">
        <p className={styles.kickerLight}>{takeawayHeading(period)}</p>
        <p>{takeaway.text}</p>
      </section>

      {young ? <p className={styles.trafficNote}>{NEW_SITE_COPY}</p> : null}
      {ledger.status === 'unavailable' ? (
        <p className={styles.muted}>
          Site traffic isn&apos;t available yet. Counting started {SITE_TRAFFIC_HISTORY_LABEL}.
        </p>
      ) : null}

      {typeof realtime === 'number' ? (
        <section data-testid="traffic-now">
          <div className={styles.trafficNow}>
            <span className={styles.pulse} aria-hidden="true" />
            <p>{realtimeSentence(realtime)}</p>
            <InfoButton cardId="right-now" label="Right now" openId={openId} onToggle={toggleInfo} />
          </div>
          {openId === 'right-now' ? <Teach id="right-now-details" copy={SITE_TRAFFIC_INFO.rightNow} /> : null}
        </section>
      ) : null}

      <article className={styles.card} data-testid="site-visits">
        <CardHead title="Page views" cardId="page-views" openId={openId} onToggle={toggleInfo} />
        {publicSiteHref ? (
          <a className={styles.trafficCue} href={publicSiteHref} target="_blank" rel="noreferrer noopener">
            <ClickCue kind="site" />
            <span className={styles.srOnly}> Opens in a new tab.</span>
          </a>
        ) : null}
        <div className={styles.trafficStatRow}>
          <p className={styles.statValue}>{formatCount(summary.pageViews)}</p>
          <span className={styles.pill}>{pageViewComparisonCopy(summary)}</span>
        </div>
        <p className={styles.trafficNote}>{PAGE_VIEWS_NOTE}</p>
        {summary.people != null ? (
          <p className={styles.why}>
            <strong>{formatCount(summary.people)}</strong> people who visited
            {peopleSince ? `. Counting since ${peopleSince}.` : '. Counting starts once visitor ids are on.'}
          </p>
        ) : null}
        {period.countable ? <DailyChart bars={summary.daily} /> : (
          <p className={styles.muted}>Counting started {SITE_TRAFFIC_HISTORY_LABEL}.</p>
        )}
        {openId === 'page-views' ? (
          <div id="page-views-details">
            <Teach id="page-views-means" copy={SITE_TRAFFIC_INFO.pageViews} />
            <Teach id="page-views-chart" copy={SITE_TRAFFIC_INFO.dailyChart} />
          </div>
        ) : null}
      </article>

      <article className={styles.card} data-testid="traffic-sources">
        <CardHead title="Where they came from" cardId="sources" openId={openId} onToggle={toggleInfo} />
        {!period.countable ? (
          <p className={styles.muted}>No counted days in this period yet.</p>
        ) : sourceRows.length > 0 ? (
          <ShareRows rows={sourceRows} />
        ) : ga4Ready ? (
          <p className={styles.muted}>
            {summary.qrVisits > 0
              ? `QR cards: ${formatCount(summary.qrVisits)} ${summary.qrVisits === 1 ? 'visit' : 'visits'} from your counter. Google Analytics has no other sources for these dates yet.`
              : 'No source visits in this period yet.'}
          </p>
        ) : (
          <>
            <p className={styles.muted}>{ga4StatusLine(view.status)}</p>
            {summary.qrVisits > 0 ? (
              <p className={styles.why}>
                QR cards: {formatCount(summary.qrVisits)} {summary.qrVisits === 1 ? 'visit' : 'visits'} from your counter. The source split shows up when Google Analytics is ready.
              </p>
            ) : null}
          </>
        )}
        <p className={styles.trafficSourceNote}>QR from Sparkle Suite&apos;s counter. Others from Google Analytics.</p>
        {openId === 'sources' ? <Teach id="sources-details" copy={SITE_TRAFFIC_INFO.sources} /> : null}
      </article>

      <article className={styles.card} data-testid="traffic-pages">
        <CardHead title="What they looked at" cardId="pages" openId={openId} onToggle={toggleInfo} />
        {summary.pages.length > 0 ? (
          <ol className={styles.trafficPages}>
            {summary.pages.map((page) => (
              <li key={page.name}>
                <span>{page.name}</span>
                <strong>{formatCount(page.count)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>Pages show up here after someone opens your site.</p>
        )}
        {openId === 'pages' ? <Teach id="pages-details" copy={SITE_TRAFFIC_INFO.pages} /> : null}
      </article>

      <article className={styles.card} data-testid="traffic-join">
        <CardHead title="Join page interest" cardId="join" openId={openId} onToggle={toggleInfo} />
        <div className={styles.trafficStatRow}>
          <p className={styles.statValue}>{formatCount(summary.joinViews)}</p>
          {joinComparisonCopy(summary) ? <span className={styles.pill}>{joinComparisonCopy(summary)}</span> : null}
        </div>
        <p className={styles.why}>{joinOpenedSentence(period)}</p>
        {openId === 'join' ? <Teach id="join-details" copy={SITE_TRAFFIC_INFO.join} /> : null}
      </article>

      <article className={styles.card} data-testid="visit-heatmap">
        <CardHead title="Busiest hour" cardId="busiest" openId={openId} onToggle={toggleInfo} />
        <p className={styles.muted}>
          {summary.busiest
            ? `Busiest: ${summary.busiest.day}, ${hourLabel(summary.busiest.hour)}. Darker squares are busier hours.`
            : 'A busy hour shows up after a few page views.'}
        </p>
        <div
          className={styles.heatmap}
          role="img"
          aria-label={summary.busiest
            ? `Busiest ${summary.busiest.day}, ${hourLabel(summary.busiest.hour)}. Darker squares are busier hours.`
            : 'Page view heatmap. Darker squares will be busier hours.'}
        >
          <div className={styles.heatHours} aria-hidden="true">
            <span />
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
          </div>
          {heatOrder.map((dayIndex) => (
            <div className={styles.heatRow} key={summary.dayNames[dayIndex]}>
              <span className={styles.heatDay}>{summary.dayNames[dayIndex]}</span>
              <span className={styles.heatCells}>
                {summary.heatmap[dayIndex]?.map((count, hour) => (
                  <span
                    key={`${dayIndex}-${hour}`}
                    className={styles.heatCell}
                    style={{ background: heatColor(count, heatMax) }}
                    title={`${summary.dayNames[dayIndex]} ${hourLabel(hour)}: ${count}`}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
        {openId === 'busiest' ? <Teach id="busiest-details" copy={SITE_TRAFFIC_INFO.busiest} /> : null}
      </article>

      <article className={styles.card} data-testid="visit-map">
        <CardHead title="Where they are" cardId="places" openId={openId} onToggle={toggleInfo} />
        {!period.countable ? (
          <p className={styles.muted}>No counted days in this period yet.</p>
        ) : readyGa4 ? (
          <>
            <StateMap states={states} />
            {readyGa4.cities.length > 0 ? (
              <div>
                <h4 className={styles.mapListTitle}>Top cities</h4>
                <ol className={styles.topStates}>
                  {readyGa4.cities.slice(0, 5).map((city) => (
                    <li key={city.label}>
                      <span>{city.label}</span>
                      <strong>{formatCount(city.value)}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <p className={styles.trafficSourceNote}>From Google Analytics. State and city only, never addresses.</p>
          </>
        ) : (
          <p className={styles.muted}>{ga4StatusLine(view.status)}</p>
        )}
        {openId === 'places' ? <Teach id="places-details" copy={SITE_TRAFFIC_INFO.places} /> : null}
      </article>

      <article className={styles.card} data-testid="qr-visits">
        <CardHead title="QR visits" cardId="qr" openId={openId} onToggle={toggleInfo} />
        <div className={styles.trafficStatRow}>
          <p className={styles.statValue}>{formatCount(summary.qrVisits)}</p>
          {qrShare != null ? <span className={styles.pill}>{qrShare}% of page views</span> : null}
        </div>
        <p className={styles.why}>Scans of QR codes you made in Cards &amp; QR codes.</p>
        <a className={styles.trafficCue} href={workspaceSectionHref('card-qr')}>
          <ClickCue />
        </a>
        {openId === 'qr' ? <Teach id="qr-details" copy={SITE_TRAFFIC_INFO.qr} /> : null}
      </article>

      <article className={styles.card} data-testid="traffic-months">
        <CardHead title="Month by month" cardId="months" openId={openId} onToggle={toggleInfo} />
        {months.length > 0 ? (
          <>
            <div className={styles.monthChart} role="img" aria-label={months.map((month) => `${month.label} ${month.pageViews}`).join(', ')}>
              {months.map((month) => {
                const max = Math.max(...months.map((item) => item.pageViews), 1)
                return (
                  <div className={styles.monthCol} key={month.key}>
                    <span>{formatCount(month.pageViews)}</span>
                    <div
                      className={month.partial ? styles.monthBarPartial : month.current ? styles.monthBarCurrent : styles.monthBar}
                      style={{ height: `${Math.max(8, Math.round((month.pageViews / max) * 100))}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className={styles.monthLabels}>
              {months.map((month) => <span key={month.key}>{month.label}</span>)}
            </div>
            {months.some((month) => month.partial) ? (
              <p className={styles.muted}>*Partial month. Counting started Oct 17.</p>
            ) : null}
          </>
        ) : (
          <p className={styles.muted}>Month by month shows up after the first page views. Counting started {SITE_TRAFFIC_HISTORY_LABEL}.</p>
        )}
        {openId === 'months' ? <Teach id="months-details" copy={SITE_TRAFFIC_INFO.months} /> : null}
      </article>

      <div className={styles.card}>
        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={moreOpen}
          aria-controls="traffic-more-panel"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span>
            More details
            <small>Devices, new vs returning visitors</small>
          </span>
          <span aria-hidden="true">{moreOpen ? '\u25B4' : '\u25BE'}</span>
        </button>
        {moreOpen ? (
          <div id="traffic-more-panel">
            <InfoButton cardId="more" label="More details" openId={openId} onToggle={toggleInfo} />
            {readyGa4 ? (
              <div className={styles.trafficMoreGrid}>
                <div>
                  <h4 className={styles.mapListTitle}>Devices</h4>
                  {readyGa4.devices.some((device) => device.value > 0) ? (
                    <ol className={styles.topStates}>
                      {readyGa4.devices.filter((device) => device.value > 0).map((device) => (
                        <li key={device.label}>
                          <span>{plainDeviceName(device.label)}</span>
                          <strong>{formatCount(device.value)}</strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.muted}>No device data for this period yet.</p>
                  )}
                </div>
                <div>
                  <h4 className={styles.mapListTitle}>New vs returning</h4>
                  {(readyGa4.newVisitors ?? 0) > 0 || (readyGa4.returningVisitors ?? 0) > 0 ? (
                    <ol className={styles.topStates}>
                      <li><span>New</span><strong>{formatCount(readyGa4.newVisitors ?? 0)}</strong></li>
                      <li><span>Returning</span><strong>{formatCount(readyGa4.returningVisitors ?? 0)}</strong></li>
                    </ol>
                  ) : (
                    <p className={styles.muted}>{GA4_PROCESSING_COPY}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.muted}>{ga4StatusLine(view.status)}</p>
            )}
            {openId === 'more' ? <Teach id="more-details" copy={SITE_TRAFFIC_INFO.more} /> : null}
          </div>
        ) : null}
      </div>

      <p className={styles.trafficAbout}>{ABOUT_NUMBERS_COPY}</p>
    </SubjectCardTip>
  )
}

export function SiteGa4SummaryView({ view }: { view: { status: SiteTrafficGa4State['status'] } }) {
  return <p className={styles.muted}>{ga4StatusLine(view.status)}</p>
}
