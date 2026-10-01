import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { MarketingFooter } from '@/app/_components/landing-experience'
import { sparkleSuiteMarketingHubContent as hub } from '@/lib/sparkle-suite/marketing-hub-content'

import landingStyles from './landing-experience.module.css'
import styles from './marketing-hub.module.css'

function PathCard({
  destinationLabel,
  detail,
  href,
  product,
  signInHref,
  signInLabel,
  title,
  tone,
}: {
  destinationLabel: string
  detail: string
  href: string
  product: string
  signInHref: string
  signInLabel: string
  title: string
  tone: 'suite' | 'finder'
}) {
  const className = `${styles.card} ${tone === 'suite' ? styles.suite : styles.finder}`
  const main = (
    <>
      <span className={styles.cardCopy}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardDetail}>
          {product} — {detail}
        </span>
      </span>
      <span className={styles.srOnly}>{destinationLabel}</span>
      <ArrowRight aria-hidden="true" className={styles.trail} size={28} />
    </>
  )
  const signIn = (
    <>
      {signInLabel}
      <span className={styles.srOnly}> to {product}</span>
      <ArrowRight aria-hidden="true" size={18} />
    </>
  )

  return (
    <article className={className} data-path={tone}>
      {href.startsWith('http') ? (
        <a className={styles.cardMain} href={href}>
          {main}
        </a>
      ) : (
        <Link className={styles.cardMain} href={href}>
          {main}
        </Link>
      )}
      {signInHref.startsWith('http') ? (
        <a className={styles.signIn} href={signInHref}>
          {signIn}
        </a>
      ) : (
        <Link className={styles.signIn} href={signInHref}>
          {signIn}
        </Link>
      )}
    </article>
  )
}

export function MarketingHub() {
  return (
    <main className={styles.page} id="top">
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.stage}>
        <header className={styles.wordmarkBar}>
          <p className={styles.wordmark}>
            <Link href="/">{hub.wordmark[0]}</Link>
            <span aria-hidden="true" className={styles.wordmarkRule}>
              |
            </span>
            <a href={hub.finder.href}>{hub.wordmark[1]}</a>
          </p>
        </header>
        <section className={styles.hero} id="main-content" aria-labelledby="hub-title">
          <h1 id="hub-title">{hub.headline}</h1>
          <p className={styles.prompt}>{hub.prompt}</p>
          <div className={styles.spark} aria-hidden="true">
            <span />
            <svg viewBox="0 0 16 16" width="12" height="12">
              <path d="M8 0 10 6 16 8 10 10 8 16 6 10 0 8 6 6Z" fill="currentColor" />
            </svg>
            <span />
          </div>
          <div className={styles.paths}>
            <PathCard
              destinationLabel={hub.suite.destinationLabel}
              detail={hub.suite.detail}
              href={hub.suite.href}
              product={hub.suite.product}
              signInHref={hub.suite.signInHref}
              signInLabel={hub.suite.signInLabel}
              title={hub.suite.title}
              tone="suite"
            />
            <PathCard
              destinationLabel={hub.finder.destinationLabel}
              detail={hub.finder.detail}
              href={hub.finder.href}
              product={hub.finder.product}
              signInHref={hub.finder.signInHref}
              signInLabel={hub.finder.signInLabel}
              title={hub.finder.title}
              tone="finder"
            />
          </div>
        </section>
      </div>
      <section className={styles.continue} aria-labelledby="suite-continue-title">
        <div className={styles.continueInner}>
          <p className={styles.continueEyebrow}>{hub.suiteContinue.eyebrow}</p>
          <h2 id="suite-continue-title">{hub.suiteContinue.heading}</h2>
          <p>{hub.suiteContinue.body}</p>
          <p className={styles.continueNote}>{hub.suiteContinue.note}</p>
          <nav className={styles.continueLinks} aria-label="Sparkle Suite">
            {hub.suiteContinue.links.map((link) => (
              <Link
                className={link.href === hub.suiteContinue.links[0].href ? styles.continuePrimary : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
                {link.href === hub.suiteContinue.links[0].href ? (
                  <ArrowRight aria-hidden="true" size={16} />
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <div className={landingStyles.page}>
        <MarketingFooter />
      </div>
    </main>
  )
}
