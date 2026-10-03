import {
  legalFooterLinks,
  type LegalDocument,
} from '@/lib/prelaunch/legal-content'
import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'

function getPlainEnglishSummary(document: LegalDocument) {
  if (document.pageTitle === 'Privacy Policy') {
    return 'Sparkle Suite uses the information needed to run representative websites, Live Queue display, forms, messages, and support. Neon Rabbit Digital Services does not sell personal information or SMS opt-in data.'
  }

  return 'Sparkle Suite is software and website support from Neon Rabbit Digital Services. These terms explain how the website system, Live Queue extension, representative pages, messages, payments, and support are used.'
}

function withReturnTo(href: string, returnTo: string | undefined) {
  if (!returnTo) return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

export function SparkleLegalPage({
  backHref = '/prelaunch',
  backLabel = 'Back to Sparkle Suite',
  document,
}: {
  backHref?: string
  backLabel?: string
  document: LegalDocument
}) {
  const returnLinkClass =
    'prelaunch-link -mx-2 inline-flex min-h-11 items-center px-2 text-sm font-semibold'
  const footerLinkClass =
    'prelaunch-link -mx-2 inline-flex min-h-11 items-center px-2'
  const summary = getPlainEnglishSummary(document)
  const legalReturnTo = backLabel === 'Back to checkout' ? backHref : undefined

  return (
    <main className="prelaunch-page">
      <section className="prelaunch-section">
        <div className="prelaunch-shell sparkle-legal-shell">
          <div className="mb-8 pt-8">
            <a className={returnLinkClass} href={backHref} aria-label={backLabel}>
              {backLabel}
            </a>
          </div>

          <article className="prelaunch-card p-5 sm:p-10">
            <header className="border-b border-[var(--prelaunch-border)] pb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--prelaunch-muted)]">
                Sparkle Suite Legal Center
              </p>
              <h1 className="prelaunch-display mt-4 text-4xl leading-tight text-[var(--prelaunch-plum-ink)] sm:text-5xl">
                {document.pageTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--prelaunch-muted)] sm:text-lg">
                {document.description}
              </p>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--prelaunch-plum-ink)]">
                Operated and developed by {document.developer}.
              </p>
              <div className="mt-6 grid gap-2 text-sm text-[var(--prelaunch-muted)]">
                <p>
                  <strong className="text-[var(--prelaunch-plum-ink)]">Last Updated:</strong>{' '}
                  {document.lastUpdated}
                </p>
                <p>
                  <strong className="text-[var(--prelaunch-plum-ink)]">Developer:</strong>{' '}
                  {document.developer}
                </p>
                <p>
                  <strong className="text-[var(--prelaunch-plum-ink)]">Contact:</strong>{' '}
                  <a
                    className="prelaunch-link -mx-2 inline-flex min-h-11 items-center px-2"
                    href={`mailto:${document.contact}`}
                    aria-label={`Email ${document.contact}`}
                  >
                    {document.contact}
                  </a>
                </p>
              </div>
            </header>

            <section
              className="mt-8 grid gap-3 border-b border-[var(--prelaunch-border)] pb-8"
              aria-label="Plain-English summary"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--prelaunch-muted)]">
                Plain-English summary
              </p>
              <p className="max-w-3xl text-base leading-8 text-[var(--prelaunch-muted)]">
                {summary}
              </p>
            </section>

            <div className="mt-8 grid gap-8">
              {document.sections.map((section) => (
                <section className="grid gap-3" key={section.title}>
                  <h2 className="text-2xl font-semibold text-[var(--prelaunch-plum-ink)]">
                    {section.title}
                  </h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p className="leading-8 text-[var(--prelaunch-muted)]" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="grid gap-2 pl-5 text-[var(--prelaunch-muted)]">
                      {section.bullets.map((bullet) => (
                        <li className="list-disc leading-7" key={bullet}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.postBulletsParagraphs?.map((paragraph) => (
                    <p className="leading-8 text-[var(--prelaunch-muted)]" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}

                  {section.links?.length ? (
                    <div className="flex flex-wrap gap-4">
                      {section.links.map((link) => (
                        <a
                          className={footerLinkClass}
                          href={withReturnTo(link.href, legalReturnTo)}
                          key={link.href}
                          aria-label={link.label}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 border-t border-[var(--prelaunch-border)] pt-6">
              <a className={returnLinkClass} href={backHref} aria-label={backLabel}>
                {backLabel}
              </a>
            </div>
          </article>

          <footer className="mt-8 flex flex-col gap-3 text-sm text-[var(--prelaunch-muted)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Sparkle Suite</span>
              <nav className="flex flex-wrap gap-4" aria-label="Legal pages">
                {legalFooterLinks.map((link) => (
                  <a
                    className={footerLinkClass}
                    href={withReturnTo(link.href, legalReturnTo)}
                    key={link.href}
                    aria-label={link.label}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
            <p>{sparkleSuitePublicLandingSafety.disclaimer}</p>
          </footer>
        </div>
      </section>
    </main>
  )
}
