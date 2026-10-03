import Link from "next/link";
import type { LegalDocument } from "@/lib/sparkle-finder/legal-content";
import { sparkleFinderLegalFooterLinks } from "@/lib/sparkle-finder/legal-content";
import { sparkleProductFooterDisclaimer } from "@/lib/sparkle-finder/learn-page-content";

type SparkleFinderLegalPageProps = {
  document: LegalDocument;
};

export function SparkleFinderLegalPage({ document }: SparkleFinderLegalPageProps) {
  return (
    <main className="sparkle-finder-legal-page">
      <section className="sparkle-finder-legal-shell">
        <div className="mb-8 pt-8">
          <Link className="sparkle-finder-legal-link" href="/" aria-label="Back to Sparkle Finder">
            Back to Sparkle Finder
          </Link>
        </div>

        <article className="sparkle-finder-legal-card">
          <header className="sparkle-finder-legal-header">
            <p className="sparkle-finder-legal-eyebrow">Sparkle Finder Legal Center</p>
            <h1>{document.pageTitle}</h1>
            <p>{document.description}</p>
            <p>
              Operated and developed by <strong>{document.developer}</strong>.
            </p>
            <div className="sparkle-finder-legal-meta">
              <p>
                <strong>Last Updated:</strong> {document.lastUpdated}
              </p>
              <p>
                <strong>Developer:</strong> {document.developer}
              </p>
              <p>
                <strong>Contact:</strong>{" "}
                <a className="sparkle-finder-legal-link" href={`mailto:${document.contact}`}>
                  {document.contact}
                </a>
              </p>
            </div>
          </header>

          <section className="sparkle-finder-legal-summary" aria-label="Plain-English summary">
            <p className="sparkle-finder-legal-eyebrow">Plain-English summary</p>
            <p>{document.plainEnglishSummary}</p>
          </section>

          <div className="sparkle-finder-legal-sections">
            {document.sections.map((section) => (
              <section className="sparkle-finder-legal-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.postBulletsParagraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.links?.length ? (
                  <div className="sparkle-finder-legal-inline-links">
                    {section.links.map((link) => (
                      <Link className="sparkle-finder-legal-link" href={link.href} key={link.href}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <footer className="sparkle-finder-legal-footer">
          <span>Sparkle Finder</span>
          <p>{sparkleProductFooterDisclaimer}</p>
          <nav aria-label="Legal pages">
            {sparkleFinderLegalFooterLinks.map((link) => (
              <Link className="sparkle-finder-legal-link" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </section>
    </main>
  );
}
