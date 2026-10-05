import * as FinderLaunchNotify from "@/components/learn/FinderLaunchNotify";
import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";
import { sparkleSuiteMarketingHref } from "@/lib/sparkle-finder/marketing-destinations";
import { SparkleMarketingFooter } from "@/components/marketing/SparkleMarketingFooter";
import styles from "./finder-learn.module.css";

const finderLearnLockupSrc = "/brand/sparkle-finder-logo-transparent.png";

export function FinderLearnPage({ variant = "preview" }: { variant?: "preview" | "live" } = {}) {
  const content = finderLearnContent;
  const live = variant === "live";
  const actionLabel = live ? content.createAccount : content.comingSoon;

  return (
    <div className={styles.page} data-finder-brand="amethyst" id="top">
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <FinderLearnLockup />
          <div className={styles.navRoom} />
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="learn-title" data-smoke={live ? "finder-learn-live" : "finder-learn"}>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
              <h1 id="learn-title">
                {content.hero.headlineLead} <em>{content.hero.headlineAccent}</em>
              </h1>
              <p className={styles.tagline}>{content.tagline}</p>
              <div className={styles.heroActions}>
                {live ? <InertAccountButton label={actionLabel} /> : <FinderLaunchNotify.FinderLearnNotifyButton />}
              </div>
              <p className={styles.lede}>{content.hero.body}</p>
            </div>
          </div>
        </section>

        <section className={styles.pillars} id={content.pillars.id} aria-label="How it works">
          <div className={styles.pillarGrid}>
            {content.pillars.items.map((pillar) => (
              <article className={styles.pillar} data-pillar={pillar.title} key={pillar.title}>
                <img className={styles.pillarArt} src={pillar.image} alt="" />
                <div className={styles.pillarCopy}>
                  <h2>{pillar.title}</h2>
                  <ul>
                    {pillar.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.silver} id={content.offers.id} aria-label="Silver and Free">
          <div className={styles.offerStack}>
            <article className={`${styles.offer} ${styles.offerSilver}`} aria-labelledby="silver-title">
              <h2 className={styles.trialHighlight} id="silver-title">
                {content.offers.silver.highlight}
              </h2>
              <p>{content.offers.silver.noCard}</p>
              <p>{content.offers.silver.price}</p>
              <p>{content.offers.silver.charge}</p>
              <div className={styles.includes}>
                <h3>{content.offers.silver.includesLabel}</h3>
                <ul>
                  {content.offers.silver.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {live ? <InertAccountButton label={actionLabel} /> : <FinderLaunchNotify.FinderLearnNotifyButton />}
            </article>
            <article className={`${styles.offer} ${styles.offerFree}`} aria-labelledby="free-title">
              <h2 id="free-title">{content.offers.free.title}</h2>
              <div className={styles.includes}>
                <h3>{content.offers.free.includesLabel}</h3>
                <ul>
                  {content.offers.free.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SparkleMarketingFooter finderHref="#top" suiteHref={sparkleSuiteMarketingHref()} />
    </div>
  );
}

function FinderLearnLockup({ className }: { className?: string } = {}) {
  return (
    <a className={[styles.brand, className].filter(Boolean).join(" ")} href="#top" aria-label="Sparkle Finder by Sparkle Suite">
      <img alt="" className={styles.logo} src={finderLearnLockupSrc} />
    </a>
  );
}

function InertAccountButton({ label }: { label: string }) {
  return (
    <button className={styles.primaryButton} type="button">
      {label}
      <ArrowIcon />
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

