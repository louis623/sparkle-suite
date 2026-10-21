import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUG_HUNT_PRIORITIES,
  BUG_HUNT_STATUSES,
  normalizeBugHuntItem,
} from "@/lib/control-center/bug-hunt";
import { runWithLocOperator, type LocOperatorContext } from "./context";
import { locOperationCatalog, findLocOperation } from "./catalog";
import { digestLocInput, LocBridgeError, LocPreconditionError, verifyLocSignature } from "./security";
import { readLocOperation } from "./read-models";
import { runExistingLocRoute } from "./legacy-routes";
import { runLocSupportOperation } from "./support";
import {saveLocSetupProfile} from './setup-profile'
import { ServiceError } from '@/lib/services/errors'
import { approveFizzIssue, getFizzIssue, stageFizzIssue } from '@/lib/services/fizz-issues'
import {
  publicationNoticeContent,
  renderSuiteOfficialNoticeHtml,
  resourceNoticeContent,
} from '@/lib/services/suite-official-notice'

import { locJobDelegationSchema, locNamedAgentGrantSchema, verifyLocJobDelegation, verifyLocNamedAgentGrant, withLocNamedAgentAudit } from './job-delegation'

const envelope = z
  .object({
    authority: z.enum(["owner", "agent"]).default("agent"),
    delegation: locJobDelegationSchema.optional(),
    ownerId: z.uuid(),
    operation: z.string().min(1).max(100),
    input: z.record(z.string(), z.unknown()).default({}),
    operationId: z.uuid().optional(),
    connectionId: z.string().min(1).max(160).default("loc-owner"),
    intendedAssignee: z.string().max(160).nullable().optional(),
    namedAgentGrant: locNamedAgentGrantSchema.optional(),
  })
  .strict();
const taskPatch = z
  .object({
    id: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    details: z.string().trim().max(4000).optional(),
    owner: z.string().trim().max(160).optional(),
    priority: z.enum(BUG_HUNT_PRIORITIES).optional(),
    status: z.enum(BUG_HUNT_STATUSES).optional(),
    product: z.literal("suite"),
  })
  .strict();

export function redactCredentialFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactCredentialFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/password|csrf|secret|access.?token|refresh.?token|bearer|credential/i.test(
            key,
          ),
      )
      .map(([key, child]) => [key, redactCredentialFields(child)]),
  );
}

