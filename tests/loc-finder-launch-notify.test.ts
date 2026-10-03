import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { locOperationCatalog } from "@/lib/loc-control-center/catalog";
import { LocBridgeError } from "@/lib/loc-control-center/security";
import {
  launchNotifySearch,
  liveFinderProjectRef,
  readFinderLaunchNotifyList,
  resolveLiveFinderDatabase,
} from "@/lib/loc-control-center/finder-launch-notify";

const suiteFrom = vi.hoisted(() => vi.fn());
const createdUrls = vi.hoisted(() => [] as string[]);
const finderState = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: suiteFrom }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string) => {
    createdUrls.push(String(url));
    return finderState.client;
  },
}));

const liveUrl = `https://${liveFinderProjectRef}.supabase.co`;
const smokeRef = "awdwtxcqkqrzgdikrwab";

function serviceJwt(ref: string, role = "service_role") {
  const payload = Buffer.from(JSON.stringify({ ref, role })).toString("base64url");
  return `e30.${payload}.sig`;
}

function envFor(url: string, key = serviceJwt(liveFinderProjectRef)) {
  return {
    SPARKLE_FINDER_SUPABASE_URL: url,
    SPARKLE_FINDER_SERVICE_ROLE_KEY: key,
  };
}

function listClient(rows: Record<string, unknown>[]) {
  const calls: string[] = [];
  const builder = {
    select(value: string) {
      calls.push(`select:${value}`);
      return builder;
    },
    or(value: string) {
      calls.push(`or:${value}`);
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push(`order:${column}:${options.ascending}`);
      return builder;
    },
    async range(from: number, to: number) {
      calls.push(`range:${from}:${to}`);
      return { data: rows.slice(from, to + 1), error: null };
    },
  };
  return {
    calls,
    client: {
      from(table: string) {
        calls.push(`from:${table}`);
        if (table !== "sparkle_finder_launch_notify")
          throw new Error(`unexpected table ${table}`);
        return builder;
      },
    },
  };
}

