// Thumper tool registry. Adding a new tool is mechanical:
//   1. Create lib/thumper/tools/<name>.ts that exports a ToolDefinition
//   2. Import and push it into REGISTRY below
// No route.ts changes needed.
//
// buildAllTools(ctx) returns the ToolSet that streamText expects, with each
// tool wrapped in:
//   withErrorHandling( { name, ctx, readOnly }, withTelemetry(name, ctx, raw) )
// Composition order matters — see the header comments in each wrapper.

import type { Tool, ToolSet } from 'ai'
import { listMyTradeBoardTool } from './list-my-trade-board'
import { removeListingTool } from './remove-listing'
import { withTelemetry } from './wrappers/with-telemetry'
import { withErrorHandling } from './wrappers/with-error-handling'
import type { ToolContext, ToolDefinition } from './types'

const REGISTRY: ToolDefinition[] = [
  listMyTradeBoardTool,
  removeListingTool,
]

export function buildAllTools(ctx: ToolContext): ToolSet {
  // Fail loudly on duplicate tool names — Object.fromEntries silently
  // overwrites, which would let a buggy registry ship without warning.
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const def of REGISTRY) {
    if (seen.has(def.name)) dupes.push(def.name)
    seen.add(def.name)
  }
  if (dupes.length) {
    throw new Error(`[thumper] duplicate tool names in REGISTRY: ${dupes.join(', ')}`)
  }

  const entries: Array<[string, Tool]> = REGISTRY.map((def) => {
    const built = def.build(ctx) as Tool & { needsApproval?: boolean }
    const inner = withTelemetry(def.name, ctx, built)
    const outer = withErrorHandling({ name: def.name, ctx, readOnly: def.readOnly }, inner)
    // Dev-time safety net: assert metadata survived wrapping. If a future
    // wrapper change drops needsApproval, HITL silently breaks — catch it here.
    if ((outer as { needsApproval?: boolean }).needsApproval !== built.needsApproval) {
      throw new Error(`[thumper] needsApproval lost during wrapping for ${def.name}`)
    }
    return [def.name, outer]
  })

  return Object.fromEntries(entries) as ToolSet
}

export type { ToolContext, ToolDefinition } from './types'
