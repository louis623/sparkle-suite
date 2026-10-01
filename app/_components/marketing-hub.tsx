import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { MarketingFooter } from '@/app/_components/landing-experience'
import { sparkleSuiteMarketingHubContent as hub } from '@/lib/sparkle-suite/marketing-hub-content'

import landingStyles from './landing-experience.module.css'
import styles from './marketing-hub.module.css'

function AccountLink({ href, children }: { href: string; children: string }) {
  if (href.startsWith('http')) {
    return (
      <a className={styles.accountLink} href={href}>
        {children}
      </a>
    )
  }

  return (
    <Link className={styles.accountLink} href={href}>
      {children}
    </Link>
  )
}

function PathCard({
  comingSoon,
  destinationLabel,
  detail,
  href,
  product,
  signInHref,
  signInLabel,
  signUpHref,
  signUpLabel,
  tone,
}: {
  comingSoon?: string
  destinationLabel: string
  detail: string
  href: string
  product: string
  signInHref: string
  signInLabel: string
  signUpHref: string
  signUpLabel: string
  tone: 'suite' | 'finder'
}) {
  const className = `${styles.card} ${tone === 'suite' ? styles.suite : styles.finder}`
  const main = (
    <>
      <span className={styles.cardCopy}>
        <span className={styles.cardBrand}>{product}</span>
        <span className={styles.cardDetail}>{detail}</span>
      </span>
      <span className={styles.srOnly}>{destinationLabel}</span>
      <ArrowRight aria-hidden="true" className={styles.trail} size={28} />
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
      <div className={styles.accountBlock}>
        {comingSoon ? <p className={styles.comingSoon}>{comingSoon}</p> : null}
        <div className={styles.accountActions}>
          <AccountLink href={signInHref}>{signInLabel}</AccountLink>
          <AccountLink href={signUpHref}>{signUpLabel}</AccountLink>
        </div>
      </div>
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
          <h1 className={styles.support} id="hub-title">
            {hub.support}
          </h1>
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
              signUpHref={hub.suite.signUpHref}
              signUpLabel={hub.suite.signUpLabel}
              tone="suite"
            />
            <PathCard
              destinationLabel={hub.finder.destinationLabel}
              detail={hub.finder.detail}
              href={hub.finder.href}
              product={hub.finder.product}
              comingSoon={hub.finder.comingSoon}
              signInHref={hub.finder.signInHref}
              signInLabel={hub.finder.signInLabel}
              signUpHref={hub.finder.signUpHref}
              signUpLabel={hub.finder.signUpLabel}
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
