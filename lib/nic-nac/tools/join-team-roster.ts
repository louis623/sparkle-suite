import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import { getTeamOnboardingAccess } from '@/lib/services/team-onboarding'
import {
  getJoinTeamRoster,
  removeJoinTeamMember,
  reorderJoinTeamRoster,
  upsertJoinTeamMember,
} from '@/lib/services/join-team-roster'
import { NicNacToolError } from '@/lib/nic-nac/errors'
import type { ToolDefinition } from './types'

const linksSchema = z.object({
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  youtube: z.string().optional(),
  whatnot: z.string().optional(),
})

const memberSchema = z.object({
  id: z.string().optional(),
  displayName: z.string(),
  businessName: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  initials: z.string().optional(),
  photoUrl: z.string().optional(),
  photoAlt: z.string().optional(),
  imageClassName: z.string().optional(),
  bio: z.string().optional(),
  birthday: z
    .string()
    .regex(/^\d{2}-\d{2}$/, 'Birthday must use MM-DD with no year.')
    .nullable()
    .optional(),
  links: linksSchema.optional(),
  sortOrder: z.number().optional(),
  isVisible: z.boolean().optional(),
})

const manageSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('upsert'),
    member: memberSchema,
  }),
  z.object({
    action: z.literal('remove'),
    memberId: z.string(),
  }),
  z.object({
    action: z.literal('reorder'),
    memberIds: z.array(z.string()).min(1),
  }),
])

function throwToolError(error: unknown): never {
  if (error instanceof ServiceError) {
    throw new NicNacToolError({
      code: error.code,
      userMessage: error.userMessage,
      cause: error,
    })
  }

  throw error
}

async function requireTeamManagementAccess(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  const access = await getTeamOnboardingAccess(ctx.supabase, ctx.repId)
  if (access.enabled) return

  throw new ServiceError({
    code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
    message: 'team management entitlement is not enabled',
    userMessage: 'Team Management is not enabled for this workspace.',
    statusCode: 403,
  })
}

export function makeListJoinTeamRosterTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      'List the authenticated rep join-team roster cards, including private month-and-day birthdays, hidden cards, photos, sort order, and social/website links.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        await requireTeamManagementAccess(ctx)
        const members = await getJoinTeamRoster(ctx.supabase, ctx.repId, {
          visibleOnly: false,
        })
        return {
          count: members.length,
          members,
        }
      } catch (error) {
        throwToolError(error)
      }
    },
  })
}

export function makeManageJoinTeamRosterTool(ctx: {
  repId: string
  supabase: SupabaseClient
}) {
  return tool({
    description:
      'Add, update, remove, hide/show, or reorder join-team roster cards for the authenticated rep public Join Team page. A birthday is private and must be MM-DD with no year. Removing a team member requires visible rep approval before it executes. Supported links include TikTok, Facebook/VIP, Instagram, website/globe, YouTube, and Whatnot.',
    inputSchema: manageSchema,
    needsApproval: (input) => input.action === 'remove',
    execute: async (input) => {
      try {
        await requireTeamManagementAccess(ctx)
        if (input.action === 'remove') {
          return {
            action: 'remove',
            ...(await removeJoinTeamMember(ctx.supabase, ctx.repId, input.memberId)),
          }
        }

        if (input.action === 'reorder') {
          return {
            action: 'reorder',
            ...(await reorderJoinTeamRoster(ctx.supabase, ctx.repId, {
              memberIds: input.memberIds,
            })),
          }
        }

        return {
          action: 'upsert',
          member: await upsertJoinTeamMember(ctx.supabase, ctx.repId, input.member),
        }
      } catch (error) {
        throwToolError(error)
      }
    },
  })
}

export const listJoinTeamRosterTool: ToolDefinition = {
  name: 'list_join_team_roster',
  readOnly: true,
  build: (ctx) =>
    makeListJoinTeamRosterTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
    }),
}

export const manageJoinTeamRosterTool: ToolDefinition = {
  name: 'manage_join_team_roster',
  readOnly: false,
  build: (ctx) =>
    makeManageJoinTeamRosterTool({
      repId: ctx.repId,
      supabase: ctx.supabase,
    }),
}
