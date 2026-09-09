import { z } from "zod";
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  digestLocInput,
  LocPreconditionError,
  verifyLocSignature,
} from "@/lib/loc-control-center/security";
import { locOperationCatalog } from "@/lib/loc-control-center/catalog";

const mock = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  calls: 0,
  fail: false,
  precondition: false,
  active: true,
  queryCalls: 0,
}));
vi.mock("@/lib/loc-control-center/read-models", () => ({
  readLocOperation: vi.fn(async () => ({ items: [{ id: "safe-reviewer" }] })),
}));
vi.mock("@/lib/loc-control-center/legacy-routes", () => ({
  runExistingLocRoute: vi.fn(async () => {
    if (mock.precondition) throw new LocPreconditionError(409, "Existing support session is open.");
    mock.calls++;
    if (mock.fail) throw new Error("after side effect");
    return { item: { id: "safe-task" } };
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      mock.queryCalls++;
      let action = "select",
        payload: Record<string, unknown> = {},
        filters: Record<string, unknown> = {};
      const execute = () => {
        if (table === "reps")
          return {
            data: {
              id: "00000000-0000-4000-8000-000000000003",
              auth_user_id: "test-auth",
              email: "owner@example.com",
              status: mock.active ? "active" : "inactive",
            },
            error: null,
          };
        if (action === "insert") {
          if (mock.rows.has(String(payload.id)))
            return { error: { code: "23505" } };
          mock.rows.set(String(payload.id), {
            ...payload,
            created_at: new Date().toISOString(),
          });
          return { error: null };
        }
        const row = [...mock.rows.values()].find((value) =>
          Object.entries(filters).every(
            ([key, wanted]) => value[key] === wanted,
          ),
        );
        if (action === "update" && row) Object.assign(row, payload);
        return { data: row ?? null, error: null };
      };
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return builder;
        },
        insert: (value: Record<string, unknown>) => {
          action = "insert";
          payload = value;
          return builder;
        },
        update: (value: Record<string, unknown>) => {
          action = "update";
          payload = value;
          return builder;
        },
        maybeSingle: async () => execute(),
        single: async () => execute(),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(execute()).then(resolve),
      };
      return builder;
    },
  }),
}));
import { dispatchLocRequest } from "@/lib/loc-control-center/dispatcher";
const owner = "00000000-0000-4000-8000-000000000001",
  opId = "00000000-0000-4000-8000-000000000002",
  secret = "s".repeat(48);