async function boundedRequestText(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 128_000) {
      await reader.cancel();
      throw new LocBridgeError(413, "Request too large.");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function operatorContext(
  body: z.infer<typeof envelope>,
): Promise<LocOperatorContext> {
  const ownerId = process.env.LOC_CONTROL_CENTER_OWNER_ID;
  const email =
    process.env.LOC_CONTROL_CENTER_OPERATOR_EMAIL?.trim().toLowerCase();
  if (!ownerId || !email)
    throw new LocBridgeError(503, "LOC operator binding is not configured.");
  if (body.ownerId !== ownerId)
    throw new LocBridgeError(403, "This LOC owner is not bound to Sparkle.");
  const owners = (
    process.env.CONTROL_CENTER_OWNER_EMAILS ?? "louis@neonrabbit.net"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase());
  const operators = (
    process.env.INTERNAL_OPERATOR_EMAILS ?? "louis@neonrabbit.net"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase());
  const restricted = [
    ...(process.env.CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS ?? "").split(
      ",",
    ),
    ...(
      process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS ?? ""
    ).split(","),
  ].map((value) => value.trim().toLowerCase());
  if (
    !owners.includes(email) ||
    !operators.includes(email) ||
    restricted.includes(email)
  )
    throw new LocBridgeError(
      403,
      "The bound operator does not have owner access.",
    );
  const { data: rep, error } = await createAdminClient()
    .from("reps")
    .select(
      "id, auth_user_id, email, display_name, business_name, stripe_customer_id, public_site_slug, custom_domain, time_zone, status",
    )
    .eq("email", email)
    .maybeSingle();
  if (error || !rep || rep.status !== "active" || !rep.auth_user_id)
    throw new LocBridgeError(
      403,
      "The bound operator is unavailable or inactive.",
    );
  return {
    operator: { repId: rep.id, rep },
    ownerId,
    connectionId: body.connectionId,
    intendedAssignee: body.intendedAssignee ?? null,
  };
}
function enabled(name: string, effect: string) {
  const setting = process.env.LOC_CONTROL_CENTER_OPERATIONS?.trim();
  return setting
    ? setting
        .split(",")
        .map((value) => value.trim())
        .includes(name)
    : effect === "read";
}
async function locService<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new LocBridgeError(error.statusCode, error.userMessage);
    }
    throw error;
  }
}
async function previewLocSuiteEmail(
  input: Record<string, unknown>,
  options?: { resource?: boolean },
) {
  const resourceType = typeof input.resourceType === "string" ? input.resourceType : "";
  const content = options?.resource || resourceType
    ? resourceNoticeContent({
        resourceType: resourceType || "blog",
        title: String(input.title ?? ""),
        summary: typeof input.summary === "string" ? input.summary : "",
        body: typeof input.body === "string" ? input.body : "",
        thumbnailUrl: typeof input.thumbnailUrl === "string" ? input.thumbnailUrl : null,
        videoUrl: typeof input.videoUrl === "string" ? input.videoUrl : null,
        actionUrl: typeof input.actionUrl === "string" ? input.actionUrl : null,
      })
    : publicationNoticeContent({
        title: String(input.title ?? ""),
        summary: typeof input.summary === "string" ? input.summary : null,
        body: String(input.body ?? ""),
        actionUrl: typeof input.actionUrl === "string" ? input.actionUrl : null,
      });
  const rendered = renderSuiteOfficialNoticeHtml(content);
  return {
    html: rendered.html,
    subject: content.headline,
    variables: rendered.variables,
    thumbnailUrl: content.thumbnailUrl,
    ctaLabel: content.ctaLabel,
    ctaUrl: content.ctaUrl,
  };
}
function receipt(row: Record<string, unknown>) {
  const stale =
    row.status === "running" &&
    Date.now() - Date.parse(String(row.created_at)) > 120000;
  return {
    operationId: row.id,
    operation: row.operation,
    product: row.product,
    status: stale ? "uncertain" : row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: stale
      ? "The request outlived its execution window. Reconcile the business record; do not repeat it."
      : row.error_message,
  };
}
async function updateTask(input: Record<string, unknown>) {
  const parsed = taskPatch.parse(input),
    { id, expectedUpdatedAt, product, ...patch } = parsed;
  void product;
  if (!Object.keys(patch).length)
    throw new LocBridgeError(400, "No task update was supplied.");
  const { data, error } = await createAdminClient().rpc(
    "loc_update_control_center_task",
    { p_id: id, p_expected_updated_at: expectedUpdatedAt, p_patch: patch },
  );
  if (error) throw error;
  if (!data?.[0])
    throw new LocBridgeError(
      409,
      "This task changed. Refresh it before saving.",
    );
  return { item: normalizeBugHuntItem(data[0]) };
}
export async function dispatchLocRequest(request: Request): Promise<Response> {
  let operationId: string | undefined;
  let failureReceiptStatus = "reconcile";
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 128_000)
      throw new LocBridgeError(413, "Request too large.");
    const raw = await boundedRequestText(request);
    if (Buffer.byteLength(raw) > 128_000)
      throw new LocBridgeError(413, "Request too large.");
    verifyLocSignature(raw, request.headers);
    const body = envelope.parse(JSON.parse(raw));
    operationId = body.operationId;
    const namedAgent = verifyLocNamedAgentGrant(body);
    const context = await operatorContext(body);
    if (body.operation === "catalog")
      return Response.json(
        {
          ok: true,
          result: {
            version: 1,
            operations: locOperationCatalog.filter(
              (op) =>
                enabled(op.name, op.effect) &&
                (!op.ownerOnly || body.authority === "owner"),
            ),
          },
        },
        { headers: { "cache-control": "no-store" } },
      );
    const operation = findLocOperation(body.operation);
    if (!operation) throw new LocBridgeError(404, "Unknown LOC operation.");
    const delegated = verifyLocJobDelegation(body, operation.targetKeys)
    if (operation.ownerOnly && body.authority !== "owner" && !delegated && !namedAgent)
      throw new LocBridgeError(
        403,
        "This operation requires the verified LOC owner.",
      );
    const product = body.input.product;
    if (
      (product !== "suite" && product !== "finder") ||
      !operation.products.includes(product)
    )
      throw new LocBridgeError(
        403,
        "This operation is not available for that product.",
      );
    if (!enabled(operation.name, operation.effect))
      throw new LocBridgeError(
        403,
        "This operation is not enabled on the Sparkle connection.",
      );
    if(['onboarding.waitlist.update','onboarding.waitlist.delete'].includes(operation.name))z.iso.datetime({offset:true}).parse(body.input.expectedUpdatedAt)
    const admin = createAdminClient();
    if (operation.name === "receipts.get") {
      const id = z.uuid().parse(body.input.operationId);
      const { data, error } = await admin
        .from("loc_control_center_operations")
        .select("*")
        .eq("id", id)
        .eq("owner_id", context.ownerId)
        .eq("connection_id", context.connectionId)
        .eq("product", product)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new LocBridgeError(404, "Operation receipt not found.");
      return Response.json(
        {
          ok: true,
          result: data.status === "succeeded" ? data.result : null,
          receipt: receipt(data),
        },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (operation.effect === "read") {
      const result = await runWithLocOperator(context, () => {
        if (
          operation.name === "communications.emailPreview" ||
          operation.name === "resources.emailPreview"
        ) {
          return previewLocSuiteEmail(body.input, {
            resource: operation.name === "resources.emailPreview",
          });
        }
        if (operation.name === "fizz.issue.get") {
          return locService(() => getFizzIssue(createAdminClient(), String(body.input.issueId ?? "")));
        }
        return operation.name.startsWith("support.session.") ||
          operation.name.startsWith("support.workspace.")
          ? runLocSupportOperation(operation.name, body.input)
          : readLocOperation(operation.name, body.input);
      });
      return Response.json(
        { ok: true, result, observedAt: new Date().toISOString() },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (!operationId)
      throw new LocBridgeError(
        400,
        "A stable operation ID is required for every write.",
      );
    const inputDigest = digestLocInput({
      operation: operation.name,
      input: body.input,
      connectionId: context.connectionId,
      authority: body.authority,
      ...(namedAgent
        ? { namedAgentGrant: { agentId: namedAgent.agentId, grantId: namedAgent.grantId } }
        : {}),
    });
    const row = {
      id: operationId,
      owner_id: context.ownerId,
      connection_id: context.connectionId,
      intended_assignee: context.intendedAssignee,
      operator_rep_id: context.operator.repId,
      operation: operation.name,
      product,
      input_digest: inputDigest,
      status: "running",
    };
    const claimed = await admin
      .from("loc_control_center_operations")
      .insert(row);
    if (claimed.error) {
      if (claimed.error.code !== "23505") throw claimed.error;
      const { data: existing, error } = await admin
        .from("loc_control_center_operations")
        .select("*")
        .eq("id", operationId)
        .eq("owner_id", context.ownerId)
        .eq("connection_id", context.connectionId)
        .maybeSingle();
      if (error || !existing)
        throw new LocBridgeError(409, "Operation ID is already reserved.");
      if (existing.input_digest !== inputDigest)
        throw new LocBridgeError(
          409,
          "Operation ID was used for different input.",
        );
      return Response.json(
        {
          ok: existing.status === "succeeded",
          result: existing.status === "succeeded" ? existing.result : null,
          receipt: receipt(existing),
          ...(existing.status === "succeeded"
            ? {}
            : {
                error: {
                  code: "operation_not_replayable",
                  message:
                    "This operation is already recorded. Reconcile its receipt before taking further action.",
                },
              }),
        },
        {
          status: existing.status === "succeeded" ? 200 : 409,
          headers: { "cache-control": "no-store" },
        },
      );
    }
    try {
      if (namedAgent)
        console.info("[loc-named-agent-grant]", {
          event: "publish",
          operationId,
          agentId: namedAgent.agentId,
          agentName: namedAgent.agentName,
          grantId: namedAgent.grantId,
        });
      const rawResult = await runWithLocOperator(context, () =>
        operation.name === "tasks.update"
          ? updateTask(body.input)
          : operation.name === 'onboarding.setup-profile'?saveLocSetupProfile(body.input)
          : operation.name === "fizz.issue.stage"
            ? locService(() => stageFizzIssue(createAdminClient(), {
                issueId: String(body.input.issueId ?? ""),
                subject: String(body.input.subject ?? ""),
                preheader: String(body.input.preheader ?? ""),
                ...(body.input.emailHtml !== undefined ? { emailHtml: body.input.emailHtml } : {}),
                content: (body.input.content ?? null) as Record<string, unknown>,
                workspaceTitle: String(body.input.workspaceTitle ?? ""),
                workspaceSummary: String(body.input.workspaceSummary ?? ""),
                workspaceBody: String(body.input.workspaceBody ?? ""),
                actionUrl: typeof body.input.actionUrl === "string" ? body.input.actionUrl : null,
                stagedBy: context.operator.rep.email,
              }))
            : operation.name === "fizz.issue.approve"
              ? locService(() => {
                  const mode = body.input.mode;
                  if (mode !== "test" && mode !== "live") {
                    throw new LocBridgeError(400, "Mode must be test or live.");
                  }
                  return approveFizzIssue({
                    supabase: createAdminClient(),
                    issueId: String(body.input.issueId ?? ""),
                    mode,
                  });
                })
              : operation.name.startsWith("support.session.") ||
              operation.name.startsWith("support.workspace.")
            ? runLocSupportOperation(operation.name, body.input, operationId)
            : runExistingLocRoute(operation.name, body.input),
      );
      const redacted = redactCredentialFields(rawResult);
      const result = namedAgent ? withLocNamedAgentAudit(redacted, namedAgent) : redacted;
      const { data: saved, error } = await admin
        .from("loc_control_center_operations")
        .update({
          status: "succeeded",
          result,
          completed_at: new Date().toISOString(),
        })
        .eq("id", operationId)
        .select("*")
        .single();
      if (error || !saved)
        throw new Error(
          "The product action may have completed but its receipt could not be finalized.",
        );
      return Response.json(
        { ok: true, result, receipt: receipt(saved) },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      const certain =
        error instanceof LocPreconditionError ||
        error instanceof z.ZodError ||
          (['tasks.update','onboarding.setup-profile','onboarding.waitlist.update','onboarding.waitlist.delete','fizz.issue.stage','fizz.issue.approve'].includes(operation.name) &&
          error instanceof LocBridgeError &&
          error.status < 500);
      // Existing handlers can return an error after committing one of several
      // business effects. Never label those retry-safe or automatically replay.
      const state = certain ? "failed" : "uncertain";
      const recorded = await admin
        .from("loc_control_center_operations")
        .update({
          status: state,
          error_message:
            certain && error instanceof LocBridgeError
              ? error.message
              : "The result requires reconciliation before retrying.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", operationId)
        .select("id")
        .single();
      if (certain && !recorded.error && recorded.data) failureReceiptStatus = "failed";
      throw error;
    }
  } catch (error) {
    const status =
      error instanceof LocBridgeError
        ? error.status
        : error instanceof z.ZodError || error instanceof SyntaxError
          ? 400
          : 502;
    return Response.json(
      {
        ok: false,
        error: {
          code:
            status === 401
              ? "unauthorized"
              : status === 403
                ? "forbidden"
                : status === 409
                  ? "conflict"
                  : status === 400
                    ? "invalid_input"
                    : "product_unavailable",
          message:
            error instanceof LocBridgeError
              ? error.message
              : status === 400
                ? "Check the request fields."
                : "The product service could not complete this request.",
        },
        ...(operationId
          ? { receipt: { operationId, status: failureReceiptStatus } }
          : {}),
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
