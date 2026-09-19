// Three-tier error handling for Nic-Nac tool execution. Composition position:
// OUTSIDE withTelemetry (i.e. wraps the telemetry-wrapped tool). When the
// inner tool throws, we classify and act:
//
//   Tier 1 — RETRY (read-only tools only):
//     Transient errors (network blips, timeouts, 5xx, 408/429) get one retry
//     after 500ms. Write/mutation tools (readOnly: false) skip Tier 1 entirely
//     to avoid double-applying side effects. If retry also throws, falls
//     through to Tier 3.
//
//   Tier 2 — EXPLAIN (instanceof NicNacToolError):
//     Returns a structured { ok: false, errorTier: 'explain', code, message }
//     to the SDK. The model sees it as a tool result and explains in plain
//     language. NO incident written — these are expected business errors.
//
//   Tier 3 — ESCALATE (everything else, or Tier 1 retry failed):
//     Best-effort writes a nic_nac_incidents row and returns a friendly
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
//   lib/nic-nac/guardian-telemetry.ts); the extra try/catch around it here
//   is a defense-in-depth contract — incident writes never throw, never
//   mask the tool outcome.

import type { Tool } from 'ai'
import { createHash } from 'crypto'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import { classifyNicNacToolFailure } from '@/lib/nic-nac/tool-failure-classification'
import { recordTradeBoardIntakeFailure } from '@/lib/nic-nac/workflows/trade-board-intake-store'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupportReport } from '@/lib/services/support-reports'
import type { ToolContext } from '../types'

const TRANSIENT_RX = /ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|socket hang up|\b(408|429|502|503|504)\b/i
const TRADE_BOARD_WORKFLOW_TOOLS = new Set([
  'prepare_trade_board_work',
  'search_jewelry_database',
  'add_listing',
])

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
          return await escalate(retryErr, name, ctx, args[0])
        }
      }
      if (err instanceof NicNacToolError) {
        return {
          ok: false,
          errorTier: 'explain' as const,
          code: err.code,
          message: err.userMessage,
        }
      }
      return await escalate(err, name, ctx, args[0])
    }
  }

  // Preserve all original tool metadata (needsApproval, description, etc).
  return { ...(tool as object), execute: wrapped } as Tool
}

function stableInputSignature(input: unknown): string {
  const record =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const safe = {
    mode: record.mode,
    catalogMode: record.catalogMode,
    itemNumber: record.itemNumber,
    designName: record.designName,
    collectionName: record.collectionName,
    collectionYear: record.collectionYear,
    material: record.material,
    mainStone: record.mainStone,
    ringSize: record.ringSize,
    listingPhotoIndex: record.listingPhotoIndex,
    piecePhotoIndex: record.piecePhotoIndex,
    items: Array.isArray(record.items)
      ? record.items.map((item) => {
          const value =
            item && typeof item === 'object'
              ? (item as Record<string, unknown>)
              : {}
          return {
            itemNumber: value.itemNumber,
            material: value.material,
            mainStone: value.mainStone,
            ringSize: value.ringSize,
          }
        })
      : undefined,
  }
  return createHash('sha256').update(JSON.stringify(safe)).digest('hex')
}

function redactFailureMessage(error: unknown): string {
  const message = (error as Error)?.message ?? String(error)
  return message.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, '[image omitted]').slice(0, 500)
}

function formatAddListingSaveFailureMessage(
  error: unknown,
  classification: { code: string; stage: string },
): string {
  const cause = redactFailureMessage(error)
    .replace(/\s+/g, ' ')
    .trim()
  const stageLabel =
    classification.stage === 'catalog_photo_storage'
      ? 'photo upload'
      : classification.stage === 'listing_write'
        ? 'listing save'
        : classification.stage === 'database_write'
          ? 'database save'
          : 'save'
  const detail = cause
    ? ` ${stageLabel} error (${classification.code}): ${cause}`
    : ` ${stageLabel} error (${classification.code}).`
  return `The save failed on the Sparkle Suite side.${detail} I kept your details and confirmed photo, so you can retry once without uploading it again.`
}

