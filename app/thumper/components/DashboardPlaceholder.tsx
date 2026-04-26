import styles from './DashboardPlaceholder.module.css'

const CARDS = [
  { title: 'Trade board', subtitle: 'Active listings' },
  { title: 'Recent activity', subtitle: 'Last 7 days' },
  { title: 'Customer roster', subtitle: 'Saved contacts' },
]

export function DashboardPlaceholder() {
  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <span className={styles.brand}>Sparkle Suite</span>
      </header>
      <div className={styles.cards}>
        {CARDS.map((c) => (
          <div key={c.title} className={styles.card}>
            <div className={styles.cardTitle}>{c.title}</div>
            <div className={styles.cardSubtitle}>{c.subtitle}</div>
            <div className={styles.cardFill} aria-hidden="true" />
          </div>
        ))}
      </div>
    </main>
  )
}
