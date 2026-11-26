import Link from 'next/link'

import type { AmethystSiteContent, AmethystStreamLink } from '@/lib/amethyst/site-content'
import {
  getPublicRepName,
  redactPublicRepFullName,
} from '@/lib/amethyst/public-rep-name'
import { publicSignupSubtitle } from '@/lib/amethyst/homepage-template-data'

import {
  AmethystSiteShell,
  platformClass,
} from '@/components/amethyst/site-shell'

function streamBadge(link: AmethystStreamLink) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold text-white ${platformClass(link.platform)}`}
    >
      {link.label.slice(0, 2).toUpperCase()}
    </span>
  )
}

function LiveQueueSection({ content }: { content: AmethystSiteContent }) {
  if (content.liveQueueState === 'offline') {
    return (
      <section className="border-b border-[var(--amethyst-border)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--amethyst-fg-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--amethyst-fg-muted)]" />
            Live Lineup
          </div>
          <p className="text-[13px] text-[var(--amethyst-fg-muted)]">
            Show ended - see you next Tuesday at 8pm CST.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b border-[var(--amethyst-border)] bg-white" id="watch-live">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--amethyst-fg)]">
          <span className="amethyst-live-dot h-2 w-2 rounded-full bg-[#ff3366]" />
          Live Lineup
        </div>
        <div className="flex flex-wrap gap-3">
          {content.liveQueueEntries.slice(0, 2).map((entry) => (
            <div
              className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 ${
                entry.position === '2'
                  ? 'border-[var(--amethyst-primary)] bg-[color-mix(in_oklab,var(--amethyst-primary)_10%,white)]'
                  : 'border-[var(--amethyst-border)] bg-[var(--amethyst-bg)]'
              }`}
              key={`${entry.position}-${entry.customerName}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--amethyst-primary)] text-xs font-semibold text-white">
                {entry.position}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[var(--amethyst-fg)]">
                  {entry.customerName}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HeroSection({ content }: { content: AmethystSiteContent }) {
  const shopLink = content.streamLinks.find((link) => link.platform === 'shop')
  const watchLink = content.streamLinks.find((link) => link.platform !== 'shop')
  const heroSub = redactPublicRepFullName(content.heroSub, content.repName)

  return (
    <section className="relative overflow-hidden">
      <div className="amethyst-hero-media amethyst-hero-placeholder absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[86vh] max-w-7xl px-6 pb-24 pt-24">
        <div className="max-w-[620px] text-white">
          <h1 className="font-[family-name:var(--font-amethyst-display)] text-[clamp(3rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.03em]">
            {content.heroHeadline}
          </h1>
          <p className="mt-6 max-w-[540px] text-lg leading-[1.55] text-white/78">
            {heroSub}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--amethyst-fg)] transition hover:-translate-y-0.5"
              href="#events"
            >
              Browse the dance floor
            </a>
            {shopLink ? (
              <a
                className="inline-flex items-center rounded-full border border-white/30 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[var(--amethyst-fg)]"
                href={shopLink.href}
                rel={shopLink.href.startsWith('http') ? 'noreferrer noopener' : undefined}
                target={shopLink.href.startsWith('http') ? '_blank' : undefined}
              >
                Shop Bomb Party
              </a>
            ) : null}
            {watchLink ? (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[var(--amethyst-fg)]"
                href={watchLink.href}
              >
                <span className="amethyst-live-dot h-2 w-2 rounded-full bg-[#ff3366]" />
                Watch Live
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function EventCodeRow({
  code,
  description,
}: {
  code: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--amethyst-accent)] bg-white/70 px-4 py-3">
      <div className="min-w-0">
        <strong className="font-mono text-sm tracking-[0.12em] text-[var(--amethyst-accent)]">
          {code}
        </strong>
        <span className="ml-2 text-sm leading-6 text-[var(--amethyst-fg-muted)]">
          {description}
        </span>
      </div>
      <button
        className="shrink-0 rounded-full border border-[var(--amethyst-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--amethyst-fg)]"
        type="button"
      >
        Copy
      </button>
    </div>
  )
}

function EventsSection({ content }: { content: AmethystSiteContent }) {
  return (
    <section className="px-6 py-24" id="events">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--amethyst-primary)]">
            <span className="h-px w-6 bg-[var(--amethyst-primary)]" />
            Upcoming Shows
            <span className="h-px w-6 bg-[var(--amethyst-primary)]" />
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-amethyst-display)] text-[clamp(2.2rem,4vw,3.3rem)] leading-[1.03] tracking-[-0.03em]">
            Mark your calendar. The next two reveals.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-[var(--amethyst-fg-muted)]">
            Times shown in your local timezone. Tap a code to copy it before showtime.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {content.events.slice(0, 2).map((event) => (
            <article
              className={`relative rounded-[1.15rem] border p-5 text-left shadow-[0_20px_40px_rgba(42,31,64,0.08)] ${
                event.featured
                  ? 'border-[var(--amethyst-primary)] bg-[linear-gradient(180deg,var(--amethyst-bg-elevated),var(--amethyst-bg-deep))]'
                  : 'border-[var(--amethyst-border)] bg-[var(--amethyst-bg-elevated)]'
              }`}
              key={event.id}
            >
              {event.featured ? (
                <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-[var(--amethyst-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Featured
                </span>
              ) : null}

              <h3 className="pr-24 font-[family-name:var(--font-amethyst-display)] text-2xl leading-tight tracking-[-0.02em]">
                {event.title}
              </h3>
              <div className="mt-4 space-y-2 text-sm font-medium text-[var(--amethyst-fg-muted)]">
                <p>{event.dateLabel}</p>
                <p>{event.timeLabel}</p>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                  Discounts
                </div>
                <div className="mt-3 space-y-3">
                  {event.discounts.map((discount) => (
                    <EventCodeRow
                      code={discount.code}
                      description={discount.description}
                      key={discount.code}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                  Featured Collections
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.featuredCollections.map((collection) => (
                    <a
                      className="rounded-full border border-[var(--amethyst-border)] bg-white px-3 py-1.5 text-sm text-[var(--amethyst-fg)] transition hover:border-[var(--amethyst-primary)] hover:text-[var(--amethyst-primary)]"
                      href="#signup"
                      key={collection}
                    >
                      {collection}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {event.platforms.map((platform) => (
                  <a
                    className="inline-flex items-center gap-3 rounded-xl bg-[var(--amethyst-fg)] px-4 py-3 text-sm font-medium text-[var(--amethyst-bg)] transition hover:bg-[var(--amethyst-accent)]"
                    href={platform.href}
                    key={`${event.id}-${platform.label}`}
                  >
                    {streamBadge(platform)}
                    {platform.label}
                  </a>
                ))}
                <button
                  className="rounded-xl border border-[var(--amethyst-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--amethyst-fg)] transition hover:border-[var(--amethyst-primary)] hover:text-[var(--amethyst-primary)]"
                  type="button"
                >
                  Add to calendar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function BombPartySection({ content }: { content: AmethystSiteContent }) {
  const repName = getPublicRepName(content.repName)

  return (
    <section className="bg-[var(--amethyst-bg-elevated)] px-6 py-24" id="bomb-party">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.15rem] border border-[var(--amethyst-border)] bg-[var(--amethyst-bg)] p-9 shadow-[0_20px_40px_rgba(42,31,64,0.08)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--amethyst-primary)]">
            First time here?
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-amethyst-display)] text-[clamp(2.2rem,3.4vw,3rem)] leading-[1.08] tracking-[-0.03em]">
            It&apos;s a live jewelry reveal - with {repName}
          </h2>
          <p className="mt-4 text-base leading-8 text-[var(--amethyst-fg-muted)]">
            {content.whatIsBombPartyBody}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StepCard
              description="Pick a box, place pre-order before showtime."
              label="Order"
              number="1"
            />
            <StepCard
              description="Join the reveal on TikTok or Facebook."
              label="Watch Live"
              number="2"
            />
            <StepCard
              description="Real jewelry ships to your door."
              label="Receive"
              number="3"
            />
          </div>
        </article>

        <div className="relative isolate flex min-h-[420px] items-end overflow-hidden rounded-[1.15rem] border border-[var(--amethyst-border)] bg-[linear-gradient(180deg,#0e0820_0%,#1a1034_100%)] p-6 text-white shadow-[0_24px_60px_rgba(14,8,32,0.24)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(210,9,227,0.38),transparent_55%),radial-gradient(ellipse_at_70%_70%,rgba(72,13,223,0.4),transparent_55%)]" />
          <div className="relative z-10 flex w-full flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/92 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25f4ee]" />
              TikTok Loops
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl text-[var(--amethyst-fg)]">
              ▶
            </div>
            <p className="max-w-xs text-sm leading-6 text-white/72">
              @{repName.toLowerCase().replace(/\s+/g, '')} - &quot;When the box hits different...&quot;
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function StepCard({
  number,
  label,
  description,
}: {
  number: string
  label: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-[var(--amethyst-border)] bg-[var(--amethyst-bg-elevated)] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--amethyst-primary)] text-sm font-semibold text-white">
        {number}
      </div>
      <div className="mt-3 text-sm font-semibold text-[var(--amethyst-fg)]">{label}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--amethyst-fg-muted)]">{description}</div>
    </div>
  )
}

function SignupSection({ content }: { content: AmethystSiteContent }) {
  const signupSub = publicSignupSubtitle(redactPublicRepFullName(content.signupSub, content.repName))

  return (
    <section className="px-6 py-24" id="signup">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.4rem] border border-[var(--amethyst-border)] bg-[var(--amethyst-bg-elevated)] p-8 shadow-[0_28px_60px_rgba(42,31,64,0.08)] md:p-12">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--amethyst-primary)]">
            {content.signupEyebrow}
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-amethyst-display)] text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.05] tracking-[-0.03em]">
            {content.signupTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[var(--amethyst-fg-muted)]">
            {signupSub}
          </p>
        </div>

        <form className="mt-10 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                First name
              </span>
              <input
                className="w-full rounded-xl border border-[var(--amethyst-border)] bg-white px-4 py-3 text-[15px] text-[var(--amethyst-fg)] outline-none transition focus:border-[var(--amethyst-primary)]"
                name="first_name"
                placeholder="Jamie"
                type="text"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                Last name
              </span>
              <input
                className="w-full rounded-xl border border-[var(--amethyst-border)] bg-white px-4 py-3 text-[15px] text-[var(--amethyst-fg)] outline-none transition focus:border-[var(--amethyst-primary)]"
                name="last_name"
                placeholder="Lane"
                type="text"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                Email
              </span>
              <input
                className="w-full rounded-xl border border-[var(--amethyst-border)] bg-white px-4 py-3 text-[15px] text-[var(--amethyst-fg)] outline-none transition focus:border-[var(--amethyst-primary)]"
                name="email"
                placeholder="you@example.com"
                type="email"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--amethyst-fg-muted)]">
                Phone <span className="normal-case tracking-normal text-[var(--amethyst-fg-muted)]/70">(optional, for SMS)</span>
              </span>
              <input
                className="w-full rounded-xl border border-[var(--amethyst-border)] bg-white px-4 py-3 text-[15px] text-[var(--amethyst-fg)] outline-none transition focus:border-[var(--amethyst-primary)]"
                name="phone"
                placeholder="(555) 555-5555"
                type="tel"
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-[1rem] border border-[var(--amethyst-border)] bg-white/70 p-4 text-sm text-[var(--amethyst-fg)]">
            <label className="flex items-start gap-3">
              <input className="mt-1" name="sms_consent" type="checkbox" value="true" />
              <span>Text me show reminders and SMS updates.</span>
            </label>
            <label className="flex items-start gap-3">
              <input className="mt-1" name="email_consent" type="checkbox" value="true" />
              <span>Email me show reminders and collection updates.</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                className="mt-1"
                name="marketing_consent"
                type="checkbox"
                value="true"
              />
              <span>I also want promotional drops, launches, and special offers.</span>
            </label>
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[var(--amethyst-primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--amethyst-accent)]"
              type="button"
            >
              Sign me up
              <span aria-hidden="true">→</span>
            </button>
            <p className="max-w-2xl text-center text-xs leading-6 text-[var(--amethyst-fg-muted)]">
              Choose SMS, email, or both. Marketing consent stays separate from
              reminders and updates. Message and data rates may apply. Reply STOP to
              unsubscribe.{' '}
              <Link className="underline" href="/amethyst/unsubscribe">
                Manage preferences or unsubscribe
              </Link>
              .
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}

export function AmethystHomepage({
  content,
}: {
  content: AmethystSiteContent
}) {
  return (
    <AmethystSiteShell content={content}>
      <LiveQueueSection content={content} />
      <HeroSection content={content} />
      <EventsSection content={content} />
      <BombPartySection content={content} />
      <SignupSection content={content} />
    </AmethystSiteShell>
  )
}
