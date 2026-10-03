import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";
import styles from "./finder-learn.module.css";

export function FinderLearnPage() {
  const content = finderLearnContent;

  return (
    <div className={styles.page} id="top">
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
        <section className={styles.hero} aria-labelledby="learn-title" data-smoke="finder-learn">
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
              <h1 id="learn-title">
                {content.hero.headlineLead} <em>{content.hero.headlineAccent}</em>
              </h1>
              <p className={styles.lede}>{content.hero.body}</p>
              <p className={styles.tagline}>{content.tagline}</p>
              <div className={styles.heroActions}>
                <p className={styles.comingSoon}>{content.comingSoon}</p>
                <a className={styles.textLink} href={content.hero.explore.href}>
                  {content.hero.explore.label}
                </a>
              </div>
              <p className={styles.note}>{content.hero.note}</p>
            </div>
            <figure className={styles.heroFigure}>
              <FinderSeal className={styles.heroSeal} />
              <figcaption>
                {content.brand}
                <span>{content.byline}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.why} id={content.why.id} aria-labelledby="why-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{content.why.eyebrow}</p>
            <h2 id="why-title">{content.why.heading}</h2>
            <p>{content.why.body}</p>
          </div>
          <ol className={styles.pointGrid}>
            {content.why.points.map((point) => (
              <li key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.discover} id={content.discover.id} aria-labelledby="discover-title">
          <div className={styles.discoverInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{content.discover.eyebrow}</p>
              <h2 id="discover-title">{content.discover.heading}</h2>
              <p>{content.discover.body}</p>
            </div>
            <ul className={styles.featureGrid}>
              {content.discover.features.map((feature) => (
                <li key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.how} id={content.how.id} aria-labelledby="how-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{content.how.eyebrow}</p>
            <h2 id="how-title">{content.how.heading}</h2>
          </div>
          <ol className={styles.steps}>
            {content.how.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.silver} id={content.silver.id} aria-labelledby="silver-title">
          <div className={styles.silverCopy}>
            <p className={styles.eyebrow}>{content.silver.eyebrow}</p>
            <h2 id="silver-title">{content.silver.heading}</h2>
            <p>{content.silver.body}</p>
          </div>
          <aside className={styles.offer} aria-label="Silver membership">
            <p className={styles.offerLabel}>{content.silver.offerLabel}</p>
            <p className={styles.price}>
              <strong>{content.silver.price}</strong>
              <span>{content.silver.period}</span>
            </p>
            <p className={styles.offerNote}>{content.silver.offerNote}</p>
            <ul>
              {content.silver.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </aside>
        </section>

        <section className={styles.profile} id={content.profile.id} aria-labelledby="profile-title">
          <div>
            <p className={styles.eyebrow}>{content.profile.eyebrow}</p>
            <h2 id="profile-title">{content.profile.heading}</h2>
            <p>{content.profile.body}</p>
          </div>
          <ol>
            {content.profile.uses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ol>
        </section>

        <section className={styles.cta} id={content.cta.id} aria-labelledby="cta-title">
          <h2 id="cta-title">{content.cta.heading}</h2>
          <p className={styles.comingSoon}>{content.comingSoon}</p>
          <p>{content.cta.body}</p>
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

function FinderSeal({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64">
      <circle cx="32" cy="32" fill="#ffffff" r="30" stroke="currentColor" strokeWidth="0.75" />
      <text
        dominantBaseline="central"
        fill="currentColor"
        fontFamily="var(--font-playfair), Georgia, serif"
        fontSize="32"
        fontStyle="italic"
        fontWeight="500"
        textAnchor="middle"
        x="32"
        y="33"
      >
        F
      </text>
    </svg>
  );
}
