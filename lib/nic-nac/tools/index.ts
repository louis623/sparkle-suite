// Nic-Nac tool registry. Adding a new tool is mechanical:
//   1. Create lib/nic-nac/tools/<name>.ts that exports a ToolDefinition
//   2. Import and push it into REGISTRY below
// No route.ts changes needed.
//
// buildAllTools(ctx) returns the full ToolSet that streamText expects.
// buildToolsForIntents(ctx, intents) returns a scoped ToolSet for one turn.
// Both paths wrap tools in:
//   withErrorHandling( { name, ctx, readOnly }, withTelemetry(name, ctx, raw) )
// Composition order matters - see the header comments in each wrapper.

import type { Tool, ToolSet } from 'ai'
import {
  isAboutNarrativeCopySubmission,
  isAboutSectionCorrection,
} from '@/lib/nic-nac/site-editing-intent'
import { isCalendarReadQueryText } from '@/lib/nic-nac/calendar-read-intent'
import { listMyTradeBoardTool } from './list-my-trade-board'
import { removeListingTool } from './remove-listing'
import { restoreListingTool } from './restore-listing'
import { addListingTool } from './add-listing'
import { prepareTradeBoardWorkTool } from './prepare-trade-board-work'
import { getTradeRequestsTool } from './get-trade-requests'
import { approveTradeTool } from './approve-trade'
import { approveTradeSwapTool } from './approve-trade-swap'
import { rejectTradeTool } from './reject-trade'
import { getTradeSwapCleanupTool } from './get-trade-swap-cleanup'
import { searchJewelryDatabaseTool } from './search-jewelry-database'
import { reportJewelryCatalogIssueTool } from './report-jewelry-catalog-issue'
import { updateListingTool } from './update-listing'
import { getTradeHistoryTool } from './get-trade-history'
import { getFulfillmentQueueTool } from './get-fulfillment-queue'
import { updateFulfillmentStatusTool } from './update-fulfillment-status'
import { addShowTool } from './add-show'
import { prepareCalendarWorkTool } from './prepare-calendar-work'
import { listMyShowsTool } from './list-my-shows'
import { updateShowTool } from './update-show'
import { cancelShowTool } from './cancel-show'
import { skipShowOccurrenceTool } from './skip-show-occurrence'
import { cancelShowSeriesTool } from './cancel-show-series'
import { pauseShowSeriesTool } from './pause-show-series'
import { endShowTool } from './end-show'
import { updateBannerTextTool } from './update-banner-text'
import { updateStreamingLinksTool } from './update-streaming-links'
import { updateSiteSettingTool } from './update-site-setting'
import {
  listJoinTeamRosterTool,
  manageJoinTeamRosterTool,
} from './join-team-roster'
import {
  listSiteRecipesTool,
  manageSiteRecipesTool,
} from './site-recipes'
import { buildSiteRecipeDraftTool } from './build-site-recipe-draft'
import { writeRepNoteTool } from './write-rep-note'
import { readRecentRepNotesTool } from './read-recent-rep-notes'
import { startShowSessionTool } from './start-show-session'
import { recordShowSessionEventTool } from './record-show-session-event'
import { getShowSessionContextTool } from './get-show-session-context'
import { sendSmsNotificationTool } from './send-sms-notification'
import { sendEmailNotificationTool } from './send-email-notification'
import { getNotificationPreferencesTool } from './get-notification-preferences'
import { setNotificationPreferencesTool } from './set-notification-preferences'
import { setShowReminderOverrideTool } from './set-show-reminder-override'
import { customerAudienceTool } from './get-customer-audience'
import { manageCustomerContactTool } from './manage-customer-contact'
import { getHelpResourcesTool } from './get-help-resources'
import { searchWorkKnowledgeTool } from './search-work-knowledge'
import { submitSupportReportTool } from './submit-support-report'
import { getRequiredSetupStateTool } from './get-required-setup-state'
import { ensureLiveQueueSyncCodeTool } from './ensure-live-queue-sync-code'
import { saveRequiredSetupAnswerTool } from './save-required-setup-answer'
import { requestRequiredSetupSupportTool } from './request-required-setup-support'
import { unlockRequiredSetupTool } from './unlock-required-setup'
import { withTelemetry } from './wrappers/with-telemetry'
import { withErrorHandling } from './wrappers/with-error-handling'
import { withOperatorSupportAudit } from './wrappers/with-operator-support-audit'
import { filterOperatorSupportToolNames } from '@/lib/nic-nac/core/operator-support-policy'
import type { ToolContext, ToolDefinition } from './types'

