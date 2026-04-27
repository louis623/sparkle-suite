// Tool execution telemetry — writes one row to tool_executions per call to
// the underlying execute(). Composition position: INSIDE withErrorHandling
// (i.e. wrapped by withErrorHandling on the outside). Sees the raw outcome —
// if execute() throws, logs success=false then re-throws so the outer
// withErrorHandling can decide which tier to apply. If we lived OUTSIDE the
// error handler, Tier 2/3 friendly returns would look like successes here.
//
// Retry telemetry semantics:
//   A Tier 1 retry on a read-only tool produces TWO tool_executions rows —
//   one with success=false (initial transient failure) and one with success=true
//   (retry success). This is intentional — the table reflects what actually
//   happened, not a synthesised "did it eventually work" view. Anyone computing
//   success rates or write volume from tool_executions should be aware.
//
// Failure isolation:
//   logToolExecution already swallows its own internal errors (see
//   lib/thumper/guardian-telemetry.ts), but we wrap the call in an extra
//   try/catch as a defense-in-depth contract: telemetry can never mask the
//   tool's outcome to the model.

import type { Tool } from 'ai'
import { logToolExecution } from '@/lib/thumper/guardian-telemetry'
import { hashState } from '@/lib/thumper/audit'
import type { ToolContext } from '../types'

export function withTelemetry(toolName: string, ctx: ToolContext, tool: Tool): Tool {
  const original = (tool as { execute?: (...a: unknown[]) => unknown }).execute
  if (typeof original !== 'function') return tool

  const wrapped = async (...args: unknown[]): Promise<unknown> => {
    const start = performance.now()
    let success = false
    let errorMessage: string | undefined
    try {
      const result = await original.apply(tool, args)
      success = true
      return result
    } catch (err) {
      errorMessage = (err as Error).message
      throw err
    } finally {
      // Fire-and-forget — do NOT await. The telemetry insert was previously in
      // the critical path of returning the tool result to the model, costing
      // ~50-150ms per call. logToolExecution already swallows its own errors;
      // the .catch() here is defense-in-depth for unexpected promise rejections.
      const durationMs = Math.round(performance.now() - start)
      const toolArgs = (args[0] ?? {}) as Record<string, unknown>
      void logToolExecution({
        toolName,
        repId: ctx.repId,
        conversationId: ctx.conversationId,
        success,
        durationMs,
        errorMessage,
        argsHash: hashState(toolArgs),
      }).catch((logErr) => {
        console.error('[thumper] tool_executions write failed', { toolName, logErr })
      })
    }
  }

  // Spread ALL original tool fields; only override execute. This preserves
  // needsApproval and any other AI SDK metadata through the wrapper layer.
  return { ...(tool as object), execute: wrapped } as Tool
}
