import type { ToolSet } from 'ai'
import type { NicNacProductContext } from '@/lib/nic-nac/core/product-context'
import {
  filterNicNacToolIntentsForContext,
  type NicNacBlockedToolIntent,
} from '@/lib/nic-nac/core/tool-policy'
import {
  WORKSPACE_TOOL_INTENTS,
  buildToolsForIntents,
  type NicNacToolIntent,
} from '@/lib/nic-nac/tools'
import {
  getNicNacToolSafetyEntry,
  type NicNacToolSafetyLedgerEntry,
} from '@/lib/nic-nac/tools/safety-ledger'
import type { ToolContext } from '@/lib/nic-nac/tools/types'
import { repAskedToUpdateSharedCatalogImage } from '@/lib/nic-nac/core/stream-output-guard'
import type { NicNacAgentMode } from '@/lib/nic-nac/agent/instructions'

export type NicNacCapabilityCatalogSource =
  | 'workspace_permissions'
  | 'required_setup_permissions'

export type NicNacCapabilityCatalog = {
  source: NicNacCapabilityCatalogSource
  mode: NicNacAgentMode
  tools: ToolSet
  toolNames: string[]
  toolSafety: NicNacToolSafetyLedgerEntry[]
  requestedIntents: NicNacToolIntent[]
  allowedIntents: NicNacToolIntent[]
  blockedIntents: NicNacBlockedToolIntent[]
  blockedToolNames: string[]
  operatorRestrictedToolNames: string[]
  harnessExcludedToolNames: string[]
}

export type BuildNicNacCapabilityCatalogInput = {
  mode?: NicNacAgentMode
  productContext: NicNacProductContext
  toolContext: ToolContext
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

const AGENT_EXCLUDED_TOOL_NAMES = new Set([
  // The ToolLoopAgent should reason directly across the Calendar read/write
  // tools. This retired regex/text resolver must not compete with the model.
  'prepare_calendar_work',
  // Keep direct outbound sends out of the default agent catalog during this
  // correction slice. Reintroducing them based on wording would recreate a
  // pre-model intent router.
  'send_sms_notification',
  'send_email_notification',
])

/**
 * Builds the complete capability set for the current product surface.
 *
 * This deliberately does not inspect user text or old workflow intent. The
 * product policy, authenticated permissions, support-session capabilities,
 * and required-setup mode decide what the model is allowed to use. The model
 * decides which allowed capability fits the current request.
 */
export function buildNicNacCapabilityCatalog({
  mode = 'workspace',
  productContext,
  toolContext,
}: BuildNicNacCapabilityCatalogInput): NicNacCapabilityCatalog {
  const requestedIntents: NicNacToolIntent[] =
    mode === 'required_setup'
      ? ['required_setup']
      : [...WORKSPACE_TOOL_INTENTS]
  const policy = filterNicNacToolIntentsForContext(
    productContext,
    requestedIntents,
  )
  const allowedTools = buildToolsForIntents(toolContext, policy.allowedIntents)
  const allowCatalogPhotoTool = repAskedToUpdateSharedCatalogImage(
    toolContext.latestUserText ?? '',
  )
  const harnessExcludedToolNames = Object.keys(allowedTools).filter((name) =>
    AGENT_EXCLUDED_TOOL_NAMES.has(name),
  )
  const tools = Object.fromEntries(
    Object.entries(allowedTools).filter(([name]) => {
      if (AGENT_EXCLUDED_TOOL_NAMES.has(name)) return false
      if (name === 'report_jewelry_catalog_issue' && !allowCatalogPhotoTool) return false
      return true
    }).map(([name, definition]) => [name, {
      ...definition,
      // Responses otherwise normalizes omitted strictness and may require
      // optional fields (e.g. recurrence on a one-time show). Preserve the
      // app-owned Zod contract; SDK validation and approvals still run.
      strict: definition.strict ?? false,
    }]),
  ) as ToolSet
  const toolNames = Object.keys(tools)
  const toolSafety = toolNames.map((toolName) => {
    const entry = getNicNacToolSafetyEntry(toolName)
    if (!entry) {
      throw new Error(
        `[nic-nac] Refusing to expose unclassified agent tool: ${toolName}`,
      )
    }
    return entry
  })
  const operatorRestrictedToolNames = toolContext.operatorSupport
    ? policy.allowedToolNames.filter(
        (name) =>
          !toolNames.includes(name) &&
          !AGENT_EXCLUDED_TOOL_NAMES.has(name),
      )
    : []

  return {
    source:
      mode === 'required_setup'
        ? 'required_setup_permissions'
        : 'workspace_permissions',
    mode,
    tools,
    toolNames,
    toolSafety,
    requestedIntents,
    allowedIntents: policy.allowedIntents,
    blockedIntents: policy.blockedIntents,
    blockedToolNames: unique([
      ...policy.blockedToolNames,
      ...operatorRestrictedToolNames,
    ]),
    operatorRestrictedToolNames,
    harnessExcludedToolNames,
  }
}