const REGISTRY: ToolDefinition[] = [
  listMyTradeBoardTool,
  prepareTradeBoardWorkTool,
  removeListingTool,
  restoreListingTool,
  addListingTool,
  getTradeRequestsTool,
  approveTradeTool,
  approveTradeSwapTool,
  rejectTradeTool,
  getTradeSwapCleanupTool,
  searchJewelryDatabaseTool,
  reportJewelryCatalogIssueTool,
  updateListingTool,
  getTradeHistoryTool,
  getFulfillmentQueueTool,
  updateFulfillmentStatusTool,
  addShowTool,
  prepareCalendarWorkTool,
  listMyShowsTool,
  updateShowTool,
  cancelShowTool,
  skipShowOccurrenceTool,
  cancelShowSeriesTool,
  pauseShowSeriesTool,
  endShowTool,
  updateBannerTextTool,
  updateStreamingLinksTool,
  updateSiteSettingTool,
  listJoinTeamRosterTool,
  manageJoinTeamRosterTool,
  buildSiteRecipeDraftTool,
  listSiteRecipesTool,
  manageSiteRecipesTool,
  writeRepNoteTool,
  readRecentRepNotesTool,
  startShowSessionTool,
  recordShowSessionEventTool,
  getShowSessionContextTool,
  sendSmsNotificationTool,
  sendEmailNotificationTool,
  getNotificationPreferencesTool,
  setNotificationPreferencesTool,
  setShowReminderOverrideTool,
  customerAudienceTool,
  manageCustomerContactTool,
  getHelpResourcesTool,
  searchWorkKnowledgeTool,
  submitSupportReportTool,
  getRequiredSetupStateTool,
  ensureLiveQueueSyncCodeTool,
  saveRequiredSetupAnswerTool,
  requestRequiredSetupSupportTool,
  unlockRequiredSetupTool,
]

/**
 * Read-only registry metadata for capability and safety audits.
 *
 * Keep the definitions themselves private so callers cannot bypass the normal
 * wrapper stack. The array intentionally preserves registry order and
 * duplicates: the safety audit must be able to detect an accidental duplicate
 * instead of having a Map or object silently hide it.
 */
export function listRegisteredNicNacToolMetadata(): Array<{
  name: string
  readOnly: boolean
}> {
  return REGISTRY.map(({ name, readOnly }) => ({ name, readOnly }))
}

export type NicNacToolIntent =
  | 'memory'
  | 'show_memory'
  | 'trade_board'
  | 'trade_requests'
  | 'fulfillment'
  | 'catalog'
  | 'calendar'
  | 'site'
  | 'notification'
  | 'audience'
  | 'resources'
  | 'required_setup'

