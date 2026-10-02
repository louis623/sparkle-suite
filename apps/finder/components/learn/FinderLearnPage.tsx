import Image from "next/image";
import { FinderSeal } from "@/components/learn/FinderSeal";
import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";
import styles from "./finder-learn.module.css";

export function FinderLearnPage() {
  const content = finderLearnContent;

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
              <ProductPeek
                alt={content.hero.peek.alt}
                height={content.hero.peek.height}
                label={content.hero.peek.label}
                src={content.hero.peek.src}
                width={content.hero.peek.width}
              />
              <figcaption>{content.hero.peek.caption}</figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.why} id={content.why.id} aria-labelledby="why-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{content.why.eyebrow}</p>
            <h2 id="why-title">{content.why.heading}</h2>
            <p>{content.why.body}</p>
          </div>
          <ol className={styles.outcomes}>
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
            <div className={styles.features}>
              {content.discover.features.map((feature) => (
                <article className={styles.feature} key={feature.title}>
                  <div className={styles.featureCopy}>
                    <p className={styles.kicker}>{feature.kicker}</p>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                  <ProductPeek
                    alt={feature.peek.alt}
                    height={feature.peek.height}
                    label={feature.peek.label}
                    src={feature.peek.src}
                    width={feature.peek.width}
                  />
                </article>
              ))}
            </div>
            <p className={styles.aside}>{content.discover.aside}</p>
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
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
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
          <div className={styles.profileCopy}>
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

function ProductPeek({
  alt,
  height,
  label,
  src,
  width,
}: {
  alt: string;
  height: number;
  label: string;
  src: string;
  width: number;
}) {
  return (
    <div className={styles.peek}>
      <p className={styles.peekLabel}>{label}</p>
      <Image alt={alt} className={styles.peekImage} height={height} sizes="(min-width: 960px) 720px, 100vw" src={src} width={width} />
    </div>
  );
}
