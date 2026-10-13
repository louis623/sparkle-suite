import type { SiteVisitSummary } from '@/lib/services/site-visit-summary'
import { US_STATE_HEX, US_STATE_NAMES } from '@/lib/services/site-visit-summary'
import styles from './RepDashboard.module.css'

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'am' : 'pm'
  const face = hour % 12 === 0 ? 12 : hour % 12
  return `${face}${suffix}`
}

function shareLabel(share: number | null) {
  if (share == null) return 'No visits in this period'
  return `${Math.round(share * 100)}% of visits`
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
  const radius = 18
  const width = 11 * radius * 1.72 + 36
  const height = 8 * radius * 1.55 + 36
  return (
    <svg className={styles.stateMap} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Visits by US state">
      {US_STATE_HEX.map((state) => {
        const count = counts.get(state.code) ?? 0
        const cx = 22 + state.col * radius * 1.72 + (state.row % 2) * radius * 0.86
        const cy = 22 + state.row * radius * 1.55
        const points = Array.from({ length: 6 }, (_, index) => {
          const angle = (Math.PI / 180) * (60 * index - 30)
          return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
        }).join(' ')
        return (
          <g key={state.code}>
            <polygon
              points={points}
              fill={heatColor(count, max)}
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>{`${US_STATE_NAMES[state.code]}: ${count}`}</title>
            </polygon>
            <text x={cx} y={cy + 3} textAnchor="middle" className={styles.stateCode}>
              {state.code === 'DC' ? 'DC' : state.code}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function SiteVisitsPanel({ visits }: { visits: SiteVisitSummary }) {
  if (visits.status === 'unavailable') {
    return (
      <article className={styles.card} data-testid="site-visitors">
        <h3 className={styles.cardTitle}>Site visitors</h3>
        <p className={styles.muted}>Site visits aren&apos;t available yet. They&apos;ll show up here after tracking is turned on.</p>
      </article>
    )
  }

  const heatMax = Math.max(...visits.heatmap.flat(), 0)
  const busiest = visits.busiest
    ? `${visits.busiest.day} at ${hourLabel(visits.busiest.hour)}`
    : null

  return (
    <div className={styles.visitGrid} data-testid="site-visitors">
      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <h3>Visits</h3>
          <span className={styles.pill}>{visits.periodLabel}</span>
        </div>
        <p className={styles.statValue}>{formatCount(visits.total)}</p>
        <p className={styles.muted}>{visits.total === 0 ? 'No visits in this period yet.' : 'Page views on your public site.'}</p>
        <VisitSparkline values={visits.daily} labels={visits.dayLabels} />
      </article>

      <article className={styles.card}>
        <div className={styles.statTop}>
          <h3 className={styles.cardTitle}>Busiest hour</h3>
        </div>
        <p className={styles.muted}>{busiest ? `Busiest: ${busiest}` : 'A busy hour shows up after a few visits.'}</p>
        <div className={styles.heatmap} role="img" aria-label={busiest ? `Busiest ${busiest}` : 'Visit heatmap, no visits yet'}>
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

      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <h3>QR visits</h3>
        </div>
        <p className={styles.statValue}>{formatCount(visits.qrVisits)}</p>
        <p className={styles.muted}>{shareLabel(visits.qrShare)}</p>
        <p className={styles.note}>
          Scans from new Cards &amp; QR codes count here. Codes printed earlier still open your site and count as direct visits.
        </p>
      </article>

      <article className={styles.card}>
        <div className={styles.statTop}>
          <h3 className={styles.cardTitle}>Where they are</h3>
        </div>
        <StateMap states={visits.states} />
        {visits.states.length > 0 ? (
          <ul className={styles.stateList}>
            {visits.states.slice(0, 4).map((state) => (
              <li key={state.code}>
                <span>{state.name}</span>
                <strong>{formatCount(state.count)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>US states fill in from visits. Nothing is stored about a visitor&apos;s exact location.</p>
        )}
      </article>
    </div>
  )
}
