import {
  sparkleSuitePublicLandingContent,
  sparkleSuitePublicLandingSafety,
} from '@/lib/sparkle-suite/public-landing-content'
import { MarketingSocialLinks } from './marketing-social-links'
import { SparkleSuitePublicAccountAction } from './SparkleSuitePublicAccountAction'

export function SparkleSeal({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64">
      <circle
        cx="32"
        cy="32"
        fill="#ffffff"
        r="30"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <text
        fill="currentColor"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="32"
        fontStyle="italic"
        fontWeight="500"
        textAnchor="middle"
        x="32"
        y="42"
      >
        S
      </text>
    </svg>
  )
}

export function SparkleSuitePublicHeader({
  homeHref = '/',
}: {
  homeHref?: string
}) {
  return (
    <header className="sl2-header">
      <div className="sl2-header__inner">
        <a aria-label="Sparkle Suite workspace" className="sl2-brand" href={homeHref}>
          <img alt="" className="sl2-brand__logo" src="/email-signatures/sparkle-suite-logo.png" />
        </a>
        <nav className="sl2-header__actions" aria-label="Account links">
          <SparkleSuitePublicAccountAction />
        </nav>
      </div>
    </header>
  )
}

export function SparkleSuitePublicFooter({
  current,
}: {
  current?: 'faq'
} = {}) {
  const { footer } = sparkleSuitePublicLandingContent

  return (
    <footer className="sl2-footer">
      <div className="sl2-footer__inner">
        <div className="sl2-footer__brand">
          <img alt="Sparkle Suite workspace" className="sl2-brand__logo" src="/email-signatures/sparkle-suite-logo.png" />
        </div>
        <nav className="sl2-footer__nav" aria-label="Footer links">
          <div>
            <h2>Links</h2>
            {footer.links.map((link) => (
              <a
                aria-current={current === 'faq' && link.href === '/faq' ? 'page' : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div>
            <h2>Social</h2>
            {footer.socialLinks
              .filter((link) => link.label !== 'TikTok' && link.label !== 'YouTube')
              .map((link) => (
                <a href={link.href} key={link.label}>
                  {link.label}
                </a>
              ))}
            <MarketingSocialLinks tone="night" />
          </div>
        </nav>
        <p>{sparkleSuitePublicLandingSafety.disclaimer}</p>
      </div>
    </footer>
  )
}
