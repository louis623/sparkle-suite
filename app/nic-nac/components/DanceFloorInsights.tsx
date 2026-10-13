import type { ReactNode } from 'react'
import type { DanceFloorInsights, DanceFloorPointKind } from '@/lib/services/dance-floor-insights'
import { workspaceSectionHref } from '@/lib/services/rep-dashboard-math'
import { ClickCue, DashboardLink } from './DashboardLink'
import styles from './RepDashboard.module.css'

function FloorCard({
  className,
  onOpen,
  children,
}: {
  className?: string
  onOpen: () => void
  children: ReactNode
}) {
  return (
    <DashboardLink
      className={className ?? styles.card}
      href={workspaceSectionHref('trade-board')}
      onOpen={onOpen}
    >
      <div className={styles.cueEnd}>
        <ClickCue />
      </div>
      {children}
    </DashboardLink>
  )
}

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

const DOT_CLASS: Record<DanceFloorPointKind, string> = {
  listed: styles.dotListed,
  sold: styles.dotSold,
  removed: styles.dotRemoved,
}

const AGE_CLASS = {
  fresh: styles.ageFresh,
  aging: styles.ageAging,
  slow: styles.ageSlow,
  unknown: styles.ageUnknown,
} as const

const TYPE_CLASS = [styles.typeSeg0, styles.typeSeg1, styles.typeSeg2]

function requestLabel(count: number) {
  return count === 1 ? '1 request' : `${formatCount(count)} requests`
}

function layoutStrip(points: Array<{ days: number; kind: DanceFloorPointKind }>) {
  const groups = new Map<number, Array<{ days: number; kind: DanceFloorPointKind }>>()
  for (const point of points) {
    const day = Math.round(point.days)
    const group = groups.get(day) ?? []
    group.push(point)
    groups.set(day, group)
  }
  const placed: Array<{ days: number; kind: DanceFloorPointKind; column: number; row: number; rows: number }> = []
  for (const [day, group] of groups) {
    group.forEach((point, index) => {
      placed.push({
        days: day,
        kind: point.kind,
        column: Math.floor(index / 5),
        row: index % 5,
        rows: Math.min(group.length, 5),
      })
    })
  }
  return placed
}

function DaysStrip({ insights }: { insights: DanceFloorInsights }) {
  const axisMax = insights.strips[0]?.axisMax ?? 60
  const width = 600
  const x0 = 14
  const x1 = 574
  const lane = 108
  const height = 36 + insights.strips.length * lane
  const step = axisMax <= 60 ? 15 : axisMax <= 120 ? 30 : 60
  const ticks = Array.from({ length: Math.floor(axisMax / step) + 1 }, (_, index) => index * step)
  const xFor = (days: number) => x0 + ((x1 - x0) * Math.min(days, axisMax)) / axisMax

  return (
    <svg className={styles.strip} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Days on the floor by jewelry type">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={xFor(tick)} x2={xFor(tick)} y1={28} y2={height - 24} className={styles.stripGrid} />
          <text x={xFor(tick)} y={height - 8} className={styles.stripAxis} textAnchor="middle">
            {tick}d
          </text>
        </g>
      ))}
      {insights.strips.map((strip, index) => {
        const y = 78 + index * lane
        const placed = layoutStrip(strip.points)
        const medianX = strip.median == null ? null : xFor(strip.median)
        return (
          <g key={strip.label}>
            <text x={8} y={y - 42} className={styles.stripLabel}>
              {strip.label} <tspan className={styles.stripSub}>· {strip.count} pieces</tspan>
            </text>
            {medianX != null ? (
              <>
                <line x1={medianX} x2={medianX} y1={y - 34} y2={y + 34} className={styles.stripMedian} />
                <text x={medianX - 6} y={y - 40} className={styles.stripMedianText} textAnchor="end">
                  median {Math.round(strip.median ?? 0)}d
                </text>
              </>
            ) : null}
            {placed.map((point, pointIndex) => {
              const cx = xFor(point.days) + (point.column - 0) * 11
              const cy = y + (point.row - (point.rows - 1) / 2) * 11
              return <circle key={`${strip.label}-${pointIndex}`} cx={cx} cy={cy} r="4.6" className={DOT_CLASS[point.kind]} />
            })}
          </g>
        )
      })}
    </svg>
  )
}

