import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  createOwnerDirectAttachmentSignedRead,
  getOwnerDirectConversation,
  listOwnerDirectMessages,
  sendOwnerDirectMessage,
} from "@/lib/services/workspace-owner-direct";
import { createAdminClient } from "@/lib/supabase/admin";

import type { LocOperatorContext } from "./context";
import { LocBridgeError, LocPreconditionError } from "./security";

// LOC PR #66 bridge envelope (server/operations/bridge.ts BridgeRequest plus ownerId).
// authority is injected by LOC from the authenticated principal. A live owner
// session is authority "owner", the configured owner id, connection loc-owner,
// and no agent attribution. Omission of authority is the agent default.
export const OWNER_DIRECT_OPERATIONS = [
  "ownerDirect.list",
  "ownerDirect.conversation",
  "ownerDirect.reply",
  "ownerDirect.send",
  "ownerDirect.attachment",
] as const;

export type OwnerDirectOperation = (typeof OWNER_DIRECT_OPERATIONS)[number];

export type OwnerDirectRejection =
  | "non_bridge"
  | "operation"
  | "named_agent_grant"
  | "job"
  | "agent"
  | "missing_session";

export const OWNER_DIRECT_REJECTION_MESSAGE: Record<OwnerDirectRejection, string> = {
  non_bridge: "Direct messages from this path require the interactive owner session.",
  operation: "This operation is not an owner direct message.",
  named_agent_grant: "Direct messages cannot be granted to an agent.",
  job: "Direct messages cannot be run as an approved job.",
  agent: "Direct messages are limited to the owner signed into LOC.",
  missing_session: "Direct messages require a live owner session.",
};

const OWNER_CONNECTION = "loc-owner";

const envelopeShape = z
  .object({
    authority: z.enum(["owner", "agent"]).optional(),
    delegation: z.unknown().optional(),
    namedAgentGrant: z.unknown().optional(),
    ownerId: z.uuid(),
    operation: z.string().min(1).max(100),
    input: z.record(z.string(), z.unknown()).optional(),
    operationId: z.uuid().optional(),
    connectionId: z.string().min(1).max(160).optional(),
    intendedAssignee: z.string().max(160).nullable().optional(),
  })
  .strict();

export type OwnerDirectSession = {
  email: string;
  status: string;
  authUserId: string | null;
  repId: string;
};

export function isOwnerDirectOperation(name: string): name is OwnerDirectOperation {
  return (OWNER_DIRECT_OPERATIONS as readonly string[]).includes(name);
}

export function isOwnerDirectRequest(
  value: unknown,
): value is { operation: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as { operation?: unknown }).operation === "string" &&
      (value as { operation: string }).operation.startsWith("ownerDirect."),
  );
}

// Structural envelope check. Does not read the database.
// Returns null when the envelope is the owner shape and the caller may
// resolve the live operator session.
export function preflightOwnerDirectBridge(
  raw: unknown,
  source: "loc-bridge" | "control-center" | "service",
): OwnerDirectRejection | null {
  if (source !== "loc-bridge") return "non_bridge";
  const body = envelopeShape.parse(raw);
  if (!isOwnerDirectOperation(body.operation)) return "operation";
  if (body.namedAgentGrant !== undefined) return "named_agent_grant";
  if (body.delegation !== undefined) return "job";
  if (body.authority !== "owner") return "agent";
  if (body.connectionId !== undefined && body.connectionId !== OWNER_CONNECTION) return "agent";
  if (body.intendedAssignee) return "agent";
  return null;
}

export function ownerDirectSessionRejection(input: {
  ownerId: string;
  expectedOwnerId: string;
  ownerEmails: readonly string[];
  session: OwnerDirectSession | null;
}): OwnerDirectRejection | null {
  const email = input.session?.email.trim().toLowerCase() ?? "";
  const owners = input.ownerEmails.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (
    !input.expectedOwnerId ||
    input.ownerId !== input.expectedOwnerId ||
    !input.session ||
    input.session.status !== "active" ||
    !input.session.authUserId ||
    !input.session.repId ||
    !owners.includes(email)
  ) {
    return "missing_session";
  }
  return null;
}

