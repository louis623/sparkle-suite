import Link from "next/link";
import { Gem, Home, LogOut, Search, UserRound, UsersRound } from "lucide-react";
import { SparkleFinderLogo } from "@/components/brand/SparkleFinderLogo";
import { getLocalDevAuthState, isSparkleFinderSignedIn } from "@/lib/sparkle-finder/auth";
import { getSparkleFinderNavStatusLabel } from "@/lib/sparkle-finder/account-service";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Find", href: "/#find-a-piece", icon: Search },
  { label: "Collection", href: "/#bling-vault", icon: Gem },
  { label: "Reps", href: "/reps", icon: UsersRound },
];

type SparkleFinderNavProps = {
  accountState?: SparkleFinderAccountState;
  variant?: "app" | "public";
};

export function SparkleFinderNav({ accountState = getLocalDevAuthState(), variant = "app" }: SparkleFinderNavProps = {}) {
  const isSignedIn = isSparkleFinderSignedIn(accountState);
  const accountLabel = accountState.status === "anonymous" ? "Sign In" : getSparkleFinderNavStatusLabel(accountState);
  const accountHref = isSignedIn ? "/account" : "/auth/sign-in";
  const appNavItems = [...navItems, { label: "Me", href: accountHref, icon: UserRound }];
  const innerClassName =
    variant === "public"
      ? "mx-auto flex min-h-[5.05rem] w-full max-w-[112rem] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10 lg:py-0"
      : "mx-auto flex min-h-[4.65rem] w-full max-w-[112rem] items-center justify-center gap-4 px-5 py-3 sm:px-8 lg:min-h-[5.05rem] lg:justify-between lg:gap-6 lg:px-10 lg:py-0";

  return (
    <header className={variant === "public" ? "sparkle-finder-nav-shell sparkle-finder-nav-shell--public" : "sparkle-finder-nav-shell"} data-smoke="nav">
      <div className={innerClassName}>
        <SparkleFinderLogo lockup={variant === "public"} />
        {variant === "public" ? (
          <nav aria-label="Sparkle Finder public navigation">
            <Link aria-label="Sign In" className="sparkle-finder-nav-link px-3" href="/auth/sign-in">
              <UserRound aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
              <span>Sign In</span>
            </Link>
          </nav>
        ) : (
          <>
            <nav aria-label="Sparkle Finder primary navigation" className="hidden lg:block">
              <ul className="flex items-center gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.label}>
                      <Link aria-label={item.label} className="sparkle-finder-nav-link px-3" href={item.href}>
                        <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link aria-label="Account" className="sparkle-finder-nav-link px-3" href={accountHref}>
                    <UserRound aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                    <span>{accountLabel}</span>
                  </Link>
                </li>
                {isSignedIn ? (
                  <li>
                    <Link
                      aria-label="Sign out"
                      className="sparkle-finder-nav-link px-3"
                      href="/auth/sign-out"
                      prefetch={false}
                    >
                      <LogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                      <span>Sign out</span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
            <nav
              aria-label="Sparkle Finder app navigation"
              className="sparkle-finder-app-bottom-nav lg:hidden"
              data-smoke="app-bottom-nav"
            >
              {appNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link aria-label={item.label} href={item.href} key={item.label}>
                    <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
