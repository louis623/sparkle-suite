import {
  isSparkleFinderSmokeEnvironment,
  type SparkleFinderEnvironment,
} from "./smoke-environment";

const sparkleFinderCanonicalHost = "yoursparklefinder.com";

export function getSparkleFinderCanonicalRedirect(
  requestUrl: URL,
  vercelEnvironment: string | undefined = process.env.VERCEL_ENV,
  env: SparkleFinderEnvironment = process.env,
): URL | null {
  // Smoke deploys use `vercel --prod`, so VERCEL_ENV is production there too.
  // Smoke markers skip this rewrite and stay on the Smoke host.
  if (vercelEnvironment !== "production" || isSparkleFinderSmokeEnvironment(env)) {
    return null;
  }

  const hostname = requestUrl.hostname.toLowerCase();
  const isAlternateProductionHost = hostname === `www.${sparkleFinderCanonicalHost}` ||
    hostname.endsWith(".vercel.app");

  if (!isAlternateProductionHost) {
    return null;
  }

  const canonicalUrl = new URL(requestUrl);
  canonicalUrl.protocol = "https:";
  canonicalUrl.hostname = sparkleFinderCanonicalHost;
  canonicalUrl.port = "";
  return canonicalUrl;
}
