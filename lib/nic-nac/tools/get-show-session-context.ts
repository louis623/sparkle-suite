import { z } from 'zod'
import { tool } from 'ai'
import { loadNicNacShowSessionContext } from '@/lib/nic-nac/show-sessions'
import { loadOwnedShowLineup } from '@/lib/live-lineup/show-context'
import type { ToolDefinition } from './types'

const inputSchema = z.object({
  eventLimit: z.number().int().positive().max(50).default(20),
  memoryLimit: z.number().int().positive().max(20).default(10),
})

export function makeGetShowSessionContextTool(ctx: {
  repId: string
  supabase: never
}) {
  return tool({
    description:
      "Recall the authenticated rep's current live-show notes and recent show events. Use quietly when helping during a live or wrapping up afterward.",
    inputSchema,
    execute: async ({ eventLimit = 20, memoryLimit = 10 }) =>
      loadNicNacShowSessionContext(ctx.supabase, ctx.repId, {
        eventLimit,
        memoryLimit,
        loadEffectiveLineup: () => loadOwnedShowLineup(ctx.repId),
      }),
  })
}

export const getShowSessionContextTool: ToolDefinition = {
  name: 'get_show_session_context',
  readOnly: true,
  build: (ctx) =>
    makeGetShowSessionContextTool({
      repId: ctx.repId,
      supabase: ctx.supabase as never,
    }),
}
