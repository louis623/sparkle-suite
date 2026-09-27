export type SparkleFinderEnvironment = {
  SPARKLE_ENVIRONMENT?: string;
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT?: string;
};

/** True when either Finder Smoke marker is set. Live and preview stay false. */
export function isSparkleFinderSmokeEnvironment(
  env: SparkleFinderEnvironment = process.env,
) {
  return env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === "smoke" || env.SPARKLE_ENVIRONMENT === "smoke";
}
