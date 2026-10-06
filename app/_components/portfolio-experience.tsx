import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { QueueLink } from '@/app/_components/queue-link'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import styles from './portfolio-experience.module.css'

export function PortfolioExperience() {
  const sites = sparkleSuitePortfolioContent.carousels[0].slides
  return (
    <main className={`suite-marketing ${styles.page}`}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="portfolio" />
      <section className={styles.hero} id="main-content" aria-labelledby="portfolio-title">
        <div className={styles.container}>
          <p className={styles.eyebrow}>Portfolio</p>
          <h1 id="portfolio-title">Shows we’re proud<br />to put on the <em>floor.</em></h1>
          <p className={styles.heroBody}>Real rep sites, each with its own personality.</p>
        </div>
      </section>
      <section className={styles.gallery} aria-label="Real rep websites">
        <div className={styles.container}>
          {sites.map((site, index) => (
            <article className={styles.site} key={site.id} aria-labelledby={`${site.id}-title`}>
              <a className={styles.capture} href={site.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${site.title} (opens in a new tab)`}>
                <div className={styles.browserBar} aria-hidden="true">{site.linkLabel}</div>
                <Image src={site.src} alt={site.alt} width={site.width} height={site.height}
                  sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1240px) 65vw, 780px" preload={index === 0} />
              </a>
              <div className={styles.siteCopy}>
                <h2 id={`${site.id}-title`}>{site.title}</h2>
                <p>{site.linkLabel}</p>
                <a className={styles.visitButton} href={site.href} target="_blank" rel="noopener noreferrer">
                  Visit site <ArrowUpRight size={18} aria-hidden="true" />
                  <span className={styles.srOnly}> (opens in a new tab)</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
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
