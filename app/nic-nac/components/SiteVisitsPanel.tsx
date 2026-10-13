'use client'

import { useState, type ReactNode } from 'react'
import type { SiteVisitSummary } from '@/lib/services/site-visit-summary'
import { US_STATE_HEX, US_STATE_NAMES } from '@/lib/services/site-visit-summary'
import { workspaceSectionHref } from '@/lib/services/rep-dashboard-math'
import { DashboardLink } from './DashboardLink'
import styles from './RepDashboard.module.css'

function VisitShell({
  href,
  className,
  external = false,
  children,
}: {
  href?: string | null
  className: string
  external?: boolean
  children: ReactNode
}) {
  if (!href) return <article className={className}>{children}</article>
  return (
    <DashboardLink
      className={className}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
    >
      {children}
      {external ? <span className={styles.srOnly}>Opens in a new tab.</span> : null}
    </DashboardLink>
  )
}

const TRACKING_STARTED = 'October 13, 2026'

const MAP_COLORS = ['#f4eefc', '#d9c8f3', '#a07ad8', '#6f2bd0', '#2a1248'] as const

type ColorBand = {
  min: number
  max: number
  color: string
  label: string
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
    if (count >= band.min && count <= band.max) return { band, index }
  }
  return { band: bands[0], index: 0 }
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'am' : 'pm'
  const face = hour % 12 === 0 ? 12 : hour % 12
  return `${face}${suffix}`
}

function shareLabel(share: number | null) {
  if (share == null) return 'No visits in this period yet.'
  return `${Math.round(share * 100)}% of visits came from a QR code.`
}

function VisitSparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 280
  const height = 56
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : index * step
    const y = height - 8 - (value / max) * (height - 16)
    return `${x},${y}`
  })
  const line = points.join(' ')
  const summary = labels
    .map((label, index) => `${label} ${values[index] ?? 0}`)
    .join(', ')
  return (
    <svg className={styles.visitSpark} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily visits: ${summary}`}>
      <polyline className={styles.visitSparkLine} points={line} />
    </svg>
  )
}

function heatColor(count: number, max: number) {
  if (count <= 0 || max <= 0) return '#f6f1fd'
  const mix = Math.max(0.18, count / max)
  return `color-mix(in srgb, #e2198f ${Math.round(mix * 100)}%, #f1eafd)`
}

function StateMap({ states }: { states: SiteVisitSummary['states'] }) {
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
            const { band } = bandForCount(count, bands)
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
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  className={onDark ? styles.stateCodeOnDark : styles.stateCode}
                >
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
            <p className={styles.muted}>No state visits yet. Names and counts show up here as people open your site.</p>
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

export function SiteVisitsPanel({
  visits,
  siteHref = null,
}: {
  visits: SiteVisitSummary
  siteHref?: string | null
}) {
  const publicSiteHref = siteHref?.trim() || null
  return (
    <section className={styles.boardSection} data-testid="site-visitors" aria-labelledby="site-visitors-title">
      <header className={styles.sectionHead}>
        <h3 id="site-visitors-title" className={styles.boardSectionTitle}>Your site visitors</h3>
        {publicSiteHref ? (
          <a className={styles.seeAll} href={publicSiteHref} target="_blank" rel="noreferrer noopener">
            Open your site ›
            <span className={styles.srOnly}> Opens in a new tab.</span>
          </a>
        ) : null}
        <p className={styles.why}>
          Page views on your public site over the last 28 days. Tracking started {TRACKING_STARTED}. QR codes printed before that still open your site and count as regular visits.
        </p>
      </header>
      {visits.status === 'unavailable' ? (
        <article className={styles.card}>
          <h3 className={styles.pieceTitle}>Visits</h3>
          <p className={styles.muted}>
            Site visits aren&apos;t available yet. They&apos;ll show up here after tracking is on, from {TRACKING_STARTED} onward.
          </p>
        </article>
      ) : (
        <VisitCards visits={visits} siteHref={publicSiteHref} />
      )}
    </section>
  )
}

function VisitCards({ visits, siteHref }: { visits: SiteVisitSummary; siteHref: string | null }) {
  const heatMax = Math.max(...visits.heatmap.flat(), 0)
  const busiest = visits.busiest
    ? `${visits.busiest.day} at ${hourLabel(visits.busiest.hour)}`
    : null

  return (
    <div className={styles.visitGrid}>
      <VisitShell className={styles.statCard} href={siteHref} external>
        <div className={styles.statTop}>
          <h3 className={styles.pieceTitle}>Visits</h3>
          <span className={styles.pill}>{visits.periodLabel}</span>
        </div>
        <p className={styles.why}>How many times your public site was opened in this period.</p>
        <p className={styles.statValue}>{formatCount(visits.total)}</p>
        <p className={styles.muted}>
          {visits.total === 0
            ? `No visits yet. They start counting on ${TRACKING_STARTED}.`
            : 'Each open of your public site counts once.'}
        </p>
        <VisitSparkline values={visits.daily} labels={visits.dayLabels} />
      </VisitShell>

      <article className={styles.card} data-testid="visit-heatmap">
        <h3 className={styles.pieceTitle}>Busiest hour</h3>
        <p className={styles.why}>
          The day and hour people already show up, in your time zone. Darker squares are busier hours, so you can schedule a live when visitors are looking.
        </p>
        <p className={styles.muted}>{busiest ? `Busiest: ${busiest}.` : 'A busy hour shows up after a few visits.'}</p>
        <div className={styles.heatmap} role="img" aria-label={busiest ? `Busiest ${busiest}. Darker squares are busier hours.` : 'Visit heatmap, no visits yet. Darker squares will be busier hours.'}>
          <div className={styles.heatHours} aria-hidden="true">
            <span />
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
          </div>
          {visits.dayNames.map((day, dayIndex) => (
            <div className={styles.heatRow} key={day}>
              <span className={styles.heatDay}>{day}</span>
              <span className={styles.heatCells}>
                {visits.heatmap[dayIndex]?.map((count, hour) => (
                  <span
                    key={`${day}-${hour}`}
                    className={styles.heatCell}
                    style={{ background: heatColor(count, heatMax) }}
                    title={`${day} ${hourLabel(hour)}: ${count}`}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
      </article>

      <VisitShell className={styles.statCard} href={workspaceSectionHref('card-qr')}>
        <h3 className={styles.pieceTitle}>QR visits</h3>
        <p className={styles.why}>
          Scans from Cards &amp; QR codes made after tracking started. Codes you already printed still open your site and count as regular visits, not QR scans.
        </p>
        <p className={styles.statValue}>{formatCount(visits.qrVisits)}</p>
        <p className={styles.muted}>{shareLabel(visits.qrShare)}</p>
      </VisitShell>

      <article className={styles.card} data-testid="visit-map">
        <h3 className={styles.pieceTitle}>Where they are</h3>
        <StateMap states={visits.states} />
      </article>
    </div>
  )
}
