import Link from "next/link";
import { cookies } from "next/headers";
import { LogIn, LogOut } from "lucide-react";
import { AccountPreferences } from "@/components/account/AccountPreferences";
import { CollectorIntakeEditor } from "@/components/account/CollectorIntakeEditor";
import { RepBadge } from "@/components/account/RepBadge";
import { RepClaimPanel } from "@/components/account/RepClaimPanel";
import { SilverStatusPanel } from "@/components/account/SilverStatusPanel";
import { SparkleFinderNav } from "@/components/layout/SparkleFinderNav";
import { getAccountCompletionState } from "@/lib/sparkle-finder/account-completion";
import { readCollectorIntake } from "@/lib/sparkle-finder/collector-intake-store";
import type { CollectorIntakeRecord } from "@/lib/sparkle-finder/collector-intake";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentSparkleFinderAccount,
  type CurrentSparkleFinderAccountState,
} from "@/lib/sparkle-finder/account-service";
import { parseSparkleFinderAuthMode, sparkleFinderAuthCookieName } from "@/lib/sparkle-finder/auth";
import type { SparkleSuiteRepIdentity } from "@/lib/sparkle-finder/types";

type AccountSearchParams = Record<string, string | string[] | undefined>;
type AccountNotice = {
  tone: "success" | "error";
  title: string;
  body: string;
};

type AccountPageProps = {
  searchParams?: AccountSearchParams | Promise<AccountSearchParams>;
};

export default async function AccountPage({ searchParams }: AccountPageProps = {}) {
  const cookieStore = await cookies();
  const resolvedSearchParams = await searchParams;
  const authMode = parseSparkleFinderAuthMode(cookieStore.get(sparkleFinderAuthCookieName)?.value);
  const accountState = await getCurrentSparkleFinderAccount({ localPreviewAuthMode: authMode });

  const intake =
    accountState.status === "authenticated" && accountState.customer
      ? await loadCollectorIntake(accountState.customer.id)
      : null;

  return (
    <>
      <SparkleFinderNav accountState={accountState} />
      {renderAccountPageContent(accountState, undefined, getAccountNotice(resolvedSearchParams), intake)}
    </>
  );
}

async function loadCollectorIntake(userId: string): Promise<CollectorIntakeRecord | null> {
  try {
    return await readCollectorIntake(await createClient() as unknown as Parameters<typeof readCollectorIntake>[0], userId);
  } catch {
    return null;
  }
}

export function renderAccountPageContent(
  accountState: CurrentSparkleFinderAccountState,
  now?: Date,
  notice?: AccountNotice | null,
  intake?: CollectorIntakeRecord | null,
) {
  if (accountState.status !== "authenticated") {
    return (
      <main className="min-h-screen bg-[var(--sparkle-shell)] px-5 py-8 sm:px-8 lg:px-10">
        <section className="mx-auto grid w-full max-w-3xl gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-6 shadow-[var(--sparkle-shadow-sm)]">
          <div className="flex items-start gap-3">
            <LogIn aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--sparkle-plum-deep)]">
                Sign in to manage your Sparkle Finder account
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
                Account controls, Silver trial details, profile basics, and communication preferences are only shown
                after verified server auth.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white"
              href="/auth/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-5 text-sm font-bold text-[var(--sparkle-plum-deep)]"
              href="/auth/sign-up"
            >
              Create account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const completion = getAccountCompletionState(accountState);

  return (
    <main className="min-h-screen bg-[var(--sparkle-shell)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="grid gap-2">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--sparkle-coral)]">Account</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-[var(--sparkle-plum-deep)]">Sparkle Finder account</h1>
              <RepBadge repIdentity={getSelfFacingRepIdentity(accountState)} />
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">
              Manage the signed-in profile, privacy choices, and Silver access attached to verified account data.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-5 text-sm font-bold text-[var(--sparkle-plum-deep)] transition hover:bg-[var(--sparkle-shell)]"
            href="/auth/sign-out"
            prefetch={false}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </Link>
        </section>

        {notice ? <AccountNoticePanel notice={notice} /> : null}
        {!completion.isComplete ? <AccountCompletionPanel /> : null}
        <RepClaimPanel accountState={accountState} />
        <SilverStatusPanel accountState={accountState} now={now} />
        <AccountPreferences accountState={accountState} />
        <CollectorIntakeEditor accountState={accountState} intake={intake ?? null} />
      </div>
    </main>
  );
}

function AccountNoticePanel({ notice }: { notice: AccountNotice }) {
  const className =
    notice.tone === "success"
      ? "border-[var(--sparkle-border)] bg-white text-[var(--sparkle-plum-deep)]"
      : "border-[var(--sparkle-coral)] bg-white text-[var(--sparkle-plum-deep)]";

  return (
    <section className={`grid gap-1 rounded-[var(--sparkle-radius-sm)] border p-4 shadow-[var(--sparkle-shadow-sm)] ${className}`}>
      <h2 className="text-base font-bold">{notice.title}</h2>
      <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">{notice.body}</p>
    </section>
  );
}

