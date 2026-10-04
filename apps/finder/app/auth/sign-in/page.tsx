import Link from "next/link";
import { Gem, LogIn, UserPlus, UserRound } from "lucide-react";
import { SignInForm } from "@/components/account/SignInForm";
import { SparkleFinderNav } from "@/components/layout/SparkleFinderNav";
import {
  getLocalDevAuthState,
  isLocalPreviewAuthEnabled,
} from "@/lib/sparkle-finder/auth";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";

type SignInPageProps = {
  searchParams?: Promise<SignInSearchParams> | SignInSearchParams;
};

type SignInSearchParams = Record<string, string | string[] | undefined>;

export default async function SignInPage({ searchParams }: SignInPageProps = {}) {
  return renderSignInPageContent(await Promise.resolve(searchParams ?? {}));
}

export function renderSignInPageContent(searchParams: SignInSearchParams = {}) {
  const localFreeAccount = getLocalDevAuthState("free");
  const localSilverAccount = getLocalDevAuthState("silver");
  const previewAuthEnabled = isLocalPreviewAuthEnabled();
  const nextPath = safeSparkleFinderNextPath(getSearchParam(searchParams.next) ?? null);
  const notice = getSignInNotice(getSearchParam(searchParams.message), getSearchParam(searchParams.error));
  const signUpHref = nextPath === "/" ? "/auth/sign-up" : `/auth/sign-up?next=${encodeURIComponent(nextPath)}`;

  return (
    <>
      <SparkleFinderNav accountState={getLocalDevAuthState("anonymous")} variant="public" />
      <main className="min-h-screen bg-[var(--sparkle-warm-bg)] px-5 py-10 sm:px-8">
        <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="grid gap-5">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--sparkle-coral)]">
              Sparkle Finder account
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
              Sign in to open Sparkle Finder
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--sparkle-ink-muted)]">
              Use your Sparkle Finder account to browse jewelry, find dancers, keep a collection and Sparkle
              Showcase, and get personalized help from Nic-Nac. The 30-day Silver trial starts when the intake form is finished.
            </p>
            {notice ? (
              <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)] shadow-[var(--sparkle-shadow-sm)]">
                {notice}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white"
                href={signUpHref}
              >
                <UserPlus aria-hidden="true" className="size-4" />
                Create account
              </Link>
            </div>
            {previewAuthEnabled ? (
              <div className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
                <div>
                  <h2 className="text-lg font-bold text-[var(--sparkle-plum-deep)]">Development preview</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
                    This development build uses fixture accounts, so no production credentials are needed. Guest preview
                    keeps the public view anonymous, Free preview opens the browsing hub, and Silver preview opens
                    collection tools and personalized help from Nic-Nac.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-[var(--sparkle-paper)] px-5 text-sm font-bold text-[var(--sparkle-plum-deep)]"
                    href="/auth/preview/anonymous"
                  >
                    <UserRound aria-hidden="true" className="size-4" />
                    Continue as Guest
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white"
                    href="/auth/preview/free"
                  >
                    <LogIn aria-hidden="true" className="size-4" />
                    Continue as {localFreeAccount.displayName}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-[var(--sparkle-paper)] px-5 text-sm font-bold text-[var(--sparkle-plum-deep)]"
                    href="/auth/preview/silver"
                  >
                    <Gem aria-hidden="true" className="size-4" />
                    Preview {localSilverAccount.displayName}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <SignInForm nextPath={nextPath} />
        </section>
      </main>
    </>
  );
}

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSignInNotice(message: string | undefined, error: string | undefined): string | null {
  if (message === "check_email") {
    return "Check your email for the Sparkle Finder sign-in link.";
  }

  if (error === "missing_oauth_code") {
    return "Google sign-in did not return a valid authorization code.";
  }

  if (error === "oauth_exchange_failed") {
    return "Google sign-in could not be completed. Please try again.";
  }

  if (error === "missing_email") {
    return "Enter your email and we will send a sign-in link. No password needed.";
  }

  if (error === "magic_link_failed") {
    return "Sparkle Finder could not email a sign-in link. Check the address and try again.";
  }

  if (error === "confirmation_failed") {
    return "That sign-in link could not be completed. Request a new magic link and open it in this browser.";
  }

  return null;
}
