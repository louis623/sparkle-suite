import { createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { digestLocInput } from "@/lib/loc-control-center/security";
import {
  LOC_NAMED_AGENT_EMAIL_SCOPE,
  LOC_NAMED_AGENT_PUBLISH_SCOPE,
  locNamedAgentGrantSchema,
  verifyLocNamedAgentGrant,
} from "@/lib/loc-control-center/job-delegation";

const mock = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  calls: 0,
  queryCalls: 0,
  lastInput: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/loc-control-center/read-models", () => ({
  readLocOperation: vi.fn(async () => ({ items: [] })),
}));
vi.mock("@/lib/loc-control-center/legacy-routes", () => ({
  runExistingLocRoute: vi.fn(async (_name: string, input: Record<string, unknown>) => {
    mock.calls += 1;
    mock.lastInput = input;
    return { ok: true, resource: { id: "resource-1" } };
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      mock.queryCalls += 1;
      let action = "select";
      let payload: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const execute = () => {
        if (table === "reps") {
          return {
            data: {
              id: "00000000-0000-4000-8000-000000000003",
              auth_user_id: "test-auth",
              email: "owner@example.com",
              status: "active",
            },
            error: null,
          };
        }
        if (action === "insert") {
          if (mock.rows.has(String(payload.id))) return { error: { code: "23505" } };
          mock.rows.set(String(payload.id), {
            ...payload,
            created_at: new Date().toISOString(),
          });
          return { error: null };
        }
        const row = [...mock.rows.values()].find((value) =>
          Object.entries(filters).every(([key, wanted]) => value[key] === wanted),
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
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute()).then(resolve),
      };
      return builder;
    },
  }),
}));

import { dispatchLocRequest } from "@/lib/loc-control-center/dispatcher";

const owner = "00000000-0000-4000-8000-000000000001";
const opId = "00000000-0000-4000-8000-000000000002";
const agentId = "00000000-0000-4000-8000-000000000021";
const otherAgentId = "00000000-0000-4000-8000-000000000022";
const grantId = "00000000-0000-4000-8000-000000000023";
const connectionId = "00000000-0000-4000-8000-000000000024";
const secret = "s".repeat(48);
const now = Date.parse("2026-10-21T00:00:00.000Z");

function locGrant(overrides: Record<string, unknown> = {}) {
  return {
    mode: "named-agent" as const,
    agentId,
    agentName: "Suite",
    operation: LOC_NAMED_AGENT_PUBLISH_SCOPE,
    ...overrides,
  };
}

function publishEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    authority: "agent" as const,
    operation: "resources.publish",
    operationId: opId,
    connectionId,
    intendedAssignee: "Suite",
    input: { product: "suite", title: "Walkthrough", emailSuiteList: false },
    namedAgentGrant: locGrant(),
    ...overrides,
  };
}

function signed(body: Record<string, unknown>, timestamp = String(Math.floor(Date.now() / 1000))) {
  const raw = JSON.stringify({ ownerId: owner, ...body });
  return new Request("https://www.yoursparklesuite.com/api/internal/loc-control-center", {
    method: "POST",
    body: raw,
    headers: {
      "x-loc-timestamp": timestamp,
      "x-loc-signature": createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex"),
    },
  });
}

beforeEach(() => {
  mock.rows.clear();
  mock.calls = 0;
  mock.queryCalls = 0;
  mock.lastInput = null;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.mocked(console.info).mockClear();
  vi.stubEnv("LOC_CONTROL_CENTER_SECRET", secret);
  vi.stubEnv("LOC_CONTROL_CENTER_OWNER_ID", owner);
  vi.stubEnv("LOC_CONTROL_CENTER_OPERATOR_EMAIL", "owner@example.com");
  vi.stubEnv("CONTROL_CENTER_OWNER_EMAILS", "owner@example.com");
  vi.stubEnv("INTERNAL_OPERATOR_EMAILS", "owner@example.com");
  vi.stubEnv("CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS", "");
  vi.stubEnv("CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS", "");
  vi.stubEnv("LOC_CONTROL_CENTER_OPERATIONS", "resources.publish,tasks.create,approvals.decide,receipts.get");
});

