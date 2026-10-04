import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createCustomerAudienceContact,
  updateCustomerAudienceContact,
} from '@/lib/services/customer-audience'
import { ServiceError } from '@/lib/services/errors'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const optionalContactFields = {
  identityLabel: z.string().trim().max(80).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(3).optional(),
  address: z.string().trim().max(500).optional(),
  birthday: z.string().regex(/^\d{2}-\d{2}$/).optional(),
  favoriteGemOrStone: z.string().trim().max(120).optional(),
  favoriteMaterial: z.string().trim().max(120).optional(),
  favoriteCut: z.string().trim().max(120).optional(),
  favoriteCollection: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
}

const createContactFields = {
  name: z.string().trim().min(1),
  ...optionalContactFields,
}

export const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), ...createContactFields }),
  z.object({
    action: z.literal('update'),
    audienceId: z.string().uuid(),
    expectedVersion: z.number().int().min(0),
    name: z.string().trim().min(1).optional(),
    ...optionalContactFields,
  }),
])

function explainServiceError(error: unknown): never {
  if (error instanceof ServiceError) {
    throw new NicNacToolError({
      code: error.code,
      userMessage: error.userMessage,
      cause: error,
    })
  }
  throw error
}

export function makeManageCustomerContactTool(ctx: {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}) {
  return tool({
    description:
      "Create a contact in the authenticated rep's Customer List or update one identified contact's editable profile fields. " +
      'Requires explicit approval. Contact creation and profile edits never create or change SMS, email, or marketing consent; those are captured only by the customer-facing signup flow. Before updating, retrieve the customer using get_customer_audience and pass its profileVersion as expectedVersion. If multiple people match, ask the rep to choose using identityLabel and ID; never pick the first result. Update only supplied fields, preserving other details. identityLabel is a private distinguishing label, not a replacement name. A stale version requires a fresh read and review.',
    inputSchema,
    needsApproval: true,
    execute: async (input) => {
      const context = {
        actorKind: 'nic_nac' as const,
        actorRepId: ctx.repId,
        nicNacConversationId: ctx.conversationId,
        nicNacRunId: ctx.runId,
      }
      try {
        if (input.action === 'create') {
          const customer = await createCustomerAudienceContact(
            ctx.supabase,
            ctx.repId,
            input,
            context,
          )
          return { action: 'created' as const, customer }
        }

        const customer = await updateCustomerAudienceContact(
          ctx.supabase,
          ctx.repId,
          input,
          context,
        )
        if (!customer) {
          throw new NicNacToolError({
            code: 'CUSTOMER_NOT_FOUND',
            userMessage: "I couldn't find that customer in your Customer List.",
          })
        }
        return { action: 'updated' as const, customer }
      } catch (error) {
        explainServiceError(error)
      }
    },
  })
}

export const manageCustomerContactTool: ToolDefinition = {
  name: 'manage_customer_contact',
  readOnly: false,
  build: (ctx) =>
    makeManageCustomerContactTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
      conversationId: ctx.conversationId,
      runId: ctx.runId,
    }),
}
