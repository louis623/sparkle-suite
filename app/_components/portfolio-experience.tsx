import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { PortfolioCarousels } from '@/app/_components/portfolio-carousels'
import { sparkleSuitePortfolioContent, sparkleSuiteScheduleBuild } from '@/lib/sparkle-suite/portfolio-content'
import styles from './portfolio-experience.module.css'

export function PortfolioExperience() {
  const hero = sparkleSuitePortfolioContent.hero

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="portfolio" />
      <section className={styles.hero} id="main-content" aria-labelledby="portfolio-title" data-band="night">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{hero.eyebrow}</p>
            <h1 id="portfolio-title">{hero.headline}</h1>
            <p className={styles.heroBody}>{hero.body}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href={sparkleSuiteScheduleBuild.href}>
                {sparkleSuiteScheduleBuild.label} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className={styles.textLink} href="#rep-highlights">See the shows <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <p className={styles.heroNote}>{sparkleSuiteScheduleBuild.note}</p>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroWindow}>
              <div className={styles.browserBar} aria-hidden="true">
                <em>{hero.image.label}</em>
              </div>
              <Image
                src={hero.image.src}
                alt={hero.image.alt}
                width={hero.image.width}
                height={hero.image.height}
                sizes="(max-width: 700px) 94vw, 1180px"
                preload
              />
            </div>
            <figcaption>A community Halloween look. The carousels below are the shows and themes.</figcaption>
          </figure>
        </div>
      </section>
      <PortfolioCarousels />
      <MarketingFooter />
    </main>
  )
}
