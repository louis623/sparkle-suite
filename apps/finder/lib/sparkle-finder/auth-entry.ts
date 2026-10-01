import { isSparkleFinderSmokeEnvironment, type SparkleFinderEnvironment } from "./smoke-environment";
import { safeSparkleFinderNextPath } from "./safe-redirect";

const authenticatedHomePath = "/";

const authScreenPaths = new Set([
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/confirm",
  "/auth/post-login",
  "/auth/forgot-password",
]);

const authCodeLandingPaths = new Set(["/", "/auth/sign-in"]);

/**
 * Where a signed-in Finder session should land.
 * Auth screens and the public root resolve to the collection home.
 * Other safe in-app paths, such as /library or /account, are preserved.
 */
export function sparkleFinderAuthenticatedEntryPath(next: string | null): string {
  const safeNext = safeSparkleFinderNextPath(next);
  const pathname = safeNext.split("?")[0] || authenticatedHomePath;

  if (pathname === authenticatedHomePath || authScreenPaths.has(pathname)) {
    return authenticatedHomePath;
  }

  return safeNext;
}

/** Smoke anonymous visitors skip the coming-soon interstitial and start at sign-in. */
export function sparkleFinderSmokeAnonymousEntryPath(
  accountStatus: string,
  env: SparkleFinderEnvironment = process.env,
): "/auth/sign-in?next=/" | null {
  if (accountStatus === "authenticated" || !isSparkleFinderSmokeEnvironment(env)) {
    return null;
  }

  return "/auth/sign-in?next=/";
}

/**
 * Supabase sometimes returns a PKCE code on the site root or sign-in page
 * instead of /auth/confirm. Send that request to confirm without dropping
 * the code or the safe next path.
 */
export function sparkleFinderAuthCodeConfirmUrl(requestUrl: URL): URL | null {
  const code = requestUrl.searchParams.get("code");

  if (!code || !authCodeLandingPaths.has(requestUrl.pathname)) {
    return null;
  }

  const confirmUrl = new URL("/auth/confirm", requestUrl.origin);
  requestUrl.searchParams.forEach((value, key) => {
    confirmUrl.searchParams.append(key, value);
  });

  return confirmUrl;
}
