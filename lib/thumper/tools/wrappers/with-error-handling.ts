// Three-tier error handling for Thumper tool execution. Composition position:
// OUTSIDE withTelemetry (i.e. wraps the telemetry-wrapped tool). When the
// inner tool throws, we classify and act:
//
//   Tier 1 — RETRY (read-only tools only):
//     Transient errors (network blips, timeouts, 5xx, 408/429) get one retry
//     after 500ms. Write/mutation tools (readOnly: false) skip Tier 1 entirely
//     to avoid double-applying side effects. If retry also throws, falls
//     through to Tier 3.
//
//   Tier 2 — EXPLAIN (instanceof ThumperToolError):
//     Returns a structured { ok: false, errorTier: 'explain', code, message }
//     to the SDK. The model sees it as a tool result and explains in plain
//     language. NO incident written — these are expected business errors.
//
//   Tier 3 — ESCALATE (everything else, or Tier 1 retry failed):
//     Best-effort writes a thumper_incidents row and returns a friendly
//     "I've flagged this" message to the model.
//
// STREAM LIFECYCLE NOTE (intentional behavior change vs pre-Task-1.4 route):
//   Previously, an unhandled tool throw propagated to streamText, fired
//   onError, and the route's persistence path treated the assistant message
//   as aborted. After this change, Tier 2 and Tier 3 errors RETURN a
//   structured value to the SDK; the model continues; onFinish fires
//   normally; the assistant message COMPLETES with the model's explanation.
//   This is correct because Tier 2 errors are by definition recoverable, and
//   Tier 3 escalates AND degrades gracefully (better UX than a stream-level
//   abort). True fatal errors (auth wrapper crash, errors in this wrapper
//   itself) still throw past us and trigger onError — abort path preserved.
//
// FAILURE ISOLATION:
//   logIncident already swallows its own internal errors (see
//   lib/thumper/guardian-telemetry.ts); the extra try/catch around it here
//   is a defense-in-depth contract — incident writes never throw, never
//   mask the tool outcome.

import type { Tool } from 'ai'
import { logIncident } from '@/lib/thumper/guardian-telemetry'
import { ThumperToolError } from '@/lib/thumper/errors'
import type { ToolContext } from '../types'

const TRANSIENT_RX = /ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|socket hang up|\b(408|429|502|503|504)\b/i

function isTransient(err: unknown): boolean {
  const msg = (err as Error)?.message ?? ''
  return TRANSIENT_RX.test(msg)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type Args = { name: string; ctx: ToolContext; readOnly: boolean }

export function withErrorHandling({ name, ctx, readOnly }: Args, tool: Tool): Tool {
  const original = (tool as { execute?: (...a: unknown[]) => unknown }).execute
  if (typeof original !== 'function') return tool

  const wrapped = async (...args: unknown[]): Promise<unknown> => {
    try {
      return await original.apply(tool, args)
    } catch (err) {
      if (readOnly && isTransient(err)) {
        await sleep(500)
        try {
          return await original.apply(tool, args)
        } catch (retryErr) {
          return await escalate(retryErr, name, ctx)
        }
      }
      if (err instanceof ThumperToolError) {
        return {
          ok: false,
          errorTier: 'explain' as const,
          code: err.code,
          message: err.userMessage,
        }
      }
      return await escalate(err, name, ctx)
    }
  }

  // Preserve all original tool metadata (needsApproval, description, etc).
  return { ...(tool as object), execute: wrapped } as Tool
}

async function escalate(err: unknown, toolName: string, ctx: ToolContext) {
  try {
    await logIncident({
      errorType: 'tool_unhandled',
      repId: ctx.repId,
      conversationId: ctx.conversationId,
      severity: 'error',
      details: {
        toolName,
        runId: ctx.runId,
        message: (err as Error)?.message ?? String(err),
        stack: (err as Error)?.stack,
      },
    })
  } catch (logErr) {
    console.error('[thumper] thumper_incidents write failed', { toolName, logErr })
  }
  return {
    ok: false,
    errorTier: 'escalate' as const,
    message: "Something unexpected happened. I've flagged this for the Neon Rabbit team.",
  }
}
