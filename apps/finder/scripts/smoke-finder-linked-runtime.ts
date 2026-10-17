import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildFinderNicNacSmokeBody,
  evaluateFinderNicNacSmokeResponse,
} from "./smoke-finder-nic-nac";

type EnvRecord = Record<string, string | undefined>;

export type FinderLinkedRuntimeSmokeConfig = {
  baseUrl: string;
  finderServiceRoleKey?: string;
  finderSupabaseUrl?: string;
  headless: boolean;
  keepUserOnFailure: boolean;
  nicNacPrompt: string;
  runNicNac: boolean;
  secretRepIdNumber?: string;
  suiteFinderRepClaimApiUrl?: string;
  suiteServiceRoleKey?: string;
  suiteSupabaseUrl?: string;
  suiteClaimToken?: string;
  telemetryTimeoutMs: number;
};

type FinderSmokeUser = {
  email: string;
  password: string;
  userId: string;
};

type SecretRepClaimCandidate = {
  businessName?: string | null;
  publicSiteSlug?: string | null;
  secretRepIdNumber: string;
  suiteRepId?: string | null;
};

const defaultFinderBaseUrl = "https://sparkle-finder-dev.vercel.app";
const defaultSuiteBaseUrl = "https://www.yoursparklesuite.com";

export function parseFinderLinkedRuntimeSmokeConfig(
  env: EnvRecord,
): FinderLinkedRuntimeSmokeConfig {
  const suiteEnv = parseEnvFile(env.SPARKLE_FINDER_LINKED_SMOKE_SUITE_ENV_FILE);
  const merged = {
    ...suiteEnv,
    ...env,
  };

  return {
    baseUrl: cleanUrl(merged.SPARKLE_FINDER_LINKED_SMOKE_BASE_URL || defaultFinderBaseUrl),
    finderServiceRoleKey: clean(merged.SPARKLE_FINDER_SERVICE_ROLE_KEY || merged.SUPABASE_SERVICE_ROLE_KEY),
    finderSupabaseUrl: clean(merged.SPARKLE_FINDER_SUPABASE_URL || merged.NEXT_PUBLIC_SUPABASE_URL),
    headless: parseBoolean(merged.SPARKLE_FINDER_LINKED_SMOKE_HEADLESS, true),
    keepUserOnFailure: parseBoolean(merged.SPARKLE_FINDER_LINKED_SMOKE_KEEP_USER, false),
    nicNacPrompt: clean(merged.SPARKLE_FINDER_LINKED_SMOKE_NIC_NAC_PROMPT)
      || "From Sparkle Finder, remind me how you handle Sparkle Suite workspace requests.",
    runNicNac: parseBoolean(merged.SPARKLE_FINDER_LINKED_SMOKE_RUN_NIC_NAC, true),
    secretRepIdNumber: clean(merged.SPARKLE_FINDER_LINKED_SMOKE_SECRET_REP_ID_NUMBER),
    suiteClaimToken: clean(merged.SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN),
    suiteFinderRepClaimApiUrl: clean(
      merged.SPARKLE_SUITE_FINDER_REP_CLAIM_API_URL
        || buildInternalSuiteApiUrl(
          merged.SPARKLE_SUITE_FINDER_API_BASE_URL
            || merged.NEXT_PUBLIC_SPARKLE_SUITE_FINDER_API_BASE_URL
            || defaultSuiteBaseUrl,
        ),
    ),
    suiteServiceRoleKey: clean(merged.SPARKLE_SUITE_SERVICE_ROLE_KEY),
    suiteSupabaseUrl: clean(merged.SPARKLE_SUITE_SUPABASE_URL),
    telemetryTimeoutMs: parsePositiveInteger(merged.SPARKLE_FINDER_LINKED_SMOKE_TELEMETRY_TIMEOUT_MS, 20_000),
  };
}