async function escalate(
  err: unknown,
  toolName: string,
  ctx: ToolContext,
  toolInput?: unknown,
) {
  const classification = classifyNicNacToolFailure(err)
  const inputSignature = stableInputSignature(toolInput)
  const failureSignature = createHash('sha256')
    .update(
      [
        ctx.activeTradeBoardWorkflow?.id ?? 'no-workflow',
        toolName,
        classification.code,
        classification.stage,
        inputSignature,
      ].join(':'),
    )
    .digest('hex')
  let workflowFailure:
    | Awaited<ReturnType<typeof recordTradeBoardIntakeFailure>>
    | null = null

  if (
    TRADE_BOARD_WORKFLOW_TOOLS.has(toolName) &&
    ctx.activeTradeBoardWorkflow &&
    ['active', 'needs_human_review'].includes(
      ctx.activeTradeBoardWorkflow.status,
    )
  ) {
    try {
      workflowFailure = await recordTradeBoardIntakeFailure(
        createAdminClient(),
        {
          sessionId: ctx.activeTradeBoardWorkflow.id,
          repId: ctx.repId,
          conversationId: ctx.conversationId,
          toolName,
          runId: ctx.runId,
          failureSignature,
          inputSignature,
          errorCode: classification.code,
          errorStage: classification.stage,
          retryable: classification.retryable,
          nowIso: new Date().toISOString(),
        },
      )
    } catch (workflowError) {
      console.error('[nic-nac] workflow failure recording failed', {
        toolName,
        workflowError,
      })
    }
  }

  try {
    await logIncident({
      errorType: 'tool_unhandled',
      repId: ctx.repId,
      conversationId: ctx.conversationId,
      severity: 'error',
      details: {
        toolName,
        runId: ctx.runId,
        workflowId: ctx.activeTradeBoardWorkflow?.id ?? null,
        errorCode: classification.code,
        errorStage: classification.stage,
        retryable: classification.retryable,
        failureSignature,
        attemptNumber: workflowFailure?.failureCount ?? 1,
        workflowStatusAfter:
          workflowFailure?.workflowStatusAfter ?? null,
        inputSignature,
        message: redactFailureMessage(err),
      },
    })
  } catch (logErr) {
    console.error('[nic-nac] nic_nac_incidents write failed', { toolName, logErr })
  }

  if (workflowFailure?.newlyEscalated) {
    const operationLabel =
      toolName === 'add_listing' ? 'backend save' : 'Dance Floor catalog check'
    try {
      await createSupportReport(createAdminClient(), {
        source: 'nic_nac',
        repId: ctx.repId,
        conversationId: ctx.conversationId,
        runId: ctx.runId,
        reportType: 'bug',
        urgency: 'blocking',
        pageOrWorkflow: 'Nic-Nac / Dance Floor add dancer',
        title: `Nic-Nac paused a dancer add (${classification.code})`,
        details:
          `Two matching ${operationLabel} failures paused workflow ${workflowFailure.workflowId}. ` +
          `Stage: ${classification.stage}. Failure signature: ${failureSignature}. ` +
          'The rep-provided details and confirmed photo remain in the durable workflow.',
        expectedResult:
          toolName === 'add_listing'
            ? 'Save the dancer once and preserve the accepted variant and photo.'
            : 'Resolve the catalog path and continue the dancer intake.',
        actualResult: `The ${operationLabel} failed twice and the workflow was paused for human review.`,
        contactOk: true,
      })
    } catch (supportError) {
      console.error('[nic-nac] automatic support report failed', {
        workflowId: workflowFailure.workflowId,
        supportError,
      })
    }
  }

  if (workflowFailure?.workflowStatusAfter === 'needs_human_review') {
    return {
      ok: false,
      errorTier: 'escalate' as const,
      code: classification.code,
      stage: classification.stage,
      needsHumanReview: true,
      message:
        'I paused this dancer add for the Neon Rabbit team to review. Everything already captured in this intake is still saved, so you do not need to start over.',
    }
  }

  if (workflowFailure) {
    return {
      ok: false,
      errorTier: 'escalate' as const,
      code: classification.code,
      stage: classification.stage,
      retryable: true,
      message:
        toolName === 'add_listing'
          ? formatAddListingSaveFailureMessage(err, classification)
          : 'The Dance Floor catalog check failed on the Sparkle Suite side. I kept the intake details, so you can retry once without starting over.',
    }
  }
  return {
    ok: false,
    errorTier: 'escalate' as const,
    message: "Something unexpected happened. I've flagged this for the Neon Rabbit team.",
  }
}