describe("named-agent grant proof", () => {
  it("accepts the LOC proof and uses the agent id when no separate grant id is sent", () => {
    const body = publishEnvelope();
    expect(locNamedAgentGrantSchema.parse(body.namedAgentGrant)).toMatchObject({
      mode: "named-agent",
      agentName: "Suite",
      operation: LOC_NAMED_AGENT_PUBLISH_SCOPE,
    });
    expect(verifyLocNamedAgentGrant(body, now)).toEqual({
      agentId,
      agentName: "Suite",
      grantId: agentId,
      emailAllowed: false,
    });
  });

  it("accepts Bunny, a separate grant id, a future expiry, and an explicit email scope", () => {
    const bunnyId = randomUUID();
    const separateGrantId = randomUUID();
    const audit = verifyLocNamedAgentGrant(publishEnvelope({
      intendedAssignee: "Bunny",
      input: { product: "suite", title: "Walkthrough", emailSuiteList: true },
      namedAgentGrant: locGrant({
        agentId: bunnyId,
        agentName: "Bunny",
        grantId: separateGrantId,
        scopes: [LOC_NAMED_AGENT_PUBLISH_SCOPE, LOC_NAMED_AGENT_EMAIL_SCOPE],
        expiresAt: "2026-10-22T00:00:00.000Z",
        revoked: false,
        revokedAt: null,
      }),
    }), now);
    expect(audit).toEqual({
      agentId: bunnyId,
      agentName: "Bunny",
      grantId: separateGrantId,
      emailAllowed: true,
    });
  });

  it("grants nothing when the field is absent", () => {
    const { namedAgentGrant, ...body } = publishEnvelope();
    void namedAgentGrant;
    expect(verifyLocNamedAgentGrant(body, now)).toBeNull();
  });

  const rejections: Array<[string, (body: ReturnType<typeof publishEnvelope>) => void, RegExp]> = [
    ["another operation", (body) => { body.operation = "tasks.create"; }, /only valid for suite\.resources\.publish/],
    ["another product", (body) => { body.input = { ...body.input, product: "finder" }; }, /only valid for suite\.resources\.publish/],
    ["an owner connection", (body) => { body.authority = "owner"; }, /only valid on an agent connection/],
    ["a one-time job approval", (body) => { body.delegation = { mode: "owner-approved" }; }, /one-time job approval/],
    ["a different agent name", (body) => { body.intendedAssignee = "Bunny"; }, /does not match the signed agent/],
    ["a missing agent name", (body) => { body.intendedAssignee = null; }, /does not match the signed agent/],
    ["a scope list that omits publish", (body) => {
      body.namedAgentGrant = locGrant({ scopes: [LOC_NAMED_AGENT_EMAIL_SCOPE] });
    }, /does not include suite\.resources\.publish/],
    ["a duplicated scope", (body) => {
      body.namedAgentGrant = locGrant({ scopes: [LOC_NAMED_AGENT_PUBLISH_SCOPE, LOC_NAMED_AGENT_PUBLISH_SCOPE] });
    }, /does not include suite\.resources\.publish/],
    ["an expiry at the current time", (body) => {
      body.namedAgentGrant = locGrant({ expiresAt: "2026-10-21T00:00:00.000Z" });
    }, /expired/],
    ["revoked true", (body) => { body.namedAgentGrant = locGrant({ revoked: true }); }, /revoked/],
    ["a revokedAt timestamp", (body) => {
      body.namedAgentGrant = locGrant({ revokedAt: "2026-10-22T00:00:00.000Z" });
    }, /revoked/],
    ["Suite list email without the email scope", (body) => {
      body.input = { ...body.input, emailSuiteList: true };
    }, /Suite list email/],
  ];
  for (const [name, mutate, message] of rejections) {
    it(`rejects ${name}`, () => {
      const body = publishEnvelope();
      mutate(body);
      expect(() => verifyLocNamedAgentGrant(body, now)).toThrow(message);
    });
  }

  it("rejects a malformed agent id, grant id, mode, and unknown field", () => {
    const grant = locGrant();
    expect(locNamedAgentGrantSchema.safeParse({ ...grant, agentId: "Suite" }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({ ...grant, grantId: "standing" }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({ ...grant, mode: "owner-approved" }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({ ...grant, approved: true }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({ ...grant, agentName: "" }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({
      ...grant,
      scopes: ["suite.communications.publish"],
    }).success).toBe(false);
    expect(locNamedAgentGrantSchema.safeParse({
      ...grant,
      operation: LOC_NAMED_AGENT_EMAIL_SCOPE,
    }).success).toBe(false);
  });
});

describe("LOC bridge named-agent publish grant", () => {
  it("publishes with the exact LOC proof and audits the named agent and grant id", async () => {
    const response = await dispatchLocRequest(signed(publishEnvelope()));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.result.locNamedAgentAudit).toEqual({
      agentId,
      agentName: "Suite",
      grantId: agentId,
    });
    expect(mock.calls).toBe(1);
    expect(mock.lastInput).toMatchObject({ emailSuiteList: false });
    expect(console.info).toHaveBeenCalledWith("[loc-named-agent-grant]", {
      event: "publish",
      operationId: opId,
      agentId,
      agentName: "Suite",
      grantId: agentId,
    });
    expect(mock.rows.get(opId)?.result).toMatchObject({
      locNamedAgentAudit: { agentId, agentName: "Suite", grantId: agentId },
    });

    const replay = await dispatchLocRequest(signed(publishEnvelope()));
    expect(replay.status).toBe(200);
    expect(mock.calls).toBe(1);
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it("emails the Suite list only when the grant includes that scope", async () => {
    const denied = await dispatchLocRequest(signed(publishEnvelope({
      input: { product: "suite", title: "Walkthrough", emailSuiteList: true },
    })));
    expect(denied.status).toBe(403);
    expect(mock.calls).toBe(0);
    expect(mock.rows.size).toBe(0);
    expect(mock.queryCalls).toBe(0);

    const allowed = await dispatchLocRequest(signed(publishEnvelope({
      operationId: randomUUID(),
      intendedAssignee: "Bunny",
      input: { product: "suite", title: "Walkthrough", emailSuiteList: true },
      namedAgentGrant: locGrant({
        agentId: otherAgentId,
        agentName: "Bunny",
        grantId,
        scopes: [LOC_NAMED_AGENT_PUBLISH_SCOPE, LOC_NAMED_AGENT_EMAIL_SCOPE],
      }),
    })));
    expect(allowed.status).toBe(200);
    expect(mock.calls).toBe(1);
    expect(mock.lastInput).toMatchObject({ emailSuiteList: true });
    const payload = await allowed.json();
    expect(payload.result.locNamedAgentAudit).toEqual({
      agentId: otherAgentId,
      agentName: "Bunny",
      grantId,
    });
  });

  it("rejects the grant on any other operation, including email preview and catalog", async () => {
    for (const operation of ["tasks.create", "resources.emailPreview", "catalog", "approvals.decide"]) {
      const response = await dispatchLocRequest(signed(publishEnvelope({
        operation,
        input: { product: "suite", title: "Walkthrough" },
      })));
      expect(response.status, operation).toBe(403);
    }
    expect(mock.calls).toBe(0);
    expect(mock.queryCalls).toBe(0);
    expect(mock.rows.size).toBe(0);
  });

  it("rejects an unsigned caller before any grant or database work", async () => {
    const response = await dispatchLocRequest(new Request("https://www.yoursparklesuite.com/api/internal/loc-control-center", {
      method: "POST",
      body: JSON.stringify({ ownerId: owner, ...publishEnvelope() }),
    }));
    expect(response.status).toBe(401);
    expect(mock.calls).toBe(0);
    expect(mock.queryCalls).toBe(0);
  });

  it("rejects a malformed grant before the route runs", async () => {
    for (const namedAgentGrant of [
      locGrant({ agentId: "Suite" }),
      locGrant({ grantId: "standing" }),
      locGrant({ approved: true }),
      locGrant({ mode: "shared" }),
      locGrant({ operation: "suite.tasks.create" }),
    ]) {
      const response = await dispatchLocRequest(signed(publishEnvelope({ namedAgentGrant })));
      expect(response.status).toBe(400);
    }
    expect(mock.calls).toBe(0);
    expect(mock.queryCalls).toBe(0);
  });

  it("rejects an expired, revoked, unbound, or incomplete grant before a receipt is reserved", async () => {
    const cases = [
      publishEnvelope({ namedAgentGrant: locGrant({ expiresAt: "2020-01-01T00:00:00.000Z" }) }),
      publishEnvelope({ namedAgentGrant: locGrant({ revoked: true }) }),
      publishEnvelope({ namedAgentGrant: locGrant({ revokedAt: "2026-10-22T00:00:00.000Z" }) }),
      publishEnvelope({ intendedAssignee: "Bunny" }),
      publishEnvelope({ authority: "owner" }),
      publishEnvelope({
        delegation: {
          mode: "owner-approved",
          ownerId: owner,
          connectionId,
          operationId: opId,
          jobId: "00000000-0000-4000-8000-000000000031",
          agentId,
          operation: "suite.resources.publish",
          inputHash: "a".repeat(64),
          bridgeInputHash: digestLocInput({
            operation: "resources.publish",
            input: { product: "suite", title: "Walkthrough", emailSuiteList: false },
          }),
          targetIds: [],
          expiresAt: "2026-10-22T00:00:00.000Z",
        },
      }),
      publishEnvelope({
        namedAgentGrant: locGrant({ scopes: [LOC_NAMED_AGENT_EMAIL_SCOPE] }),
      }),
      publishEnvelope({ input: { product: "finder", title: "Walkthrough", emailSuiteList: false } }),
    ];
    for (const body of cases) {
      const response = await dispatchLocRequest(signed(body));
      expect(response.status).toBe(403);
    }
    expect(mock.calls).toBe(0);
    expect(mock.rows.size).toBe(0);
    expect(mock.queryCalls).toBe(0);
  });

  it("does not let an agent publish without the grant, or hide the grant in business input", async () => {
    const { namedAgentGrant, ...agent } = publishEnvelope();
    void namedAgentGrant;
    expect((await dispatchLocRequest(signed(agent))).status).toBe(403);
    expect((await dispatchLocRequest(signed({
      ...agent,
      input: { ...agent.input, namedAgentGrant: locGrant() },
    }))).status).toBe(403);
    expect(mock.calls).toBe(0);
    expect(mock.rows.size).toBe(0);
  });

  it("keeps an owner publish, including Suite list email, on the previous path", async () => {
    const response = await dispatchLocRequest(signed({
      authority: "owner",
      operation: "resources.publish",
      operationId: opId,
      input: { product: "suite", title: "Owner note", emailSuiteList: true },
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.result).toEqual({ ok: true, resource: { id: "resource-1" } });
    expect(payload.result.locNamedAgentAudit).toBeUndefined();
    expect(mock.lastInput).toMatchObject({ emailSuiteList: true });
    expect(mock.calls).toBe(1);
    expect(console.info).not.toHaveBeenCalled();
    expect(mock.rows.get(opId)?.intended_assignee).toBeNull();
  });

  it("keeps a one-time owner-approved job on the previous path", async () => {
    const input = { product: "suite", title: "Approved exact draft", emailSuiteList: true };
    const delegation = {
      mode: "owner-approved",
      ownerId: owner,
      connectionId,
      operationId: opId,
      jobId: "00000000-0000-4000-8000-000000000031",
      agentId,
      operation: "suite.resources.publish",
      inputHash: "a".repeat(64),
      bridgeInputHash: digestLocInput({ operation: "resources.publish", input }),
      targetIds: [] as string[],
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const response = await dispatchLocRequest(signed({
      authority: "agent",
      operation: "resources.publish",
      operationId: opId,
      connectionId,
      intendedAssignee: "Suite",
      input,
      delegation,
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.result.locNamedAgentAudit).toBeUndefined();
    expect(mock.lastInput).toMatchObject({ emailSuiteList: true, title: "Approved exact draft" });
    expect(mock.rows.get(opId)?.intended_assignee).toBe("Suite");
    expect(mock.calls).toBe(1);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("rejects a replay that presents a different grant id", async () => {
    expect((await dispatchLocRequest(signed(publishEnvelope({
      namedAgentGrant: locGrant({ grantId }),
    })))).status).toBe(200);
    const changed = await dispatchLocRequest(signed(publishEnvelope({
      namedAgentGrant: locGrant({ grantId: otherAgentId }),
    })));
    expect(changed.status).toBe(409);
    expect(mock.calls).toBe(1);
  });

  it("rejects an expired grant on replay of a completed publish", async () => {
    expect((await dispatchLocRequest(signed(publishEnvelope()))).status).toBe(200);
    const expired = await dispatchLocRequest(signed(publishEnvelope({
      namedAgentGrant: locGrant({ expiresAt: "2020-01-01T00:00:00.000Z" }),
    })));
    expect(expired.status).toBe(403);
    expect(mock.calls).toBe(1);
  });
});