function OutcomesRing({ insights }: { insights: DanceFloorInsights }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className={styles.outcomeWrap}>
      <svg className={styles.outcomeRing} viewBox="0 0 200 200" role="img" aria-label={`${insights.outcomes.total} pieces listed`}>
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#efe7fb" strokeWidth="22" />
        {insights.outcomes.slices.map((slice) => {
          const length = circumference * (slice.count / insights.outcomes.total)
          const dash = `${Math.max(length - 2, 0)} ${circumference - length + 2}`
          const dashOffset = -offset
          offset += length
          return (
            <circle
              key={slice.key}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="22"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
            />
          )
        })}
        <text x="100" y="96" className={styles.outcomeTotal} textAnchor="middle">
          {insights.outcomes.total}
        </text>
        <text x="100" y="118" className={styles.outcomeSub} textAnchor="middle">
          pieces listed
        </text>
      </svg>
      <ul className={styles.outcomeLegend}>
        {insights.outcomes.slices.map((slice) => (
          <li key={slice.key}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{formatCount(slice.count)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DanceFloorInsightsPanel({
  insights,
  onOpenDanceFloor,
}: {
  insights: DanceFloorInsights
  onOpenDanceFloor: () => void
}) {
  if (insights.empty) {
    return (
      <FloorCard onOpen={onOpenDanceFloor}>
        <h3 className={styles.pieceTitle}>No pieces yet</h3>
        <p className={styles.muted}>Add a listing and this will show what is sitting, what sold, and where the floor is heavy.</p>
        <span className={styles.textAction}>Add your first piece</span>
      </FloorCard>
    )
  }

  const maxCollection = Math.max(
    ...insights.mix.collections.map((collection) => collection.onFloor + collection.moved),
    1,
  )

  return (
    <>
      <FloorCard onOpen={onOpenDanceFloor}>
        <h3 className={styles.pieceTitle}>Dance Floor totals</h3>
        <p className={styles.why}>
          On the floor means a shopper can still request it. Sold means it left in a sale. Sitting 45 days or more is a piece to feature in your next live or swap out.
        </p>
        <div className={styles.insightKpis} aria-label="Dance Floor totals">
          <div><strong>{formatCount(insights.onFloor)}</strong><span>on the floor</span></div>
          <div><strong>{formatCount(insights.sold)}</strong><span>sold</span></div>
          <div><strong>{formatCount(insights.sitting45)}</strong><span>sitting 45d+</span></div>
        </div>
      </FloorCard>
      <div className={styles.insightGrid}>
        <FloorCard onOpen={onOpenDanceFloor}>
          <div className={styles.statTop}>
            <h3 className={styles.cardTitle}>Sitting on the floor</h3>
            <span className={styles.tag}>oldest 7</span>
          </div>
          <p className={styles.why}>These pieces are still listed, oldest first. Feature them in your next live, or take them off the floor.</p>
          {insights.sitting.length > 0 ? (
            <ul className={styles.sittingList}>
              {insights.sitting.map((row) => (
                <li key={row.id}>
                  <div className={styles.sittingName}>
                    <strong>{row.name}</strong>
                    <span>
                      {row.itemNumber ? `${row.itemNumber} · ` : ''}
                      {row.typeLabel}
                      {row.priceLabel ? ` · ${row.priceLabel}` : ''}
                    </span>
                  </div>
                  <span className={styles.ageTrack} aria-hidden="true">
                    <span className={AGE_CLASS[row.ageBand]} style={{ width: `${row.barPercent}%` }} />
                  </span>
                  <span className={styles.sittingDays}>{row.days == null ? '—' : `${row.days}d`}</span>
                  <span className={styles.requestBadge}>{requestLabel(row.requestCount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Listed dates aren&apos;t on these pieces yet, so the oldest ones can&apos;t be ranked.</p>
          )}
          <p className={styles.legend}>
            <span><i className={styles.swatchFresh} />under 30 days</span>
            <span><i className={styles.swatchAging} />30–60 days</span>
            <span><i className={styles.swatchSlow} />60+ days</span>
          </p>
          <p className={styles.learn}><strong>What you learn:</strong> which pieces have waited longest with no trade interest, so you can feature them in your next show or swap them out.</p>
        </FloorCard>

        <FloorCard onOpen={onOpenDanceFloor}>
          <div className={styles.statTop}>
            <h3 className={styles.cardTitle}>Floor mix</h3>
            <span className={styles.tag}>{formatCount(insights.mix.total)} pieces</span>
          </div>
          <p className={styles.why}>If almost everything is one jewelry type, add the others so shoppers see variety.</p>
          <p className={styles.sublab}>By jewelry type</p>
          <div className={styles.typeStack}>
            {insights.mix.types.map((type, index) => (
              <div key={type.label} className={TYPE_CLASS[index % TYPE_CLASS.length]} style={{ flex: type.count }}>
                <span>{type.label} <b>{formatCount(type.count)}</b></span>
              </div>
            ))}
          </div>
          <p className={styles.sublab}>Top collections · on floor / moved</p>
          <ul className={styles.collectionList}>
            {insights.mix.collections.map((collection) => (
              <li key={collection.name}>
                <span>{collection.name}</span>
                <span className={styles.collectionTrack} aria-hidden="true">
                  <span className={styles.collectionOn} style={{ width: `${(collection.onFloor / maxCollection) * 100}%` }} />
                  <span className={styles.collectionMoved} style={{ width: `${(collection.moved / maxCollection) * 100}%` }} />
                </span>
                <strong>{collection.onFloor}/{collection.moved}</strong>
              </li>
            ))}
          </ul>
          <p className={styles.legend}>
            <span><i className={styles.swatchOn} />on floor</span>
            <span><i className={styles.swatchMoved} />moved</span>
          </p>
          <p className={styles.learn}><strong>What you learn:</strong> where your floor is heavy. If most pieces are one type, the other types give shoppers variety.</p>
        </FloorCard>

        <FloorCard className={`${styles.card} ${styles.insightWide}`} onOpen={onOpenDanceFloor}>
          <div className={styles.statTop}>
            <h3 className={styles.cardTitle}>Fast movers vs sitters</h3>
            <span className={insights.movers.earlyData ? styles.tagWarn : styles.tag}>
              {insights.movers.earlyData ? 'early data · ' : ''}
              {insights.movers.saleCount === 1 ? '1 sale' : `${formatCount(insights.movers.saleCount)} sales`}
            </span>
          </div>
          <p className={styles.why}>Restock the fast side and stop reordering the slow side. Early data is only a hint until you have more sales.</p>
          {insights.movers.medians.length > 0 ? (
            <div className={styles.chips}>
              {insights.movers.medians.map((median) => (
                <span key={median.label} className={styles.chip}>
                  {median.label} <b>{median.days}d</b> <small>median to sell · n={median.count}</small>
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.moverGrid}>
            <div>
              <h4 className={styles.moverFast}>Moved fastest</h4>
              {insights.movers.fastest.length > 0 ? (
                <ul className={styles.moverList}>
                  {insights.movers.fastest.map((row) => (
                    <li key={`fast-${row.name}-${row.days}`}>
                      <span>{row.name}<small>{row.typeLabel} · {row.collectionName}</small></span>
                      <b>{row.days}d</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>No sales with a clear exit date yet.</p>
              )}
            </div>
            <div>
              <h4 className={styles.moverSlow}>Sitting longest</h4>
              {insights.movers.slowest.length > 0 ? (
                <ul className={`${styles.moverList} ${styles.moverSlowList}`}>
                  {insights.movers.slowest.map((row) => (
                    <li key={`slow-${row.name}-${row.days}`}>
                      <span>{row.name}<small>{row.typeLabel} · {row.collectionName}</small></span>
                      <b>{row.days}d</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>Nothing with a listed date is still on the floor.</p>
              )}
            </div>
          </div>
          <p className={styles.learn}><strong>What you learn:</strong> what your shoppers grab quickly compared with what waits, so you know what to restock and what to stop listing.</p>
        </FloorCard>

        <FloorCard onOpen={onOpenDanceFloor}>
          <div className={styles.statTop}>
            <h3 className={styles.cardTitle}>Days on floor by type</h3>
            <span className={styles.tag}>every piece</span>
          </div>
          <p className={styles.why}>A type piled on the right is slow. Sold dots far to the left sell quickly.</p>
          <DaysStrip insights={insights} />
          <p className={styles.legend}>
            <span><i className={styles.swatchListed} />still listed</span>
            <span><i className={styles.swatchSold} />sold</span>
            <span><i className={styles.swatchRemoved} />removed</span>
            <span><i className={styles.swatchMedian} />median</span>
          </p>
          <p className={styles.learn}><strong>What you learn:</strong> whether a whole category is slow, or just a few pieces. Sold dots far to the left of the cluster show what sells quickly.</p>
        </FloorCard>

        <FloorCard onOpen={onOpenDanceFloor}>
          <div className={styles.statTop}>
            <h3 className={styles.cardTitle}>Outcomes</h3>
            {insights.outcomes.needsCleanup ? <span className={styles.tagWarn}>needs cleanup</span> : <span className={styles.tag}>clear reasons</span>}
          </div>
          <p className={styles.why}>This is what happened to pieces you listed. &quot;Other&quot; stays vague until you pick sold, keeping, or traded.</p>
          <OutcomesRing insights={insights} />
          {insights.outcomes.needsCleanup ? (
            <p className={styles.note}>
              Pieces marked &quot;mistake&quot; are hidden. &quot;Other&quot; covers pulled pieces and anything without a clearer reason, so this ring gets sharper once a sold, keeping, or traded reason is chosen.
            </p>
          ) : null}
          <p className={styles.learn}><strong>What you learn:</strong> how much of what you list actually leaves your floor, and how.</p>
        </FloorCard>
      </div>
    </>
  )
}