export function classifyOwnerDirectBridge(input: {
  source: "loc-bridge" | "control-center" | "service";
  envelope: unknown;
  expectedOwnerId: string;
  ownerEmails: readonly string[];
  session: OwnerDirectSession | null;
}): { ok: true } | { ok: false; reason: OwnerDirectRejection } {
  const preflight = preflightOwnerDirectBridge(input.envelope, input.source);
  if (preflight) return { ok: false, reason: preflight };
  const body = envelopeShape.parse(input.envelope);
  const session = ownerDirectSessionRejection({
    ownerId: body.ownerId,
    expectedOwnerId: input.expectedOwnerId,
    ownerEmails: input.ownerEmails,
    session: input.session,
  });
  if (session) return { ok: false, reason: session };
  return { ok: true };
}

export function sessionFromOperator(context: LocOperatorContext): OwnerDirectSession {
  return {
    email: context.operator.rep.email,
    status: context.operator.rep.status,
    authUserId: context.operator.rep.auth_user_id,
    repId: context.operator.repId,
  };
}

const suite = { product: z.literal("suite") };
const listInput = z.object({
  ...suite,
  recipientQuery: z.string().max(240).optional(),
  threadQuery: z.string().max(240).optional(),
  recipientOffset: z.number().int().min(0).max(100_000).optional(),
  threadOffset: z.number().int().min(0).max(100_000).optional(),
}).strict();
const conversationInput = z.object({ ...suite, conversationId: z.uuid() }).strict();
const replyInput = z.object({
  ...suite,
  conversationId: z.uuid(),
  body: z.string().trim().min(1).max(10_000),
}).strict();
const sendInput = z.object({
  ...suite,
  repId: z.uuid(),
  body: z.string().trim().min(1).max(10_000),
  clientRequestId: z.string().trim().min(8).max(180),
}).strict();
const attachmentInput = z.object({
  ...suite,
  conversationId: z.uuid(),
  attachmentId: z.uuid(),
}).strict();

export function parseOwnerDirectInput(operation: OwnerDirectOperation, input: unknown) {
  if (operation === "ownerDirect.list") return listInput.parse(input);
  if (operation === "ownerDirect.conversation") return conversationInput.parse(input);
  if (operation === "ownerDirect.reply") return replyInput.parse(input);
  if (operation === "ownerDirect.send") return sendInput.parse(input);
  return attachmentInput.parse(input);
}

async function auditOwnerDirectUse(
  admin: SupabaseClient,
  args: {
    operation: OwnerDirectOperation;
    operatorRepId: string;
    ownerId: string;
    conversationId?: string;
    repId?: string;
    attachmentId?: string;
    idempotencyKey: string;
  },
) {
  const action = args.operation.slice("ownerDirect.".length);
  // conversation_id stays null so a not-yet-confirmed id cannot fail the foreign key.
  // The target ids live in details.
  const { error } = await admin.from("workspace_conversation_audit_events").insert({
    conversation_id: null,
    actor_type: "operator",
    actor_id: args.operatorRepId,
    event_type: `loc_owner_direct_${action}`,
    details: {
      source: "loc-bridge",
      operation: args.operation,
      ownerId: args.ownerId,
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
      ...(args.repId ? { repId: args.repId } : {}),
      ...(args.attachmentId ? { attachmentId: args.attachmentId } : {}),
    },
    idempotency_key: args.idempotencyKey,
  });
  if (error && error.code !== "23505") {
    throw new LocPreconditionError(503, "Direct message audit could not be recorded.");
  }
}

