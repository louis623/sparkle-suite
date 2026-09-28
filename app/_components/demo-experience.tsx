import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { DemoClipGrid } from '@/app/_components/demo-clip-grid'
import { DemoEmbedFrame } from '@/app/_components/demo-embed-frame'
import {
  featuredDemoEmbed,
  sparkleSuiteDemoContent,
  sparkleSuiteDemoCta,
  sparkleSuiteDemoPortfolioLink,
  sparkleSuiteDemoStories,
  sparkleSuiteYouTubeChannel,
  tourDemoEmbed,
} from '@/lib/sparkle-suite/demo-page-content'
import styles from './demo-experience.module.css'

export function DemoExperience() {
  const featured = featuredDemoEmbed()
  const tour = tourDemoEmbed()
  const copy = sparkleSuiteDemoContent

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <MarketingHeader current="demo" />
      <section className={styles.hero} id="main-content" aria-labelledby="demo-title" data-band="night">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1 id="demo-title">
              {copy.hero.headlineLead} <em>{copy.hero.headlineEmphasis}</em>
            </h1>
            <p className={styles.heroBody}>{copy.hero.body}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href={sparkleSuiteDemoCta.href}>
                {sparkleSuiteDemoCta.label} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className={styles.textLink} href={sparkleSuiteDemoPortfolioLink.href}>
                {sparkleSuiteDemoPortfolioLink.label} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.heroNote}>{sparkleSuiteDemoCta.note}</p>
          </div>
          <div className={styles.stage} id="featured">
            {featured ? (
              <>
                <p className={styles.stageEyebrow}>{copy.featured.eyebrow}</p>
                <DemoEmbedFrame embed={featured} variant="hero" />
              </>
            ) : (
              <div className={styles.stageEmpty}>
                <div className={styles.browserBar} aria-hidden="true">
                  <em>{copy.featured.eyebrow}</em>
                </div>
                <div className={styles.stageCopy}>
                  <h2>{copy.featured.emptyTitle}</h2>
                  <p>{copy.featured.emptyBody}</p>
                  <a href={sparkleSuiteYouTubeChannel.href}>{sparkleSuiteYouTubeChannel.label}</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={`${styles.band} ${styles.bandPaper}`} id="show-stories" aria-labelledby="show-stories-title" data-band="paper">
        <div className={styles.bandInner}>
          <p className={styles.eyebrow}>{copy.stories.eyebrow}</p>
          <h2 id="show-stories-title">{copy.stories.heading}</h2>
          <p className={styles.bandBody}>{copy.stories.body}</p>
          <ul className={styles.storyGrid}>
            {sparkleSuiteDemoStories.map((story) => (
              <li className={styles.storyCard} key={story.id}>
                <div className={styles.storyMedia}>
                  <div className={styles.browserBar} aria-hidden="true">
                    <em>{story.eyebrow}</em>
                  </div>
                  <Image
                    alt={story.image.alt}
                    height={story.image.height}
                    sizes="(max-width: 900px) 92vw, 360px"
                    src={story.image.src}
                    width={story.image.width}
                  />
                </div>
                <div className={styles.storyCopy}>
                  <h3>{story.title}</h3>
                  <p>{story.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${styles.band} ${styles.bandBlush}`} id="clips" aria-labelledby="clips-title" data-band="blush">
        <div className={styles.bandInner}>
          <p className={styles.eyebrow}>{copy.clips.eyebrow}</p>
          <h2 id="clips-title">{copy.clips.heading}</h2>
          <DemoClipGrid />
        </div>
      </section>

      <section className={`${styles.band} ${styles.bandInk}`} id="portfolio-handoff" aria-labelledby="portfolio-handoff-title" data-band="ink">
        <div className={styles.bandInner}>
          {tour ? (
            <div className={styles.tour}>
              <p className={styles.eyebrow}>{copy.tour.eyebrow}</p>
              <h2>{copy.tour.heading}</h2>
              <DemoEmbedFrame embed={tour} variant="tour" />
            </div>
          ) : null}
          <p className={styles.eyebrow}>{copy.portfolio.eyebrow}</p>
          <h2 id="portfolio-handoff-title">{copy.portfolio.heading}</h2>
          <p className={styles.bandBody}>{copy.portfolio.body}</p>
          <Link className={styles.primaryButton} href={sparkleSuiteDemoPortfolioLink.href}>
            {sparkleSuiteDemoPortfolioLink.label} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className={styles.close} aria-labelledby="demo-close-title" data-band="night">
        <h2 id="demo-close-title">{copy.close.heading}</h2>
        <Link className={styles.primaryButton} href={sparkleSuiteDemoCta.href}>
          {sparkleSuiteDemoCta.label} <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p>{sparkleSuiteDemoCta.note}</p>
      </section>
      <MarketingFooter />
    </main>
  )
}
