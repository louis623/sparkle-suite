import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCustomerAudience } from '@/lib/services/customer-audience'
import { ServiceError } from '@/lib/services/errors'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

export const inputSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  favoriteCollection: z.string().trim().min(1).max(160).optional(),
  favoriteCut: z.string().trim().min(1).max(120).optional(),
  birthdayMonth: z.number().int().min(1).max(12).optional(),
  channelFilter: z.enum(['all', 'sms', 'email', 'marketing']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

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

export function makeCustomerAudienceTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      "List the authenticated rep's saved customer audience and subscriber counts. " +
      'Use this when the rep asks for their customer list, subscriber list, who can receive texts, who can receive emails, or how many opt-ins they have right now. ' +
      'Search all saved customer cards using query (name or private distinguishing label), favoriteCollection, favoriteCut, birthdayMonth (1–12), and optional channelFilter. Filters run before limit. Use this for preferences, birthdays and customer lookup during a live lineup. Same full names can belong to different people: show distinguishing labels and ask which card before editing. Returns stable customer IDs and profileVersion for safe edits. Audience selection does not send any messages.',
    inputSchema,
    execute: async (filters) => {
      try {
        return await getCustomerAudience(ctx.supabase, ctx.repId, {
          ...filters,
        })
      } catch (err) {
        explainServiceError(err)
      }
    },
  })
}

export const customerAudienceTool: ToolDefinition = {
  name: 'get_customer_audience',
  readOnly: true,
  build: (ctx) =>
    makeCustomerAudienceTool({ repId: ctx.repId, supabase: ctx.supabase }),
}
