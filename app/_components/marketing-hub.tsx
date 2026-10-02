import Link from 'next/link'

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

function ProductCard({
  body,
  comingSoon,
  destinationLabel,
  detail,
  learnMoreHref,
  learnMoreLabel,
  narrative,
  product,
  signInHref,
  signInLabel,
  tone,
}: {
  body: string
  comingSoon?: string
  destinationLabel: string
  detail: string
  learnMoreHref?: string
  learnMoreLabel?: string
  narrative: string
  product: string
  signInHref?: string
  signInLabel?: string
  tone: 'suite' | 'finder'
}) {
  const footer =
    learnMoreHref && learnMoreLabel && signInHref && signInLabel ? (
      <div className={styles.cardFooter}>
        <a className={styles.learnMore} href={learnMoreHref}>
          {learnMoreLabel}
        </a>
        <div className={styles.authSpacer} />
        <div className={styles.accountActions}>
          <AccountLink href={signInHref}>{signInLabel}</AccountLink>
        </div>
      </div>
    ) : null

  return (
    <article className={`${styles.card} ${tone === 'suite' ? styles.suite : styles.finder}`} data-path={tone}>
      <h2 className={styles.cardBrand}>{product}</h2>
      <span className={styles.srOnly}>{destinationLabel}</span>
      <div className={styles.cardCopy}>
        <p className={styles.cardDetail}>{detail}</p>
        <p className={styles.cardBody}>{body}</p>
      </div>
      <p className={styles.narrative}>{narrative}</p>
      {comingSoon ? <p className={styles.comingSoon}>{comingSoon}</p> : null}
      {footer}
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
        <p className={styles.veteranBanner}>{hub.veteranBanner}</p>
        <section className={styles.hero} id="main-content" aria-labelledby="hub-title">
          <h1 className={styles.support} id="hub-title">
            {hub.supportLines.map((line) => (
              <span className={styles.supportLine} key={line}>
                {line}
              </span>
            ))}
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
            <ProductCard
              body={hub.suite.body}
              destinationLabel={hub.suite.destinationLabel}
              detail={hub.suite.detail}
              learnMoreHref={hub.suite.learnMoreHref}
              learnMoreLabel={hub.suite.learnMoreLabel}
              narrative={hub.suite.narrative}
              product={hub.suite.product}
              signInHref={hub.suite.signInHref}
              signInLabel={hub.suite.signInLabel}
              tone="suite"
            />
            <ProductCard
              body={hub.finder.body}
              comingSoon={hub.finder.comingSoon}
              destinationLabel={hub.finder.destinationLabel}
              detail={hub.finder.detail}
              narrative={hub.finder.narrative}
              product={hub.finder.product}
              tone="finder"
            />
          </div>
          <div className={styles.quietExits} id="quiet-exits">
            <p className={styles.quietNote}>{hub.quietExits.note}</p>
            <nav className={styles.quietLinks} aria-label="More Sparkle Suite">
              {hub.quietExits.links.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </div>
      <div className={landingStyles.page}>
        <MarketingFooter />
      </div>
    </main>
  )
}
