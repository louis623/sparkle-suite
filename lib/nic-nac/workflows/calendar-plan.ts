import type { AddShowInput, RecurringShowInput } from '@/lib/services/types'
import type {
  CalendarWorkflowKnownFields,
  CalendarWorkflowSessionState,
} from './calendar-workflow-types'
import { mergeCalendarKnownFieldsFromText } from './calendar-workflow-controller'

export type CalendarPlanOperation =
  | 'create_one_time'
  | 'create_exact_count'
  | 'create_recurring_series'
  | 'update_event'
  | 'update_series'
  | 'cancel_event'
  | 'skip_occurrence'
  | 'cancel_series_future'
  | 'pause_series_range'
  | 'list'

export type CalendarPlanSource = 'workflow' | 'latest_user_text' | 'model_input'

export type CalendarPlanContradiction =
  | 'model_added_recurring_without_rep_intent'
  | 'model_omitted_rep_recurring_intent'
  | 'model_changed_exact_count_to_series'
  | 'model_changed_series_to_exact_count'
  | 'series_mode_with_bounded_count'
  | 'exact_count_mode_without_count'
  | 'stale_workflow_title_mismatch'

export interface CalendarPlan {
  operation: CalendarPlanOperation
  source: CalendarPlanSource
  normalizedRecurring?: RecurringShowInput
  missingFields: string[]
  contradictions: CalendarPlanContradiction[]
  requiresApproval: boolean
  recommendedTools: string[]
  preview: {
    occurrenceCount?: number
    recurrenceMode?: RecurringShowInput['mode']
    cadence?: RecurringShowInput['cadence']
    duration?: RecurringShowInput['duration']
  }
}

type AddShowDraft = AddShowInput & {
  recurring?: RecurringShowInput
}

type CalendarPlanFields = {
  platform?: string
  eventTime?: string
  timeZone?: string
  title?: string
  durationMinutes?: number
  description?: string | null
}

function normalizeTitle(value: string | null | undefined) {
  return value?.trim().toLowerCase() || undefined
}

function titlesCompatible(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeTitle(a)
  const right = normalizeTitle(b)
  return Boolean(left && right && left === right)
}

function occurrenceCountFor(recurring: RecurringShowInput | undefined) {
  if (!recurring) return undefined
  if (recurring.occurrenceCount !== undefined) return recurring.occurrenceCount
  if (recurring.cadence === 'daily') {
    if (recurring.duration === '1_month') return 30
    if (recurring.duration === '3_months') return 90
    return 180
  }
  if (recurring.cadence === 'weekday') {
    if (recurring.duration === '1_month') return 23
    if (recurring.duration === '3_months') return 66
    return 130
  }
  if (recurring.duration === '1_month') return 4
  if (recurring.duration === '3_months') return 13
  return 26
}

function normalizeRecurring(
  recurring: CalendarWorkflowKnownFields['recurring'] | RecurringShowInput | undefined,
): RecurringShowInput | undefined {
  if (!recurring) return undefined
  const mode = recurring.mode ?? (recurring.occurrenceCount !== undefined ? 'exact_count' : 'series')
  const normalized: RecurringShowInput = {
    cadence: recurring.cadence,
    duration: recurring.duration,
    mode,
  }
  if (recurring.occurrenceCount !== undefined) {
    normalized.occurrenceCount = recurring.occurrenceCount
  }
  return normalized
}

function missingAddShowFields(fields: CalendarPlanFields) {
  const missingFields: string[] = []
  if (!fields.platform?.trim()) missingFields.push('platform')
  if (!fields.eventTime?.trim()) missingFields.push('eventTime')
  if (!fields.timeZone?.trim()) missingFields.push('timeZone')
  return missingFields
}

export function buildCalendarCreatePlan(args: {
  source: CalendarPlanSource
  fields: CalendarPlanFields
  recurring?: CalendarWorkflowKnownFields['recurring'] | RecurringShowInput
  contradictions?: CalendarPlanContradiction[]
}): CalendarPlan {
  const normalizedRecurring = normalizeRecurring(args.recurring)
  const contradictions = [...(args.contradictions ?? [])]

  if (normalizedRecurring?.mode === 'series' && normalizedRecurring.occurrenceCount !== undefined) {
    contradictions.push('series_mode_with_bounded_count')
  }
  if (normalizedRecurring?.mode === 'exact_count' && normalizedRecurring.occurrenceCount === undefined) {
    contradictions.push('exact_count_mode_without_count')
  }

  const operation: CalendarPlanOperation = !normalizedRecurring
    ? 'create_one_time'
    : normalizedRecurring.mode === 'exact_count'
      ? 'create_exact_count'
      : 'create_recurring_series'

  return {
    operation,
    source: args.source,
    normalizedRecurring,
    missingFields: missingAddShowFields(args.fields),
    contradictions,
    requiresApproval: false,
    recommendedTools: ['add_show'],
    preview: {
      occurrenceCount: occurrenceCountFor(normalizedRecurring),
      recurrenceMode: normalizedRecurring?.mode,
      cadence: normalizedRecurring?.cadence,
      duration: normalizedRecurring?.duration,
    },
  }
}

