import { z } from 'zod'
import { tool } from 'ai'
import {
  NIC_NAC_SHOW_EVENT_TYPES,
  recordNicNacShowSessionEvent,
} from '@/lib/nic-nac/show-sessions'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  sessionId: z.string().min(1),
  eventType: z.enum(NIC_NAC_SHOW_EVENT_TYPES),
  summary: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export function makeRecordShowSessionEventTool(ctx: {
  repId: string
  supabase: never
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      'Record a structured event in the current show session. Use for promises, follow-ups, queue snapshots, customer requests, inventory notes, swap notes, and show summaries.',
    inputSchema,
    execute: async ({ sessionId, eventType, summary, payload }) =>
      recordNicNacShowSessionEvent(ctx.supabase, {
        sessionId,
        repId: ctx.repId,
        eventType,
        summary,
        payload,
        conversationId: ctx.conversationId,
        runId: ctx.runId,
      }),
  })
}

export const recordShowSessionEventTool: ToolDefinition = {
  name: 'record_show_session_event',
  readOnly: false,
  build: (ctx) =>
    makeRecordShowSessionEventTool({
      repId: ctx.repId,
      supabase: ctx.supabase as never,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