function request(
  body: Record<string, unknown>,
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  const raw = JSON.stringify({
    ownerId: owner,
    operation: "tasks.create",
    operationId: opId,
    input: {
      product: "suite",
      title: "Safe reviewer task",
      itemType: "operations",
    },
    ...body,
  });
  return new Request("https://example.com/api/internal/loc-control-center", {
    method: "POST",
    body: raw,
    headers: {
      "x-loc-timestamp": timestamp,
      "x-loc-signature": createHmac("sha256", secret)
        .update(`${timestamp}.${raw}`)
        .digest("hex"),
    },
  });
}
beforeEach(() => {
  mock.rows.clear();
  mock.calls = 0;
  mock.fail = false;
  mock.precondition = false;
  mock.active = true;
  mock.queryCalls = 0;
  vi.stubEnv("LOC_CONTROL_CENTER_SECRET", secret);
  vi.stubEnv("LOC_CONTROL_CENTER_OWNER_ID", owner);
  vi.stubEnv("LOC_CONTROL_CENTER_OPERATOR_EMAIL", "owner@example.com");
  vi.stubEnv("CONTROL_CENTER_OWNER_EMAILS", "owner@example.com");
  vi.stubEnv("INTERNAL_OPERATOR_EMAILS", "owner@example.com");
  vi.stubEnv("CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS", "");
  vi.stubEnv("CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS", "");
  vi.stubEnv(
    "LOC_CONTROL_CENTER_OPERATIONS",
    "tasks.create,customers.list,receipts.get",
  );
});
describe("LOC signed service boundary", () => {
  it("reports a verified precondition as failed without a business effect", async () => {
    mock.precondition = true;
    const response = await dispatchLocRequest(request({}));
    expect(response.status).toBe(409);
    expect((await response.json()).receipt.status).toBe("failed");
    expect(mock.rows.get(opId)?.status).toBe("failed");
    expect(mock.calls).toBe(0);
  });
  it("requires server-signed owner authority for owner-only actions and discovery", async () => {
    vi.stubEnv("LOC_CONTROL_CENTER_OPERATIONS", "approvals.decide");
    expect(
      (await dispatchLocRequest(request({ operation: "approvals.decide" })))
        .status,
    ).toBe(403);
    const agentCatalog = await dispatchLocRequest(
      request({ operation: "catalog" }),
    );
    expect((await agentCatalog.json()).result.operations).toHaveLength(0);
    const ownerCatalog = await dispatchLocRequest(
      request({ operation: "catalog", authority: "owner" }),
    );
    expect((await ownerCatalog.json()).result.operations).toHaveLength(1);
    expect(
      (
        await dispatchLocRequest(
          request({ operation: "approvals.decide", authority: "owner" }),
        )
      ).status,
    ).toBe(200);
    expect(mock.calls).toBe(1);
  });
  it("binds the entire payload and a short timestamp window", () => {
    const req = request({});
    expect(() => verifyLocSignature("tampered", req.headers, secret)).toThrow();
    expect(() => verifyLocSignature("", new Headers(), secret)).toThrow();
    const old = request({}, String(Math.floor(Date.now() / 1000) - 120));
    expect(() => verifyLocSignature("", old.headers, secret)).toThrow();
  });
  it("uses canonical input digests independent of object key order", () => {
    expect(digestLocInput({ b: 2, a: 1 })).toBe(digestLocInput({ a: 1, b: 2 }));
    expect(digestLocInput({ a: 2 })).not.toBe(digestLocInput({ a: 1 }));
  });
  it("denies unsigned requests before database access", async () => {
    const response = await dispatchLocRequest(
      new Request("https://example.com", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(401);
    expect(mock.queryCalls).toBe(0);
  });
  it("rejects owner swapping and disabled product actions", async () => {
    expect(
      (
        await dispatchLocRequest(
          request({ ownerId: "00000000-0000-4000-8000-000000000004" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await dispatchLocRequest(request({ input: { product: "finder" } })))
        .status,
    ).toBe(403);
    expect(mock.calls).toBe(0);
  });
  it("never allows a caller supplied role or actor to grant access", async () => {
    expect(
      (await dispatchLocRequest(request({ actor: { scope: "owner" } }))).status,
    ).toBe(400);
    vi.stubEnv(
      "CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS",
      "owner@example.com",
    );
    expect((await dispatchLocRequest(request({}))).status).toBe(403);
    expect(mock.calls).toBe(0);
  });
  it("revalidates inactive operator and defaults to read only", async () => {
    mock.active = false;
    expect((await dispatchLocRequest(request({}))).status).toBe(403);
    mock.active = true;
    vi.stubEnv("LOC_CONTROL_CENTER_OPERATIONS", "");
    expect((await dispatchLocRequest(request({}))).status).toBe(403);
    expect(
      (await dispatchLocRequest(request({ operation: "customers.list" })))
        .status,
    ).toBe(200);
  });
  it("records a durable result and replays it without a second business action", async () => {
    expect((await dispatchLocRequest(request({}))).status).toBe(200);
    const response = await dispatchLocRequest(request({}));
    expect(response.status).toBe(200);
    expect(mock.calls).toBe(1);
    expect((await response.json()).receipt.status).toBe("succeeded");
  });
  it("denies reused IDs with a changed target or payload", async () => {
    await dispatchLocRequest(request({}));
    expect(
      (
        await dispatchLocRequest(
          request({ input: { product: "suite", title: "Changed" } }),
        )
      ).status,
    ).toBe(409);
    expect(mock.calls).toBe(1);
  });
  it("retains uncertain writes and exposes reconciliation without repeating them", async () => {
    mock.fail = true;
    expect((await dispatchLocRequest(request({}))).status).toBe(502);
    expect(mock.rows.get(opId)?.status).toBe("uncertain");
    mock.fail = false;
    expect((await dispatchLocRequest(request({}))).status).toBe(409);
    const result = await dispatchLocRequest(
      request({
        operation: "receipts.get",
        input: { product: "suite", operationId: opId },
      }),
    );
    expect((await result.json()).receipt.status).toBe("uncertain");
    expect(mock.calls).toBe(1);
  });
  it("isolates receipt history by connection and product", async () => {
    await dispatchLocRequest(request({}));
    expect(
      (
        await dispatchLocRequest(
          request({
            operation: "receipts.get",
            connectionId: "another",
            input: { product: "suite", operationId: opId },
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await dispatchLocRequest(
          request({
            operation: "receipts.get",
            input: { product: "finder", operationId: opId },
          }),
        )
      ).status,
    ).toBe(404);
  });
  it("accepts clearing optional fields in discovered task and onboarding schemas", () => {
    for (const [name, input] of [
      ["tasks.create", { title: "Review fixture", itemType: "operations", owner: "", details: "", source: "" }],
      ["tasks.update", { id: "fixture", expectedUpdatedAt: "2026-09-09T00:00:00Z", owner: "", details: "" }],
      ["support.promote", { reportId: "fixture", title: "Review fixture", owner: "", notes: "" }],
      ["onboarding.setup-profile", { launchBuildId: "fixture", expectedUpdatedAt: null, businessName: "Fixture", publicSiteGoal: "", brandNotes: "", customDomain: "" }],
    ] as const) {
      const schema = locOperationCatalog.find((row) => row.name === name)!.inputSchema;
      expect(z.fromJSONSchema(schema).safeParse(input).success, name).toBe(true);
    }
    const update = z.fromJSONSchema(locOperationCatalog.find((row) => row.name === "tasks.update")!.inputSchema);
    expect(update.safeParse({ id: "fixture", expectedUpdatedAt: "2026-09-09T00:00:00Z", owner: "x".repeat(161) }).success).toBe(false);
  });
  it("requires the real ready-waitlist target for launch drafts while allowing its linked intake target", () => {
    const operation = locOperationCatalog.find((row) => row.name === "onboarding.launch-build-draft")!;
    const schema = z.fromJSONSchema(operation.inputSchema);
    expect(operation.targetKeys).toEqual(["waitlistId", "intakeSubmissionId"]);
    expect(schema.safeParse({ product: "suite", waitlistId: "ready-waitlist" }).success).toBe(true);
    expect(schema.safeParse({ product: "suite", waitlistId: "ready-waitlist", intakeSubmissionId: "linked-intake" }).success).toBe(true);
    expect(schema.safeParse({ product: "suite", intakeSubmissionId: "intake-only" }).success).toBe(false);
    expect(schema.safeParse({ product: "suite", waitlistId: "" }).success).toBe(false);
  });
  it("has unique named operations and no arbitrary relay or financial mutation", () => {
    expect(new Set(locOperationCatalog.map((row) => row.name)).size).toBe(
      locOperationCatalog.length,
    );
    expect(
      locOperationCatalog
        .filter((row) => row.area === "accounting")
        .every((row) => row.effect === "read"),
    ).toBe(true);
    expect(
      locOperationCatalog.some((row) =>
        /proxy|sql|fetch_url|support.sessions.create/.test(row.name),
      ),
    ).toBe(false);
  });
});
