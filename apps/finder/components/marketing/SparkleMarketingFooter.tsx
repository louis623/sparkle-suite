// Lives in apps/finder so Finder Smoke can compile it when the Vercel root is apps/finder.
// Suite imports this same file.
import styles from "./sparkle-marketing-footer.module.css";

export const sparkleMarketingYouTubeUrl = "https://www.youtube.com/@SparkleSuite";
export const sparkleMarketingTikTokUrl = "https://www.tiktok.com/@yoursparklesuite.com";
export const sparkleMarketingDisclaimer =
  "Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.";

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
] as const;

const socials = [
  { label: "TikTok", href: sparkleMarketingTikTokUrl },
  { label: "YouTube", href: sparkleMarketingYouTubeUrl },
] as const;

export type SparkleMarketingFooterProps = {
  suiteHref: string;
  finderHref: string;
};

export function SparkleMarketingFooter({ suiteHref, finderHref }: SparkleMarketingFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brands}>
          <a className={styles.suite} href={suiteHref} aria-label="Sparkle Suite" {...externalLinkProps(suiteHref)}>
            <img alt="" src="/brand/sparkle-suite-logo-transparent.png" />
          </a>
          <a className={styles.finder} href={finderHref} aria-label="Sparkle Finder" {...externalLinkProps(finderHref)}>
            <img alt="" src="/brand/sparkle-finder-logo-transparent.png" />
          </a>
        </div>
        <nav aria-label="Footer" className={styles.legal}>
          {legalLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Sparkle Suite channels" className={styles.socials}>
          {socials.map((link) => (
            <a aria-label={`Sparkle Suite on ${link.label}`} href={link.href} key={link.href} rel="noopener noreferrer" target="_blank">
              {link.label === "TikTok" ? <TikTokIcon /> : <YouTubeIcon />}
              <span>{link.label}</span>
            </a>
          ))}
        </nav>
        <p>{sparkleMarketingDisclaimer}</p>
      </div>
    </footer>
  );
}

function externalLinkProps(href: string) {
  if (!href.startsWith("http")) return {};
  return { rel: "noopener noreferrer", target: "_blank" as const };
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M14.2 3.1c.5 2.6 2 4.4 4.5 4.7v2.8a7.7 7.7 0 0 1-4.4-1.4v6.6a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.8V3.1h2.7Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M23 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C18.9 5 12 5 12 5s-6.9 0-8.5.5a3 3 0 0 0-2.1 2.1C1 9 1 12.2 1 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C5.1 19.4 12 19.4 12 19.4s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z" />
    </svg>
  );
}
