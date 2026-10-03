import Link from 'next/link'
import { prelaunchContent } from '@/lib/prelaunch/content'
import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { SparkleSeal } from './PrelaunchVisuals'

export function PrelaunchFooter() {
  return (
    <>
      <section className="ss-closing">
        <div className="ss-wrap ss-closing__inner">
          <SparkleSeal className="ss-closing__seal" />
          <span className="ss-eyebrow">{prelaunchContent.footerEyebrow}</span>
          <h2>{prelaunchContent.footerHeading}</h2>
          <p>{prelaunchContent.footerBody}</p>
          <a className="ss-btn ss-btn--primary" href="#waitlist">
            {prelaunchContent.primaryCtaLabel}
            <span aria-hidden="true" className="ss-arrow">
              &rarr;
            </span>
          </a>
        </div>
      </section>
      <footer className="ss-foot">
        <div className="ss-wrap ss-foot__inner">
          <div className="ss-foot__brand">
            <SparkleSeal className="ss-foot__seal" />
            <span>{prelaunchContent.brand}</span>
          </div>
          <nav aria-label="Legal pages" className="ss-foot__links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-and-conditions">Terms and Conditions</Link>
          </nav>
          <div className="ss-foot__copy">
            <div>Copyright 2026 Sparkle Suite</div>
            <div>{prelaunchContent.footerTagline}</div>
            <div>{sparkleSuitePublicLandingSafety.disclaimer}</div>
          </div>
        </div>
      </footer>
    </>
  )
}
