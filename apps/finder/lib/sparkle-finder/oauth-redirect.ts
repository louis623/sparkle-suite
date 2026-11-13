import { safeSparkleFinderNextPath } from "./safe-redirect";

export function getSparkleFinderOAuthRedirectTo(nextPath: string, browserOrigin?: string): string {
  const origin = getSparkleFinderSiteOrigin(browserOrigin);

  return `${origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/**
 * Magic-link and email confirmation return URL.
 * Prefer the host the visitor is actually on so Smoke links stay on Smoke
 * even when a configured site URL points somewhere else.
 */
export function getSparkleFinderMagicLinkRedirectTo(nextPath: string, browserOrigin?: string): string {
  const origin = getSparkleFinderOriginFromValue(browserOrigin) ?? getSparkleFinderSiteOrigin(browserOrigin);

  return `${origin}/auth/confirm?next=${encodeURIComponent(safeSparkleFinderNextPath(nextPath))}`;
}

export function getSparkleFinderSiteOrigin(fallbackOrigin = "http://localhost:3000"): string {
  return getConfiguredSparkleFinderSiteOrigin() ?? getSparkleFinderOriginFromValue(fallbackOrigin) ?? "http://localhost:3000";
}

export function getSparkleFinderOriginFromValue(value: string | undefined | null): string | null {
  return getAllowedSparkleFinderOrigin(value);
}

function getConfiguredSparkleFinderSiteOrigin(): string | null {
  return getSparkleFinderOriginFromValue(process.env.NEXT_PUBLIC_SITE_URL);
}

function getAllowedSparkleFinderOrigin(value: string | undefined | null): string | null {
  const origin = normalizeOrigin(value);

  if (!origin || !isAllowedSparkleFinderOrigin(origin)) {
    return null;
  }

  return origin;
}

function normalizeOrigin(value: string | undefined | null): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  try {
    const parsedUrl = new URL(candidate);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }

    return parsedUrl.origin;
  } catch {
    return null;
  }
}

function isAllowedSparkleFinderOrigin(origin: string): boolean {
  const hostname = new URL(origin).hostname.toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "yoursparklefinder.com" ||
    hostname === "www.yoursparklefinder.com" ||
    hostname === "sparkle-finder-dev.vercel.app" ||
    (hostname.startsWith("sparkle-finder-") && hostname.endsWith(".vercel.app"))
  );
}
