import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SignupForm } from "@/components/account/SignupForm";
import { SparkleFinderNav } from "@/components/layout/SparkleFinderNav";
import { getLocalDevAuthState } from "@/lib/sparkle-finder/auth";
import { getPasswordPolicy, getPasswordRequirements } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";

type SignUpPageProps = {
  searchParams?: Promise<SignUpSearchParams> | SignUpSearchParams;
};

type SignUpSearchParams = Record<string, string | string[] | undefined>;

export default async function SignUpPage({ searchParams }: SignUpPageProps = {}) {
  return renderSignUpPageContent(await Promise.resolve(searchParams ?? {}));
}

export function renderSignUpPageContent(searchParams: SignUpSearchParams = {}) {
  const nextPath = safeSparkleFinderNextPath(getSearchParam(searchParams.next) ?? "/account");
  const notice = getSignUpNotice(getSearchParam(searchParams.error));
  const passwordPolicy = getPasswordPolicy();
  const signInHref = nextPath === "/" ? "/auth/sign-in" : `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;

  return (
    <>
      <SparkleFinderNav accountState={getLocalDevAuthState("anonymous")} variant="public" />
      <main className="min-h-screen bg-[var(--sparkle-warm-bg)] px-5 py-10 sm:px-8">
        <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="grid gap-5">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--sparkle-coral)]">
              Sparkle Finder account
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
              Start your 45-day Silver trial
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--sparkle-ink-muted)]">
              Create one Sparkle Finder account to browse jewelry, find dancers, and build your Bling Vault and
              Sparkle Showcase. Your first 45 days include Silver access. After that, continue Silver for $4.99/month
              or keep browsing on Free.
            </p>
            <div className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
              <div className="flex items-start gap-3">
                <Sparkles aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
                <div>
                  <h2 className="text-lg font-bold text-[var(--sparkle-plum-deep)]">What Silver includes</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
                    Your Bling Vault and Sparkle Showcase, personalized help from Nic-Nac, and an easier way to follow
                    the pieces you care about.
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)] underline-offset-4 hover:underline"
                href={signInHref}
              >
                Already have an account?
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>

          <SignupForm
            nextPath={nextPath}
            notice={notice}
            passwordMinLength={passwordPolicy.minLength}
            passwordRequirements={passwordPolicy.requirements}
          />
        </section>
      </main>
    </>
  );
}

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSignUpNotice(error: string | undefined): string | null {
  if (error === "missing_required_fields") {
    return "Please complete the required account details before creating your Sparkle Finder account.";
  }

  if (error === "signup_failed") {
    return "Sparkle Finder could not create that account. Try Google, try an email link, or use a different email address.";
  }

  if (error === "password_mismatch") {
    return "Those passwords did not match. Please enter the same password twice before creating your account.";
  }

  if (error === "weak_password") {
    return getPasswordRequirements();
  }

  if (error === "magic_link_failed") {
    return "Sparkle Finder could not send that email sign-in link. Try again or continue with Google.";
  }

  return null;
}