const TOOL_PACKS: Record<NicNacToolIntent, string[]> = {
  memory: ['read_recent_rep_notes', 'write_rep_note'],
  show_memory: [
    'get_show_session_context',
    'start_show_session',
    'end_show',
    'record_show_session_event',
  ],
  trade_board: [
    'prepare_trade_board_work',
    'list_my_trade_board',
    'remove_listing',
    'restore_listing',
    'add_listing',
    'update_listing',
    'search_jewelry_database',
    'report_jewelry_catalog_issue',
  ],
  trade_requests: [
    'get_trade_requests',
    'approve_trade',
    'approve_trade_swap',
    'reject_trade',
    'get_trade_swap_cleanup',
    'get_trade_history',
  ],
  fulfillment: ['get_fulfillment_queue', 'update_fulfillment_status'],
  catalog: ['search_jewelry_database', 'report_jewelry_catalog_issue'],
  calendar: [
    'prepare_calendar_work',
    'add_show',
    'list_my_shows',
    'update_show',
    'cancel_show',
    'skip_show_occurrence',
    'cancel_show_series',
    'pause_show_series',
    'end_show',
  ],
  site: [
    'update_banner_text',
    'update_streaming_links',
    'update_site_setting',
    'list_join_team_roster',
    'manage_join_team_roster',
    'build_site_recipe_draft',
    'list_site_recipes',
    'manage_site_recipes',
  ],
  notification: [
    'prepare_calendar_work',
    'send_sms_notification',
    'send_email_notification',
    'get_notification_preferences',
    'set_notification_preferences',
    'set_show_reminder_override',
    'get_customer_audience',
    'manage_customer_contact',
  ],
  audience: [
    'prepare_calendar_work',
    'get_customer_audience',
    'manage_customer_contact',
    'get_notification_preferences',
    'set_notification_preferences',
    'set_show_reminder_override',
  ],
  resources: [
    'get_help_resources',
    'search_work_knowledge',
    'submit_support_report',
  ],
  required_setup: [
    'get_required_setup_state',
    'ensure_live_queue_sync_code',
    'save_required_setup_answer',
    'request_required_setup_support',
    'unlock_required_setup',
  ],
}

// Authenticated workspace conversations keep every normal rep capability in
// scope on every turn. Text routing and durable workflows still decide which
// tool Nic-Nac should use, while product policy, tool-level authorization, and
// approval gates remain the final safety boundaries. Required setup is kept
// separate because that mode has its own deliberately restricted tool set.
export const WORKSPACE_TOOL_INTENTS: readonly NicNacToolIntent[] = [
  'memory',
  'show_memory',
  'trade_board',
  'trade_requests',
  'fulfillment',
  'catalog',
  'calendar',
  'site',
  'notification',
  'audience',
  'resources',
]

export function addWorkspaceBaselineToolIntents(
  intents: NicNacToolIntent[],
): NicNacToolIntent[] {
  const merged: NicNacToolIntent[] = intents.filter(
    (intent) => intent !== 'required_setup',
  )
  for (const intent of WORKSPACE_TOOL_INTENTS) {
    if (!merged.includes(intent)) merged.push(intent)
  }
  return merged
}

const REGISTRY_BY_NAME = new Map(REGISTRY.map((def) => [def.name, def]))

