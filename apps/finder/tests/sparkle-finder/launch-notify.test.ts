import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finderLaunchNotifySource,
  finderLaunchNotifyTable,
  parseFinderLaunchNotifyBody,
  type FinderLaunchNotifyRow,
} from "../../lib/sparkle-finder/launch-notify";

const createClientMock = vi.fn();

vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: () => createClientMock(),
}));

import { POST } from "../../app/api/finder/launch-notify/route";

const routeSource = readFileSync("app/api/finder/launch-notify/route.ts", "utf8");
const migrationSource = readFileSync(
  "supabase/migrations/20261003124500_sparkle_finder_launch_notify.sql",
  "utf8",
);

const validBody = {
  first_name: "  Ada ",
  last_name: "Lovelace",
  email: "Ada@Example.com",
  phone: "(555) 123-4567",
  address: " 1 Sparkle Lane ",
  birthday_month: 10,
  birthday_day: 31,
  favorite_gem_or_stone: "Moonstone",
  favorite_material: "Sterling",
  favorite_cut: "Round",
  favorite_collection: "Classic",
  notes: "Launch list",
  tags: [" collector ", "silver"],
  marketing_consent: true,
  source: "client_should_be_ignored",
  rep_id: "do-not-store",
  customer_audience: "do-not-store",
};

function request(body: unknown, raw = false) {
  return new Request("https://finder.test/api/finder/launch-notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

describe("parseFinderLaunchNotifyBody", () => {
  it("keeps one normalized row and forces the Finder source", () => {
    const parsed = parseFinderLaunchNotifyBody(validBody);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.row).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "(555) 123-4567",
      notify_email: true,
      notify_sms: true,
      address: "1 Sparkle Lane",
      birthday_month: 10,
      birthday_day: 31,
      favorite_gem_or_stone: "Moonstone",
      favorite_material: "Sterling",
      favorite_cut: "Round",
      favorite_collection: "Classic",
      notes: "Launch list",
      tags: ["collector", "silver"],
      marketing_consent: true,
      source: finderLaunchNotifySource,
    });
    expect(parsed.row).not.toHaveProperty("rep_id");
    expect(parsed.row).not.toHaveProperty("customer_audience");
  });

  it("infers a channel from whichever contact is present", () => {
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" })).toMatchObject({
      ok: true,
      row: { notify_email: true, notify_sms: false, email: "ada@example.com", phone: null, marketing_consent: false, tags: [] },
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", phone: "5551234567" })).toMatchObject({
      ok: true,
      row: { notify_email: false, notify_sms: true, email: null, phone: "5551234567" },
    });
  });

  it("rejects a chosen channel that has no value and does not infer a flag that was turned off", () => {
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", notify_email: true })).toEqual({
      ok: false,
      error: "missing_email",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", notify_sms: true, email: "ada@example.com" })).toEqual({
      ok: false,
      error: "missing_phone",
    });
    expect(parseFinderLaunchNotifyBody({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "5551234567",
      notify_email: false,
      notify_sms: false,
    })).toEqual({ ok: false, error: "missing_channel" });
    expect(parseFinderLaunchNotifyBody({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "not-a-channel",
      phone: "5551234567",
      notify_email: false,
    })).toMatchObject({
      ok: true,
      row: { notify_email: false, notify_sms: true, email: null, phone: "5551234567" },
    });
  });

  it("rejects empty names, bad contacts, and out-of-range optional fields", () => {
    expect(parseFinderLaunchNotifyBody({ first_name: " ", last_name: "Lovelace", email: "ada@example.com" })).toEqual({
      ok: false,
      error: "missing_first_name",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: " ", phone: "5551234567" })).toEqual({
      ok: false,
      error: "missing_last_name",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace" })).toEqual({
      ok: false,
      error: "missing_channel",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada" })).toEqual({
      ok: false,
      error: "invalid_email",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", phone: "call me" })).toEqual({
      ok: false,
      error: "invalid_phone",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", birthday_month: 13 })).toEqual({
      ok: false,
      error: "invalid_birthday_month",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", birthday_day: 0 })).toEqual({
      ok: false,
      error: "invalid_birthday_day",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", tags: "silver" })).toEqual({
      ok: false,
      error: "invalid_tags",
    });
    expect(parseFinderLaunchNotifyBody({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", marketing_consent: "yes" })).toEqual({
      ok: false,
      error: "invalid_marketing_consent",
    });
    expect(parseFinderLaunchNotifyBody([])).toEqual({ ok: false, error: "invalid_body" });
  });
});

describe("POST /api/finder/launch-notify", () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it("inserts exactly one row and returns only ok", async () => {
    const insert = vi.fn().mockResolvedValue({
      data: [{ id: "secret-row", email: "ada@example.com" }],
      error: null,
    });
    const from = vi.fn(() => ({ insert }));
    createClientMock.mockReturnValue({ from });

    const response = await POST(request(validBody));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload).toEqual({ ok: true });
    expect(Object.keys(payload)).toEqual(["ok"]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith(finderLaunchNotifyTable);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0] as FinderLaunchNotifyRow;
    expect(Array.isArray(row)).toBe(false);
    expect(row.source).toBe(finderLaunchNotifySource);
    expect(row.email).toBe("ada@example.com");
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("rep_id");
    expect(JSON.stringify(payload)).not.toContain("secret-row");
    expect(JSON.stringify(payload)).not.toContain("ada@example.com");
  });

  it("returns a short validation code and does not insert", async () => {
    const response = await POST(request({ first_name: "Ada" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing_last_name" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(request("{", true));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_json" });
  });

  it("fails closed when the service role client is not configured", async () => {
    createClientMock.mockReturnValue(null);
    const response = await POST(request(validBody));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "service_role_not_configured" });
  });

  it("hides database errors", async () => {
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "duplicate ada@example.com secret detail" },
    });
    createClientMock.mockReturnValue({ from: () => ({ insert }) });

    const response = await POST(request(validBody));
    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "launch_notify_insert_failed" });
    expect(JSON.stringify(payload)).not.toContain("ada@example.com");
  });

  it("stays a service-role insert with no welcome email or audience write", () => {
    expect(routeSource).toContain("createSupabaseServiceRoleClient");
    expect(routeSource).toContain(finderLaunchNotifyTable);
    expect(routeSource).not.toContain("customer_audience");
    expect(routeSource).not.toContain("rep_id");
    expect(routeSource).not.toMatch(/welcome|resend|sendEmail|nodemailer/i);
  });
});

describe("launch notify migration", () => {
  it("creates the smoke columns, checks, and a closed read policy", () => {
    const normalized = migrationSource.toLowerCase();
    expect(normalized).toContain("create table if not exists public.sparkle_finder_launch_notify");
    for (const column of [
      "id",
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
    ]) {
      expect(normalized).toContain(column);
    }
    expect(normalized).toContain("enable row level security");
    expect(normalized).toContain("revoke all on table public.sparkle_finder_launch_notify from anon");
    expect(normalized).toContain("revoke all on table public.sparkle_finder_launch_notify from authenticated");
    expect(normalized).toContain("grant select, insert on table public.sparkle_finder_launch_notify to service_role");
    expect(normalized).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]*\bto\s+(anon|authenticated|public)\b/);
    expect(normalized).not.toMatch(/create policy/);
    expect(normalized).not.toContain("customer_audience");
    expect(normalized).not.toContain("rep_id");
    expect(normalized).toContain("source = 'finder_learn_notify'");
  });
});
