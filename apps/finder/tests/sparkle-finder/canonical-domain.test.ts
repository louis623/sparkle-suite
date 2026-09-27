import { describe, expect, it } from "vitest";
import { getSparkleFinderCanonicalRedirect } from "../../lib/sparkle-finder/canonical-domain";

const liveEnv = {
  SPARKLE_ENVIRONMENT: "production",
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "production",
};

const smokeEnvs = [
  { SPARKLE_ENVIRONMENT: "smoke" },
  { NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke" },
  { SPARKLE_ENVIRONMENT: "smoke", NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "production" },
  { SPARKLE_ENVIRONMENT: "production", NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke" },
];

describe("Sparkle Finder canonical production domain", () => {
  it.each([
    "https://sparkle-finder-dev.vercel.app/showcase/sparkle-mama?share=1",
    "https://sparkle-finder-abc123-louis-projects.vercel.app/showcase/sparkle-mama?share=1",
    "https://www.yoursparklefinder.com/showcase/sparkle-mama?share=1",
  ])("permanently canonicalizes alternate production hosts without losing the path or query", (requestUrl) => {
    expect(getSparkleFinderCanonicalRedirect(new URL(requestUrl), "production", liveEnv)?.toString()).toBe(
      "https://yoursparklefinder.com/showcase/sparkle-mama?share=1",
    );
    expect(getSparkleFinderCanonicalRedirect(new URL(requestUrl), "production", {})?.toString()).toBe(
      "https://yoursparklefinder.com/showcase/sparkle-mama?share=1",
    );
  });

  it.each([
    "https://sparkle-finder-smoke.vercel.app/",
    "https://sparkle-finder-smoke.vercel.app/auth/reset-password",
  ])("still redirects a live production vercel.app host to yoursparklefinder.com when Smoke markers are absent", (requestUrl) => {
    expect(getSparkleFinderCanonicalRedirect(new URL(requestUrl), "production", liveEnv)?.toString()).toBe(
      `https://yoursparklefinder.com${new URL(requestUrl).pathname}`,
    );
  });

  it.each(smokeEnvs)("does not send Smoke production hosts to the live Finder domain", (env) => {
    expect(
      getSparkleFinderCanonicalRedirect(new URL("https://sparkle-finder-smoke.vercel.app/"), "production", env),
    ).toBeNull();
    expect(
      getSparkleFinderCanonicalRedirect(
        new URL("https://sparkle-finder-smoke.vercel.app/auth/reset-password"),
        "production",
        env,
      ),
    ).toBeNull();
    expect(
      getSparkleFinderCanonicalRedirect(new URL("https://www.yoursparklefinder.com/auth/reset-password"), "production", env),
    ).toBeNull();
  });

  it.each([
    "https://yoursparklefinder.com/account",
    "http://localhost:3000/account",
    "https://evil.example/account",
  ])("does not redirect canonical, local, or unrelated hosts", (requestUrl) => {
    expect(getSparkleFinderCanonicalRedirect(new URL(requestUrl), "production", liveEnv)).toBeNull();
  });

  it("keeps preview deployments available for private verification", () => {
    const requestUrl = new URL("https://sparkle-finder-preview.vercel.app/account");
    expect(getSparkleFinderCanonicalRedirect(requestUrl, "preview", liveEnv)).toBeNull();
    expect(getSparkleFinderCanonicalRedirect(requestUrl, "preview", { SPARKLE_ENVIRONMENT: "smoke" })).toBeNull();
  });
});