export function getToolIntentsForText(text: string): NicNacToolIntent[] {
  const normalized = text.toLowerCase()
  const intents: NicNacToolIntent[] = []
  const add = (intent: NicNacToolIntent) => {
    if (!intents.includes(intent)) intents.push(intent)
  }
  const hasAny = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(normalized))
  const asksForResourceHelp = hasAny([
    /\bhow[- ]?to\b/,
    /\bwalk me through\b/,
    /\bwalkthrough\b/,
    /\bvideo\b/,
    /\bwhere\b.*\b(help|resource|guide|walkthrough|video)\b/,
    /\b(help|resource|guide|walkthrough|video)\b.*\b(where|find|show|watch)\b/,
    /\bgetting started\b/,
  ])

  if (asksForResourceHelp) return ['resources']

  if (
    hasAny([
      /\breport\b.*\b(bug|issue|problem)\b/,
      /\bfile\b.*\b(issue|bug|report)\b/,
      /\bsuggest\b.*\b(upgrade|improvement|feature)\b/,
      /\bworkflow idea\b/,
      /\bnic[- ]?nac\b.*\b(broken|confusing|stuck|not responding|wrong)\b/,
    ])
  ) {
    return ['resources']
  }

  const asksForDurableMemory = isExplicitDurableMemoryRequest(normalized)
  if (asksForDurableMemory) add('memory')

  if (
    hasAny([
      /\blive\b/,
      /\bshows?\b/,
      /post[- ]?show/,
      /after the live/,
      /current[- ]?show/,
      /\bfollow[- ]?up\b/,
      /\bpromise\b/,
      /\bremember\b/,
      /\bqueue\b/,
    ])
  ) {
    add(
      hasAny([/\blive\b/, /\bshows?\b/, /after the live/, /current[- ]?show/])
        ? 'show_memory'
        : 'memory',
    )
  }

  if (
    hasAny([
      /\bboard\b/,
      /\bdance\s+floor\b/,
      /\bdancers?\b/,
      /\blisting\b/,
      /\blistings\b/,
      /\bpiece\b/,
      /\bitem number\b/,
      /\b[A-Z]{1,4}\d{3,}\b/i,
      /\badd\b.*\b(item|piece|listing|inventory)\b/,
      /\b(item|piece|listing|inventory)\b.*\badd\b/,
      /\btake down\b/,
      /\bremove\b/,
      /\bclear\b.*\b(board|dance\s+floor|listing|listings|piece|pieces|item|items|dancer|dancers)\b/,
      /\brestore\b/,
      /\badd\b.*\bboard\b/,
      /\binventory\b/,
      /\bsame item\b/,
      /\b\d+\s+of\s+(this|the|that|same)\s+item\b/,
    ])
  ) {
    add('trade_board')
  }

  if (
    hasAny([
      /\btrade request/,
      /\btrade swap/,
      /\bswap cleanup/,
      /\bpending request/,
      /\bpending\b[\s\S]{0,60}\brequests?\b/,
      /\brequests?\b[\s\S]{0,40}\binbox\b/,
      /\binbox\b[\s\S]{0,40}\brequests?\b/,
      /\boffer\b/,
      /\bapprove\b/,
      /\breject\b/,
      /\bdeny\b/,
      /\bjust revealed\b/,
      /\brevealed item\b/,
      /\btrade history\b/,
      /\btraded\b/,
    ])
  ) {
    add('trade_requests')
  }

  if (hasAny([/\bfulfillment\b/, /\bship\b/, /\bshipped\b/, /\btracking\b/])) {
    add('fulfillment')
  }

  if (
    hasAny([
      /\bsearch\b/,
      /\blook up\b/,
      /\bfind\b/,
      /\bcatalog\b/,
      /\bwrong\b.*\b(item|piece|collection|photo|stone|material|name)\b/,
      /\b(item|piece|collection|photo|stone|material|name)\b.*\bwrong\b/,
      /\binaccurate\b/,
      /\bincorrect\b/,
      /\bbad photo\b/,
      /\bblurry\b/,
      /\bduplicate\b/,
    ])
  ) {
    add('catalog')
  }

  if (
    isCalendarReadQueryText(text) ||
    hasAny([
      /\bcalendar\b/,
      /\bschedule\b/,
      /\bupcoming\b/,
      /\b(add|schedule|set up|create|put)\b[\s\S]{0,100}\b(show|live|event)\b/,
      /\bmove\b.*\bshow\b/,
      /\bcancel\b.*\bshow\b/,
      /\btonight\b.*\b(reminder|reminders|sms|text|email)\b/,
      /\b(skip|pause|suspend)\b.*\b(show|live|tonight|today)\b/,
      /\b(skip|pause|suspend)\b.*\b(mon(day)?s?|tue(s|sday)?s?|wed(nesday)?s?|thu(r|rsday)?s?|fri(day)?s?|sat(urday)?s?|sun(day)?s?)\b/,
      /\b(sick|ill|emergency)\b.*\b(show|live|tonight|today)\b/,
      /\b(stop|cancel|pause|suspend)\b.*\b(series|recurring|future shows?|future lives?)\b/,
      /\b(pause|suspend)\b[\s\S]{0,80}\b(two weeks?|week|weeks?|month|months?|until|through)\b/,
      /\b(code|discount)\b.*\b(all|every|future|mon(day)?s?|tue(s|sday)?s?|wed(nesday)?s?|thu(r|rsday)?s?|fri(day)?s?|sat(urday)?s?|sun(day)?s?|lives?)\b/,
      /\bre[- ]?occur(?:ring|s)?\b/,
      /\brecurring\b/,
      /\bforeseeable future\b/,
    ])
  ) {
    add('calendar')
  }

  if (
    hasAny([
      /\bbanner\b/,
      /\bstreaming link/,
      /\bsite\b/,
      /\bwebsite\b/,
      /\bhome\s?page\b/,
      /\babout\s+(?:section|narrative|copy|story)\b/,
      /\babout\s+me\b/,
      /\b(?:our|my)\s+story\b/,
      /\bbio(?:graphy)?\b/,
      /\bhero\s+(?:title|headline)\b/,
      /\bprofile\b/,
      /\btagline\b/,
      /\bticker\b/,
      /\bteam name\b/,
      /\bjoin team\b/,
      /\bteam member\b/,
      /\broster\b/,
      /\brecipe\b/,
      /\brecipes\b/,
      /\bpantry\b/,
      /\bin the pantry\b/,
      /\bingredient\b/,
      /\bingredients\b/,
      /\bvip group\b/,
      /\bsocial\b/,
    ])
  ) {
    add('site')
  }

  if (
    hasAny([
      /\bsms\b/,
      /\btext\b/,
      /\bemail\b/,
      /\bnotify\b/,
      /\b(reminder|reminders)\b[\s\S]{0,80}\b(sms|text|email|show)\b/,
      /\b(customer|people|subscriber|audience|sms|text|email|show)\b[\s\S]{0,80}\b(reminder|reminders)\b/,
    ])
  ) {
    add('notification')
  }

  if (
    hasAny([
      /\bhelp\b/,
      /\bhow[- ]?to\b/,
      /\bwalkthrough\b/,
      /\bvideo\b/,
      /\bsetup\b/,
      /\bgetting started\b/,
      /\bnic[- ]?nac\b/,
      /\bcalculator\b/,
      /\bchrome extension\b/,
      /\blive queue\b/,
      /\btroubleshoot/,
      /\bescalat/,
    ])
  ) {
    add('resources')
  }

  if (
    hasAny([
      /\bcustomer list\b/,
      /\bsubscriber/,
      /\baudience\b/,
      /\bopt[- ]?in\b/,
      /\bcan receive\b/,
    ])
  ) {
    add('audience')
  }

  return intents.length ? intents : ['memory']
}

