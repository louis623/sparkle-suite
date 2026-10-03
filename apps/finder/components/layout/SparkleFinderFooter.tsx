const footerLinkGroups = [
  {
    title: "Links",
    links: [
      { label: "Account", href: "/account" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { label: "Sparkle Suite", href: "https://www.yoursparklesuite.com" },
    ],
  },
];

const footerSocialLinks = [
  { label: "TikTok", href: "https://www.tiktok.com/@yoursparklesuite", platform: "tiktok" },
  { label: "YouTube", href: "https://www.youtube.com/@yoursparklesuite", platform: "youtube" },
];

export function SparkleFinderFooter() {
  return (
    <footer className="sparkle-finder-site-footer">
      <div className="sparkle-finder-site-footer__inner">
        <div className="sparkle-finder-site-footer__brand-stack">
          <div className="sparkle-finder-site-footer__brand">
            <SparkleFinderFooterSeal />
            <span>Sparkle Finder</span>
          </div>
          <nav className="sparkle-finder-site-footer__socials" aria-label="Sparkle Finder social links">
            {footerSocialLinks.map((link) => (
              <a
                aria-label={`Sparkle Finder on ${link.label}`}
                className="sparkle-finder-site-footer__social-bubble"
                href={link.href}
                key={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <SparkleFinderSocialIcon platform={link.platform} />
              </a>
            ))}
          </nav>
        </div>
        <nav className="sparkle-finder-site-footer__nav" aria-label="Footer links">
          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <a
                  href={link.href}
                  key={link.href}
                  rel={link.href.startsWith("https://") ? "noopener noreferrer" : undefined}
                  target={link.href.startsWith("https://") ? "_blank" : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <p>
          Sparkle Finder is a discovery hub by Sparkle Suite. We are not affiliated with, endorsed by, sponsored by, or
          officially connected to Bomb Party. Visit{" "}
          <a href="https://neonrabbit.net" rel="noopener noreferrer" target="_blank">
            neonrabbit.net
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

function SparkleFinderSocialIcon({ platform }: { platform: string }) {
  if (platform === "youtube") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SparkleFinderFooterSeal() {
  return (
    <svg aria-hidden="true" className="sparkle-finder-site-footer__seal" viewBox="0 0 64 64">
      <circle cx="32" cy="32" fill="#ffffff" r="30" stroke="currentColor" strokeWidth="0.75" />
      <text
        fill="currentColor"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="28"
        fontStyle="italic"
        fontWeight="500"
        textAnchor="middle"
        x="32"
        y="42"
      >
        SF
      </text>
    </svg>
  );
}
