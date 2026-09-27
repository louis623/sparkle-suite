'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import type {
  AmethystSiteContent,
  AmethystTier,
  AmethystTradeListing,
} from '@/lib/amethyst/site-content'
import { SparkleSuiteFooterCredit } from '@/components/amethyst/sparkle-suite-footer-credit'

const ANNOUNCEMENT_TICKER_SPEED_PPS = 46
const TRADE_TICKER_SPEED_PPS = 55.2
const EMPTY_TRADE_TICKER_ITEM = {
  id: 'empty-trade-board',
  message: 'Dancers will appear here after the rep adds them to the Dance Floor.',
  isEmpty: true as const,
}
type TradeTickerItem =
  | (AmethystTradeListing & { isEmpty: false })
  | typeof EMPTY_TRADE_TICKER_ITEM

function buildTickerLoopItems<T>(items: T[], minimumSegmentItems: number): T[] {
  if (!Array.isArray(items) || items.length === 0) return []
  const copies = Math.max(1, Math.ceil(minimumSegmentItems / items.length))
  const segmentItems = Array.from({ length: copies }, () => items).flat()
  return [...segmentItems, ...segmentItems]
}

function syncTickerTrackSpeed() {
  document.querySelectorAll<HTMLElement>('[data-ticker-pps]').forEach((track) => {
    const first = track.querySelector<HTMLElement>("[data-ticker-segment-start='true']")
    const repeat = track.querySelector<HTMLElement>("[data-ticker-segment-repeat-start='true']")
    const pixelsPerSecond = Number(track.dataset.tickerPps) || ANNOUNCEMENT_TICKER_SPEED_PPS

    if (!first || !repeat || pixelsPerSecond <= 0) return

    const distance = repeat.offsetLeft - first.offsetLeft
    if (!Number.isFinite(distance) || distance <= 0) return

    track.style.setProperty('--amethyst-ticker-scroll-offset', `${distance * -1}px`)
    track.style.setProperty(
      '--amethyst-ticker-dynamic-duration',
      `${distance / pixelsPerSecond}s`,
    )
  })
}

function useDynamicTickerMotion() {
  useEffect(() => {
    let frame = 0
    const timers: number[] = []
    const scheduleSync = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(syncTickerTrackSpeed)
    }
    const scheduleDelayedSync = (delayMs: number) => {
      const timer = window.setTimeout(scheduleSync, delayMs)
      timers.push(timer)
    }
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        scheduleSync()
      }
    }

    scheduleSync()
    ;[60, 250, 1000].forEach(scheduleDelayedSync)
    window.addEventListener('resize', scheduleSync)
    window.addEventListener('orientationchange', scheduleSync)
    window.addEventListener('pageshow', scheduleSync)
    document.addEventListener('visibilitychange', syncWhenVisible)
    document.fonts?.ready?.then(scheduleSync).catch(() => {})

    const observer = 'ResizeObserver' in window ? new ResizeObserver(scheduleSync) : null
    document.querySelectorAll<HTMLElement>('[data-ticker-pps]').forEach((track) => {
      observer?.observe(track)
      Array.from(track.children).forEach((child) => observer?.observe(child))
    })

    return () => {
      window.cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('orientationchange', scheduleSync)
      window.removeEventListener('pageshow', scheduleSync)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      observer?.disconnect()
    }
  }, [])
}

function tierChipClass(tier: AmethystTier) {
  if (tier === 'unicorn') {
    return 'bg-[linear-gradient(135deg,var(--amethyst-primary),var(--amethyst-accent),#ffd86b)] text-white shadow-[0_0_20px_rgba(210,9,227,0.25)]'
  }

  if (tier === 'diamond') {
    return 'bg-[linear-gradient(135deg,#dceeff,#b0e0ff)] text-[#234464]'
  }

  return 'bg-white/85 text-[var(--amethyst-fg)]'
}

function platformClass(platform: string) {
  if (platform === 'tiktok') {
    return 'bg-[linear-gradient(135deg,#25f4ee,#fe2c55)]'
  }

  if (platform === 'facebook') {
    return 'bg-[#1877f2]'
  }

  return 'bg-[linear-gradient(135deg,var(--amethyst-primary),var(--amethyst-accent))]'
}

