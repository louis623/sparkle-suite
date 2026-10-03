import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const liveFinderLaunchNotifyProjectRef = "pzksocboqauqjdtsgpdp";
export const liveFinderLaunchNotifyHost = "pzksocboqauqjdtsgpdp.supabase.co";

type LiveFinderLaunchNotifyTarget = {
  url: string;
  serviceRoleKey: string;
};

export function resolveLiveFinderLaunchNotifyTarget(
  env: Record<string, string | undefined>,
): LiveFinderLaunchNotifyTarget | null {
  const supabaseUrl = env.SPARKLE_FINDER_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = env.SPARKLE_FINDER_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(supabaseUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || parsed.host !== liveFinderLaunchNotifyHost) {
    return null;
  }

  if (serviceRoleProjectRef(serviceRoleKey) !== liveFinderLaunchNotifyProjectRef) {
    return null;
  }

  return {
    url: parsed.origin,
    serviceRoleKey,
  };
}

export function createLiveFinderLaunchNotifyClient(
  env: Record<string, string | undefined> = process.env,
): SupabaseClient | null {
  const target = resolveLiveFinderLaunchNotifyTarget(env);
  if (!target) {
    return null;
  }

  return createClient(target.url, target.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function serviceRoleProjectRef(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    const claims = payload as { ref?: unknown; role?: unknown };
    if (claims.role !== "service_role" || typeof claims.ref !== "string" || claims.ref.trim() !== claims.ref) {
      return null;
    }

    return claims.ref;
  } catch {
    return null;
  }
}
