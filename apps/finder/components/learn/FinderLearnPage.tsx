import * as FinderLaunchNotify from "@/components/learn/FinderLaunchNotify";
import { FinderSeal } from "@/components/learn/FinderSeal";
import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";
import styles from "./finder-learn.module.css";

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
          <a className={styles.brand} href="#top" aria-label="Sparkle Finder by Sparkle Suite">
            <FinderSeal className={styles.seal} />
            <span className={styles.wordmarkBlock}>
              <span className={styles.wordmark}>{content.brand}</span>
              <span className={styles.byline}>{content.byline}</span>
            </span>
          </a>
          <nav className={styles.nav} aria-label="On this page">
            {content.nav.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
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
                <div className={styles.pillarPanel}>
                  <h2>{pillar.title}</h2>
                </div>
                <p>{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.silver} id={content.silver.id} aria-labelledby="silver-title">
          <div className={styles.offer}>
            <h2 id="silver-title">{content.silver.eyebrow}</h2>
            <p className={styles.price}>
              <strong>{content.silver.price}</strong>
              <span>{content.silver.period}</span>
            </p>
            <p>{content.silver.body}</p>
            <p className={styles.offerNote}>{content.silver.offerNote}</p>
            {live ? <InertAccountButton label={actionLabel} /> : <FinderLaunchNotify.FinderLearnNotifyButton />}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <a className={styles.brand} href="#top" aria-label="Sparkle Finder by Sparkle Suite">
            <FinderSeal className={styles.seal} />
            <span className={styles.wordmarkBlock}>
              <span className={styles.wordmark}>{content.brand}</span>
              <span className={styles.byline}>{content.byline}</span>
            </span>
          </a>
          <nav aria-label="Footer">
            {content.footer.links.map((link) => (
              <a
                href={link.href}
                key={link.href}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                target={link.href.startsWith("http") ? "_blank" : undefined}
              >
                {link.label}
              </a>
            ))}
            {content.footer.socials.map((link) => (
              <a href={link.href} key={link.href} rel="noopener noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </nav>
          <p>
            {content.footer.disclaimer} Visit{" "}
            <a href={content.footer.developerHref} rel="noopener noreferrer" target="_blank">
              {content.footer.developerLabel}
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
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

