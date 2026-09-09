import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  mapping: null as Record<string, unknown> | null,
  failSave: false,
  ended: 0,
  started: 0,
  openSessions: [] as unknown[],
  requests: [] as Request[],
  connection: "owner-connection",
}));
const sessionId = "00000000-0000-4000-8000-000000000010",
  targetId = "00000000-0000-4000-8000-000000000020";
vi.mock("@/lib/loc-control-center/context", () => ({
  getLocOperatorContext: () => ({
    ownerId: "owner",
    connectionId: mock.connection,
    operator: { repId: "operator" },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      let mode = "select",
        body: Record<string, unknown> = {},
        matches = true;
      const execute = () => {
        if (mode === "insert") {
          if (mock.failSave)
            return { error: { message: "storage unavailable" } };
          mock.mapping = body;
          return { error: null };
        }
        if (mode === "update" && mock.mapping)
          Object.assign(mock.mapping, body);
        return { data: matches ? mock.mapping : null, error: null };
      };
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          if (mock.mapping && mock.mapping[key] !== value) matches = false;
          return query;
        },
        limit: async () => ({ data: [], error: null }),
        insert: (value: Record<string, unknown>) => {
          mode = "insert";
          body = value;
          return query;
        },
        update: (value: Record<string, unknown>) => {
          mode = "update";
          body = value;
          return query;
        },
        maybeSingle: async () => execute(),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(execute()).then(resolve),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/operator-support/session-service", () => ({
  listOperatorSupportSessions: async () => mock.openSessions,
  getOperatorSupportSession: async () => ({
    id: "00000000-0000-4000-8000-000000000010",
    targetRepId: "00000000-0000-4000-8000-000000000020",
    operatorRepId: "operator",
    targetNameSnapshot: "Safe reviewer",
    status: "active",
    capabilities: ["workspace.view", "site.manage"],
    expiresAt: "2099-01-01T00:00:00Z",
  }),
}));
vi.mock("@/app/api/control-center/support-sessions/route", () => ({
  POST: async (request: Request) => {
    mock.started++;
    mock.requests.push(request);
    const response = NextResponse.json({
      session: {
        id: "00000000-0000-4000-8000-000000000010",
        targetRepId: "00000000-0000-4000-8000-000000000020",
        status: "active",
      },
    });
    response.cookies.set(
      "sparkle_support_csrf_00000000-0000-4000-8000-000000000010",
      "protected-csrf",
    );
    return response;
  },
}));
vi.mock(
  "@/app/api/control-center/support-sessions/[sessionId]/end/route",
  () => ({
    POST: async (request: Request) => {
      mock.ended++;
      mock.requests.push(request);
      return Response.json({
        session: {
          id: "00000000-0000-4000-8000-000000000010",
          status: "ended",
        },
        warning: null,
      });
    },
  }),
);
vi.mock(
  "@/app/api/control-center/support-sessions/[sessionId]/gateway/route",
  () => ({
    GET: async (request: Request) => {
      mock.requests.push(request);
      return Response.json({ settings: { displayName: "Safe reviewer" } });
    },
    POST: async (request: Request) => {
      mock.requests.push(request);
      return Response.json({ ok: true });
    },
  }),
);
import { runLocSupportOperation } from "@/lib/loc-control-center/support";
beforeEach(() => {
  mock.mapping = null;
  mock.failSave = false;
  mock.started = 0;
  mock.openSessions = [];
  mock.ended = 0;
  mock.requests = [];
  mock.connection = "owner-connection";
  vi.stubEnv("LOC_CONTROL_CENTER_SECRET", "test-support-key".repeat(4));
});
const start = () =>
  runLocSupportOperation(
    "support.session.start",
    { product: "suite", targetRepId: targetId, reasonCode: "troubleshooting" },
    "00000000-0000-4000-8000-000000000030",
  );
describe("LOC native transparent support adapter", () => {
  it("rejects an existing session before notices or activation", async () => {
    mock.openSessions = [{ id: "existing-session" }];
    await expect(start()).rejects.toMatchObject({ status: 409, message: expect.stringContaining("existing support session") });
    expect(mock.started).toBe(0);
    expect(mock.ended).toBe(0);
    expect(mock.mapping).toBeNull();
  });
  it("uses original notice/activation and stores only encrypted credentials", async () => {
    const output = await start();
    expect(mock.started).toBe(1);
    expect(mock.mapping?.target_rep_id).toBe(targetId);
    expect(JSON.stringify(mock.mapping)).not.toContain("protected-csrf");
    expect(JSON.stringify(output)).not.toContain("protected-csrf");
  });
  it("routes named views through the original gateway with fixed target and protected header", async () => {
    await start();
    await runLocSupportOperation("support.workspace.site-settings", {
      product: "suite",
      sessionId,
    });
    const req = mock.requests.at(-1)!;
    expect(new URL(req.url).searchParams.get("path")).toBe(
      "/api/nic-nac/site-settings",
    );
    expect(req.headers.get("x-sparkle-support-csrf")).toBe("protected-csrf");
    expect(req.headers.get("origin")).toBe("https://www.yoursparklesuite.com");
  });
  it("denies connection swaps and caller-supplied paths", async () => {
    await start();
    mock.connection = "different";
    await expect(
      runLocSupportOperation("support.session.inspect", { sessionId }),
    ).rejects.toThrow("not assigned");
    mock.connection = "owner-connection";
    await expect(
      runLocSupportOperation("support.workspace.site-settings", {
        sessionId,
        query: { path: "/api/account/billing" },
      }),
    ).rejects.toThrow("fixed by the session");
  });
  it("uses original end/notice service and records the outcome", async () => {
    await start();
    await runLocSupportOperation("support.session.end", {
      sessionId,
      completionSummary: "Verified without changes.",
    });
    expect(mock.ended).toBe(1);
    expect(mock.mapping?.ended_at).toBeTruthy();
    expect(mock.requests.at(-1)?.headers.get("x-sparkle-support-csrf")).toBe(
      "protected-csrf",
    );
  });
  it("attempts to close an activated session if protected storage fails", async () => {
    mock.failSave = true;
    await expect(start()).rejects.toThrow("could not preserve");
    expect(mock.started).toBe(1);
    expect(mock.ended).toBe(1);
  });
});
