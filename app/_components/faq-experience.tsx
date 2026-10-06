import { ArrowRight } from 'lucide-react'
import { FaqAccordion } from '@/app/_components/faq-accordion'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { QueueLink } from '@/app/_components/queue-link'
import { buildSparkleSuiteFaqJsonLd, sparkleSuiteFaqContent, sparkleSuiteFaqCta, sparkleSuiteFaqDemoLink, sparkleSuiteFaqGroups, sparkleSuiteFaqPortfolioLink } from '@/lib/sparkle-suite/faq-page-content'
import styles from './faq-experience.module.css'

export function FaqExperience() {
  const copy = sparkleSuiteFaqContent
  const jsonLd = JSON.stringify(buildSparkleSuiteFaqJsonLd()).replace(/</g, '\\u003c')
  return (
    <main className={`suite-marketing ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="faq" />
      <section className={styles.hero} id="main-content" aria-labelledby="faq-title">
        <div className={styles.container}>
          <h1 id="faq-title">{copy.hero.headlineLead} <em>{copy.hero.headlineEmphasis}</em></h1>
          <p>{copy.hero.body}</p>
        </div>
      </section>
      <section className={`${styles.answers} ${styles.container}`} id="answers" aria-label="Sparkle Suite answers">
        <nav aria-label="FAQ topics" className={styles.jumpNav}>
          {sparkleSuiteFaqGroups.map((group) => <a href={`#${group.id}`} key={group.id}>{group.label}</a>)}
        </nav>
        <FaqAccordion />
      </section>
      <section className={styles.proof} aria-labelledby="faq-proof-title">
        <div className={styles.container}>
          <h2 id="faq-proof-title">See the sites. Watch the <em>demos.</em></h2>
          <div className={styles.proofActions}>
            <QueueLink className={styles.secondaryButton} href={sparkleSuiteFaqPortfolioLink.href}>{sparkleSuiteFaqPortfolioLink.label} <ArrowRight size={18} aria-hidden="true" /></QueueLink>
            <QueueLink className={styles.secondaryButton} href={sparkleSuiteFaqDemoLink.href}>{sparkleSuiteFaqDemoLink.label} <ArrowRight size={18} aria-hidden="true" /></QueueLink>
          </div>
        </div>
      </section>
      <section className={styles.close} aria-labelledby="faq-close-title">
        <div className={styles.container}>
          <h2 id="faq-close-title">{copy.close.heading}</h2>
          <QueueLink className={styles.primaryButton}>{sparkleSuiteFaqCta.label} <ArrowRight size={18} aria-hidden="true" /></QueueLink>
          <p className={styles.noPayment}>{sparkleSuiteFaqCta.note}</p>
          <p className={styles.promise}>Join the build queue and I&apos;ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p>
        </div>
      </section>
      <MarketingFooter current="faq" />
    </main>
  )
}
