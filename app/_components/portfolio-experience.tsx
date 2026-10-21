import { ArrowRight } from 'lucide-react'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { QueueLink } from '@/app/_components/queue-link'
import { PortfolioCarousels } from './portfolio-carousels'
import styles from './portfolio-experience.module.css'

export function PortfolioExperience() {
  return (
    <main className={`suite-marketing ${styles.page}`}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="portfolio" />
      <section className={styles.hero} id="main-content" aria-labelledby="portfolio-title">
        <div className={styles.container}>
          <p className={styles.eyebrow}>Portfolio</p>
          <h1 id="portfolio-title">Shows we’re proud<br />to put on the <em>floor.</em></h1>
          <p className={styles.heroBody}>Themes and rep sites, each with its own personality.</p>
        </div>
      </section>
      <PortfolioCarousels ids={['community-themes', 'rep-highlights']} />
      <section className={styles.close} aria-labelledby="portfolio-close-title">
        <div className={styles.container}>
          <h2 id="portfolio-close-title">Make room for <em>your</em> show.</h2>
          <QueueLink className={styles.primaryButton}>Join the build queue <ArrowRight size={18} aria-hidden="true" /></QueueLink>
          <p className={styles.noPayment}>No payment when you join the queue.</p>
          <p className={styles.promise}>Join the build queue and I&apos;ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  )
}
