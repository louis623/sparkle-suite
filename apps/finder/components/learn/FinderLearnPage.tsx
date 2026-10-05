import * as FinderLaunchNotify from "@/components/learn/FinderLaunchNotify";
import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";
import { sparkleSuiteMarketingHref } from "@/lib/sparkle-finder/marketing-destinations";
import styles from "./finder-learn.module.css";

const finderLearnLockupSrc = "/brand/sparkle-finder-logo-transparent.png";
const suiteLearnLockupSrc = "/brand/sparkle-suite-logo-transparent.png";

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
              <article className={styles.pillar} key={pillar.title}>
                <img className={styles.pillarArt} src={pillar.image} alt="" />
                <h2>{pillar.title}</h2>
                <ul>
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
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

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <a
              aria-label="Sparkle Suite"
              className={styles.suiteLockup}
              href={sparkleSuiteMarketingHref()}
              rel="noopener noreferrer"
              target="_blank"
            >
              <img alt="" className={styles.logo} src={suiteLearnLockupSrc} />
            </a>
            <FinderLearnLockup className={styles.finderLockup} />
          </div>
          <nav aria-label="Footer">
            {content.footer.links.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Sparkle Suite channels" className={styles.socials}>
            {(["TikTok", "YouTube"] as const).map((label) => {
              const link = content.footer.socials.find((item) => item.label === label);
              if (!link) return null;
              return (
                <a
                  aria-label={`Sparkle Suite on ${link.label}`}
                  href={link.href}
                  key={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {label === "TikTok" ? <TikTokIcon /> : <YouTubeIcon />}
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>
          <p>{content.footer.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M14.2 3.1c.5 2.6 2 4.4 4.5 4.7v2.8a7.7 7.7 0 0 1-4.4-1.4v6.6a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.8V3.1h2.7Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M23 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C18.9 5 12 5 12 5s-6.9 0-8.5.5a3 3 0 0 0-2.1 2.1C1 9 1 12.2 1 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C5.1 19.4 12 19.4 12 19.4s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z" />
    </svg>
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