describe("finder.launchNotify.list", () => {
  beforeEach(() => {
    suiteFrom.mockReset();
    createdUrls.length = 0;
    finderState.client = null;
    vi.unstubAllEnvs();
  });

  it("is a Finder-only read with paging and a text query", () => {
    const operation = locOperationCatalog.find(
      (row) => row.name === "finder.launchNotify.list",
    );
    expect(operation).toMatchObject({
      products: ["finder"],
      effect: "read",
      targetKeys: [],
    });
    const properties = (
      operation?.inputSchema as { properties: Record<string, unknown> }
    ).properties;
    expect(properties).toMatchObject({
      product: { enum: ["suite", "finder"] },
      offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      query: { type: "string", maxLength: 240 },
    });
  });

  it("keeps the launch-notify table private and free of audience or rep columns", () => {
    const sql = readFileSync(
      "apps/finder/supabase/migrations/20261003124500_sparkle_finder_launch_notify.sql",
      "utf8",
    );
    expect(sql).toContain(
      "alter table public.sparkle_finder_launch_notify enable row level security",
    );
    expect(sql).toContain(
      "revoke all on table public.sparkle_finder_launch_notify from anon",
    );
    expect(sql).toContain("check (notify_email or notify_sms)");
    expect(sql).toContain("check (source = 'finder_learn_notify')");
    expect(sql).not.toMatch(/rep_id|customer_audience|create policy/i);
    expect(sql).not.toContain(smokeRef);
  });

  it("accepts only the live Finder database env", () => {
    const key = serviceJwt(liveFinderProjectRef);
    expect(resolveLiveFinderDatabase(envFor(liveUrl, key))).toEqual({
      url: liveUrl,
      serviceRoleKey: key,
    });
    for (const env of [
      {},
      envFor(`https://${smokeRef}.supabase.co`),
      envFor("https://bqhzfkgkjyuhlsozpylf.supabase.co"),
      envFor(liveUrl, serviceJwt(smokeRef)),
      envFor(liveUrl, serviceJwt(liveFinderProjectRef, "anon")),
      envFor(liveUrl, "not-a-jwt"),
      {
        NEXT_PUBLIC_SUPABASE_URL: liveUrl,
        SUPABASE_SERVICE_ROLE_KEY: key,
      },
    ]) {
      expect(() => resolveLiveFinderDatabase(env)).toThrow(LocBridgeError);
    }
  });

  it("pages a text query and returns only the public signup fields", async () => {
    const popup = signup("john.doe.popup.test@neonrabbit.net", "2026-10-03T12:57:38Z");
    const earlier = signup("john.doe.notify.test@neonrabbit.net", "2026-10-03T12:49:15Z");
    const { client, calls } = listClient([
      { ...popup, id: "newer", service_role_key: "secret" },
      { ...earlier, id: "older" },
      signup("other@example.com", "2026-10-03T12:00:00Z"),
    ]);
    const result = await readFinderLaunchNotifyList(
      { product: "finder", query: "john.doe.popup.test@neonrabbit.net" },
      { limit: 1, offset: 0 },
      envFor(liveUrl),
      () => client as never,
    );
    expect(calls[0]).toBe("from:sparkle_finder_launch_notify");
    expect(calls.some((call) => call.startsWith("or:") && call.includes("email.imatch."))).toBe(true);
    expect(launchNotifySearch("john.doe.popup.test@neonrabbit.net")).toContain(
      String.raw`email.imatch."john\.doe\.popup\.test@neonrabbit\.net"`,
    );
    expect(result.nextOffset).toBe(1);
    expect(result.items).toEqual([
      {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe.popup.test@neonrabbit.net",
        phone: null,
        notify_email: true,
        notify_sms: true,
        address: null,
        birthday_month: null,
        birthday_day: null,
        favorite_gem_or_stone: null,
        favorite_material: null,
        favorite_cut: null,
        favorite_collection: null,
        notes: null,
        tags: [],
        marketing_consent: false,
        source: "finder_learn_notify",
        created_at: "2026-10-03T12:57:38Z",
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/secret|service_role|newer/);
  });

  it("serves the live Finder read from the LOC read model", async () => {
    const { readLocOperation } = await import("@/lib/loc-control-center/read-models");
    const key = serviceJwt(liveFinderProjectRef);
    vi.stubEnv("SPARKLE_FINDER_SUPABASE_URL", liveUrl);
    vi.stubEnv("SPARKLE_FINDER_SERVICE_ROLE_KEY", key);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${smokeRef}.supabase.co`);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", serviceJwt(smokeRef));
    const { client } = listClient([
      signup("john.doe.popup.test@neonrabbit.net", "2026-10-03T12:57:38.000Z"),
    ]);
    finderState.client = client;
    const result = await readLocOperation("finder.launchNotify.list", {
      product: "finder",
      query: "john.doe.popup.test@neonrabbit.net",
      limit: 25,
      offset: 0,
    });
    expect(createdUrls).toEqual([liveUrl]);
    expect(suiteFrom).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      nextOffset: null,
      items: [{ email: "john.doe.popup.test@neonrabbit.net", notify_email: true, notify_sms: true }],
    });
  });

  it("reports an unavailable list without reading another database", async () => {
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            order: () => ({
              range: async () => ({
                data: null,
                error: { message: "relation does not exist" },
              }),
            }),
          }),
        }),
      }),
    };
    await expect(
      readFinderLaunchNotifyList(
        { product: "finder" },
        { limit: 50, offset: 0 },
        envFor(liveUrl),
        () => client as never,
      ),
    ).rejects.toThrow("Finder launch-notify list is unavailable.");
    expect(createdUrls).toEqual([]);
    expect(suiteFrom).not.toHaveBeenCalled();
  });
});

function signup(email: string, createdAt: string): Record<string, unknown> {
  return {
    first_name: "John",
    last_name: "Doe",
    email,
    phone: null,
    notify_email: true,
    notify_sms: true,
    address: null,
    birthday_month: null,
    birthday_day: null,
    favorite_gem_or_stone: null,
    favorite_material: null,
    favorite_cut: null,
    favorite_collection: null,
    notes: null,
    tags: [],
    marketing_consent: false,
    source: "finder_learn_notify",
    created_at: createdAt,
  };
}
