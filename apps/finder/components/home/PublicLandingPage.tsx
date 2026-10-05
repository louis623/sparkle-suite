import Link from "next/link";
import { LogIn, Sparkles } from "lucide-react";
import { SparkleFinderNav } from "@/components/layout/SparkleFinderNav";
import { sparkleSuiteMarketingHref } from "@/lib/sparkle-finder/marketing-destinations";
import type { CurrentSparkleFinderAccountState } from "@/lib/sparkle-finder/account-service";
import { SparkleMarketingFooter } from "../../../../packages/sparkle-marketing-footer/SparkleMarketingFooter";

type PublicLandingPageProps = {
  accountState: CurrentSparkleFinderAccountState;
};

export function PublicLandingPage({ accountState }: PublicLandingPageProps) {
  return (
    <>
      <SparkleFinderNav accountState={accountState} variant="public" />
      <main
        className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fbf7ff_0%,#f5efff_46%,#fffafd_100%)]"
        data-smoke="public-landing"
      >
        <section
          className="relative isolate px-5 py-10 sm:px-8 lg:py-16"
          data-smoke="public-hero"
        >
          <div className="mx-auto flex min-h-[calc(100vh-15rem)] w-full max-w-2xl flex-col justify-center gap-7 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[rgba(106,63,145,0.18)] bg-white/75 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--sparkle-plum)] shadow-[0_10px_28px_rgba(70,44,94,0.08)]">
              <Sparkles className="size-4" aria-hidden="true" />
              Coming soon
            </div>

            <div className="grid gap-4">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--sparkle-rose)]">
                Sparkle Finder
              </p>
              <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-semibold leading-[0.98] text-[var(--sparkle-plum-deep)] sm:text-6xl lg:text-7xl">
                Sparkle Finder is coming soon.
              </h1>
              <p className="mx-auto max-w-2xl text-xl font-semibold leading-8 text-[var(--sparkle-plum)] sm:text-2xl">
                A new place to find the pieces you love and build the collection that feels like you.
              </p>
            </div>

            <p className="mx-auto max-w-xl text-base leading-7 text-[var(--sparkle-ink-muted)]" data-smoke="coming-soon-copy">
              We are getting the finishing touches in place before the public launch. If you already have an account,
              you can sign in now.
            </p>

            <AnonymousHomeActions />
          </div>
        </section>
      </main>
      <SparkleMarketingFooter finderHref="/learn" suiteHref={sparkleSuiteMarketingHref()} />
    </>
  );
}

function AnonymousHomeActions() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-3 sm:grid-cols-2">
      <Link
        className="sparkle-home-primary-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] px-6 text-sm font-bold shadow-[0_14px_30px_rgba(64,41,36,0.2)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sparkle-rose)]"
        href="/auth/sign-up?next=/"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Create account
      </Link>
      <Link
        className="inline-flex min-h-12 items-center justify-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-plum)] bg-white/75 px-6 text-sm font-bold text-[var(--sparkle-plum)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sparkle-rose)]"
        href="/auth/sign-in"
      >
        <LogIn className="size-4" aria-hidden="true" />
        Sign in
      </Link>
    </div>
  );
}
