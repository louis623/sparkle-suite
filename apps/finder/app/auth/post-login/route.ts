import { NextResponse } from "next/server";
import { getCurrentSparkleFinderAccount } from "@/lib/sparkle-finder/account-service";
import { sparkleFinderAuthenticatedEntryPath } from "@/lib/sparkle-finder/auth-entry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = sparkleFinderAuthenticatedEntryPath(requestUrl.searchParams.get("next"));
  const accountState = await getCurrentSparkleFinderAccount();

  if (accountState.status !== "authenticated") {
    const signInUrl = new URL("/auth/sign-in", requestUrl.origin);
    signInUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(signInUrl);
  }

  if (accountState.membership?.isTrialExpired && accountState.membership.effectiveState === "free") {
    return NextResponse.redirect(new URL("/account?message=silver_trial_ended", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