function renderLink(
  key: string,
  link: { href: string; external?: boolean },
  children: ReactNode,
  className: string,
) {
  if (link.external) {
    return (
      <a
        className={className}
        href={link.href}
        key={key}
        rel="noreferrer noopener"
        target="_blank"
      >
        {children}
      </a>
    )
  }

  return (
    <a className={className} href={link.href} key={key}>
      {children}
    </a>
  )
}

function HeaderRow({ content }: { content: AmethystSiteContent }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-6 px-6 py-4">
      <button
        aria-label="Menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
        type="button"
      >
        <span className="sr-only">Menu</span>
        <svg
          aria-hidden="true"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <a className="flex flex-col items-center justify-self-center text-center" href="#top">
        <span className="font-[family-name:var(--font-amethyst-display)] text-[1.125rem] font-semibold tracking-[-0.01em] text-white">
          {content.businessName}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          Live jewelry reveals
        </span>
      </a>

      <a
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0e0820] transition hover:-translate-y-0.5"
        href={content.shopUrl}
        rel={content.shopUrl.startsWith('http') ? 'noreferrer noopener' : undefined}
        target={content.shopUrl.startsWith('http') ? '_blank' : undefined}
      >
        Shop
      </a>
    </div>
  )
}

function AmethystTicker({ content }: { content: AmethystSiteContent }) {
  useDynamicTickerMotion()
  const announcementItems = buildTickerLoopItems(content.announcementItems, 6)
  const announcementSegmentLength = announcementItems.length / 2
  const tradeTickerSource: TradeTickerItem[] = content.tradeBoardListings.length > 0
    ? content.tradeBoardListings.map((listing) => ({ ...listing, isEmpty: false as const }))
    : [EMPTY_TRADE_TICKER_ITEM]
  const tradeItems = buildTickerLoopItems(tradeTickerSource, 15)
  const tradeSegmentLength = tradeItems.length / 2

  return (
    <div className="border-b border-[var(--amethyst-border)] bg-white">
      <div className="relative flex h-[38px] items-center overflow-hidden border-b border-[var(--amethyst-border)]">
        <div className="absolute inset-y-0 left-0 z-10 flex min-w-40 items-center bg-[linear-gradient(90deg,white_0%,white_70%,transparent_100%)] px-[18px] font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--amethyst-fg-muted)]">
          Announcements
        </div>
        <div
          className="amethyst-ticker-track pl-[170px]"
          data-ticker-pps={ANNOUNCEMENT_TICKER_SPEED_PPS}
          style={{
            animation:
              'amethyst-scroll var(--amethyst-ticker-dynamic-duration, 72s) linear infinite',
          }}
        >
          {announcementItems.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-[var(--amethyst-fg)]"
              data-ticker-segment-repeat-start={
                index === announcementSegmentLength ? 'true' : undefined
              }
              data-ticker-segment-start={index === 0 ? 'true' : undefined}
            >
              <span className="h-[5px] w-[5px] rounded-full bg-[var(--amethyst-primary)]" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex h-[38px] items-center overflow-hidden bg-white">
        <div className="absolute inset-y-0 left-0 z-10 flex min-w-40 items-center bg-[linear-gradient(90deg,white_0%,white_70%,transparent_100%)] px-[18px] font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--amethyst-fg-muted)]">
          Dance Floor
        </div>
        <div
          className="amethyst-ticker-track pl-[170px]"
          data-ticker-pps={TRADE_TICKER_SPEED_PPS}
          style={{
            animation:
              'amethyst-scroll var(--amethyst-ticker-dynamic-duration, 60s) linear infinite reverse',
          }}
        >
          {tradeItems.map((listing, index) => {
            const segmentProps = {
              'data-ticker-segment-repeat-start':
                index === tradeSegmentLength ? 'true' : undefined,
              'data-ticker-segment-start': index === 0 ? 'true' : undefined,
            }

            if (listing.isEmpty) {
              return (
                <span
                  className="inline-flex items-center whitespace-nowrap text-[13px] font-bold text-[var(--amethyst-fg)]"
                  key={`${listing.id}-${index}`}
                  {...segmentProps}
                >
                  {listing.message}
                </span>
              )
            }

            return (
              <a
                className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-bold text-[var(--amethyst-fg)] transition hover:text-[var(--amethyst-primary)]"
                href={listing.href ?? '#events'}
                key={`${listing.id}-${index}`}
                {...segmentProps}
              >
                <span className={`h-2 w-2 rotate-45 rounded-[2px] ${tierChipClass(listing.tier)}`} />
                <span>
                  {listing.title} - {listing.type || 'Jewelry'} - {listing.collection || 'Collection pending'}
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FooterColumn({
  links,
}: {
  links: Array<{ label: string; href: string; external?: boolean }>
}) {
  return (
    <div>
      <ul className="flex flex-col gap-[10px] text-[13px] text-white/65">
        {links.map((link) => (
          <li key={link.label}>
            {renderLink(
              link.label,
              link,
              link.label,
              'transition hover:text-white',
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialLogo({
  label,
  shortLabel,
}: {
  label: string
  shortLabel: string
}) {
  const key = `${label} ${shortLabel}`.toLowerCase()

  if (key.includes('tiktok') || key.includes('tt')) {
    return (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  if (key.includes('facebook') || key.includes('fb')) {
    return (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M14.2 8.1V6.6c0-.7.5-.9.9-.9h2.3V2.2L14.2 2c-3.2 0-4.8 1.9-4.8 5.1v1H7v3.8h2.4V22h4.2V11.9h3.1l.5-3.8h-3Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  if (key.includes('instagram') || key.includes('ig')) {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
        viewBox="0 0 24 24"
      >
        <rect height="16" rx="4.5" width="16" x="4" y="4" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r="1" />
      </svg>
    )
  }

  if (key.includes('youtube') || key.includes('yt')) {
    return (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return <span className="text-[11px] font-bold">{shortLabel}</span>
}

export function AmethystSiteShell({
  content,
  children,
}: {
  content: AmethystSiteContent
  children: ReactNode
}) {
  const year = new Date().getFullYear()

  return (
    <>
      <div className="min-h-screen bg-[var(--amethyst-bg)] text-[var(--amethyst-fg)]" id="top">
        <header className="sticky top-0 z-[80] border-b border-white/8 bg-[#0e0820] text-white">
          <HeaderRow content={content} />
        </header>

        <AmethystTicker content={content} />

        <main>{children}</main>

        <footer className="bg-[#0e0820] px-6 pb-8 pt-16 text-white/70">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="font-[family-name:var(--font-amethyst-display)] text-[22px] font-semibold tracking-[-0.01em] text-white">
                {content.businessName}
              </div>
              <p className="mt-[14px] max-w-sm text-[13px] leading-[1.55]">
                {content.footerTagline}
              </p>
              <div className="mt-6 flex gap-2">
                {content.socialLinks.map((link) => (
                  <a
                    aria-label={link.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white hover:text-[#0e0820]"
                    href={link.href}
                    key={link.label}
                    title={link.label}
                  >
                    <SocialLogo label={link.label} shortLabel={link.shortLabel} />
                  </a>
                ))}
              </div>
            </div>

            <FooterColumn links={content.footerShopLinks} />
            <FooterColumn links={content.footerAboutLinks} />
          </div>

          <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-[11px] leading-[1.6] text-white/45">
            <div className="mb-4 flex flex-wrap justify-between gap-3">
              <span>
                © {year} {content.businessName} · <SparkleSuiteFooterCredit />
              </span>
              <span className="flex flex-wrap gap-2">
                <Link href="/amethyst/unsubscribe">Unsubscribe</Link>
                <span>·</span>
                <a href="#signup">Privacy</a>
                <span>·</span>
                <a href="#signup">Terms</a>
              </span>
            </div>
            <p>{content.legalDisclaimer}</p>
          </div>
        </footer>
      </div>

    </>
  )
}

export { platformClass, tierChipClass }