export function getMissingFinderLinkedRuntimeSmokeConfig(
  config: FinderLinkedRuntimeSmokeConfig,
): string[] {
  const missing: string[] = [];

  if (!config.finderSupabaseUrl) {
    missing.push("SPARKLE_FINDER_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!config.finderServiceRoleKey) {
    missing.push("SPARKLE_FINDER_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!config.secretRepIdNumber) {
    if (!config.suiteSupabaseUrl) {
      missing.push("SPARKLE_SUITE_SUPABASE_URL or SPARKLE_FINDER_LINKED_SMOKE_SECRET_REP_ID_NUMBER");
    }

    if (!config.suiteServiceRoleKey) {
      missing.push("SPARKLE_SUITE_SERVICE_ROLE_KEY or SPARKLE_FINDER_LINKED_SMOKE_SECRET_REP_ID_NUMBER");
    }

    if (!config.suiteClaimToken) {
      missing.push("SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN or SPARKLE_FINDER_LINKED_SMOKE_SECRET_REP_ID_NUMBER");
    }

    if (!config.suiteFinderRepClaimApiUrl) {
      missing.push("SPARKLE_SUITE_FINDER_REP_CLAIM_API_URL");
    }
  }

  return missing;
}

async function main() {
  const config = parseFinderLinkedRuntimeSmokeConfig(process.env);
  const missing = getMissingFinderLinkedRuntimeSmokeConfig(config);

  if (missing.length > 0) {
    throw new Error(`Missing Finder linked runtime smoke config: ${missing.join(", ")}`);
  }

  const finderAdmin = createClient(config.finderSupabaseUrl!, config.finderServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const candidate = await resolveSecretRepClaimCandidate(config);
  const smokeUser = await createSmokeUser(finderAdmin);
  let shouldCleanup = true;

  try {
    await runBrowserClaimSmoke(config, smokeUser, candidate);
    await verifyRepClaimRows(finderAdmin, smokeUser.userId, candidate);

    if (config.runNicNac) {
      await waitForNicNacTelemetryRun(finderAdmin, smokeUser.userId, config.telemetryTimeoutMs);
    }

    console.log("Finder linked runtime smoke passed.");
    console.log(`BASE_URL=${config.baseUrl}`);
    console.log(`FINDER_USER_ID=${smokeUser.userId}`);
    console.log(`SUITE_REP_ID=${candidate.suiteRepId ?? "provided"}`);
    console.log(`BUSINESS_NAME=${candidate.businessName ?? "provided"}`);
  } catch (error) {
    shouldCleanup = !config.keepUserOnFailure;

    if (config.keepUserOnFailure) {
      console.error(`Keeping smoke user for debugging: ${smokeUser.userId}`);
    }

    throw error;
  } finally {
    if (shouldCleanup) {
      await cleanupSmokeUser(finderAdmin, smokeUser.userId);
    }
  }
}

async function resolveSecretRepClaimCandidate(
  config: FinderLinkedRuntimeSmokeConfig,
): Promise<SecretRepClaimCandidate> {
  if (config.secretRepIdNumber) {
    return {
      secretRepIdNumber: config.secretRepIdNumber,
    };
  }

  const suiteAdmin = createClient(config.suiteSupabaseUrl!, config.suiteServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await suiteAdmin
    .from("live_lineup_connection_codes")
    .select("rep_id, sync_code")
    .not("sync_code", "is", null)
    .limit(50);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as Array<{ rep_id?: string | null; sync_code?: string | null }>) {
    const secretRepIdNumber = clean(row.sync_code);

    if (!secretRepIdNumber) {
      continue;
    }

    const response = await fetch(config.suiteFinderRepClaimApiUrl!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.suiteClaimToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        finderUserId: "finder-linked-runtime-smoke-precheck",
        secretRepIdNumber,
        sourceProduct: "sparkle_finder",
      }),
      cache: "no-store",
    });
    const responseBody = await safeJson(response);

    if (response.ok && responseBody?.ok === true) {
      return {
        businessName: readString(responseBody.businessName),
        publicSiteSlug: readString(responseBody.publicSiteSlug),
        secretRepIdNumber,
        suiteRepId: readString(responseBody.suiteRepId) || row.rep_id,
      };
    }
  }

  throw new Error("Could not find a Suite rep whose Secret Rep ID is eligible for Finder claiming.");
}

async function createSmokeUser(finderAdmin: SupabaseClient): Promise<FinderSmokeUser> {
  const password = `FinderSmoke!${randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const email = `finder-smoke+${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const { data, error } = await finderAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      smoke: "finder-linked-runtime",
    },
  });

  if (error || !data.user?.id) {
    throw error ?? new Error("Supabase did not return a smoke user id.");
  }

  return {
    email,
    password,
    userId: data.user.id,
  };
}