function getAccountNotice(searchParams: AccountSearchParams | undefined): AccountNotice | null {
  const message = firstParamValue(searchParams?.message);
  const error = firstParamValue(searchParams?.error);

  if (message === "intake_saved") {
    return {
      tone: "success",
      title: "Jewelry profile saved",
      body: "Your Finder answers were saved on your profile. A Suite rep sees this same record.",
    };
  }

  if (message === "profile_saved") {
    return {
      tone: "success",
      title: "Profile saved",
      body: "Your Sparkle Finder profile basics were updated.",
    };
  }

  if (message === "preferences_saved") {
    return {
      tone: "success",
      title: "Preferences saved",
      body: "Your Sparkle Finder communication preferences were updated.",
    };
  }

  if (message === "rep_claimed") {
    return {
      tone: "success",
      title: "Rep badge linked",
      body: "Your Sparkle Finder account is now linked to Sparkle Suite for Rep Silver and Nic-Nac context.",
    };
  }

  if (message === "silver_trial_ended") {
    return {
      tone: "success",
      title: "Silver trial ended",
      body: "Your account is now on Free access. You can continue Silver from billing when you are ready.",
    };
  }

  if (message === "silver_already_active") {
    return {
      tone: "success",
      title: "Silver is already active",
      body: "You already have paid Silver access. You can manage the subscription from your account billing controls.",
    };
  }

  if (message === "silver_checkout_started") {
    return {
      tone: "success",
      title: "Silver checkout started",
      body: "Stripe is opening your Silver checkout. Return here after checkout to confirm your membership status.",
    };
  }

  if (message === "silver_checkout_canceled") {
    return {
      tone: "success",
      title: "Silver checkout canceled",
      body: "Your Silver checkout was canceled. Your Silver trial and account access are still safe.",
    };
  }

  if (error === "missing_display_name") {
    return {
      tone: "error",
      title: "Display name needed",
      body: "Add a display name before saving your profile basics.",
    };
  }

  if (error === "missing_secret_rep_id") {
    return {
      tone: "error",
      title: "Secret Rep ID Number needed",
      body: "Enter the private rep number shown in Sparkle Suite before claiming your BP Rep badge.",
    };
  }

  if (error === "rep_claim_not_found") {
    return {
      tone: "error",
      title: "Rep number was not found",
      body: "That Secret Rep ID Number did not match an active Sparkle Suite rep.",
    };
  }

  if (error === "rep_claim_not_configured") {
    return {
      tone: "error",
      title: "Rep claiming is not configured",
      body: "Sparkle Finder cannot verify Secret Rep ID Numbers in this environment yet.",
    };
  }

  if (error === "rep_claim_failed") {
    return {
      tone: "error",
      title: "Rep badge was not linked",
      body: "Sparkle Finder could not save that verified rep link. Please try again.",
    };
  }

  if (error === "invalid_birthday") {
    return {
      tone: "error",
      title: "Birthday needs a month and day",
      body: "Enter a birthday month and day. No year is stored.",
    };
  }

  if (error === "missing_intake") {
    return {
      tone: "error",
      title: "Jewelry profile needs the required answers",
      body: "Add your name, contact details, birthday month and day, stone, cut, finish, ring size, and both agreements.",
    };
  }

  if (error === "intake_update_failed") {
    return {
      tone: "error",
      title: "Jewelry profile was not saved",
      body: "Sparkle Finder could not save those answers. Please try again.",
    };
  }

  if (error === "profile_update_failed") {
    return {
      tone: "error",
      title: "Profile was not saved",
      body: "Sparkle Finder could not save those profile basics. Please check the fields and try again.",
    };
  }

  if (error === "preferences_update_failed") {
    return {
      tone: "error",
      title: "Preferences were not saved",
      body: "Sparkle Finder could not save those communication preferences. Please try again.",
    };
  }

  if (error === "billing_not_configured") {
    return {
      tone: "error",
      title: "Silver billing is not configured yet",
      body: "Paid Silver checkout is not available in this environment. Your Silver trial and account access are still safe.",
    };
  }

  if (error === "paid_billing_disabled") {
    return {
      tone: "error",
      title: "Paid Silver is not open for beta yet",
      body: "Your 45-day Silver trial remains available while checkout stays closed.",
    };
  }

  if (error === "email_verification_required") {
    return {
      tone: "error",
      title: "Verify your email first",
      body: "Confirm your Sparkle Finder email before starting paid Silver checkout.",
    };
  }

  if (error === "checkout_session_failed") {
    return {
      tone: "error",
      title: "Silver checkout could not start",
      body: "Stripe could not create a Silver checkout session. Please try again before upgrading.",
    };
  }

  if (error === "missing_stripe_customer") {
    return {
      tone: "error",
      title: "Billing portal is not ready",
      body: "Sparkle Finder could not find a Stripe customer record for this account yet.",
    };
  }

  if (error === "account_unavailable") {
    return {
      tone: "error",
      title: "Account was unavailable",
      body: "Sparkle Finder could not read your account securely. Please sign in again and retry.",
    };
  }

  return null;
}

function firstParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function AccountCompletionPanel() {
  return (
    <section className="grid gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
      <h2 className="text-xl font-bold text-[var(--sparkle-plum-deep)]">Complete your Sparkle Finder account</h2>
      <p className="max-w-3xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">
        Google sign-in created your secure login. Add the remaining details needed for trial protection, account support, and privacy acknowledgment.
      </p>
    </section>
  );
}

function getSelfFacingRepIdentity(accountState: CurrentSparkleFinderAccountState): SparkleSuiteRepIdentity | undefined {
  if (accountState.repIdentity) {
    return accountState.repIdentity;
  }

  if (!accountState.repEntitlement) {
    return undefined;
  }

  return {
    sparkleSuiteRepId: accountState.repEntitlement.sparkleSuiteRepId,
    businessName: accountState.repEntitlement.businessName,
    publicDiscoveryEnabled: accountState.repEntitlement.publicDiscoveryEnabled,
  };
}