function isExplicitDurableMemoryRequest(normalizedText: string): boolean {
  const hasAny = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(normalizedText))

  return hasAny([
    /\bremember\b[\s\S]{0,140}\b(future|future chats?|future shows?|next time|from now on|going forward|always|preference|prefer|workflow|process)\b/,
    /\b(save|store|keep|note)\b[\s\S]{0,140}\b(preference|prefer|workflow|process|future|future chats?|future shows?|next time|from now on|going forward|always)\b/,
    /\bfor future chats?\b/,
    /\bfor future shows?\b/,
    /\bfrom now on\b/,
    /\bgoing forward\b/,
    /\bi prefer\b/,
    /\bmy (preference|workflow|process)\b/,
  ])
}

type RoutableMessage = {
  id?: string
  role?: string
  parts?: Array<{
    type?: string
    mediaType?: string
    url?: string
    text?: string
  }>
}

export function getToolIntentsForMessages(
  messages: RoutableMessage[],
): NicNacToolIntent[] {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const text = getMessageText(latestUser)

  const latestIntents = getToolIntentsForText(text ?? '')
  if (
    !latestIntents.includes('memory') &&
    !latestIntents.includes('show_memory')
  ) {
    return latestIntents
  }
  const continuationIntents = getContinuationIntents(messages, text ?? '')
  if (continuationIntents.length === 0) return latestIntents
  if (latestIntents.includes('memory')) return continuationIntents

  const merged = [...latestIntents]
  for (const intent of continuationIntents) {
    if (!merged.includes(intent)) merged.push(intent)
  }

  return merged
}

