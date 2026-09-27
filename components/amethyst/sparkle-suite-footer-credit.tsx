import {
  SPARKLE_SUITE_MARKETING_URL,
  SPARKLE_SUITE_POWERED_BY_LABEL,
} from '@/lib/amethyst/sparkle-suite-footer-credit'

export function SparkleSuiteFooterCredit() {
  return (
    <a
      className="ss-powered-by underline underline-offset-2 hover:text-white"
      href={SPARKLE_SUITE_MARKETING_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${SPARKLE_SUITE_POWERED_BY_LABEL} (opens in a new tab)`}
    >
      {SPARKLE_SUITE_POWERED_BY_LABEL}
    </a>
  )
}
