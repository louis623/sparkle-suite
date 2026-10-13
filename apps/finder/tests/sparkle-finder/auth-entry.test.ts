import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sparkleFinderAuthCodeConfirmUrl,
  sparkleFinderAuthenticatedEntryPath,
  sparkleFinderSmokeAnonymousEntryPath,
} from "../../lib/sparkle-finder/auth-entry";

describe("Sparkle Finder authenticated entry", () => {
  it("lands the public root and auth screens on the collection home", () => {
    expect(sparkleFinderAuthenticatedEntryPath(null)).toBe("/");
    expect(sparkleFinderAuthenticatedEntryPath("/")).toBe("/");
    expect(sparkleFinderAuthenticatedEntryPath("/auth/sign-in")).toBe("/");
    expect(sparkleFinderAuthenticatedEntryPath("/auth/sign-in?next=%2Faccount")).toBe("/");
    expect(sparkleFinderAuthenticatedEntryPath("/auth/post-login")).toBe("/");
  });

  it("preserves a safe in-app destination", () => {
    expect(sparkleFinderAuthenticatedEntryPath("/library")).toBe("/library");
    expect(sparkleFinderAuthenticatedEntryPath("/account?setup=required")).toBe("/account?setup=required");
  });

  it("rejects an external next path back to the collection home", () => {
    expect(sparkleFinderAuthenticatedEntryPath("https://evil.example")).toBe("/");
  });
});

describe("Sparkle Finder Smoke coming-soon bypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends anonymous Smoke visitors to sign-in", () => {
    expect(
      sparkleFinderSmokeAnonymousEntryPath("anonymous", {
        NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke",
      }),
    ).toBe("/auth/sign-in?next=/");
    expect(
      sparkleFinderSmokeAnonymousEntryPath("anonymous", {
        SPARKLE_ENVIRONMENT: "smoke",
      }),
    ).toBe("/auth/sign-in?next=/");
  });

  it("keeps signed-in Smoke visitors and live anonymous visitors on the normal home", () => {
    expect(
      sparkleFinderSmokeAnonymousEntryPath("authenticated", {
        NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke",
      }),
    ).toBeNull();
    expect(
      sparkleFinderSmokeAnonymousEntryPath("anonymous", {
        NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "production",
        SPARKLE_ENVIRONMENT: "production",
      }),
    ).toBeNull();
    expect(sparkleFinderSmokeAnonymousEntryPath("anonymous", {})).toBeNull();
  });
});

describe("Sparkle Finder auth code rescue", () => {
  it("moves a root or sign-in PKCE code onto the confirm route", () => {
    const fromRoot = sparkleFinderAuthCodeConfirmUrl(
      new URL("https://sparkle-finder-smoke.vercel.app/?code=magic-code&next=%2F"),
    );
    const fromSignIn = sparkleFinderAuthCodeConfirmUrl(
      new URL("https://sparkle-finder-smoke.vercel.app/auth/sign-in?code=magic-code"),
    );

    expect(fromRoot?.pathname).toBe("/auth/confirm");
    expect(fromRoot?.searchParams.get("code")).toBe("magic-code");
    expect(fromRoot?.searchParams.get("next")).toBe("/");
    expect(fromSignIn?.pathname).toBe("/auth/confirm");
    expect(fromSignIn?.searchParams.get("code")).toBe("magic-code");
  });

  it("leaves confirm, callback, and ordinary pages alone", () => {
    expect(
      sparkleFinderAuthCodeConfirmUrl(
        new URL("https://sparkle-finder-smoke.vercel.app/auth/confirm?code=magic-code"),
      ),
    ).toBeNull();
    expect(
      sparkleFinderAuthCodeConfirmUrl(
        new URL("https://sparkle-finder-smoke.vercel.app/api/auth/callback?code=oauth-code"),
      ),
    ).toBeNull();
    expect(sparkleFinderAuthCodeConfirmUrl(new URL("https://yoursparklefinder.com/"))).toBeNull();
  });
});

describe("Sparkle Finder proxy auth code rescue", () => {
  it("redirects a Smoke root magic-link code to confirm before session refresh", async () => {
    const { proxy } = await import("../../proxy");
    const response = await proxy(
      new NextRequest("https://sparkle-finder-smoke.vercel.app/?code=magic-code&next=%2Flibrary"),
    );
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/auth/confirm");
    expect(location.searchParams.get("code")).toBe("magic-code");
    expect(location.searchParams.get("next")).toBe("/library");
  });
});

describe("Sparkle Finder magic-link redirect host", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the email return URL on the Smoke host the visitor is using", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yoursparklefinder.com");

    const { getSparkleFinderMagicLinkRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(
      getSparkleFinderMagicLinkRedirectTo("/", "https://sparkle-finder-smoke.vercel.app"),
    ).toBe("https://sparkle-finder-smoke.vercel.app/auth/confirm?next=%2F");
  });

  it("falls back to the configured Finder origin when the browser host is not Finder", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yoursparklefinder.com");

    const { getSparkleFinderMagicLinkRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(getSparkleFinderMagicLinkRedirectTo("/account", "https://evil.example")).toBe(
      "https://yoursparklefinder.com/auth/confirm?next=%2Faccount",
    );
  });
});
