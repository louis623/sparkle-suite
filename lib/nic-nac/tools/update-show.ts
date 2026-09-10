import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { updateShow } from '@/lib/services/calendar'
import { ServiceError } from '@/lib/services/errors'
import { writeTradeActionAudit } from '@/lib/nic-nac/audit'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const inputSchema = z
  .object({
    eventId: z.string().uuid(),
    platform: z.string().optional(),
    eventTime: z.iso.datetime({ offset: true }).describe('ISO timestamp with an explicit UTC offset or Z. timeZone is not a substitute for the offset.').optional(),
    timeZone: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    discountCodes: z.array(z.object({
      code: z.string().min(1),
      description: z.string(),
    })).max(10).optional(),
    featuredCollections: z.array(z.string()).optional(),
    streamingDestinations: z.array(z.object({
      platform: z.string().min(1),
      url: z.url(),
      label: z.string().optional(),
    })).optional(),
    applyToSeries: z.boolean().optional().default(false),
  })
  .refine(
    (value) =>
      value.platform !== undefined ||
      value.eventTime !== undefined ||
      value.timeZone !== undefined ||
      value.durationMinutes !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.discountCodes !== undefined ||
      value.featuredCollections !== undefined ||
      value.streamingDestinations !== undefined,
    { message: 'at least one patch field is required' },
  )

function explainServiceError(err: unknown): never {
  if (err instanceof ServiceError) {
    throw new NicNacToolError({
      code: err.code,
      userMessage: err.userMessage,
      cause: err,
    })
  }
  throw err
}

function normalizeOptionalToolText(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (!/[A-Za-z0-9]/.test(trimmed)) return undefined
  return trimmed
}

function latestTurnRequestsDurationChange(text: string | undefined) {
  if (!text) return true
  const explicitDuration = /\b(?:duration|length|run(?:s)?\s+for|last(?:s)?\s+for|\d+(?:\.\d+)?\s*(?:minutes?|hours?|hrs?)|(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:minutes?|hours?|hrs?))\b/i
  const explicitEndTime = /\b(?:end(?:s|ing)?|finish(?:es|ing)?|stop(?:s|ping)?|go(?:es|ing)?\s+until|until)\b[^.!?]{0,40}\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\b/i
  const clockRange = /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\s*(?:-|–|—|to|through)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i
  const fromClockRange = /\bfrom\s+\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s+(?:to|through|until)\s+\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\b/i
  return explicitDuration.test(text) || explicitEndTime.test(text) || clockRange.test(text) || fromClockRange.test(text)
}

export function makeUpdateShowTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
  latestUserText?: string
}) {
  return tool({
    description:
      'Update details on a scheduled show. Can change time, platform, title, description, discount codes, or featured collections. A show platform always uses the matching link configured in the rep\'s customer-site social settings; do not collect or save a separate event URL. ' +
      'Set applyToSeries=true to apply non-time changes to the selected occurrence and every future show in its recurring series. ' +
      'A rep who changes the end time or gives a new start-to-end range is explicitly changing duration; include durationMinutes. ' +
      'Do not combine applyToSeries=true with eventTime. Do not include durationMinutes unless the rep asks to change duration, length, end time, or a start-to-end range.',
    inputSchema,
    execute: async (input) => {
      const {
        eventId,
        discountCodes,
        featuredCollections,
        streamingDestinations,
        applyToSeries,
      } = input
      const platform = normalizeOptionalToolText(input.platform)
      const eventTime = normalizeOptionalToolText(input.eventTime)
      const timeZone = normalizeOptionalToolText(input.timeZone)
      const title = normalizeOptionalToolText(input.title)
      const description = normalizeOptionalToolText(input.description)
      const durationMinutes = latestTurnRequestsDurationChange(ctx.latestUserText)
        ? input.durationMinutes
        : undefined

      const patch = {
        platform,
        eventTime,
        timeZone,
        durationMinutes,
        title,
        description,
        discountCodes,
        featuredCollections,
        streamingDestinations,
        applyToSeries,
      }

      const patchedFields = Object.entries(patch)
        .filter(([key, value]) => key !== 'applyToSeries' && value !== undefined)
        .map(([key]) => key)

      if (patchedFields.length === 0) {
        throw new NicNacToolError({
          code: 'NO_PATCH_FIELDS',
          userMessage: 'Tell me what you want to change on that show.',
        })
      }

      let result: Awaited<ReturnType<typeof updateShow>>
      try {
        result = await updateShow(ctx.supabase, ctx.repId, eventId, patch)
      } catch (err) {
        explainServiceError(err)
      }

      try {
        await writeTradeActionAudit({
          actionType: 'update_show',
          repId: ctx.repId,
          targetListingId: null,
          beforeState: {
            eventId,
            repId: ctx.repId,
            status: 'scheduled',
          },
          afterState: {
            eventId: result.event.id,
            repId: ctx.repId,
            status: result.event.status,
            patchedFields,
          },
          details: { runId: ctx.runId, conversationId: ctx.conversationId },
        })
      } catch (auditErr) {
        console.error('[nic-nac] trade_action_audit write failed', {
          eventId,
          auditErr,
        })
        try {
          await logIncident({
            errorType: 'audit_write_failed',
            repId: ctx.repId,
            conversationId: ctx.conversationId,
            severity: 'warn',
            details: {
              toolName: 'update_show',
              runId: ctx.runId,
              eventId,
              message: (auditErr as Error)?.message,
            },
          })
        } catch {
          /* swallow */
        }
      }

      return {
        event: result.event,
        updatedCount: result.updatedCount,
        patchedFields,
        seriesApplied: applyToSeries ?? false,
      }
    },
  })
}

export const updateShowTool: ToolDefinition = {
  name: 'update_show',
  readOnly: false,
  build: (ctx) =>
    makeUpdateShowTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      latestUserText: ctx.latestUserText,
    }),
}
