import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { FaqAccordion } from '@/app/_components/faq-accordion'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { SparkleSuitePublicNicNac } from '@/app/_components/sparkle-suite-public-nic-nac'
import {
  buildSparkleSuiteFaqJsonLd,
  sparkleSuiteFaqContent,
  sparkleSuiteFaqCta,
  sparkleSuiteFaqDemoLink,
  sparkleSuiteFaqGroups,
  sparkleSuiteFaqPortfolioLink,
} from '@/lib/sparkle-suite/faq-page-content'
import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import styles from './faq-experience.module.css'

export function FaqExperience() {
  const copy = sparkleSuiteFaqContent
  const jsonLd = JSON.stringify(buildSparkleSuiteFaqJsonLd()).replace(/</g, '\\u003c')

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="faq" />
      <section className={styles.hero} id="main-content" aria-labelledby="faq-title" data-band="night">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
          <h1 id="faq-title">
            {copy.hero.headlineLead} <em>{copy.hero.headlineEmphasis}</em>
          </h1>
          <p className={styles.heroBody}>{copy.hero.body}</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href={sparkleSuiteFaqCta.href}>
              {sparkleSuiteFaqCta.label} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className={styles.textLink} href={copy.hero.askHref}>
              {copy.hero.askLabel} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.heroNote}>{sparkleSuiteFaqCta.note}</p>
          <p className={styles.disclaimer}>{sparkleSuitePublicLandingSafety.disclaimer}</p>
        </div>
      </section>

      <div className={styles.jumpBar} data-band="paper">
        <nav aria-label="FAQ topics" className={styles.jumpNav}>
          {sparkleSuiteFaqGroups.map((group) => (
            <a href={`#${group.id}`} key={group.id}>{group.label}</a>
          ))}
        </nav>
      </div>

      <section className={styles.answers} aria-label="Sparkle Suite answers" data-band="paper">
        <FaqAccordion />
      </section>

      <section className={styles.nicNac} id="ask-nic-nac" aria-labelledby="ask-nic-nac-title" data-band="blush">
        <div className={styles.bandInner}>
          <p className={styles.eyebrow}>{copy.nicNac.eyebrow}</p>
          <h2 id="ask-nic-nac-title">{copy.nicNac.heading}</h2>
          <p className={styles.bandBody}>{copy.nicNac.body}</p>
          <div className={`sparkle-landing-v2 ${styles.assistant}`}>
            <SparkleSuitePublicNicNac />
          </div>
        </div>
      </section>

      <section className={styles.proof} aria-labelledby="faq-proof-title" data-band="ink">
        <div className={styles.bandInner}>
          <p className={styles.eyebrow}>{copy.proof.eyebrow}</p>
          <h2 id="faq-proof-title">{copy.proof.heading}</h2>
          <p className={styles.bandBody}>{copy.proof.body}</p>
          <div className={styles.proofActions}>
            <Link className={styles.secondaryButton} href={sparkleSuiteFaqPortfolioLink.href}>
              {sparkleSuiteFaqPortfolioLink.label} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryButton} href={sparkleSuiteFaqDemoLink.href}>
              {sparkleSuiteFaqDemoLink.label} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.close} aria-labelledby="faq-close-title" data-band="night">
        <h2 id="faq-close-title">{copy.close.heading}</h2>
        <Link className={styles.primaryButton} href={sparkleSuiteFaqCta.href}>
          {sparkleSuiteFaqCta.label} <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p>{sparkleSuiteFaqCta.note}</p>
      </section>
      <MarketingFooter />
    </main>
  )
}