function getContinuationIntents(
  messages: RoutableMessage[],
  latestText: string,
): NicNacToolIntent[] {
  const previousAssistant = [...messages.slice(0, -1)]
    .reverse()
    .find((message) => message.role === 'assistant')
  if (
    isAboutSectionCorrection({
      latestUserText: latestText,
      previousAssistantText: getMessageText(previousAssistant),
    })
  ) {
    return ['site']
  }

  const intents: NicNacToolIntent[] = []
  if (isTradeBoardContinuation(messages, latestText)) {
    intents.push('trade_board')
  }
  if (isSiteContinuation(messages, latestText)) {
    intents.push('site')
  }
  if (isCalendarContinuation(messages, latestText)) {
    intents.push('calendar')
  }
  if (intents.length === 0) return []

  const recentText = messages
    .slice(-6, -1)
    .flatMap((message) =>
      message.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text) ?? [],
    )
    .join('\n')
  const recentIntents = getToolIntentsForText(recentText)
    .filter((intent) => intent !== 'memory')

  return recentIntents.filter((intent) => intents.includes(intent))
}

function isContextualFollowUp(text: string, previousAssistantText = ''): boolean {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false

  return [
    /^(it|this|that|they|those|he|she)\b/,
    /\bcollection\b/,
    /\bsize\b/,
    /\bcolor\b/,
    /\bmaterial\b/,
    /\bitem\s*(number|#)\b/,
    /\b[A-Z]{1,4}\d{3,}\b/i,
    /^(yes|yeah|yep|sure|ok|okay|please|do that|go ahead)\b/,
    /^(try again|retry|again|try it again|try once more)\b/,
    /\bdo that\b/,
    /\bgo ahead\b/,
    /\b(?:i )?(?:don'?t|do not|can'?t|cannot)\s+have\b[\s\S]{0,80}\b(?:option|way|place)\b/,
    /\byou need to\s+(?:do|handle|publish|save|update)\b/,
    /\blet'?s\s+go\s+with\b/,
    /\bgo\s+with\s+(?:your|that|this|the)\b/,
    /\buse\s+(?:your|that|this|the)\s+(?:pick|one|version|copy|line)\b/,
    /\b(?:your|that|this|the)\s+(?:pick|one|version|copy|line)\b/,
    /\bcanonical\b/,
    /\bcustom photo\b/,
    /\bdata\s*base\b/,
    /\bdatabase\b/,
    /\b(all|everything)\b.*\b(info|information|details|photo|photos|picture|pictures|image|images)\b/,
    /\b(contained|inside|in)\b.*\b(photo|photos|picture|pictures|image|images)\b/,
    /\byou (already )?(have|got|see)\b.*\b(info|information|details|photo|photos|picture|pictures|image|images)\b/,
    /\b(i )?(didn'?t|did not|haven'?t|have not)\b.*\b(give|send|upload)\b.*\b(photo|photos|picture|pictures|image|images)\b/,
    /\b(only|just)\b.*\b(gave|sent|uploaded)\b.*\b(photo|picture|image)\b.*\b(label|tag|details|info)\b/,
    /\b(that is|that's|this is)\s+wrong\b/,
    /\bnot how this works\b/,
    /\byou (do )?have\b.*\b(tool|access|script|process|workflow)\b/,
    /^(no|nope|nah)\b.*\b(good|best|clearest|works|use|fine)\b/,
    /\bas good as (it'?s|it is) gonna get\b/,
  ].some((pattern) => pattern.test(normalized))
    || (
      wordCount(normalized) <= 8 &&
      /collection|photo|picture|image|label|design|database|data\s*base|missing|listing|board|item number|guided|add a piece|tool|available|retry|try again|what .*from/i.test(
        previousAssistantText,
      )
    )
}

export function shouldRequireToolCallForMessages(
  messages: RoutableMessage[],
  intents: NicNacToolIntent[],
): boolean {
  if (intents.includes('required_setup')) return true
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const latestText = getMessageText(latestUser)
  if (
    intents.includes('memory') &&
    isExplicitDurableMemoryRequest(latestText.toLowerCase())
  ) {
    return true
  }
  if (intents.includes('site')) {
    const previousAssistant = [...messages.slice(0, -1)]
      .reverse()
      .find((message) => message.role === 'assistant')
    if (
      isSiteContinuation(messages, latestText) ||
      isAboutSectionCorrection({
        latestUserText: latestText,
        previousAssistantText: getMessageText(previousAssistant),
      })
    ) {
      return true
    }
  }
  if (
    intents.includes('calendar') &&
    isCalendarContinuation(messages, latestText)
  ) {
    return true
  }
  if (!intents.includes('trade_board')) return false

  return isTradeBoardContinuation(messages, latestText)
}

function getMessageText(message: RoutableMessage | undefined): string {
  return message?.parts
    ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n') ?? ''
}

function isTradeBoardContinuation(
  messages: RoutableMessage[],
  latestText: string,
): boolean {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const priorMessages = messages.slice(0, -1)
  const previousAssistant = [...priorMessages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const previousAssistantText = getMessageText(previousAssistant)
  const latestHasImage = hasImagePart(latestUser)
  const isPhotoFollowUp =
    latestHasImage &&
    /photo|picture|image|label|upload|database|data\s*base|missing|item\s*(number|#)|trade\s*board|add (a |this )?(piece|item|listing)/i.test(
      previousAssistantText,
    )
  if (!isContextualFollowUp(latestText, previousAssistantText) && !isPhotoFollowUp) {
    return false
  }

  const recentText = priorMessages
    .slice(-6)
    .flatMap((message) =>
      message.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text) ?? [],
    )
    .join('\n')

  return getToolIntentsForText(recentText).includes('trade_board')
}

function isSiteContinuation(
  messages: RoutableMessage[],
  latestText: string,
): boolean {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const priorMessages = messages.slice(0, -1)
  const previousAssistant = [...priorMessages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const previousAssistantText = getMessageText(previousAssistant)
  const latestHasImage = hasImagePart(latestUser)
  const isPhotoFollowUp =
    latestHasImage &&
    /\b(recipe|recipes|pantry|ingredient|ingredients|food|display photo|recipe[- ]?card|card photo|image|photo|picture|upload)\b/i.test(
      previousAssistantText,
    )
  const isNarrativeCopySubmission = isAboutNarrativeCopySubmission({
    latestUserText: latestText,
    previousAssistantText,
  })
  const isAboutCorrection = isAboutSectionCorrection({
    latestUserText: latestText,
    previousAssistantText,
  })
  if (
    !isContextualFollowUp(latestText, previousAssistantText) &&
    !isPhotoFollowUp &&
    !isNarrativeCopySubmission &&
    !isAboutCorrection
  ) {
    return false
  }
  if (!assistantIsDiscussingSiteEdit(previousAssistantText)) return false
  // A confirmed About save is already site workflow state. If the rep says it
  // was incomplete, retain the site capability even when the short correction
  // itself contains no fresh site-intent keywords.
  if (isAboutCorrection) return true

  const recentText = priorMessages
    .slice(-6)
    .flatMap((message) =>
      message.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text) ?? [],
    )
    .join('\n')

  return getToolIntentsForText(recentText).includes('site')
}

function isCalendarContinuation(
  messages: RoutableMessage[],
  latestText: string,
): boolean {
  const priorMessages = messages.slice(0, -1)
  const previousAssistant = [...priorMessages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const previousAssistantText = getMessageText(previousAssistant)
  if (!assistantIsDiscussingCalendarWork(previousAssistantText)) return false
  if (
    !isContextualFollowUp(latestText, previousAssistantText) &&
    !textLooksLikeCalendarDetailFollowUp(latestText)
  ) {
    return false
  }

  const recentText = priorMessages
    .slice(-6)
    .flatMap((message) =>
      message.parts
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text) ?? [],
    )
    .join('\n')

  return getToolIntentsForText(recentText).includes('calendar')
}

function assistantIsDiscussingSiteEdit(text: string): boolean {
  return (
    /\b(?:ticker|announcement|banner|site|website|home\s?page|tagline|about\s+(?:section|narrative|copy|story)|about\s+me|(?:our|my)\s+story|bio(?:graphy)?|hero\s+(?:title|headline)|team\s+name|join\s+page|theme|skin|appearance|social|streaming\s+link|recipe|recipes|pantry|ingredient|ingredients)\b/i.test(
      text,
    ) &&
    /\b(?:swap|change|update|save|use|set|turn|make|edit|add|build|draft|publish)\b/i.test(text)
  )
}

function assistantIsDiscussingCalendarWork(text: string): boolean {
  return (
    /\b(?:calendar|schedule|show|live|event|platform|timezone|time zone|duration|recurring|re[- ]?occurring|series|split|code|discount|featured collection|description)\b/i.test(
      text,
    ) &&
    /\b(?:add|schedule|save|put|create|change|update|move|cancel|skip|pause|need|use|missing|what|start|split|confirm)\b/i.test(
      text,
    )
  )
}

function textLooksLikeCalendarDetailFollowUp(text: string): boolean {
  return /\b(?:tiktok|tik tok|facebook|instagram|youtube|live|eastern|central|mountain|pacific|standard time|daylight time|timezone|time zone|hours?|minutes?|duration|description|leave blank|no description|am|pm|next\s+(?:mon|tue|wed|thu|fri|sat|sun)|yes to the split|start next)\b/i.test(
    text,
  )
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function hasImagePart(message: RoutableMessage | undefined): boolean {
  return (
    message?.parts?.some(
      (part) =>
        part.type === 'file' &&
        typeof part.mediaType === 'string' &&
        part.mediaType.startsWith('image/') &&
        typeof part.url === 'string',
    ) ?? false
  )
}

export function listToolNamesForIntents(intents: NicNacToolIntent[]): string[] {
  const names: string[] = []
  for (const intent of intents) {
    for (const name of TOOL_PACKS[intent]) {
      if (!names.includes(name)) names.push(name)
    }
  }
  return names
}

export function buildToolsForIntents(
  ctx: ToolContext,
  intents: NicNacToolIntent[],
): ToolSet {
  const requestedNames = listToolNamesForIntents(intents)
  const allowedNames = ctx.operatorSupport
    ? filterOperatorSupportToolNames(requestedNames, ctx.operatorSupport.capabilities)
    : requestedNames
  const definitions = allowedNames.map((name) => {
    const def = REGISTRY_BY_NAME.get(name)
    if (!def) throw new Error(`[nic-nac] unknown routed tool name: ${name}`)
    return def
  })
  return buildToolSet(ctx, definitions)
}

export function buildAllTools(ctx: ToolContext): ToolSet {
  return buildToolSet(ctx, REGISTRY)
}

function buildToolSet(ctx: ToolContext, definitions: ToolDefinition[]): ToolSet {
  // Fail loudly on duplicate tool names. Object.fromEntries silently
  // overwrites, which would let a buggy registry ship without warning.
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const def of definitions) {
    if (seen.has(def.name)) dupes.push(def.name)
    seen.add(def.name)
  }
  if (dupes.length) {
    throw new Error(`[nic-nac] duplicate tool names in REGISTRY: ${dupes.join(', ')}`)
  }

  const entries: Array<[string, Tool]> = definitions.map((def) => {
    const built = def.build(ctx) as Tool & { needsApproval?: boolean }
    const audited = withOperatorSupportAudit(def.name, ctx, built)
    const inner = withTelemetry(def.name, ctx, audited)
    const outer = withErrorHandling({ name: def.name, ctx, readOnly: def.readOnly }, inner)
    // Dev-time safety net: assert metadata survived wrapping. If a future
    // wrapper change drops needsApproval, HITL silently breaks.
    if ((outer as { needsApproval?: boolean }).needsApproval !== built.needsApproval) {
      throw new Error(`[nic-nac] needsApproval lost during wrapping for ${def.name}`)
    }
    return [def.name, outer]
  })

  return Object.fromEntries(entries) as ToolSet
}

export type { ToolContext, ToolDefinition } from './types'
