import type { CalendarEvent } from '@/lib/services/types'
import type { ToolContext } from '@/lib/nic-nac/tools/types'
import { updateCalendarWorkflowSession } from './calendar-workflow-store'

const COMPLETING_CALENDAR_TOOLS = new Set([
  'add_show',
  'update_show',
  'cancel_show',
  'skip_show_occurrence',
  'cancel_show_series',
  'pause_show_series',
  'end_show',
])

type CalendarToolOutput = {
  event?: CalendarEvent
  events?: CalendarEvent[]
  firstEvent?: CalendarEvent | null
  lastEvent?: CalendarEvent | null
  count?: number
  updatedCount?: number
  cancelledCount?: number
  pausedCount?: number
}

function extractEventIds(output: unknown): string[] {
  const result = output as CalendarToolOutput
  const ids = new Set<string>()
  if (result.event?.id) ids.add(result.event.id)
  if (result.firstEvent?.id) ids.add(result.firstEvent.id)
  if (result.lastEvent?.id) ids.add(result.lastEvent.id)
  for (const event of result.events ?? []) {
    if (event?.id) ids.add(event.id)
  }
  return [...ids]
}

function extractResultCount(toolName: string, output: unknown) {
  const result = output as CalendarToolOutput
  if (typeof result.count === 'number') return result.count
  if (typeof result.updatedCount === 'number') return result.updatedCount
  if (typeof result.cancelledCount === 'number') return result.cancelledCount
  if (typeof result.pausedCount === 'number') return result.pausedCount
  if (toolName === 'cancel_show' || toolName === 'skip_show_occurrence' || toolName === 'end_show') {
    return result.event ? 1 : undefined
  }
  return undefined
}

export async function finalizeCalendarWorkflowAfterWrite(args: {
  toolName: string
  ctx: ToolContext
  output: unknown
}) {
  const workflow = args.ctx.activeCalendarWorkflow
  if (!workflow || workflow.status !== 'active') return
  if (!COMPLETING_CALENDAR_TOOLS.has(args.toolName)) return

  const resultEventIds = extractEventIds(args.output)
  await updateCalendarWorkflowSession(args.ctx.supabase, {
    ...workflow,
    status: 'completed',
    phase: 'completed',
    missingFields: [],
    candidateEventIds: resultEventIds.length ? resultEventIds : workflow.candidateEventIds,
    knownFields: {
      ...workflow.knownFields,
      completedToolName: args.toolName,
      resultEventIds,
      resultCount: extractResultCount(args.toolName, args.output),
    },
  })
}