async function ownerDirectRepId(admin: SupabaseClient, conversationId: string) {
  const result = await admin
    .from("workspace_conversations")
    .select("id, conversation_type, context_type, context_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (result.error) throw new LocBridgeError(503, "That direct message could not be loaded.");
  const row = result.data as {
    conversation_type?: string;
    context_type?: string;
    context_id?: string;
  } | null;
  const repId = z.uuid().safeParse(row?.context_id);
  if (
    !row ||
    row.conversation_type !== "owner_direct" ||
    row.context_type !== "rep_profile" ||
    !repId.success
  ) {
    throw new LocBridgeError(404, "That direct message could not be found.");
  }
  return repId.data;
}

export async function runLocOwnerDirectOperation(args: {
  operation: OwnerDirectOperation;
  input: Record<string, unknown>;
  operationId?: string;
  operatorRepId: string;
  ownerId: string;
  admin?: SupabaseClient;
}) {
  const admin = args.admin ?? createAdminClient();
  const idempotencyKey = args.operationId
    ? `loc-owner-direct:${args.operation}:${args.operationId}`
    : `loc-owner-direct:${args.operation}:${randomUUID()}`;
  if (args.operation === "ownerDirect.list") {
    const parsed = listInput.parse(args.input);
    await auditOwnerDirectUse(admin, {
      operation: args.operation,
      operatorRepId: args.operatorRepId,
      ownerId: args.ownerId,
      idempotencyKey,
    });
    return listOwnerDirectMessages(admin, {
      recipientQuery: parsed.recipientQuery,
      threadQuery: parsed.threadQuery,
      recipientOffset: parsed.recipientOffset,
      threadOffset: parsed.threadOffset,
    });
  }
  if (args.operation === "ownerDirect.conversation") {
    const parsed = conversationInput.parse(args.input);
    await auditOwnerDirectUse(admin, {
      operation: args.operation,
      operatorRepId: args.operatorRepId,
      ownerId: args.ownerId,
      conversationId: parsed.conversationId,
      idempotencyKey,
    });
    return getOwnerDirectConversation(admin, parsed.conversationId, true);
  }
  if (args.operation === "ownerDirect.reply") {
    const parsed = replyInput.parse(args.input);
    if (!args.operationId) {
      throw new LocBridgeError(400, "A stable operation ID is required for every write.");
    }
    await auditOwnerDirectUse(admin, {
      operation: args.operation,
      operatorRepId: args.operatorRepId,
      ownerId: args.ownerId,
      conversationId: parsed.conversationId,
      idempotencyKey,
    });
    const recipient = await ownerDirectRepId(admin, parsed.conversationId);
    return sendOwnerDirectMessage(admin, {
      repId: recipient,
      operatorRepId: args.operatorRepId,
      body: parsed.body,
      clientRequestId: args.operationId,
      uploadIds: [],
    });
  }
  if (args.operation === "ownerDirect.send") {
    const parsed = sendInput.parse(args.input);
    await auditOwnerDirectUse(admin, {
      operation: args.operation,
      operatorRepId: args.operatorRepId,
      ownerId: args.ownerId,
      repId: parsed.repId,
      idempotencyKey,
    });
    return sendOwnerDirectMessage(admin, {
      repId: parsed.repId,
      operatorRepId: args.operatorRepId,
      body: parsed.body,
      clientRequestId: parsed.clientRequestId,
      uploadIds: [],
    });
  }
  const parsed = attachmentInput.parse(args.input);
  await auditOwnerDirectUse(admin, {
    operation: args.operation,
    operatorRepId: args.operatorRepId,
    ownerId: args.ownerId,
    conversationId: parsed.conversationId,
    attachmentId: parsed.attachmentId,
    idempotencyKey,
  });
  return createOwnerDirectAttachmentSignedRead(admin, {
    conversationId: parsed.conversationId,
    attachmentId: parsed.attachmentId,
    ownerAuthorized: true,
  });
}
