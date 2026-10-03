import {
  isSparkleFinderSmokeEnvironment,
  type SparkleFinderEnvironment,
} from "@/lib/sparkle-finder/smoke-environment";

const SUITE_LIVE_MARKETING_HREF = "https://www.yoursparklesuite.com";
const SUITE_SMOKE_MARKETING_HREF = "https://sparkle-suite-smoke.vercel.app/";

/**
 * Suite home a Finder marketing page should open.
 * Live and preview keep www.yoursparklesuite.com. Smoke uses the existing
 * Smoke marker, which both Finder Smoke env vars already set.
 */
export function sparkleSuiteMarketingHref(
  env: SparkleFinderEnvironment = process.env,
) {
  return isSparkleFinderSmokeEnvironment(env)
    ? SUITE_SMOKE_MARKETING_HREF
    : SUITE_LIVE_MARKETING_HREF;
}
