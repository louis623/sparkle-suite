import type { MessageCenterView, SparkleSuiteFilter } from './types'
import styles from './MessageCenter.module.css'

const PRIMARY_VIEWS: Array<{ key: MessageCenterView; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs-reply', label: 'Needs reply' },
  { key: 'team', label: 'Team' },
  { key: 'rep-network', label: 'Rep Network' },
  { key: 'support', label: 'Support' },
  { key: 'sparkle-suite', label: 'Sparkle Suite' },
  { key: 'archived', label: 'Archived' },
]

const SPARKLE_SUITE_FILTERS: Array<{
  key: SparkleSuiteFilter
  label: string
}> = [
  { key: 'all', label: 'Everything' },
  { key: 'reports', label: 'Reports' },
  { key: 'resources', label: 'Resources' },
  { key: 'updates', label: 'Updates' },
]

export function MessageCenterFilters({
  view,
  sparkleSuiteFilter,
  counts,
  supportOnly = false,
  onViewChange,
  onSparkleSuiteFilterChange,
}: {
  view: MessageCenterView
  sparkleSuiteFilter: SparkleSuiteFilter
  counts: Partial<Record<MessageCenterView, number>>
  supportOnly?: boolean
  onViewChange: (view: MessageCenterView) => void
  onSparkleSuiteFilterChange: (filter: SparkleSuiteFilter) => void
}) {
  return (
    <div className={styles.filterRegion}>
      <div className={styles.primaryFilters} aria-label="Message Center views">
        {PRIMARY_VIEWS.filter((option) => !supportOnly || option.key === 'support').map((option) => (
          <button
            key={option.key}
            type="button"
            className={
              view === option.key ? styles.filterButtonActive : styles.filterButton
            }
            aria-pressed={view === option.key}
            onClick={() => onViewChange(option.key)}
          >
            <span>{option.label}</span>
            {counts[option.key] ? (
              <span className={styles.filterCount}>{counts[option.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {view === 'sparkle-suite' ? (
        <div
          className={styles.secondaryFilters}
          aria-label="Filter Sparkle Suite messages"
        >
          {SPARKLE_SUITE_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={
                sparkleSuiteFilter === option.key
                  ? styles.secondaryFilterActive
                  : styles.secondaryFilter
              }
              aria-pressed={sparkleSuiteFilter === option.key}
              onClick={() => onSparkleSuiteFilterChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const MESSAGE_CENTER_PRIMARY_VIEW_COUNT = PRIMARY_VIEWS.length
