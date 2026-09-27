import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { SparkleFinderNav } from "@/components/layout/SparkleFinderNav";
import { getLocalDevAuthState } from "@/lib/sparkle-finder/auth";
import { getPasswordPolicy } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";

type ResetPasswordPageProps = {
  searchParams?: Promise<ResetPasswordSearchParams> | ResetPasswordSearchParams;
};

type ResetPasswordSearchParams = Record<string, string | string[] | undefined>;

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps = {}) {
  return renderResetPasswordPageContent(await Promise.resolve(searchParams ?? {}));
}

export function renderResetPasswordPageContent(searchParams: ResetPasswordSearchParams = {}) {
  const nextPath = safeSparkleFinderNextPath(getSearchParam(searchParams.next) ?? "/");
  const signInHref = nextPath === "/" ? "/auth/sign-in" : `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;
  const passwordPolicy = getPasswordPolicy();

  return (
    <>
      <SparkleFinderNav accountState={getLocalDevAuthState("anonymous")} variant="public" />
      <main className="min-h-screen bg-[var(--sparkle-warm-bg)] px-5 py-10 sm:px-8">
        <section className="mx-auto grid max-w-3xl gap-6">
          <Link
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)] underline-offset-4 hover:underline"
            href={signInHref}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to sign in
          </Link>

          <ResetPasswordForm
            nextPath={nextPath}
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
