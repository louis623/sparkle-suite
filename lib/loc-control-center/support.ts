import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorSupportSession } from "@/lib/operator-support/session-service";
import {
  mapOperatorSupportSessionSummary,
  OPERATOR_SUPPORT_CSRF_COOKIE_PREFIX,
} from "@/lib/operator-support/http";
import { OPERATOR_SUPPORT_REASON_CODES } from "@/lib/operator-support/types";
import { getLocOperatorContext } from "./context";
import { LocBridgeError } from "./security";
import { sealSupportToken, openSupportToken } from "./support-credentials";

const origin = "https://www.yoursparklesuite.com";
const startSchema = z
  .object({
    product: z.literal("suite"),
    targetRepId: z.uuid(),
    reasonCode: z.enum(OPERATOR_SUPPORT_REASON_CODES),
    reasonNote: z.string().max(2000).optional(),
    supportReportId: z.uuid().optional(),
  })
  .strict();
export const supportWorkspaceOperations: Record<
  string,
  { path: string; method: "GET" | "POST" }
> = {
  "support.workspace.profile": { path: "/api/nic-nac/me", method: "GET" },
  "support.workspace.site-settings": {
    path: "/api/nic-nac/site-settings",
    method: "GET",
  },
  "support.workspace.site-settings.update": {
    path: "/api/nic-nac/site-settings",
    method: "POST",
  },
  "support.workspace.calendar": {
    path: "/api/nic-nac/calendar-summary",
    method: "GET",
  },
  "support.workspace.customers": {
    path: "/api/nic-nac/customer-audience",
    method: "GET",
  },
  "support.workspace.trade-board": {
    path: "/api/nic-nac/trade-board",
    method: "GET",
  },
  "support.workspace.fulfillment": {
    path: "/api/nic-nac/fulfillment-queue",
    method: "GET",
  },
  "support.workspace.jewelry": {
    path: "/api/nic-nac/jewelry-library",
    method: "GET",
  },
  "support.workspace.resources": {
    path: "/api/nic-nac/resource-library",
    method: "GET",
  },
  "support.workspace.reports": {
    path: "/api/nic-nac/support-reports",
    method: "GET",
  },
  "support.workspace.history": {
    path: "/api/nic-nac/support-access-history",
    method: "GET",
  },
};
function context() {
  const current = getLocOperatorContext();
  if (!current)
    throw new LocBridgeError(403, "A verified operator is required.");
  return current;
}
function request(
  path: string,
  body: unknown,
  token: string,
  operationId?: string,
) {
  return new Request(new URL(path, origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-sparkle-support-csrf": token,
      ...(operationId ? { "x-sparkle-support-request-id": operationId } : {}),
    },
    body: JSON.stringify(body),
  });
}
async function result(response: Response) {
  const body = await response.json();
  if (!response.ok)
    throw new LocBridgeError(
      response.status,
      typeof body.error === "string"
        ? body.error
        : "The support operation did not complete.",
    );
  return body as Record<string, unknown>;
}
async function mappedSession(sessionId: string) {
  const current = context(),
    admin = createAdminClient();
  const { data, error } = await admin
    .from("loc_control_center_support_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("owner_id", current.ownerId)
    .eq("connection_id", current.connectionId)
    .eq("operator_rep_id", current.operator.repId)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new LocBridgeError(
      404,
      "This support session is not assigned to this LOC connection.",
    );
  const session = await getOperatorSupportSession(admin, {
    sessionId,
    operatorRepId: current.operator.repId,
    targetRepId: data.target_rep_id,
  });
  if (!session)
    throw new LocBridgeError(404, "The support session is unavailable.");
  const binding = `${current.ownerId}:${current.connectionId}:${sessionId}:${session.targetRepId}`;
  return {
    mapping: data,
    session,
    admin,
    token: openSupportToken(data.csrf_ciphertext, binding),
  };
}
export async function runLocSupportOperation(
  name: string,
  input: Record<string, unknown>,
  operationId?: string,
): Promise<unknown> {
  if (name === "support.session.start") {
    const parsed = startSchema.parse(input),
      current = context(),
      admin = createAdminClient();
    // Fail before customer notice or activation if encrypted storage is absent.
    const preflight = await admin
      .from("loc_control_center_support_sessions")
      .select("session_id")
      .limit(0);
    if (preflight.error)
      throw new LocBridgeError(
        503,
        "Native LOC support session storage is not ready.",
      );
    sealSupportToken("preflight", "preflight");
    const handler = await import(
      "@/app/api/control-center/support-sessions/route"
    );
    const { product, ...body } = parsed;
    void product;
    const response = await handler.POST(
      request("/api/control-center/support-sessions", body, "", operationId),
    );
    const payload = await result(response);
    const session = z
      .object({ id: z.uuid(), targetRepId: z.uuid() })
      .passthrough()
      .parse(payload.session);
    const token = response.cookies.get(
      `${OPERATOR_SUPPORT_CSRF_COOKIE_PREFIX}${session.id}`,
    )?.value;
    if (!token)
      throw new LocBridgeError(
        502,
        "Support activation did not provide its protected session credential. Reconcile the active support session.",
      );
    const saved = await admin
      .from("loc_control_center_support_sessions")
      .insert({
        session_id: session.id,
        owner_id: current.ownerId,
        connection_id: current.connectionId,
        operator_rep_id: current.operator.repId,
        target_rep_id: session.targetRepId,
        csrf_ciphertext: sealSupportToken(
          token,
          `${current.ownerId}:${current.connectionId}:${session.id}:${session.targetRepId}`,
        ),
      });
    if (saved.error) {
      const end = await import(
        "@/app/api/control-center/support-sessions/[sessionId]/end/route"
      );
      await end.POST(
        request(
          `/api/control-center/support-sessions/${session.id}/end`,
          {
            changedAnything: false,
            completionSummary: "LOC support setup could not finish.",
          },
          token,
        ),
        { params: Promise.resolve({ sessionId: session.id }) },
      );
      throw new LocBridgeError(
        502,
        "LOC could not preserve the new support connection. Its activation was closed or requires reconciliation.",
      );
    }
    return { session, locManaged: true };
  }
  const sessionId = z.uuid().parse(input.sessionId);
  const mapped = await mappedSession(sessionId);
  if (name === "support.session.inspect")
    return {
      session: mapOperatorSupportSessionSummary(mapped.session),
      capabilities: mapped.session.capabilities,
      locManaged: true,
      expired:
        !!mapped.session.expiresAt &&
        Date.parse(mapped.session.expiresAt) <= Date.now(),
    };
  if (name === "support.session.end") {
    const end = await import(
      "@/app/api/control-center/support-sessions/[sessionId]/end/route"
    );
    const payload = await result(
      await end.POST(
        request(
          `/api/control-center/support-sessions/${sessionId}/end`,
          {
            changedAnything: input.changedAnything === true,
            completionSummary: input.completionSummary,
          },
          mapped.token,
          operationId,
        ),
        { params: Promise.resolve({ sessionId }) },
      ),
    );
    const marked = await mapped.admin
      .from("loc_control_center_support_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("session_id", sessionId);
    if (marked.error)
      throw new LocBridgeError(
        502,
        "Support access ended, but LOC could not finalize its session record. Reconcile before retrying.",
      );
    return { ...payload, locManaged: true };
  }
  const operation = supportWorkspaceOperations[name];
  if (!operation)
    throw new LocBridgeError(404, "Unknown support workspace operation.");
  const url = new URL(
    `/api/control-center/support-sessions/${sessionId}/gateway`,
    origin,
  );
  url.searchParams.set("path", operation.path);
  const query = z
    .record(
      z.string().max(60),
      z.union([z.string().max(1000), z.number(), z.boolean()]),
    )
    .optional()
    .parse(input.query);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (
      [
        "path",
        "method",
        "sessionId",
        "repId",
        "rep_id",
        "targetRepId",
      ].includes(key)
    )
      throw new LocBridgeError(
        400,
        "The support target and action are fixed by the session.",
      );
    url.searchParams.set(key, String(value));
  }
  const gateway = await import(
    "@/app/api/control-center/support-sessions/[sessionId]/gateway/route"
  );
  const headers = {
    "content-type": "application/json",
    origin,
    "x-sparkle-support-csrf": mapped.token,
    ...(operationId ? { "x-sparkle-support-request-id": operationId } : {}),
  };
  const body =
    operation.method === "POST"
      ? JSON.stringify(z.record(z.string(), z.unknown()).parse(input.settings))
      : undefined;
  return result(
    await gateway[operation.method](
      new Request(url, { method: operation.method, headers, body }),
      { params: Promise.resolve({ sessionId }) },
    ),
  );
}