async function runBrowserClaimSmoke(
  config: FinderLinkedRuntimeSmokeConfig,
  smokeUser: FinderSmokeUser,
  candidate: SecretRepClaimCandidate,
) {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${config.baseUrl}/auth/sign-in?next=/account`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(smokeUser.email);
    await page.getByLabel("Password").fill(smokeUser.password);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/account/, { timeout: 30_000 });

    await page.getByLabel("Secret Rep ID Number").fill(candidate.secretRepIdNumber);
    await page.getByRole("button", { name: "Claim BP Rep badge" }).click();
    await page.waitForURL(/message=rep_claimed/, { timeout: 30_000 });
    await page.getByText("Rep badge linked").waitFor({ timeout: 30_000 });

    if (config.runNicNac) {
      const response = await context.request.post(`${config.baseUrl}/api/finder/nic-nac`, {
        data: buildFinderNicNacSmokeBody(config.nicNacPrompt),
        headers: {
          "content-type": "application/json",
        },
      });
      const responseBody = await response.text();
      const result = await evaluateFinderNicNacSmokeResponse(
        new Response(responseBody, { status: response.status() }),
        { expectModelConfigured: true },
      );

      if (!result.ok) {
        throw new Error(result.detail);
      }

      console.log(`Finder linked Nic-Nac smoke ${result.status}: ${result.detail}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

async function verifyRepClaimRows(
  finderAdmin: SupabaseClient,
  userId: string,
  candidate: SecretRepClaimCandidate,
) {
  const profileResult = await finderAdmin
    .from("sparkle_finder_profiles")
    .select("is_rep, sparkle_suite_rep_id, sparkle_suite_rep_business_name, sparkle_suite_rep_public_site_slug, sparkle_suite_rep_claimed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profile = profileResult.data as {
    is_rep?: boolean | null;
    sparkle_suite_rep_business_name?: string | null;
    sparkle_suite_rep_claimed_at?: string | null;
    sparkle_suite_rep_id?: string | null;
    sparkle_suite_rep_public_site_slug?: string | null;
  } | null;

  if (!profile?.is_rep || !profile.sparkle_suite_rep_id || !profile.sparkle_suite_rep_claimed_at) {
    throw new Error("Finder profile did not persist the linked rep claim.");
  }

  if (candidate.suiteRepId && profile.sparkle_suite_rep_id !== candidate.suiteRepId) {
    throw new Error("Finder profile linked to a different Suite rep than the smoke candidate.");
  }

  const membershipResult = await finderAdmin
    .from("sparkle_finder_memberships")
    .select("access_state, silver_source")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const membership = membershipResult.data as { access_state?: string | null; silver_source?: string | null } | null;

  if (membership?.access_state !== "silver_rep_included" || membership.silver_source !== "sparkle_suite_rep") {
    throw new Error("Finder membership did not persist Rep Silver access.");
  }
}

async function waitForNicNacTelemetryRun(
  finderAdmin: SupabaseClient,
  userId: string,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const { data, error } = await finderAdmin
        .from("sparkle_finder_nic_nac_runs")
        .select("id, status, outcome, model_provider, model_name, model_policy_key, total_tokens")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const run = (data ?? [])[0] as {
        id?: string;
        model_name?: string | null;
        model_policy_key?: string | null;
        model_provider?: string | null;
        outcome?: string | null;
        status?: string | null;
        total_tokens?: number | null;
      } | undefined;

      if (run?.status === "completed" && run.model_provider === "openai" && run.model_policy_key === "human_default") {
        return run;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(750);
  }

  throw new Error(`Timed out waiting for Finder Nic-Nac telemetry run: ${String(lastError ?? "no run found")}`);
}

async function cleanupSmokeUser(finderAdmin: SupabaseClient, userId: string) {
  await bestEffortDelete(finderAdmin, "sparkle_finder_nic_nac_conversations", userId);
  await bestEffortDelete(finderAdmin, "sparkle_finder_memberships", userId);
  await bestEffortDelete(finderAdmin, "sparkle_finder_communication_consents", userId);
  await bestEffortDelete(finderAdmin, "sparkle_finder_profiles", userId);

  try {
    await finderAdmin.auth.admin.deleteUser(userId);
  } catch {
    // Cleanup should not mask the smoke result.
  }
}

async function bestEffortDelete(finderAdmin: SupabaseClient, table: string, userId: string) {
  try {
    await finderAdmin.from(table).delete().eq("user_id", userId);
  } catch {
    // Cleanup should not mask the smoke result.
  }
}

function parseEnvFile(filePath: string | undefined): EnvRecord {
  const path = clean(filePath);

  if (!path) {
    return {};
  }

  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");

          if (index <= 0) {
            return ["", ""];
          }

          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");

          return [key, value];
        })
        .filter(([key]) => Boolean(key)),
    );
  } catch {
    return {};
  }
}

function buildInternalSuiteApiUrl(baseUrl: string | undefined) {
  try {
    return new URL("/api/internal/finder/rep-claim", cleanUrl(baseUrl || defaultSuiteBaseUrl)).toString();
  } catch {
    return "";
  }
}

function cleanUrl(value: string) {
  return clean(value).replace(/\/+$/, "");
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value = await response.json();

    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
