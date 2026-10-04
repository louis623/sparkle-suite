import Link from "next/link";
import { SignupForm } from "@/components/account/SignupForm";
import { FinderSeal } from "@/components/learn/FinderSeal";
import styles from "@/components/learn/finder-learn.module.css";
import { sparkleProductFooterDisclaimer } from "@/lib/sparkle-finder/learn-page-content";
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
    <div className={styles.page} data-finder-brand="amethyst" data-smoke="finder-intake-signup">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/learn" aria-label="Sparkle Finder by Sparkle Suite">
            <FinderSeal className={styles.seal} />
            <span className={styles.wordmarkBlock}>
              <span className={styles.wordmark}>Sparkle Finder</span>
              <span className={styles.byline}>by Sparkle Suite</span>
            </span>
          </a>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-10" id="main-content">
        <div className="grid gap-3">
          <p className={styles.eyebrow}>For Bomb Party collectors</p>
          <h1>Finish this form to start 30 days of Silver</h1>
          <p>
            No card. Silver starts when this form is finished, not when the account row is created. On day 30, Silver
            becomes Free and a $6 per month reminder goes out. Nothing is charged.
          </p>
          <p>Silver is saving a collection, and Nic-Nac is your collection curator and jewelry finder assistant.</p>
          <Link className="text-sm font-bold underline-offset-4 hover:underline" href={signInHref}>
            Already have an account?
          </Link>
        </div>
        <SignupForm
          nextPath={nextPath}
          notice={notice}
          passwordMinLength={passwordPolicy.minLength}
          passwordRequirements={passwordPolicy.requirements}
        />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>
            {sparkleProductFooterDisclaimer} Visit{" "}
            <a href="https://neonrabbit.net" rel="noopener noreferrer" target="_blank">
              neonrabbit.net
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSignUpNotice(error: string | undefined): string | null {
  if (error === "missing_required_fields") {
    return "Please complete the required account details before creating your Sparkle Finder account.";
  }

  if (error === "invalid_birthday") {
    return "Enter a birthday month and day. No year is stored.";
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