export function buildCalendarPlanFromText(requestText: string): CalendarPlan {
  const fields = mergeCalendarKnownFieldsFromText({}, requestText)
  return buildCalendarCreatePlan({
    source: 'latest_user_text',
    fields,
    recurring: fields.recurring,
  })
}

function trustedWorkflowRecurring(
  workflow: CalendarWorkflowSessionState | null | undefined,
  input: AddShowDraft,
) {
  if (!workflow?.knownFields.recurring) return undefined
  if (workflow.intent !== 'add_show') return undefined
  if (!titlesCompatible(workflow.knownFields.title, input.title)) return undefined
  return workflow.knownFields.recurring
}

function trustedLatestTextRecurring(latestUserText: string | undefined, input: AddShowDraft) {
  if (!latestUserText) return undefined
  const fields = mergeCalendarKnownFieldsFromText({}, latestUserText)
  if (!fields.recurring) return undefined
  if (!titlesCompatible(fields.title, input.title)) return undefined
  return fields.recurring
}

function calendarWorkflowAllowsRecurring(
  workflow: CalendarWorkflowSessionState | null | undefined,
) {
  if (!workflow) return true
  return Boolean(workflow.knownFields.recurring)
}

export function reconcileAddShowInputWithCalendarPlan(args: {
  input: AddShowDraft
  latestUserText?: string
  activeCalendarWorkflow?: CalendarWorkflowSessionState | null
}): { input: AddShowInput; plan: CalendarPlan } {
  const contradictions: CalendarPlanContradiction[] = []
  const workflowRecurring = trustedWorkflowRecurring(args.activeCalendarWorkflow, args.input)
  const latestTextRecurring = workflowRecurring
    ? undefined
    : trustedLatestTextRecurring(args.latestUserText, args.input)

  let recurringSource: CalendarPlanSource = 'model_input'
  let recurring = args.input.recurring

  if (workflowRecurring) {
    recurring = workflowRecurring
    recurringSource = 'workflow'
  } else if (latestTextRecurring) {
    recurring = latestTextRecurring
    recurringSource = 'latest_user_text'
  } else if (
    args.activeCalendarWorkflow?.intent === 'add_show' &&
    args.activeCalendarWorkflow.knownFields.title &&
    !titlesCompatible(args.activeCalendarWorkflow.knownFields.title, args.input.title)
  ) {
    contradictions.push('stale_workflow_title_mismatch')
  }

  if ((workflowRecurring || latestTextRecurring) && !args.input.recurring) {
    contradictions.push('model_omitted_rep_recurring_intent')
  }
  if (
    (workflowRecurring || latestTextRecurring) &&
    args.input.recurring?.occurrenceCount !== undefined &&
    recurring?.occurrenceCount === undefined
  ) {
    contradictions.push('model_changed_series_to_exact_count')
  }
  if (
    (workflowRecurring || latestTextRecurring)?.occurrenceCount !== undefined &&
    args.input.recurring &&
    args.input.recurring.occurrenceCount === undefined
  ) {
    contradictions.push('model_changed_exact_count_to_series')
  }

  if (recurring && !calendarWorkflowAllowsRecurring(args.activeCalendarWorkflow) && !latestTextRecurring) {
    recurring = undefined
    contradictions.push('model_added_recurring_without_rep_intent')
  }

  const normalizedRecurring = normalizeRecurring(recurring)
  const reconciledInput: AddShowInput = {
    ...args.input,
    recurring: normalizedRecurring,
  }
  const plan = buildCalendarCreatePlan({
    source: normalizedRecurring ? recurringSource : 'model_input',
    fields: reconciledInput,
    recurring: normalizedRecurring,
    contradictions,
  })

  return { input: reconciledInput, plan }
}
