import { tool } from 'ai'
import { z } from 'zod'
import { ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ToolDefinition } from './types'

const inputSchema = z.object({})

export const ensureLiveQueueSyncCodeTool: ToolDefinition = {
  name: 'ensure_live_queue_sync_code',
  readOnly: false,
  build: (ctx) =>
    tool({
      description:
        'Create or return the authenticated rep Live Lineup sync code during required setup.',
      inputSchema,
      execute: async () => {
        const admin = createAdminClient()
        return ensureLiveQueueSyncCodeForRep(admin, { repId: ctx.repId })
      },
    }),
}
