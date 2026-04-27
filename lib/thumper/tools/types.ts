// Shared types for the Thumper tool registry. Every tool file under
// lib/thumper/tools/ exports a ToolDefinition that the barrel
// (lib/thumper/tools/index.ts) feeds into buildAllTools(ctx).

import type { Tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ToolContext = {
  repId: string
  supabase: SupabaseClient
  conversationId: string
  runId: string
}

export type ToolDefinition = {
  name: string
  /**
   * Read-only tools are eligible for Tier 1 transient retry.
   * Write/mutation tools must be false to avoid double-applying side effects.
   */
  readOnly: boolean
  build: (ctx: ToolContext) => Tool
}
