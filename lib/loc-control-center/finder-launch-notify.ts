import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LocBridgeError } from "./security";

export const liveFinderProjectRef = "pzksocboqauqjdtsgpdp";
const blockedFinderProjectRefs = ["awdwtxcqkqrzgdikrwab", "bqhzfkgkjyuhlsozpylf"];
const launchNotifyTable = "sparkle_finder_launch_notify";

export const finderLaunchNotifyListFields = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "notify_email",
  "notify_sms",
  "address",
  "birthday_month",
  "birthday_day",
  "favorite_gem_or_stone",
  "favorite_material",
  "favorite_cut",
  "favorite_collection",
  "notes",
  "tags",
  "marketing_consent",
  "source",
  "created_at",
] as const;

const launchNotifySelect =
  "first_name,last_name,email,phone,notify_email,notify_sms,address,birthday_month,birthday_day,favorite_gem_or_stone,favorite_material,favorite_cut,favorite_collection,notes,tags,marketing_consent,source,created_at,id";

const searchFields = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "address",
  "notes",
  "favorite_gem_or_stone",
  "favorite_material",
  "favorite_cut",
  "favorite_collection",
] as const;

type FinderDatabase = SupabaseClient;
type CreateFinderClient = (
  url: string,
  serviceRoleKey: string,
) => FinderDatabase;

export function launchNotifySearch(value: unknown) {
  const term = typeof value === "string" ? value.trim().slice(0, 240) : "";
  if (!term) return null;
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted =
    '"' + pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  return searchFields.map((field) => `${field}.imatch.${quoted}`).join(",");
}

export function resolveLiveFinderDatabase(
  env: Record<string, string | undefined>,
) {
  const url = env.SPARKLE_FINDER_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = env.SPARKLE_FINDER_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceRoleKey)
    throw new LocBridgeError(
      503,
      "Live Finder database read is not configured.",
    );
  let origin: string;
  try {
    const parsed = new URL(url);
    origin = parsed.origin;
    if (parsed.username || parsed.password || parsed.search || parsed.hash)
      throw new Error("credentials");
  } catch {
    throw new LocBridgeError(
      503,
      "Live Finder database read is not configured.",
    );
  }
  const material = `${origin}\n${serviceRoleKey}`;
  if (
    origin !== `https://${liveFinderProjectRef}.supabase.co` ||
    blockedFinderProjectRefs.some((ref) => material.includes(ref))
  )
    throw new LocBridgeError(
      503,
      "Live Finder database read is not configured.",
    );
  const claims = serviceRoleClaims(serviceRoleKey);
  if (
    !claims ||
    claims.ref !== liveFinderProjectRef ||
    claims.role !== "service_role"
  )
    throw new LocBridgeError(
      503,
      "Live Finder database read is not configured.",
    );
  return { url: origin, serviceRoleKey };
}

export async function readFinderLaunchNotifyList(
  input: Record<string, unknown>,
  page: { limit: number; offset: number },
  env: Record<string, string | undefined> = process.env,
  createFinderClient: CreateFinderClient = createLiveFinderClient,
) {
  const target = resolveLiveFinderDatabase(env);
  const client = createFinderClient(target.url, target.serviceRoleKey);
  let query = client.from(launchNotifyTable).select(launchNotifySelect);
  const search = launchNotifySearch(input.query);
  if (search) query = query.or(search);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.offset, page.offset + page.limit);
  if (error)
    throw new LocBridgeError(
      503,
      "Finder launch-notify list is unavailable.",
    );
  const rows = data ?? [];
  return {
    items: rows.slice(0, page.limit).map(presentLaunchNotify),
    nextOffset: rows.length > page.limit ? page.offset + page.limit : null,
  };
}

function createLiveFinderClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function serviceRoleClaims(key: string) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return null;
    return payload as { ref?: unknown; role?: unknown };
  } catch {
    return null;
  }
}

function presentLaunchNotify(row: Record<string, unknown>) {
  return {
    first_name: text(row.first_name),
    last_name: text(row.last_name),
    email: text(row.email),
    phone: text(row.phone),
    notify_email: row.notify_email === true,
    notify_sms: row.notify_sms === true,
    address: text(row.address),
    birthday_month: dayPart(row.birthday_month),
    birthday_day: dayPart(row.birthday_day),
    favorite_gem_or_stone: text(row.favorite_gem_or_stone),
    favorite_material: text(row.favorite_material),
    favorite_cut: text(row.favorite_cut),
    favorite_collection: text(row.favorite_collection),
    notes: text(row.notes),
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    marketing_consent: row.marketing_consent === true,
    source: text(row.source),
    created_at: text(row.created_at),
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function dayPart(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
