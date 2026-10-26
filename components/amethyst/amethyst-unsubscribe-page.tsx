import { AmethystUnsubscribeForm } from '@/components/amethyst/amethyst-unsubscribe-form'

export function AmethystUnsubscribePage() {
  return (
    <main className="min-h-screen bg-[var(--amethyst-bg)] text-[var(--amethyst-fg)]">
      <header className="bg-[#0e0820] px-6 py-5 text-white">
        <a className="font-semibold" href="/">Sparkle Suite</a>
      </header>
      <section className="px-6 py-24" id="unsubscribe">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.4rem] border border-[var(--amethyst-border)] bg-[var(--amethyst-bg-elevated)] p-8 shadow-[0_28px_60px_rgba(42,31,64,0.08)] md:p-12">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--amethyst-primary)]">
              Customer preferences
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-amethyst-display)] text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.05] tracking-[-0.03em]">
              Unsubscribe from updates
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[var(--amethyst-fg-muted)]">
              Choose whether to stop SMS updates, email updates, or both.
            </p>
          </div>

          <AmethystUnsubscribeForm />
        </div>
      </section>
    </main>
  )
}
