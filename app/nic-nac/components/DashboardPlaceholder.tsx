'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  AccountBillingDashboardResult,
  BoardResult,
  CalendarEvent,
  CustomerAudienceMember,
  CustomerAudienceImportInput,
  CustomerAudienceImportResult,
  CustomerAudienceSummary,
  FulfillmentQueueItem,
  HelpResource,
  JoinTeamMember,
  UpsertJoinTeamMemberInput,
  JewelryDatabaseResult,
  PublicSiteRecipe,
  PublicSiteMediaSlot,
  PublicSiteMediaSlotKey,
  SiteSettingsDashboardResult,
  SiteAnalyticsDashboardResult,
  SiteAppearancePreset,
  TradeListingWithDesign,
  TradeRequestWithListing,
  TradeSwapCleanupItem,
  WalletDashboardResult,
  WalletTransactionSummary,
} from '@/lib/services/types'
import { SMS_CHARGE_MILS, walletMilsToUsd } from '@/lib/services/wallet-units'
import { NIC_NAC_WORKSPACE_REFRESH_EVENT } from '@/lib/nic-nac/workspace-refresh-events'
import { LIVE_QUEUE_CHROME_EXTENSION_URL } from '@/lib/nic-nac/live-queue-extension'
import {
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  normalizeAmethystAppearancePreset,
} from '@/lib/amethyst/appearance-presets'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'
import {
  BRITT_WITH_BLING_ABOUT_PORTRAIT_URL,
  BRITT_WITH_BLING_SHOWCASE_VIDEO_URL,
  isBrittWithBlingPublicSiteSlug,
} from '@/lib/britt-with-bling/constants'
import { normalizeSupportedPublicVideoUrl } from '@/lib/public-site/media-url'
import {
  buildCustomerSparkleSiteHref,
  buildCustomerTradeBoardHref,
} from '@/lib/nic-nac/rep-links'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'
import { createClient } from '@/lib/supabase/client'
import { AccountSecurityCard } from './AccountSecurityCard'
import { SupportAccessHistoryCard } from './SupportAccessHistoryCard'
import {
  CalendarDays,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Gem,
  Globe2,
  Images,
  LogOut,
  Mail,
  MessagesSquare,
  RadioTower,
  Search,
  Settings2,
  Sparkles,
  Users,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react'
import { SparkleSeal } from '@/app/prelaunch/_components/PrelaunchVisuals'
import type { WorkspaceLaunchAction } from '@/lib/nic-nac/workspace-launch-actions'
import type { WorkspaceResource } from '@/lib/services/workspace-resources'
import { WorkspaceShell } from './WorkspaceShell'
import type { WorkspaceSectionTab } from './WorkspaceSectionTabs'
import { NicNacHomeWorkspaceCard } from './NicNacHomeWorkspaceCard'
import { TradeBoardWorkspaceCard } from './TradeBoardWorkspaceCard'
import { MessageCenter as UnifiedMessageCenter } from './messages/MessageCenter'
import {
  REVIEW_INBOX_FIXTURES,
  REVIEW_TEAM_CONVERSATION_ID,
} from './messages/review-fixtures'
import type {
  MessageCenterActionState as UnifiedMessageCenterActionState,
  MessageCenterState as UnifiedMessageCenterState,
  WorkspaceConversationSummary,
  WorkspaceInboxItem,
  WorkspacePublicationSummary,
} from './messages/types'
import { isConversationItem } from './messages/types'
import styles from './DashboardPlaceholder.module.css'

export const MessagesCenterCard = UnifiedMessageCenter

const CollectionIntakeTool = dynamic(() =>
  import('./CollectionIntakeTool').then((module) => module.CollectionIntakeTool),
)

const WorkspaceResourceLibrary = dynamic(() =>
  import('./WorkspaceResourceLibrary').then((module) => module.default),
)

const WorkspaceResourceLibraryView = dynamic(() =>
  import('./WorkspaceResourceLibrary').then(
    (module) => module.WorkspaceResourceLibraryView,
  ),
)

const RECIPE_AUDIT_STORAGE_KEY = 'sparkle-suite:recipe-audit'

// Texting and email updates are not launched yet. Keep the wallet implementation
// intact for that release, but do not expose prepaid SMS spend or recharge controls.
const CUSTOMER_MESSAGING_LAUNCHED = false

export {
  buildCustomerSparkleSiteHref,
  buildCustomerTradeBoardHref,
}

const WORKSPACE_SECTIONS = [
  {
    key: 'home',
    label: 'Nic-Nac',
    shortLabel: 'Home',
    icon: Sparkles,
  },
  {
    key: 'trade-board',
    label: 'Dance Floor',
    shortLabel: 'Trade',
    icon: Gem,
  },
  {
    key: 'show-calendar',
    label: 'Calendar',
    shortLabel: 'Calendar',
    icon: CalendarDays,
  },
  {
    key: 'more',
    label: 'Tools',
    shortLabel: 'Tools',
    icon: Wrench,
  },
] as const satisfies readonly WorkspaceSectionTab<string>[]

const SECONDARY_WORKSPACE_SECTIONS = [
  {
    key: 'jewelry-library',
    label: 'Jewelry Library',
    shortLabel: 'Library',
    icon: Search,
  },
  {
    key: 'live-queue',
    label: 'Live Queue',
    shortLabel: 'Queue',
    icon: RadioTower,
  },
  {
    key: 'business-tools',
    label: 'Business Tools',
    shortLabel: 'Tools',
    icon: Wrench,
  },
  {
    key: 'collection-intake',
    label: 'Bulk Collection Intake',
    shortLabel: 'Bulk Intake',
    icon: Images,
    comingSoon: true,
  },
  {
    key: 'team-management',
    label: 'Team Management',
    shortLabel: 'Team',
    icon: Users,
  },
  {
    key: 'customer-list',
    label: 'Customer List',
    shortLabel: 'Customers',
    icon: Users,
  },
  {
    key: 'messages',
    label: 'Message Center',
    shortLabel: 'Messages',
    icon: MessagesSquare,
  },
  {
    key: 'resources',
    label: 'Resources & Help',
    shortLabel: 'Resources',
    icon: BookOpen,
  },
  {
    key: 'site-settings',
    label: 'Customer-facing site setup',
    shortLabel: 'Site setup',
    icon: Settings2,
  },
  {
    key: 'recipes',
    label: 'Recipes',
    shortLabel: 'Recipes',
    icon: Sparkles,
  },
  {
    key: 'account',
    label: 'Account',
    shortLabel: 'Account',
    icon: WalletCards,
  },
] as const satisfies readonly WorkspaceSectionTab<string>[]

const TRADE_WORKSPACE_REFRESH_MS = 15_000
const MESSAGE_CENTER_REFRESH_MS = 60_000
const TRADE_BOARD_PAGE_SIZE = 12
export function buildTradeBoardFetchUrl(options: { offset?: number } = {}) {
  const params = new URLSearchParams({
    status: 'available',
    limit: String(TRADE_BOARD_PAGE_SIZE),
  })
  if (options.offset && options.offset > 0) {
    params.set('offset', String(options.offset))
  }
  return `/api/nic-nac/trade-board?${params.toString()}`
}

export function buildSiteRecipesFetchUrl() {
  return '/api/nic-nac/site-recipes'
}

export function getJewelryLibrarySearchErrorMessage(_status?: number) {
  return 'Unable to search the jewelry library right now. Try again in a minute, or ask Nic-Nac to help look up the piece.'
}

export function createTradeRequestDecisionHandlers(
  handleTradeRequestDecision: (
    requestId: string,
    action: 'approve' | 'reject',
    swap?: { revealedItemNumber?: string; revealedRingSize?: string },
  ) => void | Promise<void>,
) {
  return {
    onApproveRequest: (
      requestId: string,
      swap?: { revealedItemNumber?: string; revealedRingSize?: string },
    ) => handleTradeRequestDecision(requestId, 'approve', swap),
    onRejectRequest: (requestId: string) =>
      handleTradeRequestDecision(requestId, 'reject'),
  }
}

export function formatHeaderRepShow(
  displayName?: string | null,
  businessName?: string | null,
) {
  const rep = displayName?.trim()
  const show = businessName?.trim()
  if (rep && show) return `${rep} / ${show}`
  return rep || show || 'Rep info loading'
}

export function formatHeaderRepName(displayName?: string | null) {
  return displayName?.trim() || 'Rep info loading'
}

export function formatHeaderShowName(
  businessName?: string | null,
  displayName?: string | null,
  isLoading = false,
) {
  const showName = businessName?.trim()
  const repName = displayName?.trim()

  if (
    showName &&
    (!repName || showName.localeCompare(repName, undefined, { sensitivity: 'base' }) !== 0)
  ) {
    return showName
  }

  return isLoading ? 'Live show name loading' : 'Live show name not set'
}

function mergeTradeBoardResults(
  current: BoardResult | undefined,
  next: BoardResult,
): BoardResult {
  if (!current) return next

  const typeBreakdown = { ...current.summary.typeBreakdown }
  for (const [type, count] of Object.entries(next.summary.typeBreakdown)) {
    typeBreakdown[type as keyof typeof typeBreakdown] =
      (typeBreakdown[type as keyof typeof typeBreakdown] ?? 0) + count
  }

  return {
    listings: [...current.listings, ...next.listings],
    summary: {
      totalPieces: current.summary.totalPieces + next.summary.totalPieces,
      totalMsrp: current.summary.totalMsrp + next.summary.totalMsrp,
      pendingRequestCount:
        current.summary.pendingRequestCount + next.summary.pendingRequestCount,
      typeBreakdown,
    },
  }
}

type WorkspaceSectionKey =
  | (typeof WORKSPACE_SECTIONS)[number]['key']
  | (typeof SECONDARY_WORKSPACE_SECTIONS)[number]['key']
  | 'help-resources'

const WORKSPACE_SECTION_KEYS = new Set<string>(
  [
    ...WORKSPACE_SECTIONS,
    ...SECONDARY_WORKSPACE_SECTIONS,
    { key: 'help-resources' },
  ].map((section) => section.key),
)

const BLING_KITCHEN_RECIPE_REP_IDS = new Set([
  '9a971c05-3631-443e-bcb8-4e9a26e15885',
])
const BLING_KITCHEN_RECIPE_SLUGS = new Set(['blingkitchen', 'bling-kitchen'])

const COMING_SOON_WORKSPACE_SECTIONS = new Set<WorkspaceSectionKey>(
  SECONDARY_WORKSPACE_SECTIONS.filter(
    (section) => 'comingSoon' in section && section.comingSoon,
  )
    .map((section) => section.key),
)

export function isComingSoonWorkspaceSection(section: WorkspaceSectionKey) {
  return COMING_SOON_WORKSPACE_SECTIONS.has(section)
}

export function getInitialWorkspaceSection(search: string): WorkspaceSectionKey {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const requested = params.get('section')?.trim() ?? ''
  if (requested === 'business-calculator') return 'business-tools'
  if (WORKSPACE_SECTION_KEYS.has(requested)) {
    const section = requested as WorkspaceSectionKey
    return isComingSoonWorkspaceSection(section) ? 'more' : section
  }
  return 'home'
}

export function hasPaidWorkspaceSubscription(
  summary: AccountBillingDashboardResult | null | undefined,
) {
  if (summary?.workspaceAccess) {
    return summary.workspaceAccess.hasFullAccess
  }
  const status = summary?.subscription?.status
  return status === 'active' || status === 'trialing'
}

export function hasBlingKitchenRecipeWorkspaceAccess(input: {
  repId?: string | null
  publicSiteSlug?: string | null
}) {
  const repId = input.repId?.trim().toLowerCase() ?? ''
  const slug = input.publicSiteSlug?.trim().toLowerCase() ?? ''

  return (
    BLING_KITCHEN_RECIPE_REP_IDS.has(repId) ||
    BLING_KITCHEN_RECIPE_SLUGS.has(slug)
  )
}

export function getVisibleWorkspaceSections(
  _hasPaidWorkspace: boolean,
  _hasRecipeWorkspaceAccess = false,
) {
  return WORKSPACE_SECTIONS
}

export function resolveWorkspaceSectionForAccess(
  section: WorkspaceSectionKey,
  _hasPaidWorkspace: boolean,
  hasRecipeWorkspaceAccess = true,
): WorkspaceSectionKey {
  if (isComingSoonWorkspaceSection(section)) return 'more'
  if (section === 'recipes' && !hasRecipeWorkspaceAccess) return 'more'
  return section
}

export function shouldShowWorkspaceAccessNotice(
  section: WorkspaceSectionKey,
  hasPaidWorkspace: boolean,
  isAccessLoading = false,
) {
  return (
    !isAccessLoading &&
    !hasPaidWorkspace &&
    section !== 'messages' &&
    section !== 'help-resources' &&
    section !== 'account'
  )
}

export function shouldShowWorkspaceLoadingSkeleton(
  section: WorkspaceSectionKey,
  isAccessLoading: boolean,
) {
  return (
    isAccessLoading &&
    section !== 'messages' &&
    section !== 'help-resources' &&
    section !== 'account'
  )
}

function getWorkspaceSectionLabel(section: WorkspaceSectionKey) {
  return (
    [...WORKSPACE_SECTIONS, ...SECONDARY_WORKSPACE_SECTIONS].find(
      (workspaceSection) => workspaceSection.key === section,
    )
      ?.label ?? 'Workspace'
  )
}

export function getWorkspaceBackDestination(
  section: WorkspaceSectionKey,
): { section: WorkspaceSectionKey; label: string } | null {
  if (section === 'home') return null

  const isToolSection =
    section === 'help-resources' ||
    SECONDARY_WORKSPACE_SECTIONS.some(
      (workspaceSection) => workspaceSection.key === section,
    )

  return isToolSection
    ? { section: 'more', label: 'Tools' }
    : { section: 'home', label: 'Nic-Nac' }
}

export function buildHomeNextShowLabel(events: CalendarEvent[]) {
  const next = buildHomeNextShowSummary(events)
  if (!next) return 'No upcoming shows'
  const title = next.title
  return title.length > 28 ? `${title.slice(0, 25).trim()}...` : title
}

export type HomeNextShowSummary = {
  title: string
  weekday: string
  date: string
  time: string
  timeZone: string
}

export function buildHomeNextShowSummary(
  events: CalendarEvent[],
): HomeNextShowSummary | null {
  const next = events[0]
  if (!next) return null

  const eventDate = new Date(next.eventTime)
  const dateParts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: next.timeZone,
    timeZoneName: 'short',
  }).formatToParts(eventDate)
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? ''

  return {
    title: next.title?.trim() || next.description?.trim() || 'Upcoming show',
    weekday: getPart('weekday'),
    date: `${getPart('month')} ${getPart('day')}, ${getPart('year')}`,
    time: `${getPart('hour')}:${getPart('minute')} ${getPart('dayPeriod')}`,
    timeZone: getPart('timeZoneName') || next.timeZone,
  }
}

export type RosterFilter =
  | 'all'
  | 'sms_reachable'
  | 'email_reachable'
  | 'opted_out'

export type RosterSort =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'birthday_asc'
  | 'favorite_collection'
  | 'favorite_gem_or_stone'
  | 'favorite_material'
  | 'favorite_cut'

type AudienceState = {
  status: 'loading' | 'ready' | 'error'
  summary?: CustomerAudienceSummary
  customers?: CustomerAudienceMember[]
}

type AudienceActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

type EmailComposerState = {
  audienceId: string | null
  subject: string
  body: string
  pending: boolean
}

type WalletState = {
  status: 'loading' | 'ready' | 'error'
  summary?: WalletDashboardResult
}

type WalletActionState = {
  pendingAmountCents: number | null
  pendingSettings: boolean
  error: string | null
  helperMessage: string | null
}

type CalendarState = {
  status: 'loading' | 'ready' | 'error'
  summary?: CalendarResponsePayload
}

type SiteSettingsState = {
  status: 'loading' | 'ready' | 'error'
  settings?: SiteSettingsDashboardResult
}

type SiteSettingsActionState = {
  pending: boolean
  error: string | null
  helperMessage: string | null
}

type RecipesState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  recipes: PublicSiteRecipe[]
}

type RecipeActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

type AccountBillingState = {
  status: 'loading' | 'ready' | 'error'
  summary?: AccountBillingDashboardResult
}

type AccountBillingActionState = {
  pendingAction: 'subscribe' | 'manage' | null
  error: string | null
  helperMessage: string | null
}

type TradeBoardState = {
  status: 'loading' | 'ready' | 'error'
  board?: BoardResult
  hasMoreListings?: boolean
}

type RepProfileState = {
  status: 'loading' | 'ready' | 'error'
  repId?: string
  displayName?: string
  businessName?: string
  publicSiteSlug?: string | null
  liveQueueSyncCode?: string | null
  timeZone?: string | null
}

type TradeBoardActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

type TradeRequestsState = {
  status: 'loading' | 'ready' | 'error'
  requests?: TradeRequestWithListing[]
}

type FulfillmentQueueState = {
  status: 'loading' | 'ready' | 'error'
  items?: FulfillmentQueueItem[]
}

type TradeSwapCleanupState = {
  status: 'loading' | 'ready' | 'error'
  items?: TradeSwapCleanupItem[]
}

type JewelryLibraryState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  results?: JewelryDatabaseResult[]
  facets?: JewelryLibraryFacets
}

export type WorkspaceMessageSummary = WorkspacePublicationSummary

type MessagesInbox = {
  unreadCount: number
  messages: WorkspaceInboxItem[]
  items?: WorkspaceInboxItem[]
  nextCursor?: string | null
}

type MessagesState = {
  status: 'loading' | 'ready' | 'error'
  inbox?: MessagesInbox
}

type MessagesActionState = UnifiedMessageCenterActionState

const REVIEW_RESOURCE_FIXTURES: WorkspaceResource[] = [
  {
    id: 'review-resource-blog',
    resourceKey: 'thoughtful-customer-follow-ups',
    resourceType: 'blog',
    title: 'Five thoughtful customer follow-ups',
    summary: 'Practical ways to stay helpful after a live show.',
    body: 'Use these prompts to make follow-up feel personal, useful, and easy to repeat.',
    category: 'Customer relationships',
    tags: ['customers', 'follow-up'],
    thumbnailUrl: null,
    videoProvider: null,
    videoUrl: null,
    actionUrl: '/nic-nac?section=resources&resource=thoughtful-customer-follow-ups',
    status: 'published',
    version: 1,
    changeSummary: 'New customer follow-up guide.',
    isFeatured: true,
    authorLabel: 'Sparkle Suite',
    publishedAt: '2026-08-17T16:00:00.000Z',
  },
  {
    id: 'review-resource-video',
    resourceKey: 'prepare-your-next-show',
    resourceType: 'video',
    title: 'Prepare your next show',
    summary: 'A quick walkthrough for planning a smooth live show.',
    body: 'A step-by-step show preparation video.',
    category: 'Live shows',
    tags: ['show planning', 'video'],
    thumbnailUrl: null,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=review-smoke',
    actionUrl: 'https://www.youtube.com/watch?v=review-smoke',
    status: 'published',
    version: 1,
    changeSummary: 'New show preparation video.',
    isFeatured: false,
    authorLabel: 'Sparkle Suite',
    publishedAt: '2026-08-16T16:00:00.000Z',
  },
]

function getActiveUnreadMessageCount(messages: WorkspaceInboxItem[]) {
  return messages.reduce((count, message) => {
    if (message.archivedAt) return count
    if (isConversationItem(message)) return count + message.unreadCount
    return count + (message.isRead ? 0 : 1)
  }, 0)
}

type TeamManagementAccess = {
  enabled: boolean
  status: 'not_enabled' | 'manual_beta' | 'active' | 'past_due' | 'disabled'
  source: 'manual_beta' | 'stripe_addon' | null
}

type TeamOnboardingParticipant = {
  id: string
  joinTeamMemberId?: string | null
  displayName: string
  contactEmail: string | null
  status: 'invited' | 'started' | 'needs_help' | 'completed' | 'archived'
  accessUrl?: string
  progress: {
    completed: number
    needsHelp: number
    total: number
  }
  unreadMessageCount: number
  lastActivityAt: string | null
  createdAt: string | null
  workspaceConversationId?: string | null
  workspace_conversation_id?: string | null
  latestMessagePreview?: string | null
}

type TeamManagementState =
  | {
      status: 'loading'
      access?: TeamManagementAccess
      participants?: TeamOnboardingParticipant[]
      publicTeamRoster?: JoinTeamMember[]
    }
  | {
      status: 'locked'
      access: TeamManagementAccess
      participants?: TeamOnboardingParticipant[]
      publicTeamRoster?: JoinTeamMember[]
    }
  | {
      status: 'ready'
      access: TeamManagementAccess
      participants: TeamOnboardingParticipant[]
      publicTeamRoster?: JoinTeamMember[]
    }
  | {
      status: 'error'
      access?: TeamManagementAccess
      participants?: TeamOnboardingParticipant[]
      publicTeamRoster?: JoinTeamMember[]
    }

type TeamManagementActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

export type JoinTeamRosterDraft = {
  id?: string
  displayName: string
  businessName: string
  state?: string
  city?: string
  initials?: string
  photoUrl: string
  photoAlt?: string
  imageClassName?: string
  bio?: string
  sortOrder?: number
  tiktok: string
  facebook: string
  instagram: string
  website: string
  youtube: string
  whatnot?: string
  isVisible: boolean
}

type ResourcesState = {
  status: 'loading' | 'ready' | 'error'
  resources?: HelpResource[]
}

type AnalyticsState = {
  status: 'loading' | 'ready' | 'error'
  analytics?: SiteAnalyticsDashboardResult
}

export type WalletAutoRechargeDraft = {
  enabled: boolean
  thresholdCents: number
  amountCents: number
}

export type SiteSettingsDraft = SiteSettingsDashboardResult

export type RecipeDraft = {
  id?: string
  title: string
  slug: string
  description: string
  category: string
  prepTime: string
  servings: string
  imageUrl: string
  imageAlt: string
  imagePosition: string
  modalImageUrl: string
  modalImagePosition: string
  tiktokUrl: string
  ingredientsText: string
  stepsText: string
  note: string
  isVisible: boolean
  sourceRecipeId: string
  recipeCardImageUrls: string[]
}

type SiteRecipeBuilderDraft = {
  title?: string
  description?: string
  category?: string
  prepTime?: string
  servings?: number | null
  ingredients?: string[]
  steps?: string[]
  note?: string
  imageAlt?: string
  warnings?: string[]
}

const BLING_KITCHEN_RECIPE_CATEGORIES = [
  'Baking & Sweets',
  'Italian Classics',
  'Weeknight Dinners',
  'Drinks & Extras',
  'Holiday Favorites',
  'Breakfast',
  'Appetizer',
]

type RecipeEditorMode = 'builder' | 'manual'
type RecipeEditorTab = 'current' | 'upload' | 'edit'

type AudienceResponsePayload = {
  summary: CustomerAudienceSummary
  customers: CustomerAudienceMember[]
}

type CalendarResponsePayload = {
  upcomingEvents: CalendarEvent[]
  recentEvents: CalendarEvent[]
}

type MeResponsePayload = {
  rep?: {
    id?: string
    display_name?: string
    business_name?: string
    public_site_slug?: string | null
    time_zone?: string | null
    live_queue_sync_code?: string | null
    secret_rep_id_number?: string | null
  }
}

type WalletResponsePayload = WalletDashboardResult
type SiteSettingsResponsePayload = SiteSettingsDashboardResult
type SiteRecipesResponsePayload = {
  recipes?: PublicSiteRecipe[]
  recipe?: PublicSiteRecipe
  draft?: SiteRecipeBuilderDraft
  error?: string
}
type AccountBillingResponsePayload = AccountBillingDashboardResult
type TradeBoardResponsePayload = BoardResult
type TradeRequestsResponsePayload = TradeRequestWithListing[]
type FulfillmentQueueResponsePayload = FulfillmentQueueItem[]
type TradeSwapCleanupResponsePayload = TradeSwapCleanupItem[]
type JewelryLibraryFacetOption = {
  value: string
  count: number
}
type JewelryLibraryFacets = {
  collections: JewelryLibraryFacetOption[]
  materials: JewelryLibraryFacetOption[]
  stones: JewelryLibraryFacetOption[]
  types: JewelryLibraryFacetOption[]
  labels: JewelryLibraryFacetOption[]
  years: JewelryLibraryFacetOption[]
}
type JewelryLibraryFilters = {
  q: string
  type: string
  collection: string
  material: string
  stone: string
  label: string
  year: string
  limit: number
}
type JewelryLibraryResponsePayload =
  | JewelryDatabaseResult[]
  | {
      items?: JewelryDatabaseResult[]
      facets?: Partial<JewelryLibraryFacets>
    }
type MessagesResponsePayload = MessagesInbox
type TeamManagementResponsePayload = {
  access: TeamManagementAccess
  participants?: TeamOnboardingParticipant[]
  participant?: TeamOnboardingParticipant
  accessUrl?: string
  error?: string
}
type JoinTeamRosterResponsePayload = {
  members?: JoinTeamMember[]
  member?: JoinTeamMember
  error?: string
}
type ResourcesResponsePayload = HelpResource[]
type AnalyticsResponsePayload = SiteAnalyticsDashboardResult

const JEWELRY_LIBRARY_DEFAULT_LIMIT = 24
const EMPTY_JEWELRY_LIBRARY_FACETS: JewelryLibraryFacets = {
  collections: [],
  materials: [],
  stones: [],
  types: [],
  labels: [],
  years: [],
}
const EMPTY_JEWELRY_LIBRARY_FILTERS: JewelryLibraryFilters = {
  q: '',
  type: '',
  collection: '',
  material: '',
  stone: '',
  label: '',
  year: '',
  limit: JEWELRY_LIBRARY_DEFAULT_LIMIT,
}

const EMPTY_JOIN_TEAM_ROSTER_DRAFT: JoinTeamRosterDraft = {
  displayName: '',
  businessName: '',
  photoUrl: '',
  tiktok: '',
  facebook: '',
  instagram: '',
  website: '',
  youtube: '',
  whatnot: '',
  isVisible: false,
}

function cleanOptionalText(value?: string | null) {
  return value?.trim() ?? ''
}

export function getJoinTeamRosterDraft(
  member?: JoinTeamMember | null,
): JoinTeamRosterDraft {
  if (!member) return { ...EMPTY_JOIN_TEAM_ROSTER_DRAFT }

  return {
    id: member.id,
    displayName: member.displayName,
    businessName: member.businessName,
    state: member.state,
    city: member.city,
    initials: member.initials,
    photoUrl: member.photoUrl,
    photoAlt: member.photoAlt,
    imageClassName: member.imageClassName,
    bio: member.bio,
    sortOrder: member.sortOrder,
    tiktok: member.links.tiktok ?? '',
    facebook: member.links.facebook ?? '',
    instagram: member.links.instagram ?? '',
    website: member.links.website ?? '',
    youtube: member.links.youtube ?? '',
    whatnot: member.links.whatnot ?? '',
    isVisible: member.isVisible,
  }
}

export function buildJoinTeamRosterSavePayload(
  draft: JoinTeamRosterDraft,
): UpsertJoinTeamMemberInput {
  const displayName = cleanOptionalText(draft.displayName)
  const links = {
    ...(cleanOptionalText(draft.tiktok)
      ? { tiktok: cleanOptionalText(draft.tiktok) }
      : {}),
    ...(cleanOptionalText(draft.facebook)
      ? { facebook: cleanOptionalText(draft.facebook) }
      : {}),
    ...(cleanOptionalText(draft.instagram)
      ? { instagram: cleanOptionalText(draft.instagram) }
      : {}),
    ...(cleanOptionalText(draft.website)
      ? { website: cleanOptionalText(draft.website) }
      : {}),
    ...(cleanOptionalText(draft.youtube)
      ? { youtube: cleanOptionalText(draft.youtube) }
      : {}),
    ...(cleanOptionalText(draft.whatnot)
      ? { whatnot: cleanOptionalText(draft.whatnot) }
      : {}),
  }

  return {
    ...(draft.id ? { id: draft.id } : {}),
    displayName,
    businessName: cleanOptionalText(draft.businessName),
    ...('state' in draft ? { state: cleanOptionalText(draft.state) } : {}),
    ...('city' in draft ? { city: cleanOptionalText(draft.city) } : {}),
    ...('initials' in draft ? { initials: cleanOptionalText(draft.initials) } : {}),
    photoUrl: cleanOptionalText(draft.photoUrl),
    photoAlt:
      cleanOptionalText(draft.photoAlt) ||
      (displayName ? `${displayName} team profile photo` : ''),
    ...('imageClassName' in draft
      ? { imageClassName: cleanOptionalText(draft.imageClassName) }
      : {}),
    ...('bio' in draft ? { bio: cleanOptionalText(draft.bio) } : {}),
    ...(draft.sortOrder !== undefined ? { sortOrder: draft.sortOrder } : {}),
    links,
    isVisible: draft.isVisible,
  }
}

export function moveJoinTeamRosterMember<T extends { id: string }>(
  members: T[],
  memberId: string,
  direction: 'up' | 'down',
) {
  const ids = members.map((member) => member.id)
  const index = ids.indexOf(memberId)
  if (index < 0) return ids

  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (nextIndex < 0 || nextIndex >= ids.length) return ids

  const next = [...ids]
  const [moved] = next.splice(index, 1)
  next.splice(nextIndex, 0, moved)
  return next
}

type JewelryLibraryFilterField =
  | 'q'
  | 'type'
  | 'collection'
  | 'material'
  | 'stone'
  | 'label'
  | 'year'

type JewelryLibraryActiveFilter = {
  field: JewelryLibraryFilterField
  label: string
  value: string
}

const JEWELRY_LIBRARY_FACET_GROUPS: Array<{
  ariaLabel: string
  field: JewelryLibraryFilterField
  key: keyof JewelryLibraryFacets
  searchPlaceholder: string
  title: string
}> = [
  {
    ariaLabel: 'Search collections',
    field: 'collection',
    key: 'collections',
    searchPlaceholder: 'Search collections',
    title: 'Collections',
  },
  {
    ariaLabel: 'Search materials',
    field: 'material',
    key: 'materials',
    searchPlaceholder: 'Search materials',
    title: 'Materials',
  },
  {
    ariaLabel: 'Search stones',
    field: 'stone',
    key: 'stones',
    searchPlaceholder: 'Search stones',
    title: 'Stone / gem',
  },
  {
    ariaLabel: 'Search types',
    field: 'type',
    key: 'types',
    searchPlaceholder: 'Search types',
    title: 'Type',
  },
  {
    ariaLabel: 'Search labels',
    field: 'label',
    key: 'labels',
    searchPlaceholder: 'Search labels',
    title: 'Label',
  },
  {
    ariaLabel: 'Search years',
    field: 'year',
    key: 'years',
    searchPlaceholder: 'Search years',
    title: 'Year',
  },
]

function countJewelryFacetValues(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value))
}

function formatJewelryLibraryType(typePrefix: JewelryDatabaseResult['typePrefix']) {
  const labels: Record<JewelryDatabaseResult['typePrefix'], string> = {
    BR: 'bracelet',
    ER: 'earrings',
    NK: 'necklace',
    RG: 'ring',
    ST: 'stack',
  }
  return labels[typePrefix] ?? typePrefix.toLowerCase()
}

function deriveJewelryLibraryLabel(result: JewelryDatabaseResult) {
  const explicitTags = (result.searchTags ?? []).map((tag) =>
    tag.trim().toLowerCase(),
  )
  if (explicitTags.includes('unicorn')) return 'unicorn'
  if (explicitTags.includes('diamond')) return 'diamond'
  return 'standard'
}

function deriveJewelryLibraryFacets(results: JewelryDatabaseResult[]): JewelryLibraryFacets {
  return {
    collections: countJewelryFacetValues(results.map((result) => result.collectionName)),
    materials: countJewelryFacetValues(results.map((result) => result.material)),
    stones: countJewelryFacetValues(results.map((result) => result.mainStone)),
    types: countJewelryFacetValues(results.map((result) => formatJewelryLibraryType(result.typePrefix))),
    labels: countJewelryFacetValues(results.map(deriveJewelryLibraryLabel)),
    years: countJewelryFacetValues(
      results.map((result) =>
        result.collectionYear ? String(result.collectionYear) : undefined,
      ),
    ),
  }
}

function normalizeJewelryLibraryFacetList(
  options: JewelryLibraryFacetOption[] | undefined,
) {
  return (options ?? []).flatMap((option) => {
    const value = option.value?.trim()
    const count = Number.isFinite(option.count) ? Math.max(0, option.count) : 0
    return value && count > 0 ? [{ value, count }] : []
  })
}

function normalizeJewelryLibraryFacets(
  facets: Partial<JewelryLibraryFacets> | undefined,
): JewelryLibraryFacets {
  return {
    collections: normalizeJewelryLibraryFacetList(facets?.collections),
    materials: normalizeJewelryLibraryFacetList(facets?.materials),
    stones: normalizeJewelryLibraryFacetList(facets?.stones),
    types: normalizeJewelryLibraryFacetList(facets?.types),
    labels: normalizeJewelryLibraryFacetList(facets?.labels),
    years: normalizeJewelryLibraryFacetList(facets?.years),
  }
}

function getJewelryLibraryActiveFilters(
  filters: JewelryLibraryFilters,
): JewelryLibraryActiveFilter[] {
  const values: JewelryLibraryActiveFilter[] = []
  if (filters.q.trim()) values.push({ field: 'q', label: 'Search', value: filters.q.trim() })
  if (filters.type) values.push({ field: 'type', label: 'Type', value: filters.type })
  if (filters.collection) {
    values.push({ field: 'collection', label: 'Collection', value: filters.collection })
  }
  if (filters.material) values.push({ field: 'material', label: 'Material', value: filters.material })
  if (filters.stone) values.push({ field: 'stone', label: 'Stone', value: filters.stone })
  if (filters.label) values.push({ field: 'label', label: 'Label', value: filters.label })
  if (filters.year) values.push({ field: 'year', label: 'Year', value: filters.year })
  return values
}

function formatJewelryFacetValue(field: JewelryLibraryFilterField, value: string) {
  if (field === 'type' || field === 'label') {
    return value.replace(/^\w/, (letter) => letter.toUpperCase())
  }
  return value
}

type CalendarDayCell = {
  isoDate: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DEFAULT_CALENDAR_TIME_ZONE = 'America/New_York'

const FILTER_OPTIONS: Array<{ value: RosterFilter; label: string }> = [
  { value: 'all', label: 'All customers' },
  { value: 'sms_reachable', label: 'SMS opted in' },
  { value: 'email_reachable', label: 'Email reachable' },
  { value: 'opted_out', label: 'Opted out' },
]

const SORT_OPTIONS: Array<{ value: RosterSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'birthday_asc', label: 'Birthday (month and day)' },
  { value: 'favorite_collection', label: 'Favorite collection A-Z' },
  { value: 'favorite_gem_or_stone', label: 'Favorite gem or stone A-Z' },
  { value: 'favorite_material', label: 'Favorite material A-Z' },
  { value: 'favorite_cut', label: 'Favorite cut A-Z' },
]

const HELP_RESOURCE_GROUP_ORDER = [
  'Setup',
  'Live Shows',
  'Dance Floor',
  'Customers & Account',
  'Help',
] as const

type HelpSupportReportType =
  | 'site_issue'
  | 'bug'
  | 'suggested_upgrade'
  | 'workflow_idea'

type HelpSupportReportUrgency = 'normal' | 'blocking' | 'showtime_urgent'

type HelpSupportReportForm = {
  details: string
}

const DEFAULT_SUPPORT_REPORT_FORM: HelpSupportReportForm = {
  details: '',
}

function inferSupportReportType(details: string): HelpSupportReportType {
  if (/\b(idea|suggest|suggestion|upgrade|feature|improve|improvement)\b/i.test(details)) {
    return 'suggested_upgrade'
  }
  if (/\b(workflow|process|steps|guide|how do i|how to)\b/i.test(details)) {
    return 'workflow_idea'
  }
  if (/\b(site|website|page|link|customer-facing|public)\b/i.test(details)) {
    return 'site_issue'
  }
  return 'bug'
}

function inferSupportReportUrgency(details: string): HelpSupportReportUrgency {
  if (/\b(live|show|showtime|right now|urgent|blocked|blocking|can't|cannot|stuck)\b/i.test(details)) {
    return 'blocking'
  }
  return 'normal'
}

function buildSupportReportTitle(details: string): string {
  const compact = details.replace(/\s+/g, ' ').trim()
  const firstSentence = compact.split(/[.!?]\s/)[0]?.trim() || compact
  const title = firstSentence.replace(/[.!?]+$/, '').slice(0, 120).trim()
  return title.length >= 3 ? title : 'Quick support report'
}

function buildSupportReportPayload(details: string) {
  const normalizedDetails = details.trim()
  return {
    reportType: inferSupportReportType(normalizedDetails),
    urgency: inferSupportReportUrgency(normalizedDetails),
    title: buildSupportReportTitle(normalizedDetails),
    details: normalizedDetails,
    contactOk: true,
  }
}

const SOCIAL_HANDLE_FIELDS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'whatnot', label: 'Whatnot' },
]

const WORKSPACE_APPEARANCE_PRESET: SiteAppearancePreset =
  DEFAULT_AMETHYST_APPEARANCE_PRESET
const SITE_APPEARANCE_PRESET_OPTIONS = AMETHYST_SKIN_CARDS.map((skin) => ({
  value: skin.id as SiteAppearancePreset,
  label: `${skin.label} (${skin.code})`,
}))

const SIGNUP_FORM_PATH = '/amethyst/Homepage.html#signup'
const MESSAGE_TYPE_LABELS: Record<string, string> = {
  monthly_report: 'Monthly report',
  newsletter: 'Newsletter',
  announcement: 'Announcement',
  support_request: 'Support request',
  support_response: 'Support reply',
}

function formatCompactDateTime(value: string | null) {
  if (!value) return 'Unknown'
  return value.replace('T', ' ').slice(0, 16)
}

function formatTradeMoney(value: number | null | undefined) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : 'MSRP unavailable'
}

export type BusinessCalculatorInput = {
  averageShowSales: number
  commissionRate: number
  showsPerMonth: number
  perShowExpenses: number
  monthlyExpenses: number
  monthlyProfitGoal: number
}

export type SingleShowCalculatorInput = {
  showSales: number
  commissionRate: number
  showExpenses: number
}

export function calculateBusinessCalculator(input: BusinessCalculatorInput) {
  const showsPerMonth = Math.max(0, input.showsPerMonth)
  const commissionRate = Math.max(0, input.commissionRate) / 100
  const grossSalesPerMonth = input.averageShowSales * showsPerMonth
  const grossCommissionPerShow = input.averageShowSales * commissionRate
  const takeHomePerShowBeforeMonthlyExpenses =
    grossCommissionPerShow - input.perShowExpenses
  const estimatedMonthlyTakeHome =
    takeHomePerShowBeforeMonthlyExpenses * showsPerMonth - input.monthlyExpenses
  const salesNeededPerMonthForGoal =
    commissionRate > 0
      ? (input.monthlyProfitGoal + input.monthlyExpenses + input.perShowExpenses * showsPerMonth) /
        commissionRate
      : 0
  const salesNeededPerShowForGoal =
    showsPerMonth > 0 ? salesNeededPerMonthForGoal / showsPerMonth : 0
  const estimatedMarginPercent =
    grossSalesPerMonth > 0 ? (estimatedMonthlyTakeHome / grossSalesPerMonth) * 100 : 0

  return {
    grossSalesPerMonth: roundMoney(grossSalesPerMonth),
    takeHomePerShowBeforeMonthlyExpenses: roundMoney(
      takeHomePerShowBeforeMonthlyExpenses,
    ),
    estimatedMonthlyTakeHome: roundMoney(estimatedMonthlyTakeHome),
    salesNeededPerMonthForGoal: roundMoney(salesNeededPerMonthForGoal),
    salesNeededPerShowForGoal: roundMoney(salesNeededPerShowForGoal),
    estimatedMarginPercent: roundPercent(estimatedMarginPercent),
  }
}

export function calculateSingleShowCalculator(input: SingleShowCalculatorInput) {
  const commissionRate = Math.max(0, input.commissionRate) / 100
  const showSales = Math.max(0, input.showSales)
  const showExpenses = Math.max(0, input.showExpenses)
  const grossCommission = showSales * commissionRate
  const estimatedShowTakeHome = grossCommission - showExpenses
  const expenseImpactPercent =
    grossCommission > 0 ? (showExpenses / grossCommission) * 100 : 0
  const estimatedMarginPercent =
    showSales > 0 ? (estimatedShowTakeHome / showSales) * 100 : 0

  return {
    grossCommission: roundMoney(grossCommission),
    estimatedShowTakeHome: roundMoney(estimatedShowTakeHome),
    expenseImpactPercent: roundPercent(expenseImpactPercent),
    estimatedMarginPercent: roundPercent(estimatedMarginPercent),
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}

export function filterRosterCustomers(
  customers: CustomerAudienceMember[],
  activeFilter: RosterFilter,
) {
  if (activeFilter === 'sms_reachable') {
    return customers.filter((customer) => customer.canReceiveSms)
  }

  if (activeFilter === 'email_reachable') {
    return customers.filter((customer) => customer.canReceiveEmail)
  }

  if (activeFilter === 'opted_out') {
    return customers.filter(
      (customer) =>
        customer.smsOptedOutAt !== null ||
        customer.stopKeywordReceivedAt !== null ||
        customer.emailOptedOutAt !== null,
    )
  }

  return customers
}

export function searchRosterCustomers(
  customers: CustomerAudienceMember[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return customers

  return customers.filter((customer) => {
    const searchableParts = [
      customer.name,
      customer.phone ?? '',
      customer.email ?? '',
    ]

    return searchableParts.some((part) =>
      part.toLowerCase().includes(normalizedQuery),
    )
  })
}

export function sortRosterCustomers(
  customers: CustomerAudienceMember[],
  sortOrder: RosterSort,
) {
  const next = [...customers]

  if (sortOrder === 'oldest') {
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return next
  }

  if (sortOrder === 'name_asc') {
    next.sort((a, b) => a.name.localeCompare(b.name))
    return next
  }

  const profileFieldBySort: Partial<Record<RosterSort, keyof CustomerAudienceMember>> = {
    birthday_asc: 'birthday',
    favorite_collection: 'favoriteCollection',
    favorite_gem_or_stone: 'favoriteGemOrStone',
    favorite_material: 'favoriteMaterial',
    favorite_cut: 'favoriteCut',
  }
  const profileField = profileFieldBySort[sortOrder]

  if (profileField) {
    next.sort((a, b) => {
      const aValue = String(a[profileField] ?? '').trim()
      const bValue = String(b[profileField] ?? '').trim()

      if (!aValue && !bValue) return a.name.localeCompare(b.name)
      if (!aValue) return 1
      if (!bValue) return -1
      const comparison = aValue.localeCompare(bValue)
      return comparison || a.name.localeCompare(b.name)
    })
    return next
  }

  next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return next
}

export function getVisibleContactValues(
  customers: CustomerAudienceMember[],
  channel: 'sms' | 'email',
) {
  const rawValues = customers
    .filter((customer) =>
      channel === 'sms' ? customer.canReceiveSms : customer.canReceiveEmail,
    )
    .map((customer) => (channel === 'sms' ? customer.phone : customer.email))
    .filter((value): value is string => Boolean(value))

  return [...new Set(rawValues)]
}

function normalizeDuplicatePhone(value: string | null) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

function normalizeDuplicateEmail(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized || null
}

function formatRosterDate(value: string) {
  return value.slice(0, 10)
}

function formatWalletDate(value: string | null) {
  return value ? value.slice(0, 10) : 'Never'
}

export function formatWalletAmount(mils: number) {
  const usd = walletMilsToUsd(mils)
  return usd < 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`
}

export function getEstimatedTextsRemaining(balanceMils: number) {
  return Math.floor(balanceMils / SMS_CHARGE_MILS)
}

export function getWalletLoadOptions(summary: WalletDashboardResult) {
  const minimumLoadCents = Math.max(
    100,
    Math.round(summary.minimumLoadAmountMils / 10),
  )
  const candidateAmounts = [minimumLoadCents, 5000, 10000]
  const uniqueAmounts = [...new Set(candidateAmounts)].sort((a, b) => a - b)

  return uniqueAmounts.map((amountCents) => ({
    amountCents,
    label: `Load $${amountCents / 100}`,
  }))
}

export function getAutoRechargeDraft(
  summary: WalletDashboardResult,
): WalletAutoRechargeDraft {
  return {
    enabled: summary.autoRechargeEnabled,
    thresholdCents: Math.round(summary.autoRechargeThresholdMils / 10),
    amountCents: Math.round(summary.autoRechargeAmountMils / 10),
  }
}

export function getAutoRechargeThresholdOptions(summary: WalletDashboardResult) {
  const currentThresholdCents = Math.round(summary.autoRechargeThresholdMils / 10)
  const candidateAmounts = [500, 1000, 1500, 2000, currentThresholdCents]
  const uniqueAmounts = [...new Set(candidateAmounts)].sort((a, b) => a - b)

  return uniqueAmounts.map((amountCents) => ({
    amountCents,
    label: `Recharge below $${amountCents / 100}`,
  }))
}

function joinRecipeLines(items?: string[]) {
  return (items ?? []).join('\n')
}

function splitRecipeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getRecipeDraft(recipe?: PublicSiteRecipe | null): RecipeDraft {
  return {
    id: recipe?.id,
    title: recipe?.title ?? '',
    slug: recipe?.slug ?? '',
    description: recipe?.description ?? '',
    category:
      recipe?.category === 'Baking' || recipe?.category === 'Dessert'
        ? 'Baking & Sweets'
        : recipe?.category ?? '',
    prepTime: recipe?.prepTime ?? '',
    servings:
      typeof recipe?.servings === 'number' && Number.isFinite(recipe.servings)
        ? String(recipe.servings)
        : '',
    imageUrl: recipe?.imageUrl ?? '',
    imageAlt: recipe?.imageAlt ?? '',
    imagePosition: recipe?.imagePosition ?? 'center',
    modalImageUrl: recipe?.modalImageUrl ?? '',
    modalImagePosition: recipe?.modalImagePosition ?? 'center',
    tiktokUrl: recipe?.tiktokUrl ?? '',
    ingredientsText: joinRecipeLines(recipe?.ingredients),
    stepsText: joinRecipeLines(recipe?.steps),
    note: recipe?.note ?? '',
    isVisible: recipe?.isVisible ?? true,
    sourceRecipeId: recipe?.sourceRecipeId ?? '',
    recipeCardImageUrls: recipe?.recipeSourceImageUrls ?? [],
  }
}

export function getRecipeDraftSavePayload(
  draft: RecipeDraft,
  options: { sortOrder?: number } = {},
) {
  const servings = draft.servings.trim()
  const parsedServings = servings ? Number.parseInt(servings, 10) : null

  return {
    id: draft.id,
    title: draft.title.trim(),
    slug: draft.slug.trim() || undefined,
    description: draft.description.trim(),
    category: draft.category.trim(),
    prepTime: draft.prepTime.trim(),
    servings: Number.isFinite(parsedServings) ? parsedServings : null,
    imageUrl: draft.imageUrl.trim(),
    imageAlt: draft.imageAlt.trim(),
    imagePosition: draft.imagePosition.trim() || 'center',
    modalImageUrl: draft.modalImageUrl.trim(),
    modalImagePosition: draft.modalImagePosition.trim() || 'center',
    tiktokUrl: draft.tiktokUrl.trim(),
    ingredients: splitRecipeLines(draft.ingredientsText),
    steps: splitRecipeLines(draft.stepsText),
    note: draft.note.trim(),
    sortOrder: options.sortOrder,
    isVisible: draft.isVisible,
    sourceRecipeId: draft.sourceRecipeId.trim(),
    recipeSourceImageUrls: draft.recipeCardImageUrls.map((url) => url.trim()).filter(Boolean),
  }
}

export function buildJoinTeamRosterRemovalPayload(memberId: string) {
  return {
    action: 'remove' as const,
    memberId,
    confirmed: true,
  }
}

export function confirmJoinTeamRosterRemoval(
  member: Pick<JoinTeamMember, 'displayName'>,
  confirmRemoval: (message: string) => boolean = (message) =>
    window.confirm(message),
) {
  return confirmRemoval(
    `Remove ${member.displayName}'s public team card permanently? Their onboarding history will be preserved.`,
  )
}

function recipeDraftFingerprint(draft: RecipeDraft) {
  return JSON.stringify({
    ...draft,
    id: draft.id ?? '',
    recipeCardImageUrls: draft.recipeCardImageUrls,
  })
}

function hasRecipeDraftChanges(
  draft: RecipeDraft,
  recipes: PublicSiteRecipe[],
) {
  if (draft.id) {
    const savedRecipe = recipes.find((recipe) => recipe.id === draft.id)
    return savedRecipe
      ? recipeDraftFingerprint(draft) !== recipeDraftFingerprint(getRecipeDraft(savedRecipe))
      : false
  }

  return Boolean(
    draft.title.trim() ||
      draft.description.trim() ||
      draft.category.trim() ||
      draft.prepTime.trim() ||
      draft.servings.trim() ||
      draft.imageUrl.trim() ||
      draft.modalImageUrl.trim() ||
      draft.tiktokUrl.trim() ||
      draft.ingredientsText.trim() ||
      draft.stepsText.trim() ||
      draft.note.trim() ||
      draft.recipeCardImageUrls.length,
  )
}

export function getRecipeSaveStatusText(actionState?: RecipeActionState) {
  if (actionState?.pendingKey) return 'Saving recipe changes...'
  if (actionState?.error) return 'Recipe changes need attention.'
  return actionState?.helperMessage ?? 'Add a recipe when you are ready.'
}

function sortRecipesByOrder(recipes: PublicSiteRecipe[]) {
  return [...recipes].sort((a, b) => {
    const orderDelta = a.sortOrder - b.sortOrder
    if (orderDelta !== 0) return orderDelta
    return a.title.localeCompare(b.title)
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read image file.')))
    reader.readAsDataURL(file)
  })
}

const EMPTY_HOMEPAGE_MEDIA_SLOTS: PublicSiteMediaSlot[] = [
  { key: 'showcase' as const, caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_1' as const, caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_2' as const, caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_3' as const, caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_4' as const, caption: '', imageUrl: '', videoUrl: '' },
]

export function getSiteSettingsDraft(
  settings: SiteSettingsDashboardResult,
  options: { isBrittWithBling?: boolean } = {},
): SiteSettingsDraft {
  const homepageMediaSlots =
    settings.homepageMediaSlots ?? EMPTY_HOMEPAGE_MEDIA_SLOTS
  const normalizedMediaSlots = homepageMediaSlots.map((slot) => ({ ...slot }))
  const preparedMediaSlots = options.isBrittWithBling
    ? normalizedMediaSlots.map((slot) => {
        if (slot.key === 'showcase') {
          if (slot.isVisible === false) return slot
          return {
            ...slot,
            videoUrl:
              normalizeSupportedPublicVideoUrl(slot.videoUrl) ||
              BRITT_WITH_BLING_SHOWCASE_VIDEO_URL,
            isVisible: true,
          }
        }
        if (slot.key === 'about_1') {
          if (slot.isVisible === false) return slot
          return {
            ...slot,
            imageUrl: slot.imageUrl || BRITT_WITH_BLING_ABOUT_PORTRAIT_URL,
            isVisible: true,
            // Brittany's migrated public About/media section is live by
            // default. Preserve an explicit future hide choice.
            sectionVisible: slot.sectionVisible !== false,
          }
        }
        return slot
      })
    : normalizedMediaSlots
  return {
    ...settings,
    appearancePreset: normalizeAmethystAppearancePreset(
      settings.appearancePreset,
    ) as SiteAppearancePreset,
    socialHandles: { ...settings.socialHandles },
    homepageMediaSlots: preparedMediaSlots,
  }
}

export type CustomerProfileInput = {
  name: string
  email: string
  phone: string
  address: string
  birthday: string
  favoriteGemOrStone: string
  favoriteMaterial: string
  favoriteCut: string
  favoriteCollection: string
  notes: string
  tags: string
}

type CustomerProfile = CustomerAudienceMember & Partial<CustomerProfileInput>

function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function importedText(row: Record<string, unknown>, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    if (!aliases.includes(normalizeImportHeader(key))) continue
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}`
    }
  }
  return ''
}

function normalizeImportedBirthday(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const isoMatch = /^\d{4}-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`
  const match = /^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?$/.exec(trimmed)
  if (!match) return trimmed
  return `${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
}

function addImportedText(
  target: CustomerAudienceImportInput,
  field: Exclude<keyof CustomerAudienceImportInput, 'name' | 'tags'>,
  value: string,
) {
  if (value.trim()) target[field] = value.trim()
}

export async function parseCustomerImportFile(file: File): Promise<CustomerAudienceImportInput[]> {
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  const rows = isCsv
    ? parseCustomerImportCsv(await file.text())
    : await parseCustomerImportWorkbook(file)
  if (rows.length === 0) throw new Error('That spreadsheet does not contain any customer rows.')
  if (rows.length > 250) throw new Error('Import up to 250 customer rows at a time.')

  return rows.map((row, index) => {
    const firstName = importedText(row, ['firstname', 'first'])
    const lastName = importedText(row, ['lastname', 'last'])
    const name = importedText(row, ['name', 'fullname', 'customername']) ||
      [firstName, lastName].filter(Boolean).join(' ')
    const contact: CustomerAudienceImportInput = { name }
    addImportedText(contact, 'email', importedText(row, ['email', 'emailaddress']))
    addImportedText(contact, 'phone', importedText(row, ['phone', 'mobile', 'cell', 'phonenumber', 'mobilenumber']))
    addImportedText(contact, 'address', importedText(row, ['address', 'streetaddress', 'addressline1']))
    const birthday = normalizeImportedBirthday(importedText(row, ['birthday', 'birthdate', 'bday']))
    if (birthday && !/^\d{2}-\d{2}$/.test(birthday)) {
      throw new Error(`Birthday in row ${index + 2} must use MM-DD or M/D/YYYY.`)
    }
    addImportedText(contact, 'birthday', birthday)
    addImportedText(contact, 'favoriteGemOrStone', importedText(row, ['favoritegem', 'favoritegemorstone', 'gem', 'stone']))
    addImportedText(contact, 'favoriteMaterial', importedText(row, ['favoritematerial', 'material']))
    addImportedText(contact, 'favoriteCut', importedText(row, ['favoritecut', 'cut']))
    addImportedText(contact, 'favoriteCollection', importedText(row, ['favoritecollection', 'collection']))
    addImportedText(contact, 'notes', importedText(row, ['notes', 'note']))
    const tags = importedText(row, ['tags', 'tag'])
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (tags.length) contact.tags = tags
    return contact
  })
}

function parseCustomerImportCsv(source: string): Record<string, unknown>[] {
  const cells: string[][] = [[]]
  let quoted = false
  let cell = ''
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (character === ',' && !quoted) {
      cells[cells.length - 1].push(cell)
      cell = ''
      continue
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      cells[cells.length - 1].push(cell)
      cell = ''
      cells.push([])
      continue
    }
    cell += character
  }
  cells[cells.length - 1].push(cell)
  return customerImportRowsFromCells(cells)
}

async function parseCustomerImportWorkbook(file: File): Promise<Record<string, unknown>[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Choose a CSV or .xlsx Excel spreadsheet.')
  }
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const [firstSheet] = await readXlsxFile(file)
  return customerImportRowsFromCells(firstSheet?.data ?? [])
}

function customerImportRowsFromCells(cells: unknown[][]): Record<string, unknown>[] {
  const [headerRow, ...dataRows] = cells
  const headers = (headerRow ?? []).map((value) => String(value ?? '').trim())
  if (!headers.some(Boolean)) return []
  return dataRows
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

const PUBLIC_SITE_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const DIRECT_PUBLIC_SITE_MEDIA_MAX_BYTES = 2_700_000
const COMPRESSED_PUBLIC_SITE_MEDIA_MAX_BYTES = 2_400_000
const DEFAULT_PORTRAIT_FRAMING = {
  portraitFocusX: 50,
  portraitFocusY: 20,
  portraitZoom: 1.18,
}

const TEAM_PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024
const TEAM_PROFILE_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

type BrowserFaceDetector = {
  detect: (image: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>
}

type BrowserFaceDetectorConstructor = new (options?: {
  fastMode?: boolean
  maxDetectedFaces?: number
}) => BrowserFaceDetector

async function getSmartPortraitFraming(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('Unable to read that photo.'))
      nextImage.src = objectUrl
    })
    const FaceDetector = (window as unknown as {
      FaceDetector?: BrowserFaceDetectorConstructor
    }).FaceDetector
    if (!FaceDetector) return DEFAULT_PORTRAIT_FRAMING

    const [face] = await new FaceDetector({ fastMode: true, maxDetectedFaces: 1 }).detect(image)
    if (!face || !image.naturalWidth || !image.naturalHeight) {
      return DEFAULT_PORTRAIT_FRAMING
    }

    const centerX = ((face.boundingBox.x + face.boundingBox.width / 2) / image.naturalWidth) * 100
    const centerY = ((face.boundingBox.y + face.boundingBox.height / 2) / image.naturalHeight) * 100
    const faceWidth = face.boundingBox.width / image.naturalWidth
    return {
      portraitFocusX: Math.min(82, Math.max(18, Math.round(centerX))),
      portraitFocusY: Math.min(48, Math.max(14, Math.round(centerY - 7))),
      portraitZoom: Math.min(1.28, Math.max(1.1, Math.round((1.08 + faceWidth * 0.35) * 100) / 100)),
    }
  } catch {
    return DEFAULT_PORTRAIT_FRAMING
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function preparePublicSiteMediaUpload(file: File) {
  if (!PUBLIC_SITE_MEDIA_MIME_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP photo.')
  }

  if (file.size <= DIRECT_PUBLIC_SITE_MEDIA_MAX_BYTES) {
    return { base64Data: await readFileAsDataUrl(file), filename: file.name }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('Unable to prepare that photo.'))
      nextImage.src = objectUrl
    })
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = Math.min(1, 1800 / longestEdge)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare that photo.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.84),
    )
    if (!compressed || compressed.size > COMPRESSED_PUBLIC_SITE_MEDIA_MAX_BYTES) {
      throw new Error('Choose a photo smaller than 2.5 MB.')
    }

    const filename = `${file.name.replace(/\.[^/.]+$/, '') || 'homepage-photo'}.jpg`
    return {
      base64Data: await readFileAsDataUrl(
        new File([compressed], filename, { type: 'image/jpeg' }),
      ),
      filename,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function createTickerLinkFromSelection(input: {
  tickerText: string
  selectionStart: number
  selectionEnd: number
  destination: string
}) {
  const selectedText = input.tickerText.slice(
    input.selectionStart,
    input.selectionEnd,
  )
  if (!selectedText.trim()) return null

  try {
    const url = new URL(input.destination.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const linkedText = `[${selectedText}](${url.href})`
    return `${input.tickerText.slice(0, input.selectionStart)}${linkedText}${input.tickerText.slice(input.selectionEnd)}`
  } catch {
    return null
  }
}

export function makeTickerLinksPlainText(tickerText: string) {
  return tickerText.replace(/\[([^\]]+)\]\([^()\s]+\)/g, '$1')
}

export function updateHomepageMediaSlot(
  draft: SiteSettingsDraft,
  key: PublicSiteMediaSlotKey,
  patch: Partial<NonNullable<SiteSettingsDraft['homepageMediaSlots']>[number]>,
): SiteSettingsDraft {
  return {
    ...draft,
    homepageMediaSlots: (draft.homepageMediaSlots ?? []).map((slot) =>
      slot.key === key ? { ...slot, ...patch, key } : slot,
    ),
  }
}

export function getWorkspaceSkinPreset(
  settings?: Pick<SiteSettingsDashboardResult, 'appearancePreset'> | null,
  draft?: Pick<SiteSettingsDraft, 'appearancePreset'> | null,
): SiteAppearancePreset {
  return WORKSPACE_APPEARANCE_PRESET
}

export function getNormalizedSiteSettingsDraft(
  draft: SiteSettingsDraft,
  options: { isBrittWithBling?: boolean } = {},
): SiteSettingsDraft {
  const normalizedDraft = getSiteSettingsDraft(draft, options)
  return {
    ...normalizedDraft,
    appearancePreset: normalizeAmethystAppearancePreset(
      normalizedDraft.appearancePreset,
    ) as SiteAppearancePreset,
  }
}

export function hasSiteSettingsUnsavedChanges({
  settings,
  draft,
  isBrittWithBling = false,
}: {
  settings?: SiteSettingsDashboardResult | null
  draft?: SiteSettingsDraft | null
  isBrittWithBling?: boolean
}) {
  if (!settings || !draft) return false
  return (
    JSON.stringify(getNormalizedSiteSettingsDraft(draft, { isBrittWithBling })) !==
    JSON.stringify(
      getNormalizedSiteSettingsDraft(
        getSiteSettingsDraft(settings, { isBrittWithBling }),
        { isBrittWithBling },
      ),
    )
  )
}

export function getSiteSettingsManualSaveStatusText({
  settings,
  draft,
  actionState,
  statusMessage,
  isBrittWithBling = false,
}: {
  settings?: SiteSettingsDashboardResult | null
  draft?: SiteSettingsDraft | null
  actionState?: SiteSettingsActionState
  statusMessage?: string | null
  isBrittWithBling?: boolean
}) {
  if (!settings || !draft) return null
  if (actionState?.error) return 'Changes need attention.'
  if (actionState?.pending) return 'Saving changes...'
  if (hasSiteSettingsUnsavedChanges({ settings, draft, isBrittWithBling })) {
    return 'Unsaved changes.'
  }
  return statusMessage ?? 'No unsaved changes.'
}

export function formatAccountBillingDate(value: string | null) {
  if (!value) return 'Not set'
  return value.slice(0, 10)
}

export function getAccountBillingBannerMessage(search: string) {
  const params = new URLSearchParams(search)
  const value = params.get('billing')
  if (value === 'subscription-success') {
    return 'Subscription checkout completed. Billing status will refresh in a moment.'
  }
  if (value === 'subscription-cancelled') {
    return 'Subscription checkout was cancelled.'
  }
  if (value === 'portal-returned') {
    return 'Returned from Stripe billing portal.'
  }
  return null
}

export function getAutoRechargeAmountOptions(
  summary: WalletDashboardResult,
  thresholdCents: number,
) {
  const minimumLoadCents = Math.max(
    2500,
    Math.round(summary.minimumLoadAmountMils / 10),
  )
  const currentAmountCents = Math.round(summary.autoRechargeAmountMils / 10)
  const candidateAmounts = [minimumLoadCents, 5000, 10000, currentAmountCents]
  const uniqueAmounts = [...new Set(candidateAmounts)]
    .filter((amountCents) => amountCents > thresholdCents)
    .sort((a, b) => a - b)

  return uniqueAmounts.map((amountCents) => ({
    amountCents,
    label: `Reload $${amountCents / 100}`,
  }))
}

export function getWalletBannerMessage(search: string) {
  const normalized = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalized)
  const walletStatus = params.get('wallet')

  if (walletStatus === 'success') {
    return 'Wallet load completed. Your balance will refresh in a moment.'
  }

  if (walletStatus === 'cancelled') {
    return 'Wallet load was cancelled.'
  }

  return null
}

function getTimeZoneParts(input: Date | string, timeZone: string) {
  const date = typeof input === 'string' ? new Date(input) : input
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)
  const byType = new Map(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(byType.get('year')),
    month: Number(byType.get('month')),
    day: Number(byType.get('day')),
  }
}

function getDateKeyInTimeZone(
  input: Date | string,
  timeZone = DEFAULT_CALENDAR_TIME_ZONE,
) {
  const { year, month, day } = getTimeZoneParts(input, timeZone)
  return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
}

function getCalendarDisplayTimeZone(events: CalendarEvent[]) {
  return events.find((event) => event.timeZone)?.timeZone ?? DEFAULT_CALENDAR_TIME_ZONE
}

function getMonthStartInTimeZone(referenceDate: Date, timeZone: string) {
  const { year, month } = getTimeZoneParts(referenceDate, timeZone)
  return new Date(Date.UTC(year, month - 1, 1))
}

function getCalendarEventTitle(event: CalendarEvent) {
  const title = event.title?.trim()
  if (title) return title

  const description = event.description?.trim()
  if (description) return description

  return `${event.platform} live`
}

function getCalendarEventStatusLabel(event: CalendarEvent) {
  switch (event.status) {
    case 'live':
      return 'Live now'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'scheduled':
    default:
      return 'Scheduled'
  }
}

function getCalendarStatusClassName(event: CalendarEvent) {
  const statusClass =
    event.status === 'live'
      ? styles.calendarStatusLive
      : event.status === 'completed'
        ? styles.calendarStatusCompleted
        : event.status === 'cancelled'
          ? styles.calendarStatusCancelled
          : styles.calendarStatusScheduled

  return statusClass
}

export function getShowCalendarMetrics(
  upcomingEvents: CalendarEvent[],
  recentEvents: CalendarEvent[],
  referenceDate = new Date(),
  monthEvents: CalendarEvent[] = upcomingEvents,
) {
  const displayTimeZone = getCalendarDisplayTimeZone([...upcomingEvents, ...recentEvents])
  const monthStart = getMonthStartInTimeZone(referenceDate, displayTimeZone)
  const monthKey = getDateKeyInTimeZone(monthStart, 'UTC').slice(0, 7)

  const thisMonthCount = monthEvents.filter((event) => {
    const eventMonthKey = getDateKeyInTimeZone(
      event.eventTime,
      event.timeZone ?? displayTimeZone,
    ).slice(0, 7)
    return eventMonthKey === monthKey
  }).length

  return {
    monthLabel: monthStart.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    upcomingCount: upcomingEvents.length,
    thisMonthCount,
    recurringCount: upcomingEvents.filter((event) => event.isRecurring).length,
    recentCount: recentEvents.length,
  }
}

export function buildShowCalendarCells(
  events: CalendarEvent[],
  referenceDate = new Date(),
): CalendarDayCell[] {
  const displayTimeZone = getCalendarDisplayTimeZone(events)
  const monthStart = getMonthStartInTimeZone(referenceDate, displayTimeZone)
  const gridStart = new Date(monthStart)
  gridStart.setUTCDate(monthStart.getUTCDate() - monthStart.getUTCDay())

  const todayKey = getDateKeyInTimeZone(referenceDate, displayTimeZone)
  const eventsByDay = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const key = getDateKeyInTimeZone(
      event.eventTime,
      event.timeZone ?? displayTimeZone,
    )
    const existing = eventsByDay.get(key) ?? []
    existing.push(event)
    eventsByDay.set(key, existing)
  }

  return Array.from({ length: 35 }, (_, index) => {
    const cellDate = new Date(gridStart)
    cellDate.setUTCDate(gridStart.getUTCDate() + index)

    const isoDate = getDateKeyInTimeZone(cellDate, 'UTC')
    return {
      isoDate,
      dayNumber: cellDate.getUTCDate(),
      isCurrentMonth: cellDate.getUTCMonth() === monthStart.getUTCMonth(),
      isToday: isoDate === todayKey,
      events: eventsByDay.get(isoDate) ?? [],
    }
  })
}

function addCalendarMonths(referenceDate: Date, monthDelta: number) {
  const next = new Date(referenceDate)
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + monthDelta)
  return next
}

function formatCalendarEventDate(
  eventTime: string,
  timeZone = DEFAULT_CALENDAR_TIME_ZONE,
) {
  return new Date(eventTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone,
  })
}

function formatCalendarEventTime(
  eventTime: string,
  timeZone = DEFAULT_CALENDAR_TIME_ZONE,
) {
  return new Date(eventTime).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  })
}

function formatCalendarEventEndTime(
  eventTime: string,
  durationMinutes: number,
  timeZone = DEFAULT_CALENDAR_TIME_ZONE,
) {
  const endTime = new Date(Date.parse(eventTime) + durationMinutes * 60_000)
  return endTime.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  })
}

function formatCalendarDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes} minutes`

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  if (minutes === 0) return hourLabel
  return `${hourLabel} ${minutes} minutes`
}

function formatCalendarRecurrence(event: CalendarEvent) {
  if (!event.isRecurring) return 'One-time show'

  const cadence =
    event.recurrenceRule === 'daily'
      ? 'Daily'
      : event.recurrenceRule === 'weekday'
        ? 'Weekday'
      : event.recurrenceRule === 'weekly'
        ? 'Weekly'
        : 'Recurring'
  return `${cadence} series`
}

type CalendarEventDetailGroup = {
  label: string
  value?: string
  items?: string[]
}

export function getCalendarEventDetailGroups(
  event: CalendarEvent,
): CalendarEventDetailGroup[] {
  const title = getCalendarEventTitle(event)
  const timeZone = event.timeZone ?? DEFAULT_CALENDAR_TIME_ZONE
  const discountCodes =
    event.discountCodes.length > 0
      ? event.discountCodes.map((discount) =>
          discount.description
            ? `${discount.code}: ${discount.description}`
            : discount.code,
        )
      : ['No discount codes listed']
  const featuredCollections =
    event.featuredCollections && event.featuredCollections.length > 0
      ? event.featuredCollections
      : ['No featured collections listed']

  return [
    { label: 'Title', value: title },
    { label: 'Status', value: getCalendarEventStatusLabel(event) },
    { label: 'Platform', value: event.platform },
    {
      label: 'Date and time',
      value: `${formatCalendarEventDate(event.eventTime, timeZone)} at ${formatCalendarEventTime(
        event.eventTime,
        timeZone,
      )}`,
    },
    {
      label: 'End time',
      value: formatCalendarEventEndTime(
        event.eventTime,
        event.durationMinutes,
        timeZone,
      ),
    },
    { label: 'Duration', value: formatCalendarDuration(event.durationMinutes) },
    { label: 'Time zone', value: timeZone },
    { label: 'Recurrence', value: formatCalendarRecurrence(event) },
    { label: 'Discount codes', items: discountCodes },
    { label: 'Featured collections', items: featuredCollections },
    { label: 'Description', value: event.description?.trim() || 'No description' },
  ]
}

function getWalletTransactionLabel(transaction: WalletTransactionSummary) {
  if (transaction.description) return transaction.description

  const fallbackLabels: Record<WalletTransactionSummary['type'], string> = {
    load: 'Wallet load',
    auto_recharge: 'Auto-recharge',
    sms_charge: 'SMS send',
    refund: 'Refund',
    adjustment: 'Adjustment',
  }

  return fallbackLabels[transaction.type]
}

function getWalletTransactionAmountPrefix(type: WalletTransactionSummary['type']) {
  if (type === 'sms_charge') return '-'
  return '+'
}

function getWalletReloadHistory(transactions: WalletTransactionSummary[]) {
  return transactions.filter(
    (transaction) =>
      transaction.type === 'load' || transaction.type === 'auto_recharge',
  )
}

export function getCustomerDuplicateSummary(
  customer: CustomerAudienceMember,
  customers: CustomerAudienceMember[],
) {
  const phone = normalizeDuplicatePhone(customer.phone)
  const email = normalizeDuplicateEmail(customer.email)

  const duplicates = customers.filter((candidate) => {
    if (candidate.id === customer.id) return false

    const phoneMatches =
      phone !== null && normalizeDuplicatePhone(candidate.phone) === phone
    const emailMatches =
      email !== null && normalizeDuplicateEmail(candidate.email) === email

    return phoneMatches || emailMatches
  })

  if (duplicates.length === 0) {
    return null
  }

  return `Possible duplicate: shares phone or email with ${duplicates.length} other record${duplicates.length === 1 ? '' : 's'}.`
}

export function getCustomerChannelStatuses(customer: CustomerAudienceMember) {
  const sms = customer.canReceiveSms
    ? 'SMS opted in'
    : customer.stopKeywordReceivedAt || customer.smsOptedOutAt
      ? 'Opted out'
      : customer.smsConsent
        ? customer.phone
          ? 'Blocked'
          : 'No phone'
        : 'No consent'

  const email = customer.canReceiveEmail
    ? 'Reachable'
    : customer.emailOptedOutAt
      ? 'Opted out'
      : customer.emailConsent
        ? customer.email
          ? 'Blocked'
          : 'No email'
        : 'No consent'

  return { sms, email }
}

export function getCustomerTimeline(customer: CustomerAudienceMember) {
  const entries = [`Consent captured ${formatRosterDate(customer.consentDate ?? customer.createdAt)}`]

  if (customer.stopKeywordReceivedAt) {
    entries.push(`STOP received ${formatRosterDate(customer.stopKeywordReceivedAt)}`)
  } else if (customer.smsOptedOutAt) {
    entries.push(`SMS opted out ${formatRosterDate(customer.smsOptedOutAt)}`)
  }

  if (customer.emailOptedOutAt) {
    entries.push(`Email opted out ${formatRosterDate(customer.emailOptedOutAt)}`)
  }

  return entries
}

function getCustomerProfileDetails(customer: CustomerAudienceMember) {
  return [
    { label: 'Birthday', value: customer.birthday },
    { label: 'Favorite collection', value: customer.favoriteCollection },
    { label: 'Favorite gem or stone', value: customer.favoriteGemOrStone },
    { label: 'Favorite material', value: customer.favoriteMaterial },
    { label: 'Favorite cut', value: customer.favoriteCut },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value?.trim()))
}

function getCustomerBadges(customer: CustomerAudienceMember) {
  const badges: Array<{ tone: 'neutral' | 'positive' | 'warning'; text: string }> =
    []

  if (customer.canReceiveSms) {
    badges.push({ tone: 'positive', text: 'SMS opted in' })
  } else if (customer.stopKeywordReceivedAt) {
    badges.push({ tone: 'warning', text: 'STOP received' })
  } else if (customer.smsOptedOutAt) {
    badges.push({ tone: 'warning', text: 'SMS opted out' })
  } else if (customer.smsConsent) {
    badges.push({ tone: 'neutral', text: 'SMS consent on file' })
  }

  if (customer.canReceiveEmail) {
    badges.push({ tone: 'positive', text: 'Email reachable' })
  } else if (customer.emailOptedOutAt) {
    badges.push({ tone: 'warning', text: 'Email opted out' })
  } else if (customer.emailConsent) {
    badges.push({ tone: 'neutral', text: 'Email consent on file' })
  }

  if (customer.marketingConsent) {
    badges.push({ tone: 'neutral', text: 'Marketing ok' })
  }

  return badges
}

export function getCustomerActions(customer: CustomerAudienceMember) {
  const actions: Array<{ channel: 'sms' | 'email'; label: string }> = []

  if (customer.canReceiveSms) {
    actions.push({ channel: 'sms', label: 'Unsubscribe SMS' })
  }

  if (customer.canReceiveEmail) {
    actions.push({ channel: 'email', label: 'Unsubscribe email' })
  }

  return actions
}

export function getCustomerOutreachActions(customer: CustomerAudienceMember) {
  if (!customer.canReceiveEmail) {
    return []
  }

  return [{ kind: 'email' as const, label: 'Email customer' }]
}

export function needsFreshOptIn(customer: CustomerAudienceMember) {
  return Boolean(
    customer.smsOptedOutAt ||
      customer.stopKeywordReceivedAt ||
      customer.emailOptedOutAt,
  )
}

export function getCustomerRecoveryActions(customer: CustomerAudienceMember) {
  if (!needsFreshOptIn(customer)) {
    return []
  }

  return [
    { kind: 'open_signup' as const, label: 'Open signup form' },
    { kind: 'copy_signup' as const, label: 'Copy signup link' },
  ]
}

export type DashboardPlaceholderProps = {
  repIdOverride?: string
  publicSiteSlugOverride?: string | null
  liveQueueSyncCodeOverride?: string | null
  initialSiteSettings?: SiteSettingsDashboardResult
  reviewWorkspaceMode?: boolean
  operatorSupportMode?: boolean
  initialSectionOverride?: WorkspaceSectionKey
  onLaunchNicNacAction?: (action: WorkspaceLaunchAction) => void
  onSendNicNacPrompt?: (prompt: string) => void
  onNewConversation?: () => void
  conversationControlsDisabled?: boolean
  desktopChat?: ReactNode
}

type WorkspacePreviewState =
  | { mode: 'workspace' }
  | {
      mode: 'live_site_preview'
      href: string
      title: 'Live Site Preview' | 'Customer Dance Floor Preview'
    }

export function DashboardPlaceholder(props: DashboardPlaceholderProps = {}) {
  const {
    repIdOverride,
    publicSiteSlugOverride,
    liveQueueSyncCodeOverride,
    initialSiteSettings,
    reviewWorkspaceMode = false,
    operatorSupportMode = false,
    initialSectionOverride,
    onLaunchNicNacAction,
    onSendNicNacPrompt,
    onNewConversation,
    conversationControlsDisabled = false,
    desktopChat,
  } = props
  const [activeSection, setActiveSection] =
    useState<WorkspaceSectionKey>(() =>
      initialSectionOverride ??
      (typeof window === 'undefined'
        ? 'home'
        : getInitialWorkspaceSection(window.location.search)),
    )
  const [recipeEditorTab, setRecipeEditorTab] =
    useState<RecipeEditorTab>('current')
  const [workspacePreview, setWorkspacePreview] = useState<WorkspacePreviewState>({
    mode: 'workspace',
  })
  const [previewFrameKey, setPreviewFrameKey] = useState(0)
  const [previewUnavailableMessage, setPreviewUnavailableMessage] = useState<
    string | null
  >(null)
  const [repProfileState, setRepProfileState] = useState<RepProfileState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    repId: repIdOverride,
    displayName: initialSiteSettings?.displayName,
    businessName: initialSiteSettings?.businessName,
    publicSiteSlug: publicSiteSlugOverride ?? null,
    liveQueueSyncCode: liveQueueSyncCodeOverride ?? null,
  })
  const isBrittWithBlingWorkspace = isBrittWithBlingPublicSiteSlug(
    publicSiteSlugOverride ?? repProfileState.publicSiteSlug,
  )
  const [audienceState, setAudienceState] = useState<AudienceState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    summary: reviewWorkspaceMode
      ? {
          totalCustomers: 0,
          smsReachableCount: 0,
          emailReachableCount: 0,
          marketingConsentCount: 0,
          smsOptedOutCount: 0,
          emailOptedOutCount: 0,
          addedLast30DaysCount: 0,
        }
      : undefined,
    customers: reviewWorkspaceMode ? [] : undefined,
  })

  useEffect(() => {
    if (initialSectionOverride) return
    if (typeof window === 'undefined') return
    const requestedSection = getInitialWorkspaceSection(window.location.search)
    setActiveSection((currentSection) =>
      currentSection === requestedSection ? currentSection : requestedSection,
    )
  }, [initialSectionOverride])
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<RosterSort>('newest')
  const [actionState, setActionState] = useState<AudienceActionState>({
    pendingKey: null,
    error: null,
    helperMessage: null,
  })
  const [emailComposer, setEmailComposer] = useState<EmailComposerState>({
    audienceId: null,
    subject: '',
    body: '',
    pending: false,
  })
  const [walletState, setWalletState] = useState<WalletState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    summary: reviewWorkspaceMode
      ? {
          balanceMils: 0,
          balanceUsd: 0,
          estimatedTextsRemaining: 0,
          messagesSentThisMonth: 0,
          messagesSpendThisMonthMils: 0,
          messagesSpendThisMonthUsd: 0,
          autoRechargeEnabled: false,
          autoRechargePending: false,
          autoRechargeThresholdMils: 10000,
          autoRechargeThresholdUsd: 10,
          autoRechargeAmountMils: 25000,
          autoRechargeAmountUsd: 25,
          minimumLoadAmountMils: 25000,
          minimumLoadAmountUsd: 25,
          lastLoadedAt: null,
          recentTransactions: [],
        }
      : undefined,
  })
  const [calendarState, setCalendarState] = useState<CalendarState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    summary: reviewWorkspaceMode
      ? {
          upcomingEvents: [],
          recentEvents: [],
        }
      : undefined,
  })
  const [siteSettingsState, setSiteSettingsState] = useState<SiteSettingsState>(
    initialSiteSettings
      ? {
          status: 'ready',
          settings: initialSiteSettings,
        }
      : {
          status: 'loading',
        },
  )
  const [accountBillingState, setAccountBillingState] =
    useState<AccountBillingState>({
      status: reviewWorkspaceMode ? 'ready' : 'loading',
      summary: reviewWorkspaceMode
        ? {
            stripeConfigured: false,
            checkoutMode: 'test_buyer',
            subscription: {
              status: 'active',
              planType: 'monthly',
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              cancelledAt: null,
              livemode: false,
            },
            paymentMethod: null,
            invoices: [],
            referral: {
              code: null,
              link: null,
              pendingCount: 0,
              earnedCount: 0,
              creditedCount: 0,
            },
            workspaceAccess: {
              hasFullAccess: true,
              source: 'subscription',
              status: 'subscription_active',
              subscriptionStatus: 'active',
              trialStartsAt: null,
              trialEndsAt: null,
            },
            grandfatheredCheckout: null,
            canStartSubscription: false,
            canManageBilling: false,
          }
        : undefined,
    })
  const [walletActionState, setWalletActionState] = useState<WalletActionState>({
    pendingAmountCents: null,
    pendingSettings: false,
    error: null,
    helperMessage: null,
  })
  const [siteSettingsActionState, setSiteSettingsActionState] =
    useState<SiteSettingsActionState>({
      pending: false,
      error: null,
      helperMessage: null,
    })
  const [siteSettingsMediaUploadKey, setSiteSettingsMediaUploadKey] =
    useState<PublicSiteMediaSlotKey | null>(null)
  const [siteSettingsMediaUploadFeedback, setSiteSettingsMediaUploadFeedback] =
    useState<{ key: PublicSiteMediaSlotKey; message: string; tone: 'error' | 'success' } | null>(null)
  const [recipesState, setRecipesState] = useState<RecipesState>({
    status: 'idle',
    recipes: [],
  })
  const [recipeActionState, setRecipeActionState] =
    useState<RecipeActionState>({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft>(() =>
    getRecipeDraft(),
  )
  const [accountBillingActionState, setAccountBillingActionState] =
    useState<AccountBillingActionState>({
      pendingAction: null,
      error: null,
      helperMessage: null,
    })
  const [subscriptionAgreementAccepted, setSubscriptionAgreementAccepted] =
    useState(false)
  const [autoRechargeDraft, setAutoRechargeDraft] =
    useState<WalletAutoRechargeDraft | null>(null)
  const [siteSettingsDraft, setSiteSettingsDraft] =
    useState<SiteSettingsDraft | null>(
      initialSiteSettings
        ? getSiteSettingsDraft(initialSiteSettings, {
            isBrittWithBling: isBrittWithBlingWorkspace,
          })
        : null,
    )
  const siteSettingsDraftRef = useRef<SiteSettingsDraft | null>(
    siteSettingsDraft,
  )
  const siteSettingsSaveRequestRef = useRef(0)
  const [tradeBoardState, setTradeBoardState] = useState<TradeBoardState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    board: reviewWorkspaceMode
      ? {
          listings: [],
          summary: {
            totalPieces: 0,
            totalMsrp: 0,
            pendingRequestCount: 0,
            typeBreakdown: {
              RG: 0,
              NK: 0,
              ER: 0,
              ST: 0,
              BR: 0,
            },
          },
        }
      : undefined,
    hasMoreListings: reviewWorkspaceMode ? false : undefined,
  })
  const [tradeBoardActionState, setTradeBoardActionState] =
    useState<TradeBoardActionState>({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  const inventoryBrowseLoadPromiseRef = useRef<Promise<void> | null>(null)
  const inventoryBrowseFailedOffsetRef = useRef<number | null>(null)
  const tradeAddMutationKeysRef = useRef<Map<string, string>>(new Map())
  const [tradeRequestsState, setTradeRequestsState] = useState<TradeRequestsState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    requests: reviewWorkspaceMode ? [] : undefined,
  })
  const [fulfillmentQueueState, setFulfillmentQueueState] =
    useState<FulfillmentQueueState>({
      status: reviewWorkspaceMode ? 'ready' : 'loading',
      items: reviewWorkspaceMode ? [] : undefined,
    })
  const [tradeSwapCleanupState, setTradeSwapCleanupState] =
    useState<TradeSwapCleanupState>({
      status: reviewWorkspaceMode ? 'ready' : 'loading',
      items: reviewWorkspaceMode ? [] : undefined,
    })
  const [jewelryLibraryState, setJewelryLibraryState] =
    useState<JewelryLibraryState>({
      status: 'idle',
      results: [],
      facets: EMPTY_JEWELRY_LIBRARY_FACETS,
    })
  const [messagesState, setMessagesState] = useState<MessagesState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    inbox: reviewWorkspaceMode
      ? {
          unreadCount: getActiveUnreadMessageCount(REVIEW_INBOX_FIXTURES),
          messages: REVIEW_INBOX_FIXTURES,
        }
      : undefined,
  })
  const [messagesActionState, setMessagesActionState] =
    useState<MessagesActionState>({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  const messagesRefreshInFlightRef = useRef(false)
  const [teamManagementState, setTeamManagementState] =
    useState<TeamManagementState>(() =>
      reviewWorkspaceMode
        ? {
            status: 'locked',
            access: { enabled: false, status: 'not_enabled', source: null },
            participants: [],
            publicTeamRoster: [],
          }
        : { status: 'loading' },
    )
  const [teamManagementActionState, setTeamManagementActionState] =
    useState<TeamManagementActionState>({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  const [publicTeamDraft, setPublicTeamDraft] = useState<JoinTeamRosterDraft>(
    () => getJoinTeamRosterDraft(),
  )
  const [resourcesState, setResourcesState] = useState<ResourcesState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    resources: reviewWorkspaceMode ? [] : undefined,
  })
  const [analyticsState, setAnalyticsState] = useState<AnalyticsState>({
    status: reviewWorkspaceMode ? 'ready' : 'loading',
    analytics: reviewWorkspaceMode
      ? {
          configured: false,
          privacy: {
            disablesIpCapture: true,
            masksSensitiveInputs: true,
            identifiesAfterLoginOnly: true,
          },
          overview: {
            pageViews30d: null,
            uniqueVisitors30d: null,
            topTrafficSource: null,
            topDeviceType: null,
          },
          topPages: [],
          trafficSources: [],
          deviceMix: [],
          operationalSnapshot: {
            activeListings: 0,
            pendingRequests: 0,
            upcomingShows: 0,
            reachableCustomers: 0,
          },
        }
      : undefined,
  })
  const [tradeBoardSearchQuery, setTradeBoardSearchQuery] = useState('')
  const [quickAddItemNumber, setQuickAddItemNumber] = useState('')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryFilters, setLibraryFilters] = useState<JewelryLibraryFilters>(
    EMPTY_JEWELRY_LIBRARY_FILTERS,
  )
  async function loadRepProfile(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/me', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`rep profile request failed: ${response.status}`)
    }

    const payload = (await response.json()) as MeResponsePayload
    setRepProfileState({
      status: 'ready',
      repId: payload.rep?.id,
      displayName: payload.rep?.display_name,
      businessName: payload.rep?.business_name,
      publicSiteSlug: payload.rep?.public_site_slug ?? null,
      liveQueueSyncCode: payload.rep?.live_queue_sync_code ?? null,
      timeZone: payload.rep?.time_zone ?? null,
    })
  }

  async function loadAudience(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/customer-audience?limit=25', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`audience request failed: ${response.status}`)
    }

    const payload = (await response.json()) as AudienceResponsePayload
    setAudienceState({
      status: 'ready',
      summary: payload.summary,
      customers: payload.customers,
    })
  }

  async function loadWallet(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/wallet-summary?limit=5', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`wallet request failed: ${response.status}`)
    }

    const payload = (await response.json()) as WalletResponsePayload
    setWalletState({
      status: 'ready',
      summary: payload,
    })
  }

  async function loadCalendar(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/calendar-summary?upcoming=180&history=60', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`calendar request failed: ${response.status}`)
    }

    const payload = (await response.json()) as CalendarResponsePayload
    setCalendarState({
      status: 'ready',
      summary: payload,
    })
  }

  async function loadSiteSettings(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/site-settings', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`site settings request failed: ${response.status}`)
    }

    const payload = (await response.json()) as SiteSettingsResponsePayload
    setSiteSettingsState({
      status: 'ready',
      settings: payload,
    })
  }

  async function loadSiteRecipes(
    signal?: AbortSignal,
    options: { preferredRecipeId?: string | null } = {},
  ) {
    setRecipesState((current) => ({
      status: 'loading',
      recipes: current.recipes,
    }))

    const response = await fetch(buildSiteRecipesFetchUrl(), {
      credentials: 'include',
      signal,
    })
    const payload = (await response.json().catch(() => null)) as
      | SiteRecipesResponsePayload
      | null
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to load site recipes right now.')
    }

    const recipes = sortRecipesByOrder(payload?.recipes ?? [])
    setRecipesState({
      status: 'ready',
      recipes,
    })
    const preferredRecipeId =
      options.preferredRecipeId === undefined
        ? selectedRecipeId
        : options.preferredRecipeId
    const selectedRecipe = preferredRecipeId
      ? recipes.find((recipe) => recipe.id === preferredRecipeId)
      : undefined
    setSelectedRecipeId(selectedRecipe?.id ?? null)
    setRecipeDraft(getRecipeDraft(selectedRecipe ?? null))
    return recipes
  }

  async function loadAccountBilling(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/account-billing', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`account billing request failed: ${response.status}`)
    }

    const payload = (await response.json()) as AccountBillingResponsePayload
    setAccountBillingState({
      status: 'ready',
      summary: payload,
    })
  }

  async function loadTradeBoard(
    signal?: AbortSignal,
    options: { offset?: number; append?: boolean } = {},
  ) {
    const response = await fetch(buildTradeBoardFetchUrl({ offset: options.offset }), {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`dance floor request failed: ${response.status}`)
    }

    const payload = (await response.json()) as TradeBoardResponsePayload
    setTradeBoardState((current) => {
      const board = options.append
        ? mergeTradeBoardResults(current.board, payload)
        : payload
      return {
        status: 'ready',
        board,
        hasMoreListings: payload.listings.length === TRADE_BOARD_PAGE_SIZE,
      }
    })
    return payload
  }

  async function loadTradeRequests(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/trade-requests?status=pending&limit=8', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`trade requests request failed: ${response.status}`)
    }

    const payload = (await response.json()) as TradeRequestsResponsePayload
    setTradeRequestsState({
      status: 'ready',
      requests: payload,
    })
  }

  async function loadFulfillmentQueue(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/fulfillment-queue', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`fulfillment queue request failed: ${response.status}`)
    }

    const payload = (await response.json()) as FulfillmentQueueResponsePayload
    setFulfillmentQueueState({
      status: 'ready',
      items: payload,
    })
  }

  async function loadTradeSwapCleanup(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/trade-swap-cleanup', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`trade swap cleanup request failed: ${response.status}`)
    }

    const payload = (await response.json()) as TradeSwapCleanupResponsePayload
    setTradeSwapCleanupState({
      status: 'ready',
      items: payload,
    })
  }

  async function loadMessages(signal?: AbortSignal) {
    const loadInbox = async (archived: boolean) => {
      const params = new URLSearchParams({
        limit: '100',
        archived: String(archived),
      })
      const response = await fetch(`/api/nic-nac/messages?${params.toString()}`, {
        credentials: 'include',
        signal,
      })
      if (!response.ok) {
        throw new Error(`messages request failed: ${response.status}`)
      }
      return (await response.json()) as MessagesResponsePayload
    }

    const [activeInbox, archivedInbox] = await Promise.all([
      loadInbox(false),
      loadInbox(true),
    ])
    const activeItems = activeInbox.items ?? activeInbox.messages ?? []
    const archivedItems = archivedInbox.items ?? archivedInbox.messages ?? []
    const messagesByDelivery = new Map<string, WorkspaceInboxItem>()
    for (const message of [...activeItems, ...archivedItems]) {
      messagesByDelivery.set(
        isConversationItem(message) ? message.id : message.deliveryId || message.id,
        message,
      )
    }
    setMessagesState({
      status: 'ready',
      inbox: {
        ...activeInbox,
        unreadCount: activeInbox.unreadCount,
        messages: Array.from(messagesByDelivery.values()),
      },
    })
  }

  async function loadTeamManagement(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/team-onboarding/participants', {
      credentials: 'include',
      signal,
    })
    const payload = (await response.json().catch(() => null)) as
      | TeamManagementResponsePayload
      | null

    if (response.status === 403 && payload?.access) {
      setTeamManagementState({
        status: 'locked',
        access: payload.access,
        participants: [],
        publicTeamRoster: [],
      })
      return
    }

    if (!response.ok || !payload?.access) {
      throw new Error(payload?.error || `team management request failed: ${response.status}`)
    }

    let publicTeamRoster: JoinTeamMember[] = []
    try {
      publicTeamRoster = await loadJoinTeamRoster(signal)
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') throw error
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Onboarding is loaded. Public team cards could not load yet.',
      })
    }
    setTeamManagementState({
      status: 'ready',
      access: payload.access,
      participants: payload.participants ?? [],
      publicTeamRoster,
    })
  }

  async function loadJoinTeamRoster(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/join-team-roster', {
      credentials: 'include',
      signal,
    })
    const payload = (await response.json().catch(() => null)) as
      | JoinTeamRosterResponsePayload
      | null
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to load public team cards right now.')
    }

    return payload?.members ?? []
  }

  async function loadResources(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/resources', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`resources request failed: ${response.status}`)
    }

    const payload = (await response.json()) as ResourcesResponsePayload
    setResourcesState({
      status: 'ready',
      resources: payload,
    })
  }

  async function loadAnalytics(signal?: AbortSignal) {
    const response = await fetch('/api/nic-nac/site-analytics', {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(`analytics request failed: ${response.status}`)
    }

    const payload = (await response.json()) as AnalyticsResponsePayload
    setAnalyticsState({
      status: 'ready',
      analytics: payload,
    })
  }

  async function loadJewelryLibrary(filters: JewelryLibraryFilters, signal?: AbortSignal) {
    setJewelryLibraryState({
      status: 'loading',
      results: [],
      facets: jewelryLibraryState.facets ?? EMPTY_JEWELRY_LIBRARY_FACETS,
    })

    const params = new URLSearchParams()
    params.set('limit', String(filters.limit))
    if (filters.q.trim()) params.set('query', filters.q.trim())
    if (filters.type) params.set('type', filters.type)
    if (filters.collection) params.set('collection', filters.collection)
    if (filters.material) params.set('material', filters.material)
    if (filters.stone) params.set('stone', filters.stone)
    if (filters.label) params.set('label', filters.label)
    if (filters.year) params.set('year', filters.year)

    const response = await fetch(`/api/nic-nac/jewelry-library?${params.toString()}`, {
      credentials: 'include',
      signal,
    })
    if (!response.ok) {
      throw new Error(getJewelryLibrarySearchErrorMessage(response.status))
    }

    const payload = (await response.json()) as JewelryLibraryResponsePayload
    const nextResults = Array.isArray(payload) ? payload : (payload.items ?? [])
    const nextFacets = Array.isArray(payload)
      ? deriveJewelryLibraryFacets(payload)
      : normalizeJewelryLibraryFacets(payload.facets)
    setJewelryLibraryState({
      status: 'ready',
      results: nextResults,
      facets: nextFacets,
    })
  }

  async function loadPaidWorkspaceData(signal?: AbortSignal) {
    await Promise.all([
      loadAudience(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setAudienceState({ status: 'error' })
      }),
      ...(CUSTOMER_MESSAGING_LAUNCHED
        ? [
            loadWallet(signal).catch((error) => {
              if ((error as { name?: string }).name === 'AbortError') return
              setWalletState({ status: 'error' })
            }),
          ]
        : []),
      loadCalendar(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setCalendarState({ status: 'error' })
      }),
      loadSiteSettings(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setSiteSettingsState({ status: 'error' })
      }),
      loadTradeBoard(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setTradeBoardState({ status: 'error' })
      }),
      loadTradeRequests(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setTradeRequestsState({ status: 'error' })
      }),
      loadFulfillmentQueue(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setFulfillmentQueueState({ status: 'error' })
      }),
      loadTradeSwapCleanup(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setTradeSwapCleanupState({ status: 'error' })
      }),
      loadMessages(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setMessagesState({ status: 'error' })
      }),
      loadTeamManagement(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setTeamManagementState((current) => ({
          status: 'error',
          access: current.access,
          participants: current.participants,
          publicTeamRoster: current.publicTeamRoster,
        }))
      }),
      loadAnalytics(signal).catch((error) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setAnalyticsState({ status: 'error' })
      }),
    ])
  }

  useEffect(() => {
    if (reviewWorkspaceMode) return

    const controller = new AbortController()
    let cancelled = false

    ;(async () => {
      await Promise.all([
        loadRepProfile(controller.signal).catch((error) => {
          if (cancelled) return
          if ((error as { name?: string }).name === 'AbortError') return
          setRepProfileState({ status: 'error' })
        }),
        loadAccountBilling(controller.signal).catch((error) => {
          if (cancelled) return
          if ((error as { name?: string }).name === 'AbortError') return
          setAccountBillingState({ status: 'error' })
        }),
        loadResources(controller.signal).catch((error) => {
          if (cancelled) return
          if ((error as { name?: string }).name === 'AbortError') return
          setResourcesState({ status: 'error' })
        }),
      ])
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [operatorSupportMode, reviewWorkspaceMode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const bannerMessage = getWalletBannerMessage(window.location.search)
    const billingBannerMessage = getAccountBillingBannerMessage(
      window.location.search,
    )

    if (bannerMessage) {
      setWalletActionState((current) => ({
        ...current,
        helperMessage: current.helperMessage ?? bannerMessage,
      }))
    }

    if (billingBannerMessage) {
      setAccountBillingActionState((current) => ({
        ...current,
        helperMessage: current.helperMessage ?? billingBannerMessage,
      }))
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') !== 'subscription-success') return
    const sessionId = params.get('session_id')?.trim()

    ;(async () => {
      setAccountBillingActionState((current) => ({
        ...current,
        helperMessage:
          current.helperMessage ?? 'Subscription checkout completed. Syncing billing status...',
      }))

      try {
        const response = await fetch('/api/stripe/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (!response.ok) return
        await loadAccountBilling()
      } catch {
        setAccountBillingActionState((current) => ({
          ...current,
          helperMessage:
            current.helperMessage ??
            'Subscription checkout completed. Billing status will refresh in a moment.',
        }))
      }
    })()
  }, [])

  useEffect(() => {
    if (walletState.status !== 'ready' || !walletState.summary) return

    setAutoRechargeDraft(getAutoRechargeDraft(walletState.summary))
  }, [walletState.status, walletState.summary])

  useEffect(() => {
    if (siteSettingsState.status !== 'ready' || !siteSettingsState.settings) return

    setSiteSettingsDraft(
      getSiteSettingsDraft(siteSettingsState.settings, {
        isBrittWithBling: isBrittWithBlingWorkspace,
      }),
    )
  }, [
    isBrittWithBlingWorkspace,
    siteSettingsState.status,
    siteSettingsState.settings,
  ])

  useEffect(() => {
    siteSettingsDraftRef.current = siteSettingsDraft
  }, [siteSettingsDraft])

  async function handleUnsubscribe(
    audienceId: string,
    channel: 'sms' | 'email',
  ) {
    const pendingKey = `${audienceId}:${channel}`
    setActionState({ pendingKey, error: null, helperMessage: null })

    try {
      const response = await fetch('/api/nic-nac/customer-audience', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audienceId,
          unsubscribeSms: channel === 'sms',
          unsubscribeEmail: channel === 'email',
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(payload?.error || 'Unable to update customer audience.')
      }

      await loadAudience()
      setActionState({ pendingKey: null, error: null, helperMessage: null })
    } catch (error) {
      setActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update customer audience.',
        helperMessage: null,
      })
    }
  }

  async function handleCopySignupLink() {
    const signupUrl = `${window.location.origin}${SIGNUP_FORM_PATH}`

    try {
      await navigator.clipboard.writeText(signupUrl)
      setActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Signup link copied.',
      })
    } catch {
      setActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Copy failed. Open the signup form and copy the URL manually.',
      })
    }
  }

  async function handleCopyVisibleContacts(
    customers: CustomerAudienceMember[],
    channel: 'sms' | 'email',
  ) {
    const values = getVisibleContactValues(customers, channel)
    if (values.length === 0) {
      setActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          channel === 'sms'
            ? 'No visible phone numbers to copy.'
            : 'No visible email addresses to copy.',
      })
      return
    }

    try {
      await navigator.clipboard.writeText(values.join('\n'))
      setActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          channel === 'sms'
            ? 'Visible phone numbers copied.'
            : 'Visible email addresses copied.',
      })
    } catch {
      setActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Copy failed. Please copy the visible contacts manually.',
      })
    }
  }

  function handleOpenEmailComposer(customer: CustomerAudienceMember) {
    setActionState((current) => ({
      ...current,
      error: null,
      helperMessage: null,
    }))
    setEmailComposer({
      audienceId: customer.id,
      subject: 'Quick update',
      body: '',
      pending: false,
    })
  }

  function handleCloseEmailComposer() {
    setEmailComposer({
      audienceId: null,
      subject: '',
      body: '',
      pending: false,
    })
  }

  async function handleSendEmail() {
    if (!emailComposer.audienceId) return

    setEmailComposer((current) => ({ ...current, pending: true }))
    setActionState({ pendingKey: null, error: null, helperMessage: null })

    try {
      const response = await fetch('/api/nic-nac/send-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audienceId: emailComposer.audienceId,
          subject: emailComposer.subject,
          body: emailComposer.body,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: { email?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send that email right now.')
      }

      setActionState({
        pendingKey: null,
        error: null,
        helperMessage: payload?.customer?.email
          ? `Email sent to ${payload.customer.email}.`
          : 'Email sent.',
      })
      handleCloseEmailComposer()
    } catch (error) {
      setActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send that email right now.',
        helperMessage: null,
      })
      setEmailComposer((current) => ({ ...current, pending: false }))
    }
  }

  async function handleWalletLoad(amountCents: number) {
    setWalletActionState({
      pendingAmountCents: amountCents,
      pendingSettings: false,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/stripe/wallet/load', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountCents }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            url?: string
            minimum_load_amount_cents?: number
          }
        | null

      if (!response.ok || !payload?.url) {
        const minimumLoadMessage =
          payload?.minimum_load_amount_cents && amountCents < payload.minimum_load_amount_cents
            ? `Minimum wallet load is ${formatWalletAmount(payload.minimum_load_amount_cents * 10)}.`
            : null

        throw new Error(
          minimumLoadMessage ??
            payload?.error ??
            'Unable to start wallet checkout right now.',
        )
      }

      setWalletActionState({
        pendingAmountCents: null,
        pendingSettings: false,
        error: null,
        helperMessage: 'Opening Stripe checkout...',
      })
      window.location.href = payload.url
    } catch (error) {
      setWalletActionState({
        pendingAmountCents: null,
        pendingSettings: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to start wallet checkout right now.',
        helperMessage: null,
      })
    }
  }

  function handleAutoRechargeDraftChange(
    patch: Partial<WalletAutoRechargeDraft>,
  ) {
    const summary = walletState.summary
    if (!summary) return

    setAutoRechargeDraft((current) => {
      if (!current) return current

      const next = { ...current, ...patch }
      const validAmountOptions = getAutoRechargeAmountOptions(
        summary,
        next.thresholdCents,
      )

      if (
        validAmountOptions.length > 0 &&
        !validAmountOptions.some(
          (option) => option.amountCents === next.amountCents,
        )
      ) {
        next.amountCents = validAmountOptions[0].amountCents
      }

      return next
    })
  }

  async function handleSaveAutoRechargeSettings() {
    if (!autoRechargeDraft) return

    setWalletActionState({
      pendingAmountCents: null,
      pendingSettings: true,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/stripe/wallet/auto-recharge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enabled: autoRechargeDraft.enabled,
          threshold_cents: autoRechargeDraft.thresholdCents,
          amount_cents: autoRechargeDraft.amountCents,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save auto-recharge settings.')
      }

      await loadWallet()
      setWalletActionState({
        pendingAmountCents: null,
        pendingSettings: false,
        error: null,
        helperMessage: 'Auto-recharge settings saved.',
      })
    } catch (error) {
      setWalletActionState({
        pendingAmountCents: null,
        pendingSettings: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save auto-recharge settings.',
        helperMessage: null,
      })
    }
  }

  function handleSiteSettingsDraftChange(
    patch: Partial<SiteSettingsDraft>,
  ) {
    setSiteSettingsActionState((current) => ({
      pending: current.pending,
      error: null,
      helperMessage: null,
    }))
    setSiteSettingsDraft((current) => {
      if (!current) return current
      return {
        ...current,
        ...patch,
        socialHandles: patch.socialHandles
          ? { ...patch.socialHandles }
          : current.socialHandles,
      }
    })
  }

  function handleSocialHandleChange(platform: string, value: string) {
    setSiteSettingsActionState((current) => ({
      pending: current.pending,
      error: null,
      helperMessage: null,
    }))
    setSiteSettingsDraft((current) => {
      if (!current) return current
      return {
        ...current,
        socialHandles: {
          ...current.socialHandles,
          [platform]: value,
        },
      }
    })
  }

  function handleHomepageMediaChange(
    key: PublicSiteMediaSlotKey,
    patch: Partial<NonNullable<SiteSettingsDraft['homepageMediaSlots']>[number]>,
  ) {
    setSiteSettingsActionState((current) => ({
      pending: current.pending,
      error: null,
      helperMessage: null,
    }))
    setSiteSettingsDraft((current) =>
      current ? updateHomepageMediaSlot(current, key, patch) : current,
    )
  }

  async function handleHomepageMediaUpload(
    key: PublicSiteMediaSlotKey,
    file: File,
  ) {
    setSiteSettingsMediaUploadKey(key)
    setSiteSettingsMediaUploadFeedback(null)
    setSiteSettingsActionState((current) => ({
      pending: current.pending,
      error: null,
      helperMessage: null,
    }))

    try {
      const [preparedUpload, smartPortraitFraming] = await Promise.all([
        preparePublicSiteMediaUpload(file),
        key === 'about_1' ? getSmartPortraitFraming(file) : Promise.resolve(null),
      ])
      const { base64Data, filename } = preparedUpload
      const response = await fetch('/api/nic-nac/site-settings/media', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ base64Data, filename }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; imageUrl?: string }
        | null
      if (!response.ok || !payload?.imageUrl) {
        throw new Error(payload?.error || 'Unable to upload that image.')
      }
      setSiteSettingsDraft((current) =>
        current
          ? updateHomepageMediaSlot(current, key, {
              imageUrl: payload.imageUrl,
              ...(isBrittWithBlingWorkspace ? { isVisible: true } : {}),
              ...(smartPortraitFraming ?? {}),
            })
          : current,
      )
      setSiteSettingsActionState((current) => ({
        pending: current.pending,
        error: null,
        helperMessage: 'Image uploaded. Save site settings to publish it.',
      }))
      setSiteSettingsMediaUploadFeedback({
        key,
        message:
          key === 'about_1'
            ? 'Photo uploaded with Smart Frame. Review the preview, then save.'
            : 'Photo uploaded. It is ready to save.',
        tone: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload that image.'
      setSiteSettingsActionState((current) => ({
        pending: current.pending,
        error: message,
        helperMessage: null,
      }))
      setSiteSettingsMediaUploadFeedback({ key, message, tone: 'error' })
    } finally {
      setSiteSettingsMediaUploadKey(null)
    }
  }

  function refreshLiveSitePreviewAfterSiteSettingsSave() {
    if (workspacePreview.mode === 'live_site_preview') {
      setPreviewFrameKey((current) => current + 1)
    }
  }

  async function handleSaveManagedTeamName() {
    const teamName = siteSettingsDraft?.teamName ?? siteSettingsState.settings?.teamName ?? ''

    setTeamManagementActionState({
      pendingKey: 'team-name',
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/site-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        // Save only this identity field. Other unsaved Site Settings edits must
        // not be published incidentally from Team Management.
        body: JSON.stringify({ teamName }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; settings?: SiteSettingsDashboardResult }
        | null

      if (!response.ok || !payload?.settings) {
        throw new Error(payload?.error || 'Unable to save the team name.')
      }

      const savedSettings = payload.settings
      setSiteSettingsState({ status: 'ready', settings: savedSettings })
      setSiteSettingsDraft((current) =>
        current
          ? { ...current, teamName: savedSettings.teamName }
          : getSiteSettingsDraft(savedSettings, {
              isBrittWithBling: isBrittWithBlingWorkspace,
            }),
      )
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Managed team name saved.',
      })
      refreshLiveSitePreviewAfterSiteSettingsSave()
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error: error instanceof Error ? error.message : 'Unable to save the team name.',
        helperMessage: null,
      })
    }
  }

  async function saveSiteSettingsDraft(draftToSave: SiteSettingsDraft) {
    const requestId = siteSettingsSaveRequestRef.current + 1
    siteSettingsSaveRequestRef.current = requestId
    const normalizedDraft = getNormalizedSiteSettingsDraft(draftToSave, {
      isBrittWithBling: isBrittWithBlingWorkspace,
    })

    setSiteSettingsActionState({
      pending: true,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/site-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(normalizedDraft),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; settings?: SiteSettingsDashboardResult }
        | null

      if (!response.ok || !payload?.settings) {
        throw new Error(payload?.error || 'Unable to save site settings.')
      }

      setSiteSettingsState({
        status: 'ready',
        settings: payload.settings,
      })
      const latestDraft = siteSettingsDraftRef.current
      if (
        !latestDraft ||
        JSON.stringify(latestDraft) === JSON.stringify(normalizedDraft)
      ) {
        setSiteSettingsDraft(
          getSiteSettingsDraft(payload.settings, {
            isBrittWithBling: isBrittWithBlingWorkspace,
          }),
        )
      }
      if (siteSettingsSaveRequestRef.current === requestId) {
        setSiteSettingsActionState({
          pending: false,
          error: null,
          helperMessage: 'Site settings saved.',
        })
      }
      refreshLiveSitePreviewAfterSiteSettingsSave()
    } catch (error) {
      if (siteSettingsSaveRequestRef.current === requestId) {
        setSiteSettingsActionState({
          pending: false,
          error:
            error instanceof Error ? error.message : 'Unable to save site settings.',
          helperMessage: null,
        })
      }
    }
  }

  function handleSaveSiteSettings() {
    if (siteSettingsState.status !== 'ready' || !siteSettingsState.settings) return
    if (!siteSettingsDraft) return
    if (
      !hasSiteSettingsUnsavedChanges({
        settings: siteSettingsState.settings,
        draft: siteSettingsDraft,
        isBrittWithBling: isBrittWithBlingWorkspace,
      })
    ) {
      setSiteSettingsActionState({
        pending: false,
        error: null,
        helperMessage: 'No unsaved changes.',
      })
      return
    }

    void saveSiteSettingsDraft(getNormalizedSiteSettingsDraft(siteSettingsDraft))
  }

  function handleRecipeDraftChange(patch: Partial<RecipeDraft>) {
    setRecipeActionState((current) => ({
      pendingKey: current.pendingKey,
      error: null,
      helperMessage: null,
    }))
    setRecipeDraft((current) => ({ ...current, ...patch }))
  }

  function handleSelectRecipe(recipeId: string) {
    const recipe = recipesState.recipes.find((item) => item.id === recipeId)
    if (!recipe) return
    setSelectedRecipeId(recipe.id)
    setRecipeDraft(getRecipeDraft(recipe))
    setRecipeActionState({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  }

  function handleNewRecipeDraft() {
    setSelectedRecipeId(null)
    setRecipeDraft(getRecipeDraft())
    setRecipeActionState({
      pendingKey: null,
      error: null,
      helperMessage: null,
    })
  }

  async function handleSaveRecipe() {
    if (!recipeDraft.title.trim()) {
      setRecipeActionState({
        pendingKey: null,
        error: 'Recipe title is required.',
        helperMessage: null,
      })
      return
    }

    const existingRecipe = recipeDraft.id
      ? recipesState.recipes.find((recipe) => recipe.id === recipeDraft.id)
      : undefined
    const sortOrder = existingRecipe?.sortOrder ?? recipesState.recipes.length
    setRecipeActionState({
      pendingKey: 'save',
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch(buildSiteRecipesFetchUrl(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          recipe: getRecipeDraftSavePayload(recipeDraft, { sortOrder }),
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | SiteRecipesResponsePayload
        | null

      if (!response.ok || !payload?.recipe) {
        throw new Error(payload?.error || 'Unable to save this recipe right now.')
      }

      const wasNewRecipe = !recipeDraft.id
      setSelectedRecipeId(wasNewRecipe ? null : payload.recipe.id)
      setRecipeDraft(wasNewRecipe ? getRecipeDraft() : getRecipeDraft(payload.recipe))
      await loadSiteRecipes(undefined, {
        preferredRecipeId: wasNewRecipe ? null : payload.recipe.id,
      })
      setRecipeActionState({
        pendingKey: null,
        error: null,
        helperMessage: wasNewRecipe
          ? `${payload.recipe.title} saved. Add the next recipe when you are ready.`
          : `${payload.recipe.title} saved for the Pantry.`,
      })
      refreshLiveSitePreviewAfterSiteSettingsSave()
    } catch (error) {
      setRecipeActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save this recipe right now.',
        helperMessage: null,
      })
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    const recipe = recipesState.recipes.find((item) => item.id === recipeId)
    setRecipeActionState({
      pendingKey: `remove:${recipeId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch(buildSiteRecipesFetchUrl(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          recipeId,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove this recipe right now.')
      }

      setSelectedRecipeId(null)
      setRecipeDraft(getRecipeDraft())
      await loadSiteRecipes(undefined, { preferredRecipeId: null })
      setRecipeActionState({
        pendingKey: null,
        error: null,
        helperMessage: `${recipe?.title ?? 'Recipe'} removed from the Pantry.`,
      })
      refreshLiveSitePreviewAfterSiteSettingsSave()
    } catch (error) {
      setRecipeActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to remove this recipe right now.',
        helperMessage: null,
      })
    }
  }

  async function handleRecipeImageUpload(
    field: 'imageUrl' | 'modalImageUrl' | 'recipeCardImageUrls',
    file: File | null,
  ) {
    if (!file) return
    setRecipeActionState({
      pendingKey: `upload:${field}`,
      error: null,
      helperMessage: null,
    })

    try {
      const base64Data = await readFileAsDataUrl(file)
      const response = await fetch('/api/nic-nac/site-recipes/image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          filename: file.name,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; imageUrl?: string }
        | null
      if (!response.ok || !payload?.imageUrl) {
        throw new Error(payload?.error || 'Unable to upload this recipe image.')
      }

      setRecipeDraft((current) =>
        field === 'recipeCardImageUrls'
          ? {
              ...current,
              recipeCardImageUrls: [
                ...current.recipeCardImageUrls,
                payload.imageUrl ?? '',
              ].filter(Boolean),
            }
          : { ...current, [field]: payload.imageUrl ?? '' },
      )
      setRecipeActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          field === 'recipeCardImageUrls'
            ? 'Recipe-source photo uploaded. Read and format it when you are ready.'
            : 'Food photo uploaded. Save the recipe to publish it.',
      })
    } catch (error) {
      setRecipeActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to upload this recipe image.',
        helperMessage: null,
      })
    }
  }

  async function handleBuildRecipeDraft() {
    if (!recipeDraft.title.trim()) {
      setRecipeActionState({
        pendingKey: null,
        error: 'Recipe title is required before the recipe can be formatted.',
        helperMessage: null,
      })
      return
    }

    if (recipeDraft.recipeCardImageUrls.length === 0) {
      setRecipeActionState({
        pendingKey: null,
        error: 'Upload at least one readable recipe-source photo first.',
        helperMessage: null,
      })
      return
    }

    setRecipeActionState({
      pendingKey: 'build-draft',
      error: null,
      helperMessage: null,
    })

    try {
      const images = [
        recipeDraft.imageUrl.trim()
          ? { role: 'display_photo', url: recipeDraft.imageUrl.trim() }
          : null,
        recipeDraft.modalImageUrl.trim()
          ? { role: 'display_photo', url: recipeDraft.modalImageUrl.trim() }
          : null,
        ...recipeDraft.recipeCardImageUrls.map((url) => ({
          role: 'recipe_card',
          url,
        })),
      ].filter(Boolean)

      const response = await fetch('/api/nic-nac/site-recipes/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: recipeDraft.title,
          images,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | SiteRecipesResponsePayload
        | null

      if (!response.ok || !payload?.draft) {
        throw new Error(payload?.error || 'Unable to build this recipe draft.')
      }

      const draft = payload.draft
      setRecipeDraft((current) => ({
        ...current,
        title: draft.title?.trim() || current.title,
        description: draft.description?.trim() ?? current.description,
        category: draft.category?.trim() ?? current.category,
        prepTime: draft.prepTime?.trim() ?? current.prepTime,
        servings:
          typeof draft.servings === 'number' && Number.isFinite(draft.servings)
            ? String(draft.servings)
            : current.servings,
        ingredientsText: joinRecipeLines(draft.ingredients),
        stepsText: joinRecipeLines(draft.steps),
        note: draft.note?.trim() ?? current.note,
        imageAlt: draft.imageAlt?.trim() || current.imageAlt,
      }))
      setRecipeActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          draft.warnings && draft.warnings.length > 0
            ? `Recipe formatted. Check: ${draft.warnings.join(' ')}`
            : 'Source photos read. Recipe details were replaced in this draft; review them, then save when they look right.',
      })
    } catch (error) {
      setRecipeActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to format this recipe.',
        helperMessage: null,
      })
    }
  }

  async function handleAccountBillingAction(action: 'subscribe' | 'manage') {
    setAccountBillingActionState({
      pendingAction: action,
      error: null,
      helperMessage: null,
    })

    try {
      const endpoint =
        action === 'subscribe'
          ? '/api/stripe/create-checkout'
          : '/api/stripe/create-portal-session'
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body:
          action === 'subscribe'
            ? JSON.stringify({ agreementAccepted: subscriptionAgreementAccepted })
            : undefined,
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null

      if (!response.ok || !payload?.url) {
        throw new Error(
          payload?.error ||
            (action === 'subscribe'
              ? 'Unable to start subscription checkout.'
              : 'Unable to open the Stripe billing portal.'),
        )
      }

      setAccountBillingActionState({
        pendingAction: null,
        error: null,
        helperMessage:
          action === 'subscribe'
            ? 'Opening Stripe checkout...'
            : 'Opening Stripe billing portal...',
      })
      window.location.href = payload.url
    } catch (error) {
      setAccountBillingActionState({
        pendingAction: null,
        error:
          error instanceof Error
            ? error.message
            : action === 'subscribe'
              ? 'Unable to start subscription checkout.'
              : 'Unable to open the Stripe billing portal.',
        helperMessage: null,
      })
    }
  }

  async function refreshTradeWorkspace() {
    if (reviewWorkspaceMode) return

    await Promise.all([
      loadTradeBoard(),
      loadTradeRequests(),
      loadFulfillmentQueue(),
      loadTradeSwapCleanup(),
      loadAnalytics(),
    ])
  }

  async function refreshTradeWorkspaceSettled() {
    if (reviewWorkspaceMode) return []

    return Promise.allSettled([
      loadTradeBoard(),
      loadTradeRequests(),
      loadFulfillmentQueue(),
      loadTradeSwapCleanup(),
      loadAnalytics(),
    ])
  }

  const handleEnsureInventoryBrowseLoaded = useCallback(async () => {
    if (reviewWorkspaceMode) return
    if (tradeBoardActionState.pendingKey === 'load-more-listings') return

    let offset = tradeBoardState.board?.listings.length ?? 0
    if (offset <= 0 || tradeBoardState.hasMoreListings !== true) return
    if (inventoryBrowseLoadPromiseRef.current) {
      return inventoryBrowseLoadPromiseRef.current
    }
    if (inventoryBrowseFailedOffsetRef.current === offset) return

    setTradeBoardActionState({
      pendingKey: 'load-more-listings',
      error: null,
      helperMessage: null,
    })

    inventoryBrowseLoadPromiseRef.current = (async () => {
      try {
        let hasMore = true
        while (hasMore) {
          const payload = await loadTradeBoard(undefined, { offset, append: true })
          const fetchedCount = payload.listings.length
          hasMore = fetchedCount === TRADE_BOARD_PAGE_SIZE
          offset += fetchedCount
          if (fetchedCount === 0) break
        }
        inventoryBrowseFailedOffsetRef.current = null
        setTradeBoardActionState({
          pendingKey: null,
          error: null,
          helperMessage: null,
        })
      } catch (error) {
        inventoryBrowseFailedOffsetRef.current =
          tradeBoardState.board?.listings.length ?? null
        setTradeBoardActionState({
          pendingKey: null,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load more dancers right now.',
          helperMessage: null,
        })
      } finally {
        inventoryBrowseLoadPromiseRef.current = null
      }
    })()

    return inventoryBrowseLoadPromiseRef.current
  }, [
    reviewWorkspaceMode,
    tradeBoardActionState.pendingKey,
    tradeBoardState.board?.listings.length,
    tradeBoardState.hasMoreListings,
  ])

  useEffect(() => {
    if (activeSection !== 'trade-board') return
    if (reviewWorkspaceMode) return

    const refreshIfTradeBoardActive = () => {
      if (document.visibilityState === 'hidden') return
      void refreshTradeWorkspace()
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshTradeWorkspace()
      }
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshIfTradeBoardActive)
    const intervalId = window.setInterval(
      refreshIfTradeBoardActive,
      TRADE_WORKSPACE_REFRESH_MS,
    )

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshIfTradeBoardActive)
      window.clearInterval(intervalId)
    }
  }, [activeSection, reviewWorkspaceMode])

  useEffect(() => {
    if (activeSection !== 'jewelry-library') return
    if (jewelryLibraryState.status !== 'idle') return

    void loadJewelryLibrary(libraryFilters).catch((error) => {
      setJewelryLibraryState({
        status: 'error',
        results: [],
        facets: EMPTY_JEWELRY_LIBRARY_FACETS,
      })
      setTradeBoardActionState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search the jewelry library right now.',
      }))
    })
  }, [activeSection, jewelryLibraryState.status])

  useEffect(() => {
    if (activeSection !== 'recipes') return
    if (recipesState.status !== 'idle') return

    const controller = new AbortController()
    void loadSiteRecipes(controller.signal).catch((error) => {
      if ((error as { name?: string }).name === 'AbortError') return
      setRecipesState({ status: 'error', recipes: [] })
      setRecipeActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load site recipes right now.',
        helperMessage: null,
      })
    })

    return () => controller.abort()
  }, [activeSection])

  useEffect(() => {
    const refreshAfterNicNacMutation = (event: Event) => {
      const detail = (event as CustomEvent<{ topic?: 'trade' | 'site' | 'calendar' }>).detail
      const topic = detail?.topic
      if (topic !== 'trade' && topic !== 'site' && topic !== 'calendar') return
      if (document.visibilityState === 'hidden') return
      if (topic === 'trade' && !reviewWorkspaceMode) {
        void refreshTradeWorkspace()
      }
      if (topic === 'calendar' && !reviewWorkspaceMode) {
        void loadCalendar().catch(() => {
          setCalendarState({ status: 'error' })
        })
      }
      if (topic === 'site' && activeSection === 'recipes') {
        void loadSiteRecipes(undefined, {
          preferredRecipeId: selectedRecipeId,
        }).catch((error) => {
          setRecipesState({ status: 'error', recipes: [] })
          setRecipeActionState({
            pendingKey: null,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to refresh site recipes right now.',
            helperMessage: null,
          })
        })
      }
      if (
        workspacePreview.mode === 'live_site_preview' &&
        (topic === 'trade' || topic === 'site' || topic === 'calendar')
      ) {
        setPreviewFrameKey((current) => current + 1)
      }
    }

    window.addEventListener(
      NIC_NAC_WORKSPACE_REFRESH_EVENT,
      refreshAfterNicNacMutation,
    )
    return () => {
      window.removeEventListener(
        NIC_NAC_WORKSPACE_REFRESH_EVENT,
        refreshAfterNicNacMutation,
      )
    }
  }, [activeSection, reviewWorkspaceMode, selectedRecipeId, workspacePreview.mode])

  useEffect(() => {
    if (reviewWorkspaceMode) return

    const controller = new AbortController()
    void loadPaidWorkspaceData(controller.signal)

    return () => controller.abort()
  }, [operatorSupportMode, reviewWorkspaceMode])

  useEffect(() => {
    if (reviewWorkspaceMode) return

    const refreshMessagesInBackground = () => {
      if (
        document.visibilityState !== 'visible' ||
        messagesRefreshInFlightRef.current
      ) {
        return
      }
      messagesRefreshInFlightRef.current = true
      void loadMessages()
        // A quiet refresh should never replace an open Message Center with an
        // error state. The existing inbox stays available until the next check.
        .catch(() => undefined)
        .finally(() => {
          messagesRefreshInFlightRef.current = false
        })
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshMessagesInBackground()
      }
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshMessagesInBackground)
    const intervalId = window.setInterval(
      refreshMessagesInBackground,
      MESSAGE_CENTER_REFRESH_MS,
    )

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshMessagesInBackground)
      window.clearInterval(intervalId)
    }
  }, [operatorSupportMode, reviewWorkspaceMode])

  useEffect(() => {
    if (accountBillingState.status !== 'ready') return
    const hasPaidWorkspace = hasPaidWorkspaceSubscription(accountBillingState.summary)
    const isRecipeWorkspaceAccessKnown =
      Boolean(repIdOverride || publicSiteSlugOverride) ||
      repProfileState.status === 'ready' ||
      reviewWorkspaceMode
    const hasRecipeWorkspaceAccess = hasBlingKitchenRecipeWorkspaceAccess({
      repId: repIdOverride ?? repProfileState.repId,
      publicSiteSlug: publicSiteSlugOverride ?? repProfileState.publicSiteSlug,
    })
    if (
      activeSection === 'recipes' &&
      !hasRecipeWorkspaceAccess &&
      !isRecipeWorkspaceAccessKnown
    ) {
      return
    }
    const allowedSection = resolveWorkspaceSectionForAccess(
      activeSection,
      operatorSupportMode || hasPaidWorkspace,
      hasRecipeWorkspaceAccess,
    )
    if (allowedSection !== activeSection) {
      setActiveSection(allowedSection)
    }
  }, [
    accountBillingState.status,
    accountBillingState.summary,
    activeSection,
    publicSiteSlugOverride,
    repIdOverride,
    repProfileState.status,
    repProfileState.publicSiteSlug,
    repProfileState.repId,
    operatorSupportMode,
    reviewWorkspaceMode,
  ])

  function getTradeAddMutationStorageKey(logicalMutation: string) {
    const repScope = repProfileState.repId ?? repIdOverride ?? 'workspace'
    return `sparkle-suite:trade-add:${repScope}:${logicalMutation}`
  }

  function getOrCreateTradeAddMutationKey(logicalMutation: string) {
    const inMemoryKey = tradeAddMutationKeysRef.current.get(logicalMutation)
    if (inMemoryKey) return inMemoryKey

    const storageKey = getTradeAddMutationStorageKey(logicalMutation)
    let persistedKey: string | null = null
    try {
      persistedKey = window.localStorage.getItem(storageKey)
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }

    const mutationKey = persistedKey || crypto.randomUUID()
    tradeAddMutationKeysRef.current.set(logicalMutation, mutationKey)
    try {
      window.localStorage.setItem(storageKey, mutationKey)
    } catch {
      // The in-memory key still protects retries during the current page lifetime.
    }
    return mutationKey
  }

  function clearTradeAddMutationKey(logicalMutation: string) {
    tradeAddMutationKeysRef.current.delete(logicalMutation)
    try {
      window.localStorage.removeItem(
        getTradeAddMutationStorageKey(logicalMutation),
      )
    } catch {
      // Nothing else is required after the server has confirmed success.
    }
  }

  async function handleQuickAddListing() {
    if (!quickAddItemNumber.trim()) {
      setTradeBoardActionState({
        pendingKey: null,
        error: 'Enter an item number first.',
        helperMessage: null,
      })
      return
    }

    const logicalMutation = `quick-add:${quickAddItemNumber.trim().toUpperCase()}`
    const mutationKey = getOrCreateTradeAddMutationKey(logicalMutation)

    setTradeBoardActionState({
      pendingKey: 'quick-add',
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/trade-board', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemNumber: quickAddItemNumber,
          mutationKey,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { mutationReplayed?: boolean } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add that dancer right now.')
      }

      setQuickAddItemNumber('')
      await refreshTradeWorkspace()
      clearTradeAddMutationKey(logicalMutation)
      setTradeBoardActionState({
        pendingKey: null,
        error: null,
        helperMessage: payload?.result?.mutationReplayed
          ? 'Your earlier add already completed. No new copy was added. Tap Add again if you have another identical dancer.'
          : 'Dancer added to your Dance Floor.',
      })
    } catch (error) {
      setTradeBoardActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to add that dancer right now.',
        helperMessage: null,
      })
    }
  }

  async function handleRemoveTradeListing(listingId: string) {
    setTradeBoardActionState({
      pendingKey: `remove:${listingId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/trade-board', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId,
          reason: 'other',
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove that dancer right now.')
      }

      await refreshTradeWorkspace()
      setTradeBoardActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Dancer removed from your Dance Floor.',
      })
    } catch (error) {
      setTradeBoardActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to remove that dancer right now.',
        helperMessage: null,
      })
    }
  }

  async function handleTradeRequestDecision(
    requestId: string,
    action: 'approve' | 'reject',
    swap?: { revealedItemNumber?: string; revealedRingSize?: string },
  ) {
    setTradeBoardActionState({
      pendingKey: `${action}:${requestId}`,
      error: null,
      helperMessage: null,
    })
    const skippedRevealedItemNumber =
      action === 'approve' && !swap?.revealedItemNumber?.trim()

    try {
      const response = await fetch('/api/nic-nac/trade-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          requestId,
          ...(action === 'reject' ? { reason: 'not_interested' } : {}),
          ...(swap?.revealedItemNumber
            ? {
                revealedItemNumber: swap.revealedItemNumber,
                revealedRingSize: swap.revealedRingSize,
              }
            : {}),
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            result?: {
              replacementStatus?: string
            }
          }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update that request right now.')
      }

      await refreshTradeWorkspace()
      const replacementStatus = payload?.result?.replacementStatus
      const approveMessage =
        replacementStatus === 'added_to_board'
          ? 'Trade approved. Added the revealed dancer back to your Dance Floor.'
          : replacementStatus === 'needs_ring_size'
            ? 'Trade approved. I saved the item number to this swap; add the ring size after the show to add the dancer to the Dance Floor.'
            : replacementStatus === 'needs_catalog_details'
              ? 'Trade approved. I saved the item number to this swap; finish the catalog details after the show.'
              : skippedRevealedItemNumber
                ? 'Trade approved. Add the revealed dancer later with Nic-Nac when you are ready.'
              : 'Trade request approved.'
      setTradeBoardActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          action === 'approve'
            ? approveMessage
            : 'Trade request denied.',
      })
    } catch (error) {
      setTradeBoardActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update that request right now.',
        helperMessage: null,
      })
    }
  }

  async function handleAdvanceFulfillment(
    requestId: string,
    nextStatus: 'shipped' | 'completed',
  ) {
    setTradeBoardActionState({
      pendingKey: `fulfillment:${requestId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/fulfillment-queue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId,
          nextStatus,
          addToBoard: nextStatus === 'completed',
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to advance fulfillment right now.')
      }

      const refreshResults = await refreshTradeWorkspaceSettled()
      const refreshFailed = refreshResults.some(
        (result) => result.status === 'rejected',
      )
      setTradeBoardActionState({
        pendingKey: null,
        error: refreshFailed
          ? 'Fulfillment updated, but part of the workspace did not refresh.'
          : null,
        helperMessage:
          nextStatus === 'shipped'
            ? 'Fulfillment moved to shipped.'
            : 'Fulfillment marked completed. Add the received dancer to your Dance Floor when you are ready.',
      })
    } catch (error) {
      setTradeBoardActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to advance fulfillment right now.',
        helperMessage: null,
      })
    }
  }

  async function handleLibrarySearch(nextQuery = librarySearchQuery) {
    const nextFilters = {
      ...libraryFilters,
      q: nextQuery.trim(),
      limit: JEWELRY_LIBRARY_DEFAULT_LIMIT,
    }
    setLibrarySearchQuery(nextFilters.q)
    setLibraryFilters(nextFilters)
    try {
      await loadJewelryLibrary(nextFilters)
    } catch (error) {
      setJewelryLibraryState({
        status: 'error',
        results: [],
        facets: EMPTY_JEWELRY_LIBRARY_FACETS,
      })
      setTradeBoardActionState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search the jewelry library right now.',
      }))
    }
  }

  async function handleLibraryFilterChange(
    field: JewelryLibraryFilterField,
    value: string,
  ) {
    const nextFilters = {
      ...libraryFilters,
      [field]: value,
      limit: JEWELRY_LIBRARY_DEFAULT_LIMIT,
    }
    if (field === 'q') {
      setLibrarySearchQuery(value)
    }
    setLibraryFilters(nextFilters)
    try {
      await loadJewelryLibrary(nextFilters)
    } catch (error) {
      setJewelryLibraryState({
        status: 'error',
        results: [],
        facets: EMPTY_JEWELRY_LIBRARY_FACETS,
      })
      setTradeBoardActionState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search the jewelry library right now.',
      }))
    }
  }

  async function handleLibraryClear() {
    setLibrarySearchQuery('')
    setLibraryFilters(EMPTY_JEWELRY_LIBRARY_FILTERS)
    try {
      await loadJewelryLibrary(EMPTY_JEWELRY_LIBRARY_FILTERS)
    } catch (error) {
      setJewelryLibraryState({
        status: 'error',
        results: [],
        facets: EMPTY_JEWELRY_LIBRARY_FACETS,
      })
      setTradeBoardActionState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search the jewelry library right now.',
      }))
    }
  }

  async function handleAddFromLibrary(result: JewelryDatabaseResult) {
    const { designId, itemNumber, mainStone, material } = result
    const logicalMutation = `library-add:${designId}:${material ?? ''}:${mainStone ?? ''}`
    const mutationKey = getOrCreateTradeAddMutationKey(logicalMutation)
    setTradeBoardActionState({
      pendingKey: `library:${designId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/jewelry-library', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          designId,
          itemNumber,
          material,
          mainStone,
          mutationKey,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { mutationReplayed?: boolean } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add that dancer right now.')
      }

      await Promise.all([refreshTradeWorkspace(), loadJewelryLibrary(libraryFilters)])
      clearTradeAddMutationKey(logicalMutation)
      setTradeBoardActionState({
        pendingKey: null,
        error: null,
        helperMessage: payload?.result?.mutationReplayed
          ? 'Your earlier add already completed. No new copy was added. Tap Add again if you have another identical dancer.'
          : `${itemNumber}${material ? ` · ${material}` : ''}${mainStone ? ` · ${mainStone}` : ''} added to your Dance Floor.`,
      })
    } catch (error) {
      setTradeBoardActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to add that dancer right now.',
        helperMessage: null,
      })
    }
  }

  async function patchMessageDelivery(
    deliveryId: string,
    patch: { read?: boolean; archived?: boolean },
  ) {
    const response = await fetch('/api/nic-nac/messages', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deliveryId, ...patch }),
    })
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to update that message right now.')
    }
  }

  async function handleUpdateMessage(
    message: WorkspaceInboxItem,
    patch: { read?: boolean; archived?: boolean },
  ) {
    if (isConversationItem(message)) return
    const deliveryId = message.deliveryId || message.id
    const action =
      patch.archived === true
        ? 'archive'
        : patch.archived === false
          ? 'unarchive'
          : patch.read === false
            ? 'unread'
            : 'read'
    setMessagesActionState({
      pendingKey: `${action}:${deliveryId}`,
      error: null,
      helperMessage: null,
    })

    if (reviewWorkspaceMode) {
      const now = new Date().toISOString()
      setMessagesState((current) => {
        const messages = (current.inbox?.messages ?? []).map((currentMessage) =>
          !isConversationItem(currentMessage) &&
          (currentMessage.deliveryId || currentMessage.id) === deliveryId
            ? {
                ...currentMessage,
                isRead:
                  typeof patch.read === 'boolean' ? patch.read : currentMessage.isRead,
                readAt:
                  patch.read === true
                    ? now
                    : patch.read === false
                      ? null
                      : currentMessage.readAt,
                archivedAt:
                  patch.archived === true
                    ? now
                    : patch.archived === false
                      ? null
                      : currentMessage.archivedAt,
              }
            : currentMessage,
        )
        return {
          status: 'ready',
          inbox: {
            ...(current.inbox ?? { unreadCount: 0 }),
            unreadCount: getActiveUnreadMessageCount(messages),
            messages,
          },
        }
      })
      setMessagesActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          action === 'archive'
            ? 'Message archived.'
            : action === 'unarchive'
              ? 'Message returned to your inbox.'
              : action === 'unread'
                ? 'Message marked unread.'
                : 'Message marked read.',
      })
      return
    }

    try {
      await patchMessageDelivery(deliveryId, patch)
      await loadMessages()
      setMessagesActionState({
        pendingKey: null,
        error: null,
        helperMessage:
          action === 'archive'
            ? 'Message archived.'
            : action === 'unarchive'
              ? 'Message returned to your inbox.'
              : action === 'unread'
                ? 'Message marked unread.'
                : 'Message marked read.',
      })
    } catch (error) {
      await loadMessages().catch(() => undefined)
      setMessagesActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update that message right now.',
        helperMessage: null,
      })
    }
  }

  function handleUpdateConversationSummary(
    message: WorkspaceConversationSummary,
    patch: Pick<WorkspaceConversationSummary, 'unreadCount'> &
      Partial<Pick<WorkspaceConversationSummary, 'archivedAt' | 'mutedAt'>>,
  ) {
    setMessagesState((current) => {
      const messages = (current.inbox?.messages ?? []).map((currentMessage) =>
        isConversationItem(currentMessage) && currentMessage.id === message.id
          ? { ...currentMessage, ...patch }
          : currentMessage,
      )
      return {
        ...current,
        inbox: {
          ...(current.inbox ?? { unreadCount: 0 }),
          unreadCount: getActiveUnreadMessageCount(messages),
          messages,
        },
      }
    })
  }

  async function handleMarkAllMessagesRead() {
    const unreadMessages = (messagesState.inbox?.messages ?? []).filter(
      (message): message is WorkspacePublicationSummary =>
        !isConversationItem(message) && !message.isRead && !message.archivedAt,
    )
    if (unreadMessages.length === 0) return

    setMessagesActionState({
      pendingKey: 'read:all',
      error: null,
      helperMessage: null,
    })

    if (reviewWorkspaceMode) {
      const now = new Date().toISOString()
      setMessagesState((current) => {
        const messages = (current.inbox?.messages ?? []).map((message) =>
          isConversationItem(message) || message.archivedAt || message.isRead
            ? message
            : { ...message, isRead: true, readAt: now },
        )
        return {
          status: 'ready',
          inbox: {
            ...(current.inbox ?? { unreadCount: 0 }),
            unreadCount: 0,
            messages,
          },
        }
      })
      setMessagesActionState({
        pendingKey: null,
        error: null,
        helperMessage: `${unreadMessages.length} message${unreadMessages.length === 1 ? '' : 's'} marked read.`,
      })
      return
    }

    try {
      await Promise.all(
        unreadMessages.map((message) =>
          patchMessageDelivery(message.deliveryId || message.id, { read: true }),
        ),
      )
      await loadMessages()
      setMessagesActionState({
        pendingKey: null,
        error: null,
        helperMessage: `${unreadMessages.length} message${unreadMessages.length === 1 ? '' : 's'} marked read.`,
      })
    } catch (error) {
      await loadMessages().catch(() => undefined)
      setMessagesActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to mark all messages read right now.',
        helperMessage: null,
      })
    }
  }

  function handlePublicTeamDraftChange(patch: Partial<JoinTeamRosterDraft>) {
    setTeamManagementActionState((current) => ({
      ...current,
      error: null,
      helperMessage: null,
    }))
    setPublicTeamDraft((current) => ({ ...current, ...patch }))
  }

  async function handlePublicTeamPhotoUpload(file: File | null) {
    if (!file) return

    if (!TEAM_PROFILE_PHOTO_TYPES.has(file.type)) {
      setTeamManagementActionState({
        pendingKey: null,
        error: 'Choose a JPG, PNG, or WebP image.',
        helperMessage: null,
      })
      return
    }

    if (file.size > TEAM_PROFILE_PHOTO_MAX_BYTES) {
      setTeamManagementActionState({
        pendingKey: null,
        error: 'Profile photos must be 3 MB or smaller.',
        helperMessage: null,
      })
      return
    }

    setTeamManagementActionState({
      pendingKey: 'public-team:photo-upload',
      error: null,
      helperMessage: null,
    })

    try {
      const base64Data = await readFileAsDataUrl(file)
      const response = await fetch('/api/nic-nac/join-team-roster/photo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ base64Data, filename: file.name }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; imageUrl?: string }
        | null
      if (!response.ok || !payload?.imageUrl) {
        throw new Error(payload?.error || 'Unable to upload that profile photo right now.')
      }

      setPublicTeamDraft((current) => ({
        ...current,
        photoUrl: payload.imageUrl ?? current.photoUrl,
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Photo uploaded. Review the preview, then save the team member card.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to upload that profile photo right now.',
        helperMessage: null,
      })
    }
  }

  async function handleSavePublicTeamMember() {
    if (!publicTeamDraft.displayName.trim()) {
      setTeamManagementActionState({
        pendingKey: null,
        error: 'Enter the first name before saving the public card.',
        helperMessage: null,
      })
      return
    }

    setTeamManagementActionState({
      pendingKey: 'public-team:save',
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/join-team-roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          member: buildJoinTeamRosterSavePayload(publicTeamDraft),
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | JoinTeamRosterResponsePayload
        | null
      if (!response.ok || !payload?.member) {
        throw new Error(payload?.error || 'Unable to save that public team card right now.')
      }

      const savedMember = payload.member
      setTeamManagementState((current) => {
        const roster = current.publicTeamRoster ?? []
        const nextRoster = roster.some((member) => member.id === savedMember.id)
          ? roster.map((member) =>
              member.id === savedMember.id ? savedMember : member,
            )
          : [...roster, savedMember]

        return {
          ...current,
          publicTeamRoster: nextRoster.sort((a, b) => a.sortOrder - b.sortOrder),
        }
      })
      setPublicTeamDraft(getJoinTeamRosterDraft())
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Public team card saved to the Join Team page.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save that public team card right now.',
        helperMessage: null,
      })
    }
  }

  function handleEditPublicTeamMember(member: JoinTeamMember) {
    setPublicTeamDraft(getJoinTeamRosterDraft(member))
    setTeamManagementActionState({
      pendingKey: null,
      error: null,
      helperMessage: `Editing ${member.displayName}'s public card.`,
    })
  }

  async function handleTogglePublicTeamMember(member: JoinTeamMember) {
    setTeamManagementActionState({
      pendingKey: `public-team:toggle:${member.id}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/join-team-roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          member: {
            ...buildJoinTeamRosterSavePayload(getJoinTeamRosterDraft(member)),
            isVisible: !member.isVisible,
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | JoinTeamRosterResponsePayload
        | null
      if (!response.ok || !payload?.member) {
        throw new Error(payload?.error || 'Unable to update that public card right now.')
      }

      setTeamManagementState((current) => ({
        ...current,
        publicTeamRoster: (current.publicTeamRoster ?? []).map((rosterMember) =>
          rosterMember.id === payload.member?.id ? payload.member : rosterMember,
        ),
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: payload.member.isVisible
          ? 'Public team card is visible on the Join Team page.'
          : 'Public team card is hidden from the Join Team page.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update that public card right now.',
        helperMessage: null,
      })
    }
  }

  async function handleMovePublicTeamMember(
    memberId: string,
    direction: 'up' | 'down',
  ) {
    const roster = teamManagementState.publicTeamRoster ?? []
    const memberIds = moveJoinTeamRosterMember(roster, memberId, direction)
    if (memberIds.join('|') === roster.map((member) => member.id).join('|')) return

    setTeamManagementActionState({
      pendingKey: `public-team:move:${memberId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/join-team-roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          memberIds,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reorder public team cards right now.')
      }

      const byId = new Map(roster.map((member) => [member.id, member]))
      setTeamManagementState((current) => ({
        ...current,
        publicTeamRoster: memberIds
          .map((id, index) => {
            const member = byId.get(id)
            return member ? { ...member, sortOrder: index } : null
          })
          .filter((member): member is JoinTeamMember => member !== null),
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Public team cards reordered.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reorder public team cards right now.',
        helperMessage: null,
      })
    }
  }

  async function handleRemovePublicTeamMember(memberId: string) {
    setTeamManagementActionState({
      pendingKey: `public-team:remove:${memberId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/join-team-roster', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildJoinTeamRosterRemovalPayload(memberId)),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove that public team card right now.')
      }

      setTeamManagementState((current) => ({
        ...current,
        publicTeamRoster: (current.publicTeamRoster ?? []).filter(
          (member) => member.id !== memberId,
        ),
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Public team card removed from the Join Team page.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to remove that public team card right now.',
        helperMessage: null,
      })
    }
  }

  async function handleCreateTeamOnboardingParticipant(member: JoinTeamMember) {
    setTeamManagementActionState({
      pendingKey: `onboarding:create:${member.id}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch('/api/nic-nac/team-onboarding/participants', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: member.displayName,
          joinTeamMemberId: member.id,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | TeamManagementResponsePayload
        | null

      if (!response.ok || !payload?.participant || !payload.accessUrl) {
        throw new Error(payload?.error || 'Unable to create that onboarding link right now.')
      }

      const participant = {
        ...payload.participant,
        accessUrl: payload.accessUrl,
      }
      setTeamManagementState((current) => {
        const currentAccess =
          current.access ?? { enabled: true, status: 'manual_beta' as const, source: 'manual_beta' as const }
        const currentParticipants = current.participants ?? []
        return {
          status: 'ready',
          access: currentAccess,
          participants: [participant, ...currentParticipants],
          publicTeamRoster: current.publicTeamRoster,
        }
      })
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: `${member.displayName}'s private onboarding link is ready in their card.`,
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create that onboarding link right now.',
        helperMessage: null,
      })
    }
  }

  async function handleRefreshTeamOnboardingInvite(participantId: string) {
    setTeamManagementActionState({
      pendingKey: `onboarding:refresh:${participantId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch(
        `/api/nic-nac/team-onboarding/participants/${participantId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'refresh_access' }),
        },
      )
      const payload = (await response.json().catch(() => null)) as
        | TeamManagementResponsePayload
        | null

      if (!response.ok || !payload?.participant || !payload.accessUrl) {
        throw new Error(
          payload?.error || 'Unable to create a fresh onboarding link right now.',
        )
      }

      setTeamManagementState((current) => ({
        ...current,
        participants: (current.participants ?? []).map((participant) =>
          participant.id === participantId
            ? {
                ...participant,
                ...payload.participant,
                accessUrl: payload.accessUrl,
              }
            : participant,
        ),
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: `${payload.participant.displayName}'s fresh private onboarding link is ready. The previous link no longer works.`,
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create a fresh onboarding link right now.',
        helperMessage: null,
      })
    }
  }

  async function handleCopyTeamOnboardingInvite(accessUrl?: string) {
    if (!accessUrl) {
      setTeamManagementActionState({
        pendingKey: null,
        error: 'Create a fresh onboarding link first.',
        helperMessage: null,
      })
      return
    }

    try {
      await navigator.clipboard.writeText(accessUrl)
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Onboarding link copied.',
      })
    } catch {
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Copy failed. Open the link and copy it manually.',
      })
    }
  }

  async function handleArchiveTeamOnboardingParticipant(participantId: string) {
    setTeamManagementActionState({
      pendingKey: `archive:${participantId}`,
      error: null,
      helperMessage: null,
    })

    try {
      const response = await fetch(
        `/api/nic-nac/team-onboarding/participants/${participantId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'archive' }),
        },
      )
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to archive that onboarding link right now.')
      }

      setTeamManagementState((current) => ({
        ...current,
        participants: (current.participants ?? []).map((participant) =>
          participant.id === participantId
            ? { ...participant, status: 'archived' }
            : participant,
        ),
      }))
      setTeamManagementActionState({
        pendingKey: null,
        error: null,
        helperMessage: 'Onboarding link archived.',
      })
    } catch (error) {
      setTeamManagementActionState({
        pendingKey: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to archive that onboarding link right now.',
        helperMessage: null,
      })
    }
  }

  const currentPublicSiteSlug =
    publicSiteSlugOverride ?? repProfileState.publicSiteSlug
  const currentRepId = repIdOverride ?? repProfileState.repId
  const currentLiveQueueSyncCode =
    liveQueueSyncCodeOverride ?? repProfileState.liveQueueSyncCode
  const customerSparkleSiteHref =
    currentPublicSiteSlug || currentRepId
      ? buildCustomerSparkleSiteHref({
          repId: currentRepId,
          publicSiteSlug: currentPublicSiteSlug,
        })
      : null
  const customerSparkleSiteUrl = customerSparkleSiteHref
    ? `https://www.yoursparklesuite.com${customerSparkleSiteHref}`
    : null
  const customerSparkleSiteDisplay = customerSparkleSiteUrl
    ? customerSparkleSiteUrl.replace(/^https:\/\/www\./, '')
    : repProfileState.status === 'loading'
      ? 'Site address loading'
      : 'Site address not set'
  const customerJoinTeamHref = currentPublicSiteSlug
    ? `/${encodeURIComponent(currentPublicSiteSlug.trim().toLowerCase())}/join`
    : currentRepId
      ? `/amethyst/Join.html?c=${encodeURIComponent(currentRepId)}`
      : '/amethyst/Join.html'
  const customerTradeBoardHref = buildCustomerTradeBoardHref({
    repId: repIdOverride ?? repProfileState.repId,
    publicSiteSlug: publicSiteSlugOverride ?? repProfileState.publicSiteSlug,
  })
  const openWorkspacePreview = (nextPreview: Extract<WorkspacePreviewState, { mode: 'live_site_preview' }>) => {
    setPreviewUnavailableMessage(null)
    setWorkspacePreview(nextPreview)
    setPreviewFrameKey((current) => current + 1)
  }
  const handleOpenTradeBoardPreview = () => {
    openWorkspacePreview({
      mode: 'live_site_preview',
      href: customerTradeBoardHref,
      title: 'Customer Dance Floor Preview',
    })
  }
  const handleOpenCustomerSitePreview = () => {
    if (!customerSparkleSiteHref) return
    openWorkspacePreview({
      mode: 'live_site_preview',
      href: customerSparkleSiteHref,
      title: 'Live Site Preview',
    })
  }
  const headerRepName = formatHeaderRepName(
    siteSettingsState.settings?.displayName ?? repProfileState.displayName,
  )
  const headerShowName = formatHeaderShowName(
    siteSettingsState.settings?.businessName ?? repProfileState.businessName,
    headerRepName,
    siteSettingsState.status === 'loading' && repProfileState.status === 'loading',
  )
  const managedTeamName =
    siteSettingsDraft?.teamName ?? siteSettingsState.settings?.teamName ?? ''
  const memberTeamName =
    siteSettingsDraft?.memberTeamName ?? siteSettingsState.settings?.memberTeamName ?? ''
  const workspaceSkinPreset = getWorkspaceSkinPreset(
    siteSettingsState.settings,
    siteSettingsDraft,
  )
  const hasPaidWorkspace = hasPaidWorkspaceSubscription(
    accountBillingState.summary,
  )
  const hasRecipeWorkspaceAccess = hasBlingKitchenRecipeWorkspaceAccess({
    repId: repIdOverride ?? repProfileState.repId,
    publicSiteSlug: publicSiteSlugOverride ?? repProfileState.publicSiteSlug,
  })
  const isWorkspaceAccessLoading = accountBillingState.status !== 'ready'
  const hasWorkspaceAccess = operatorSupportMode || hasPaidWorkspace
  const canRenderWorkspaceSections = hasWorkspaceAccess
  const visibleWorkspaceSections = getVisibleWorkspaceSections(
    hasWorkspaceAccess,
    hasRecipeWorkspaceAccess,
  )
  const showWorkspaceAccessNotice = shouldShowWorkspaceAccessNotice(
    activeSection,
    hasWorkspaceAccess,
    isWorkspaceAccessLoading,
  )
  const showWorkspaceLoadingSkeleton = shouldShowWorkspaceLoadingSkeleton(
    activeSection,
    isWorkspaceAccessLoading,
  )
  const isLiveSitePreview = workspacePreview.mode === 'live_site_preview'
  const activeWorkspacePreview = isLiveSitePreview ? workspacePreview : null
  const activeWorkspacePreviewSrc = activeWorkspacePreview
    ? `${activeWorkspacePreview.href}${
        activeWorkspacePreview.href.includes('?') ? '&' : '?'
      }previewRefresh=${previewFrameKey}`
    : null
  const siteSettingsHasUnsavedChanges = hasSiteSettingsUnsavedChanges({
    settings: siteSettingsState.settings,
    draft: siteSettingsDraft,
    isBrittWithBling: isBrittWithBlingWorkspace,
  })
  const siteSettingsSaveStatusText = getSiteSettingsManualSaveStatusText({
    settings: siteSettingsState.settings,
    draft: siteSettingsDraft,
    actionState: siteSettingsActionState,
    statusMessage: siteSettingsActionState.helperMessage,
    isBrittWithBling: isBrittWithBlingWorkspace,
  })
  const activeWorkspaceShellSection = WORKSPACE_SECTIONS.some(
    (section) => section.key === activeSection,
  )
    ? (activeSection as (typeof WORKSPACE_SECTIONS)[number]['key'])
    : 'more'
  function openMessageCenter(options: {
    view?: 'all' | 'team' | 'rep-network' | 'support' | 'sparkle-suite' | 'archived'
    conversationId?: string | null
    composeSupport?: boolean
    source?: string | null
  } = {}) {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('section', 'messages')
      if (options.view && options.view !== 'all') {
        url.searchParams.set('view', options.view)
      } else {
        url.searchParams.delete('view')
      }
      if (options.conversationId) {
        url.searchParams.set('conversationId', options.conversationId)
      } else {
        url.searchParams.delete('conversationId')
      }
      if (options.composeSupport) {
        url.searchParams.set('compose', 'support')
        if (options.source) url.searchParams.set('source', options.source)
      } else {
        url.searchParams.delete('compose')
        url.searchParams.delete('source')
      }
      window.history.replaceState(window.history.state, '', url)
    }
    setWorkspacePreview({ mode: 'workspace' })
    setPreviewUnavailableMessage(null)
    setActiveSection('messages')
  }
  const workspaceHeader = !isLiveSitePreview ? (
    <WorkspaceAppHeader
      repName={headerRepName}
      showName={headerShowName}
      memberTeamName={memberTeamName}
      publicSiteUrl={customerSparkleSiteUrl}
      publicSiteDisplay={customerSparkleSiteDisplay}
      liveQueueSyncCode={currentLiveQueueSyncCode}
      unreadMessageCount={messagesState.inbox?.unreadCount ?? 0}
      messagesLoading={messagesState.status === 'loading'}
      messagesActive={activeSection === 'messages'}
      onOpenPublicSite={handleOpenCustomerSitePreview}
      onOpenMessages={() => openMessageCenter()}
      onGoHome={() => {
        setWorkspacePreview({ mode: 'workspace' })
        setPreviewUnavailableMessage(null)
        setActiveSection('home')
      }}
      operatorSupportMode={operatorSupportMode}
    />
  ) : null
  const accessNotice = (
    <WorkspaceAccessNotice
      sectionLabel={getWorkspaceSectionLabel(activeSection)}
      state={accountBillingState}
      actionState={accountBillingActionState}
      onOpenAccount={() => setActiveSection('account')}
      onStartSubscription={() => handleAccountBillingAction('subscribe')}
      onManageBilling={() => handleAccountBillingAction('manage')}
      statusMessage={accountBillingActionState.helperMessage}
      agreementAccepted={subscriptionAgreementAccepted}
      onAgreementAcceptedChange={setSubscriptionAgreementAccepted}
    />
  )
  const renderActiveWorkspaceSection = () => {
    if (showWorkspaceLoadingSkeleton && !canRenderWorkspaceSections) {
      return (
        <div className={styles.cardFill}>
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
        </div>
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'trade-board') {
      const tradeRequestDecisionHandlers = createTradeRequestDecisionHandlers(
        handleTradeRequestDecision,
      )

      return (
        <TradeBoardWorkspaceCard
          tradeBoardState={tradeBoardState}
          tradeBoardSearchQuery={tradeBoardSearchQuery}
          onTradeBoardSearchQueryChange={setTradeBoardSearchQuery}
          quickAddItemNumber={quickAddItemNumber}
          onQuickAddItemNumberChange={setQuickAddItemNumber}
          actionState={tradeBoardActionState}
          tradeRequestsState={tradeRequestsState}
          fulfillmentQueueState={fulfillmentQueueState}
          tradeSwapCleanupState={tradeSwapCleanupState}
          onQuickAddListing={handleQuickAddListing}
          onRemoveListing={handleRemoveTradeListing}
          onApproveRequest={tradeRequestDecisionHandlers.onApproveRequest}
          onRejectRequest={tradeRequestDecisionHandlers.onRejectRequest}
          onAdvanceFulfillment={handleAdvanceFulfillment}
          customerBoardHref={customerTradeBoardHref}
          onOpenCustomerBoardPreview={handleOpenTradeBoardPreview}
          hasMoreListings={tradeBoardState.hasMoreListings === true}
          onEnsureInventoryBrowseLoaded={handleEnsureInventoryBrowseLoaded}
          isInventoryBrowseLoading={
            tradeBoardActionState.pendingKey === 'load-more-listings'
          }
        />
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'home') {
      return (
        <NicNacHomeWorkspaceCard
          tradeRequestsCount={tradeRequestsState.requests?.length ?? 0}
          cleanupCount={tradeSwapCleanupState.items?.length ?? 0}
          fulfillmentCount={fulfillmentQueueState.items?.length ?? 0}
          nextShowLabel={buildHomeNextShowLabel(
            calendarState.summary?.upcomingEvents ?? [],
          )}
          onLaunchAction={(action) => onLaunchNicNacAction?.(action)}
          onOpenTradeBoard={() => setActiveSection('trade-board')}
          onOpenCalendar={() => setActiveSection('show-calendar')}
          onOpenCustomerBoardPreview={handleOpenTradeBoardPreview}
        />
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'jewelry-library') {
      return (
        <JewelryLibraryCard
          state={jewelryLibraryState}
          searchQuery={librarySearchQuery}
          filters={libraryFilters}
          onSearchQueryChange={setLibrarySearchQuery}
          onSearch={handleLibrarySearch}
          onFilterChange={handleLibraryFilterChange}
          onClear={handleLibraryClear}
          onAddToBoard={handleAddFromLibrary}
          actionState={tradeBoardActionState}
        />
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'show-calendar') {
      return (
        <div className={styles.workspaceSectionStack}>
          <ShowCalendarCard state={calendarState} />
        </div>
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'business-tools') {
      return <BusinessToolsCard />
    }

    if (canRenderWorkspaceSections && activeSection === 'live-queue') {
      return (
        <LiveQueueTool
          liveQueueSyncCode={currentLiveQueueSyncCode}
          customerSiteHref={customerSparkleSiteHref}
          onOpenHelp={() => setActiveSection('help-resources')}
        />
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'collection-intake') {
      return <CollectionIntakeTool />
    }

    if (canRenderWorkspaceSections && activeSection === 'more') {
      return (
        <MoreWorkspaceCard
          sections={SECONDARY_WORKSPACE_SECTIONS.filter(
            (section) =>
              section.key !== 'recipes' || hasRecipeWorkspaceAccess,
          )}
          onSectionChange={(section) => {
            const nextSection = resolveWorkspaceSectionForAccess(
              section,
              hasWorkspaceAccess,
              hasRecipeWorkspaceAccess,
            )
            if (nextSection === 'recipes') setRecipeEditorTab('current')
            setActiveSection(nextSection)
          }}
        />
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'team-management') {
      return (
        <div className={styles.workspaceSectionStack}>
          <TeamManagementCard
            state={teamManagementState}
            actionState={teamManagementActionState}
            publicTeamDraft={publicTeamDraft}
            teamName={managedTeamName}
            joinTeamPreviewHref={customerJoinTeamHref}
            onTeamNameChange={(teamName) => handleSiteSettingsDraftChange({ teamName })}
            onSaveTeamName={handleSaveManagedTeamName}
            onCreateParticipant={handleCreateTeamOnboardingParticipant}
            onRefreshInvite={handleRefreshTeamOnboardingInvite}
            onCopyInvite={handleCopyTeamOnboardingInvite}
            onArchiveParticipant={handleArchiveTeamOnboardingParticipant}
            onPublicTeamDraftChange={handlePublicTeamDraftChange}
            onUploadPublicTeamPhoto={handlePublicTeamPhotoUpload}
            onSavePublicTeamMember={handleSavePublicTeamMember}
            onEditPublicTeamMember={handleEditPublicTeamMember}
            onTogglePublicTeamMember={handleTogglePublicTeamMember}
            onMovePublicTeamMember={handleMovePublicTeamMember}
            onRemovePublicTeamMember={handleRemovePublicTeamMember}
            onOpenMessages={(conversationId) =>
              openMessageCenter({ view: 'team', conversationId })
            }
          />
        </div>
      )
    }

    if (activeSection === 'messages') {
      return (
        <div className={styles.workspaceSectionStack}>
          <UnifiedMessageCenter
            state={messagesState as UnifiedMessageCenterState}
            actionState={messagesActionState}
            reviewMode={reviewWorkspaceMode}
            supportOnly={!hasPaidWorkspace}
            draftScope={currentRepId ?? (reviewWorkspaceMode ? 'review-rep' : null)}
            onUpdatePublication={handleUpdateMessage}
            onUpdateConversation={handleUpdateConversationSummary}
            onRetry={() => void loadMessages()}
          />
        </div>
      )
    }

    if (
      activeSection === 'resources' ||
      activeSection === 'help-resources'
    ) {
      return (
        <div className={styles.workspaceSectionStack}>
          <HelpResourcesCard
            key={activeSection}
            state={resourcesState}
            hasPaidWorkspace={hasPaidWorkspace}
            initialTab={activeSection === 'help-resources' ? 'help' : 'learn'}
            learningContent={
              canRenderWorkspaceSections
                ? reviewWorkspaceMode
                  ? <WorkspaceResourceLibraryView resources={REVIEW_RESOURCE_FIXTURES} />
                  : <WorkspaceResourceLibrary />
                : undefined
            }
            onContactSupport={() =>
              openMessageCenter({
                view: 'support',
                composeSupport: true,
                source: 'help',
              })
            }
          />
        </div>
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'customer-list') {
      return (
        <div className={styles.workspaceSectionStack}>
          <CustomerRosterCard
            state={audienceState}
            activeFilter={rosterFilter}
            onFilterChange={setRosterFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            actionState={actionState}
            onUnsubscribe={handleUnsubscribe}
            onCopySignupLink={handleCopySignupLink}
            onCopyVisibleContacts={handleCopyVisibleContacts}
            activeComposerAudienceId={emailComposer.audienceId}
            composerSubject={emailComposer.subject}
            composerBody={emailComposer.body}
            composerPending={emailComposer.pending}
            onOpenEmailComposer={handleOpenEmailComposer}
            onCloseEmailComposer={handleCloseEmailComposer}
            onComposerSubjectChange={(value) =>
              setEmailComposer((current) => ({ ...current, subject: value }))
            }
            onComposerBodyChange={(value) =>
              setEmailComposer((current) => ({ ...current, body: value }))
            }
            onSendEmail={handleSendEmail}
            onCreate={async (profile) => {
              const response = await fetch('/api/nic-nac/customer-audience', {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(profile),
              })
              const payload = await response.json().catch(() => null) as { error?: string } | null
              if (!response.ok) throw new Error(payload?.error || 'Unable to add this customer.')
              await loadAudience()
            }}
            onUpdate={async (audienceId, profile) => {
              const response = await fetch('/api/nic-nac/customer-audience', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ audienceId, ...profile }),
              })
              const payload = await response.json().catch(() => null) as { error?: string } | null
              if (!response.ok) throw new Error(payload?.error || 'Unable to update this customer.')
              await loadAudience()
            }}
            onImport={async (contacts) => {
              const response = await fetch('/api/nic-nac/customer-audience', {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ action: 'import', contacts }),
              })
              const payload = (await response.json().catch(() => null)) as
                | { error?: string; result?: CustomerAudienceImportResult }
                | null
              if (!response.ok || !payload?.result) {
                throw new Error(payload?.error || 'Unable to import this customer list.')
              }
              await loadAudience()
              return payload.result
            }}
          />
        </div>
      )
    }

    if (canRenderWorkspaceSections && activeSection === 'site-settings') {
      return (
        <div className={styles.workspaceSectionStack}>
          <SiteSettingsCard
            state={siteSettingsState}
            draft={siteSettingsDraft}
            actionState={siteSettingsActionState}
            hasUnsavedChanges={siteSettingsHasUnsavedChanges}
            statusMessage={siteSettingsSaveStatusText}
            onDraftChange={handleSiteSettingsDraftChange}
            onSocialHandleChange={handleSocialHandleChange}
            onHomepageMediaChange={handleHomepageMediaChange}
            onHomepageMediaUpload={handleHomepageMediaUpload}
            mediaUploadKey={siteSettingsMediaUploadKey}
            mediaUploadFeedback={siteSettingsMediaUploadFeedback}
            isBrittWithBling={isBrittWithBlingWorkspace}
            canPreview={Boolean(customerSparkleSiteHref)}
            onPreview={handleOpenCustomerSitePreview}
            onWriteAboutNarrative={() => {
              setActiveSection('home')
              onSendNicNacPrompt?.(
                'Help me write my customer-facing About section narrative. Ask me to free-talk first, then give me 2 or 3 polished choices that keep my real details and voice. Once I choose one, save it to my customer-facing site.',
              )
            }}
            onSave={handleSaveSiteSettings}
          />
        </div>
      )
    }

    if (
      canRenderWorkspaceSections &&
      activeSection === 'recipes' &&
      hasRecipeWorkspaceAccess
    ) {
      return (
        <div className={styles.workspaceSectionStack}>
          <RecipesCard
            state={recipesState}
            draft={recipeDraft}
            actionState={recipeActionState}
            activeTab={recipeEditorTab}
            statusMessage={getRecipeSaveStatusText(recipeActionState)}
            onActiveTabChange={setRecipeEditorTab}
            onDraftChange={handleRecipeDraftChange}
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipeDraft}
            onSave={handleSaveRecipe}
            onRemove={handleRemoveRecipe}
            onUploadImage={handleRecipeImageUpload}
            onBuildDraft={handleBuildRecipeDraft}
          />
        </div>
      )
    }

    if (activeSection === 'account') {
      return (
        <div className={styles.workspaceSectionStack}>
          <AccountBillingCard
            state={accountBillingState}
            actionState={accountBillingActionState}
            onStartSubscription={() => handleAccountBillingAction('subscribe')}
            onManageBilling={() => handleAccountBillingAction('manage')}
            statusMessage={accountBillingActionState.helperMessage}
            agreementAccepted={subscriptionAgreementAccepted}
            onAgreementAcceptedChange={setSubscriptionAgreementAccepted}
            mutationsDisabled={operatorSupportMode}
          />
          <AccountSecurityCard mutationsDisabled={operatorSupportMode} />
          {accountBillingState.status === 'ready' &&
          accountBillingState.summary ? (
            <ReferralProgramCard referral={accountBillingState.summary.referral} />
          ) : null}
          {canRenderWorkspaceSections ? (
            <>
              {CUSTOMER_MESSAGING_LAUNCHED ? (
                <WalletSummaryCard
                  state={walletState}
                  actionState={walletActionState}
                  autoRechargeDraft={autoRechargeDraft}
                  onAutoRechargeDraftChange={handleAutoRechargeDraftChange}
                  onSaveAutoRechargeSettings={handleSaveAutoRechargeSettings}
                  onLoadWallet={handleWalletLoad}
                  statusMessage={walletActionState.helperMessage}
                  mutationsDisabled={operatorSupportMode}
                />
              ) : null}
              <SiteAnalyticsCard state={analyticsState} />
            </>
          ) : null}
          <SupportAccessHistoryCard />
        </div>
      )
    }

    return null
  }
  const renderedSection = renderActiveWorkspaceSection()
  const showConceptHome = activeSection === 'home'
  const workspaceBackDestination = getWorkspaceBackDestination(activeSection)
  const isRecipeDetailOpen =
    activeSection === 'recipes' && recipeEditorTab === 'edit'
  const homeTradeRequestsCount = tradeRequestsState.requests?.length ?? 0
  const homeCleanupCount = tradeSwapCleanupState.items?.length ?? 0
  const homeFulfillmentCount = fulfillmentQueueState.items?.length ?? 0
  const homeNextShowLabel = buildHomeNextShowLabel(
    calendarState.summary?.upcomingEvents ?? [],
  )
  const homeNextShow = buildHomeNextShowSummary(
    calendarState.summary?.upcomingEvents ?? [],
  )
  return (
    <main
      className={`${styles.main} ${isLiveSitePreview ? styles.mainPreviewFocus : ''}`}
      data-workspace-skin="concept-one"
      data-customer-site-skin={workspaceSkinPreset}
    >
      {previewUnavailableMessage ? (
        <div className={styles.previewUnavailableNotice}>
          {previewUnavailableMessage}
        </div>
      ) : null}
      {activeWorkspacePreview ? (
        <section className={styles.previewFocusShell} aria-label={activeWorkspacePreview.title}>
          <div className={styles.previewFocusBar}>
            <div className={styles.previewToolbarCopy}>
              <span className={styles.previewKicker}>Live Site Preview</span>
              <span className={styles.previewTitle}>{activeWorkspacePreview.title}</span>
            </div>
            <div className={styles.previewFocusActions}>
              <button
                type="button"
                className={styles.previewAction}
                onClick={() => {
                  setWorkspacePreview({ mode: 'workspace' })
                  setPreviewUnavailableMessage(null)
                }}
              >
                Back to workspace
              </button>
              <a
                className={styles.previewAction}
                href={activeWorkspacePreview.href}
                target="_blank"
                rel="noreferrer"
              >
                Open full site
              </a>
            </div>
          </div>
          <div className={styles.previewWorkbench}>
            <div className={styles.previewFramePane}>
              <iframe
                key={`${previewFrameKey}:${activeWorkspacePreview.href}`}
                className={styles.previewFocusFrame}
                src={activeWorkspacePreviewSrc ?? activeWorkspacePreview.href}
                title="Sparkle Suite live site preview"
              />
            </div>
          </div>
        </section>
      ) : (
        <WorkspaceShell
          tabs={visibleWorkspaceSections}
          activeSection={activeWorkspaceShellSection}
          header={workspaceHeader}
          onSectionChange={(section) =>
            setActiveSection(
              resolveWorkspaceSectionForAccess(
                section,
                hasWorkspaceAccess,
                hasRecipeWorkspaceAccess,
              ),
            )
          }
          notice={showWorkspaceAccessNotice ? accessNotice : null}
        >
          {showConceptHome ? (
            <ConceptHomeWorkspace
              chat={desktopChat}
              tradeRequestsCount={homeTradeRequestsCount}
              cleanupCount={homeCleanupCount}
              fulfillmentCount={homeFulfillmentCount}
              nextShow={homeNextShow}
              siteLive={Boolean(customerSparkleSiteHref)}
              onLaunchAction={(action) => onLaunchNicNacAction?.(action)}
              onOpenTradeBoard={() => setActiveSection('trade-board')}
              onOpenCalendar={() => setActiveSection('show-calendar')}
              onOpenPublicSite={handleOpenCustomerSitePreview}
              onOpenHelp={() => setActiveSection('help-resources')}
              onNewConversation={onNewConversation}
              repName={repProfileState.displayName ?? siteSettingsState.settings?.displayName ?? null}
              conversationControlsDisabled={conversationControlsDisabled}
            />
          ) : (
            <div className={styles.workspaceSectionPage}>
              {workspaceBackDestination ? (
                <button
                  type="button"
                  className={styles.workspaceBackButton}
                  onClick={() => {
                    setWorkspacePreview({ mode: 'workspace' })
                    setPreviewUnavailableMessage(null)
                    if (isRecipeDetailOpen) {
                      setRecipeEditorTab('current')
                    } else {
                      setActiveSection(workspaceBackDestination.section)
                    }
                  }}
                  aria-label={`Back to ${
                    isRecipeDetailOpen ? 'current recipes' : workspaceBackDestination.label
                  }`}
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>
                    Back to {isRecipeDetailOpen ? 'current recipes' : workspaceBackDestination.label}
                  </span>
                </button>
              ) : null}
              {renderedSection}
            </div>
          )}
        </WorkspaceShell>
      )}
    </main>
  )
}

export function WorkspaceAppHeader({
  repName,
  showName,
  memberTeamName,
  publicSiteUrl,
  publicSiteDisplay,
  liveQueueSyncCode,
  unreadMessageCount,
  messagesLoading,
  messagesActive,
  onOpenPublicSite,
  onOpenMessages,
  onGoHome,
  operatorSupportMode = false,
}: {
  repName: string
  showName: string
  memberTeamName?: string
  publicSiteUrl: string | null
  publicSiteDisplay: string
  liveQueueSyncCode?: string | null
  unreadMessageCount: number
  messagesLoading?: boolean
  messagesActive?: boolean
  onOpenPublicSite: () => void
  onOpenMessages: () => void
  onGoHome: () => void
  operatorSupportMode?: boolean
}) {
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [siteLinkCopied, setSiteLinkCopied] = useState(false)

  useEffect(() => {
    if (!siteLinkCopied) return
    const timeoutId = window.setTimeout(() => setSiteLinkCopied(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [siteLinkCopied])

  const handleCopyPublicSite = async () => {
    if (!publicSiteUrl) return

    try {
      await navigator.clipboard.writeText(publicSiteUrl)
      setSiteLinkCopied(true)
    } catch {
      setSiteLinkCopied(false)
    }
  }

  const handleLogout = async () => {
    setLogoutBusy(true)
    setLogoutError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      window.location.assign('/')
    } catch (error) {
      setLogoutBusy(false)
      setLogoutError(
        error instanceof Error ? error.message : 'Unable to log out right now.',
      )
    }
  }

  return (
    <header className={styles.appHeader}>
      <button
        type="button"
        className={styles.appBrand}
        onClick={onGoHome}
        aria-label="Go to Nic-Nac home"
      >
        <SparkleSeal className={styles.appBrandSeal} />
        <span className={styles.appBrandText}>
          <span className={styles.appBrandName}>Sparkle Suite</span>
          <span className={styles.appBrandSubtitle}>Workspace</span>
        </span>
      </button>
      <div className={styles.appHeaderReferences} aria-label="Workspace quick reference">
        <div className={styles.appHeaderReference}>
          <span className={styles.appHeaderReferenceLabel}>Public site</span>
          <button
            type="button"
            className={styles.appHeaderReferenceValue}
            title={publicSiteUrl ?? undefined}
            onClick={onOpenPublicSite}
            disabled={!publicSiteUrl}
          >
            {publicSiteDisplay}
          </button>
          <button
            type="button"
            className={`${styles.appHeaderCopyButton} ${
              siteLinkCopied ? styles.appHeaderCopyButtonCopied : ''
            }`}
            onClick={() => void handleCopyPublicSite()}
            disabled={!publicSiteUrl}
            aria-label={
              siteLinkCopied
                ? 'Public site address copied'
                : 'Copy public site address'
            }
            title={siteLinkCopied ? 'Copied' : 'Copy public site address'}
          >
            {siteLinkCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </button>
        </div>
        <div className={styles.appHeaderReference}>
          <span className={styles.appHeaderReferenceLabel}>Live Queue code</span>
          <strong className={styles.appHeaderQueueCode}>
            {liveQueueSyncCode?.trim() ||
              (repName === 'Rep info loading' ? 'Loading' : 'Not set')}
          </strong>
        </div>
        {memberTeamName ? (
          <div className={styles.appHeaderReference}>
            <span className={styles.appHeaderReferenceLabel}>Team I belong to</span>
            <strong className={styles.appHeaderQueueCode}>{memberTeamName}</strong>
          </div>
        ) : null}
      </div>
      <div className={styles.appHeaderActions}>
        <button
          type="button"
          className={`${styles.appMessageButton} ${
            messagesActive ? styles.appMessageButtonActive : ''
          }`}
          onClick={onOpenMessages}
          aria-current={messagesActive ? 'page' : undefined}
          aria-label={
            unreadMessageCount > 0
              ? `Open Message Center, ${unreadMessageCount} unread message${unreadMessageCount === 1 ? '' : 's'}`
              : 'Open Message Center'
          }
          title="Message Center"
        >
          <Mail aria-hidden="true" />
          <span className={styles.appMessageButtonLabel}>Messages</span>
          {!messagesLoading && unreadMessageCount > 0 ? (
            <span className={styles.appMessageBadge} aria-hidden="true">
              {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
            </span>
          ) : null}
        </button>
        <details className={styles.appProfileMenu}>
          <summary
            className={styles.appProfile}
            aria-label={`Open account menu for ${repName}`}
          >
            <span className={styles.appProfileInitial}>
              {repName.charAt(0).toUpperCase()}
            </span>
            <span className={styles.appProfileCopy}>
              <strong>{repName}</strong>
              <small>{showName}</small>
            </span>
            <ChevronDown className={styles.appProfileChevron} aria-hidden="true" />
          </summary>
          <div className={styles.appProfilePopover}>
            <button
              type="button"
              className={styles.appProfileLogout}
              disabled={logoutBusy || operatorSupportMode}
              onClick={() => void handleLogout()}
              title={
                operatorSupportMode
                  ? 'Sign-in changes are disabled during support access.'
                  : undefined
              }
            >
              <LogOut aria-hidden="true" />
              {logoutBusy ? 'Logging out…' : 'Log out'}
            </button>
            {logoutError ? (
              <span className={styles.appProfileError} role="alert">
                {logoutError}
              </span>
            ) : null}
          </div>
        </details>
      </div>
    </header>
  )
}

function ConceptHomeWorkspace({
  chat,
  tradeRequestsCount,
  cleanupCount,
  fulfillmentCount,
  nextShow,
  siteLive,
  onLaunchAction,
  onOpenTradeBoard,
  onOpenCalendar,
  onOpenPublicSite,
  onOpenHelp,
  onNewConversation,
  conversationControlsDisabled,
  repName,
}: {
  chat?: ReactNode | null
  tradeRequestsCount: number
  cleanupCount: number
  fulfillmentCount: number
  nextShow: HomeNextShowSummary | null
  siteLive: boolean
  onLaunchAction: (action: WorkspaceLaunchAction) => void
  onOpenTradeBoard: () => void
  onOpenCalendar: () => void
  onOpenPublicSite: () => void
  onOpenHelp: () => void
  onNewConversation?: () => void
  conversationControlsDisabled: boolean
  repName: string | null
}) {
  return (
    <section className={styles.conceptHome} aria-label="Nic-Nac first workspace">
      <aside className={styles.conceptRail} aria-label="Trade info at a glance">
        <button
          type="button"
          className={styles.railLaunchAction}
          onClick={() => onLaunchAction('add_trade_piece')}
        >
          <span className={styles.railLaunchPieceIcon} aria-hidden="true">+</span>
          <span>Add a dancer</span>
        </button>
        <ConceptPanel title="Trade Info" icon={<CalendarDays aria-hidden="true" />}>
          <MetricRows
            rows={[
              ['Trade requests', tradeRequestsCount],
              ['Trade follow-up', cleanupCount],
              ['Fulfillment', fulfillmentCount],
            ]}
          />
          <button type="button" className={styles.panelCtaButton} onClick={onOpenTradeBoard}>
            Open Trade Workspace
          </button>
        </ConceptPanel>
      </aside>

      <div className={styles.conceptCenter}>
        <div className={styles.nicNacHero}>
          <div className={styles.nicNacHeroTitleRow}>
            <h1>
              <span className={styles.nicNacHeroBadge} aria-hidden="true">
                N
              </span>
              <span>Nic-Nac</span>
            </h1>
            {onNewConversation ? (
              <div className={styles.nicNacHeroActions} aria-label="Nic-Nac conversation controls">
                <button
                  type="button"
                  onClick={onNewConversation}
                  disabled={conversationControlsDisabled}
                  aria-label="Clear conversation with Nic-Nac to start a new conversation"
                  title="Clear conversation with Nic-Nac to start a new conversation"
                >
                  Clear conversation
                </button>
              </div>
            ) : null}
          </div>
          <p>Hi {repName?.trim() || 'there'}, how can I help you today?</p>
          <div className={styles.mobileHeroQuickActions}>
            <button type="button" onClick={() => onLaunchAction('add_trade_piece')}>
              <span className={styles.railLaunchPieceIcon} aria-hidden="true">+</span>
              Add a dancer
            </button>
          </div>
        </div>
        {chat ? (
          <>
            <div className={styles.chatDivider}>
              <span>Today</span>
            </div>
            <div className={styles.embeddedChat}>{chat}</div>
          </>
        ) : null}
      </div>

      <aside className={styles.conceptRail} aria-label="Workspace glance">
        <ConceptPanel
          title="Upcoming Show"
          action="View calendar"
          onAction={onOpenCalendar}
        >
          {nextShow ? (
            <button
              type="button"
              className={styles.nextShowPreview}
              onClick={onOpenCalendar}
              aria-label={`View ${nextShow.title} in Calendar`}
            >
              <span className={styles.nextShowIcon}>
                <CalendarDays aria-hidden="true" />
              </span>
              <span className={styles.nextShowDetails}>
                <strong>{nextShow.title}</strong>
                <span>{nextShow.weekday}, {nextShow.date}</span>
                <span>{nextShow.time} {nextShow.timeZone}</span>
              </span>
            </button>
          ) : (
            <div className={styles.emptyShowPreview}>
              <span className={styles.nextShowIcon}>
                <CalendarDays aria-hidden="true" />
              </span>
              <span>
                <strong>No upcoming shows</strong>
                <button
                  type="button"
                  onClick={() => onLaunchAction('add_calendar_show')}
                >
                  Add a show
                </button>
              </span>
            </div>
          )}
        </ConceptPanel>
        <ConceptPanel
          title="Public Site"
          action={siteLive ? 'Open site' : undefined}
          onAction={siteLive ? onOpenPublicSite : undefined}
        >
          <button
            type="button"
            className={styles.publicSiteStatus}
            onClick={onOpenPublicSite}
            disabled={!siteLive}
          >
            <span className={styles.publicSiteStatusIcon}>
              <Globe2 aria-hidden="true" />
            </span>
            <span className={styles.publicSiteStatusCopy}>
              <strong>{siteLive ? 'Your site is live' : 'Site setup in progress'}</strong>
              <small>
                {siteLive
                  ? 'Customers can visit your Sparkle Suite site.'
                  : 'Finish customer-facing site setup to publish your customer site.'}
              </small>
            </span>
          </button>
        </ConceptPanel>
        <ConceptPanel title="Need help?" action="Visit resources" onAction={onOpenHelp}>
          <button type="button" className={styles.helpPreview} onClick={onOpenHelp}>
            <BookOpen aria-hidden="true" />
            Guides, playbooks, and quick answers
          </button>
        </ConceptPanel>
        <ConceptPanel title="Recent conversations" className={styles.mobileRecentPanel}>
          <div className={styles.recentConversationList}>
            <button type="button" onClick={() => onLaunchAction('check_board')}>
              <span>N</span>
              Added 2 new dancers to my Dance Floor
              <small>9:30 AM</small>
            </button>
            <button type="button" onClick={onOpenCalendar}>
              <span>N</span>
              Next show setup
              <small>Yesterday</small>
            </button>
          </div>
        </ConceptPanel>
      </aside>
    </section>
  )
}

function ConceptPanel({
  title,
  subtitle,
  icon,
  action,
  onAction,
  className,
  children,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: string
  onAction?: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`${styles.conceptPanel} ${className ?? ''}`}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelTitle}>
            {icon}
            {title}
          </span>
          {subtitle ? <span className={styles.panelSubtitle}>{subtitle}</span> : null}
        </div>
        {action ? (
          <button type="button" onClick={onAction} className={styles.panelAction}>
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function MetricRows({ rows }: { rows: Array<[string, number]> }) {
  return (
    <div className={styles.metricRows}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.metricRow}>
          <span>{value}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

export function WorkspaceAccessNotice({
  sectionLabel,
  state,
  actionState,
  onOpenAccount,
  onStartSubscription,
  onManageBilling,
  statusMessage,
  agreementAccepted,
  onAgreementAcceptedChange,
}: {
  sectionLabel: string
  state: AccountBillingState
  actionState?: AccountBillingActionState
  onOpenAccount?: () => void
  onStartSubscription?: () => void
  onManageBilling?: () => void
  statusMessage?: string | null
  agreementAccepted?: boolean
  onAgreementAcceptedChange?: (accepted: boolean) => void
}) {
  const isLoading = state.status !== 'ready'
  return (
    <div className={styles.workspaceSectionStack}>
      <div className={styles.workspaceIntroCard}>
        <div>
          <div className={styles.cardTitle}>
            {isLoading ? 'Checking workspace access' : `${sectionLabel} needs account setup`}
          </div>
          <div className={styles.accountMuted}>
            {isLoading
              ? 'Sparkle Suite is loading your account status before showing this section.'
              : 'Your account page has the current checkout or billing step. Once access is active, this section will open here.'}
          </div>
        </div>
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.helperButton}
            onClick={() => onOpenAccount?.()}
          >
            Open account
          </button>
        </div>
      </div>
      <AccountBillingCard
        state={state}
        actionState={actionState}
        onStartSubscription={onStartSubscription}
        onManageBilling={onManageBilling}
        statusMessage={statusMessage}
        agreementAccepted={agreementAccepted}
        onAgreementAcceptedChange={onAgreementAcceptedChange}
      />
    </div>
  )
}

function MoreWorkspaceCard({
  sections,
  onSectionChange,
}: {
  sections: readonly (typeof SECONDARY_WORKSPACE_SECTIONS)[number][]
  onSectionChange: (section: WorkspaceSectionKey) => void
}) {
  return (
    <section className={styles.workspaceIntroCard}>
      <div className={styles.sectionHeadingRow}>
        <div>
          <h2 className={styles.cardTitle}>Tools</h2>
          <p className={styles.cardSubtitle}>
            Open the Jewelry Library, Bulk Collection Intake, business helpers,
            settings, and other workspace tools when you need them.
          </p>
        </div>
      </div>
      <div className={styles.moreToolGrid}>
        {sections.map((section) => {
          const Icon = section.icon
          const disabled = 'comingSoon' in section && section.comingSoon === true
          return (
            <button
              key={section.key}
              type="button"
              className={styles.moreToolButton}
              disabled={disabled}
              onClick={() => onSectionChange(section.key)}
            >
              <Icon className={styles.moreToolIcon} aria-hidden="true" />
              <span className={styles.moreToolCopy}>
                <span className={styles.moreToolLabel}>{section.label}</span>
                <span className={styles.moreToolHint}>
                  {disabled ? 'Coming soon' : 'Open tool'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const LIVE_QUEUE_PARTY_ORDERS_URL =
  'https://myoffice.bombparty.com/live-party-orders'

export function LiveQueueTool({
  liveQueueSyncCode,
  customerSiteHref,
  onOpenHelp,
}: {
  liveQueueSyncCode?: string | null
  customerSiteHref?: string | null
  onOpenHelp?: () => void
}) {
  const [codeCopied, setCodeCopied] = useState(false)
  const assignedCode = liveQueueSyncCode?.trim() || null

  async function copyLiveQueueCode() {
    if (!assignedCode) return
    await navigator.clipboard.writeText(assignedCode)
    setCodeCopied(true)
    window.setTimeout(() => setCodeCopied(false), 1800)
  }

  return (
    <div className={styles.workspaceSectionStack}>
      <section className={styles.workspaceIntroCard}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>Live Queue</div>
            <div className={styles.cardSubtitle}>
              Install the Chrome extension, connect it with your private code,
              and confirm your customer-facing reveal queue is ready before a
              live show.
            </div>
          </div>
          <span className={styles.rosterTag}>Live-show setup</span>
        </div>

        <div className={styles.liveQueueSetupGrid}>
          <div className={styles.liveQueueCodePanel}>
            <span className={styles.liveQueueEyebrow}>
              Your private Live Queue code
            </span>
            <strong className={styles.liveQueueCode}>
              {assignedCode ?? 'Code not assigned yet'}
            </strong>
            <p className={styles.liveQueueBody}>
              Keep this code private. Use the exact code shown here when the
              extension asks for it. Some setup messages may call it your
              Secret Rep ID Number.
            </p>
            {!assignedCode ? (
              <p className={styles.liveQueueWarning}>
                Ask Nic-Nac or support to retrieve your assigned code. Do not
                make one up.
              </p>
            ) : null}
            <button
              type="button"
              className={styles.secondaryActionButton}
              disabled={!assignedCode}
              onClick={copyLiveQueueCode}
            >
              {codeCopied ? 'Code copied' : 'Copy code'}
            </button>
          </div>

          <div className={styles.liveQueueInstallPanel}>
            <span className={styles.liveQueueEyebrow}>Start here</span>
            <h3>Install the Chrome extension</h3>
            <p className={styles.liveQueueBody}>
              Use the official Sparkle Suite Live Queue listing. Install it in
              the same Chrome profile you use for the Bomb Party back office.
            </p>
            <a
              className={styles.liveQueuePrimaryLink}
              href={LIVE_QUEUE_CHROME_EXTENSION_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open Chrome Web Store
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.workspacePanel}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>Set it up step by step</div>
            <div className={styles.cardSubtitle}>
              Complete these steps in order. You only need to enter the code
              once unless the extension is reset or reinstalled.
            </div>
          </div>
        </div>

        <ol className={styles.liveQueueSteps}>
          <li>
            <span className={styles.liveQueueStepNumber}>1</span>
            <div>
              <strong>Add the extension to Chrome</strong>
              <p>
                Open the Chrome Web Store link above, choose <b>Add to Chrome</b>,
                and confirm <b>Add extension</b>.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.liveQueueStepNumber}>2</span>
            <div>
              <strong>Pin Sparkle Suite Live Queue</strong>
              <p>
                Select the puzzle-piece icon in Chrome, find Sparkle Suite Live
                Queue, and choose the pin so it stays easy to reach.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.liveQueueStepNumber}>3</span>
            <div>
              <strong>Open Bomb Party Party Orders</strong>
              <p>
                Sign in to the Bomb Party back office in that same Chrome
                profile, then open Party Orders.
              </p>
              <a
                className={styles.liveQueueTextLink}
                href={LIVE_QUEUE_PARTY_ORDERS_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open Bomb Party Party Orders
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </li>
          <li>
            <span className={styles.liveQueueStepNumber}>4</span>
            <div>
              <strong>Enter your private code</strong>
              <p>
                Open the extension, paste the exact Live Queue code shown
                above, save it, and turn syncing on.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.liveQueueStepNumber}>5</span>
            <div>
              <strong>Choose the right Party Filter</strong>
              <p>
                In the extension, choose the party you are actively working
                from so orders from another party do not appear in this queue.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.liveQueueStepNumber}>6</span>
            <div>
              <strong>Leave Party Orders open while you are live</strong>
              <p>
                The extension reads that page and syncs the unrevealed queue.
                It never needs to refresh or change your Bomb Party page.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className={styles.workspacePanel}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>
              Make sure everything is working
            </div>
            <div className={styles.cardSubtitle}>
              Run this quick check before your first live show and after
              reinstalling the extension.
            </div>
          </div>
        </div>

        <ul className={styles.liveQueueChecklist}>
          <li>The extension is installed, pinned, and turned on.</li>
          <li>The saved code exactly matches the code shown on this page.</li>
          <li>Bomb Party Party Orders is open in the same Chrome profile.</li>
          <li>The correct Party Filter is selected.</li>
          <li>The extension status shows connected or green.</li>
          <li>
            Your customer site shows the first unrevealed customer, or a clear
            empty state when nobody is waiting.
          </li>
        </ul>

        <div className={styles.liveQueueActionRow}>
          {customerSiteHref ? (
            <a
              className={styles.liveQueueSecondaryLink}
              href={customerSiteHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open customer site
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            className={styles.liveQueueHelpButton}
            onClick={onOpenHelp}
          >
            Open Help &amp; Resources
          </button>
        </div>

        <div className={styles.liveQueueTroubleshooting}>
          <strong>If the queue looks stale or does not connect</strong>
          <p>
            Confirm Party Orders is still open, syncing is on, the code matches
            exactly, and the right Party Filter is selected. Give it up to one
            minute to run the backup sync. If it is still not connected, use
            Help &amp; Resources and tell support exactly what the extension
            status shows.
          </p>
        </div>
      </section>

      <section className={styles.workspacePanel}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>How Live Queue works</div>
            <div className={styles.cardSubtitle}>
              The extension connects the reveal order you already manage in
              Bomb Party to the queue customers see on your Sparkle Suite site.
            </div>
          </div>
        </div>

        <div className={styles.liveQueueFlowGrid}>
          <div>
            <strong>1. It reads Party Orders</strong>
            <p>
              While Party Orders is open, the extension reads the customer
              first names and whether each order is already revealed.
            </p>
          </div>
          <div>
            <strong>2. It builds the waiting order</strong>
            <p>
              Revealed orders are left out. The customer site puts the oldest
              unrevealed customer first and treats that person as currently
              unboxing.
            </p>
          </div>
          <div>
            <strong>3. It updates your customer site</strong>
            <p>
              The queue syncs automatically as orders and reveal statuses
              change, so customers can follow their place without asking in
              chat.
            </p>
          </div>
        </div>

        <p className={styles.liveQueuePrivacyNote}>
          Live Queue sends only the queue information needed for the customer
          display. It does not place orders, reveal jewelry, refresh the Bomb
          Party page, or change anything in the Bomb Party back office.
        </p>
      </section>
    </div>
  )
}

export function JewelryLibraryCard({
  state,
  searchQuery,
  filters,
  onSearchQueryChange,
  onSearch,
  onFilterChange,
  onClear,
  onAddToBoard,
  actionState,
}: {
  state: JewelryLibraryState
  searchQuery: string
  filters: JewelryLibraryFilters
  onSearchQueryChange: (value: string) => void
  onSearch: (query: string) => void
  onFilterChange: (field: JewelryLibraryFilterField, value: string) => void
  onClear: () => void
  onAddToBoard: (result: JewelryDatabaseResult) => void
  actionState: TradeBoardActionState
}) {
  const results = state.results ?? []
  const facets = state.facets ?? EMPTY_JEWELRY_LIBRARY_FACETS
  const activeFilters = getJewelryLibraryActiveFilters(filters)
  const hasActiveFilters = activeFilters.length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onSearch(String(formData.get('librarySearchQuery') ?? ''))
  }

  return (
    <div className={styles.workspaceSectionStack}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Master Jewelry Library</div>
          <div className={styles.cardSubtitle}>
            Search the Jewelry Library by piece, collection, type, material, stone, and Bomb Party label.
          </div>
        </div>
      </div>
      <div className={styles.librarySearchCard}>
        <form className={styles.librarySearchForm} onSubmit={handleSubmit}>
          <div className={styles.librarySearchPrimary}>
            <label className={styles.librarySearchLabel}>
              Search the Jewelry Library
              <input
                type="search"
                name="librarySearchQuery"
                className={`${styles.librarySearchInput} ph-no-capture`}
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Try a stone, collection, item number, or piece name"
              />
            </label>
            <p className={styles.librarySearchHint}>
              Not sure what it is called? Ask Nic-Nac from here.
            </p>
          </div>
          <div className={styles.librarySearchActions}>
            <button type="submit" className={styles.libraryPrimaryButton}>
              <Search aria-hidden="true" className={styles.libraryButtonIcon} strokeWidth={2} />
              Search
            </button>
            <a className={styles.librarySecondaryButton} href="#nic-nac-workspace-chat">
              <Sparkles aria-hidden="true" className={styles.libraryButtonIcon} strokeWidth={1.8} />
              Ask Nic-Nac
            </a>
            <button type="button" className={styles.libraryTertiaryButton} onClick={onClear}>
              <X aria-hidden="true" className={styles.libraryButtonIcon} strokeWidth={2} />
              Clear
            </button>
          </div>
        </form>
        {hasActiveFilters ? (
          <div className={styles.librarySelectedFilters}>
            <div className={styles.librarySelectedFiltersLabel}>Selected filters</div>
            <div className={styles.librarySelectedFilterList}>
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  className={styles.librarySelectedFilter}
                  key={`${filter.field}:${filter.value}`}
                  onClick={() => onFilterChange(filter.field, '')}
                >
                  {filter.label}: {filter.value}
                  <X aria-hidden="true" className={styles.libraryChipIcon} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <details className={styles.libraryFacetPanel}>
          <summary className={styles.libraryFacetSummary}>
            <span>Filters</span>
            <span className={styles.libraryFacetCount}>
              {activeFilters.length > 0 ? `${activeFilters.length} active` : 'Browse options'}
            </span>
          </summary>
          <div className={styles.libraryFacetGrid}>
            {JEWELRY_LIBRARY_FACET_GROUPS.map((group) => (
              <JewelryLibraryFacetGroup
                activeValue={filters[group.field] ?? ''}
                ariaLabel={group.ariaLabel}
                field={group.field}
                key={group.key}
                onFilterChange={onFilterChange}
                options={facets[group.key]}
                searchPlaceholder={group.searchPlaceholder}
                title={group.title}
              />
            ))}
          </div>
        </details>
        {actionState.error ? <div className={styles.actionError}>{actionState.error}</div> : null}
        {actionState.helperMessage ? (
          <div className={styles.helperMessage}>{actionState.helperMessage}</div>
        ) : null}
      </div>
      {state.status === 'idle' || state.status === 'loading' ? (
        <div className={styles.libraryGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.librarySkeletonCard} key={`library-skeleton-${index}`}>
              <div className={styles.librarySkeletonImage} />
              <div className={styles.loadingLine} />
              <div className={styles.loadingLineShort} />
            </div>
          ))}
        </div>
      ) : state.status === 'error' ? (
        <div className={styles.libraryEmptyState}>
          The library search is temporarily unavailable.
        </div>
      ) : results.length > 0 ? (
        <div className={styles.libraryGrid}>
          {results.map((result) => (
            <JewelryLibraryResultCard
              actionState={actionState}
              key={result.designId}
              onAddToBoard={onAddToBoard}
              result={result}
            />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <div className={styles.libraryEmptyState}>
          <p>No library records match those filters.</p>
          <p>Not sure what it is called? Ask Nic-Nac to help broaden the search.</p>
        </div>
      ) : (
        <div className={styles.libraryEmptyState}>
          The shared Sparkle Suite jewelry catalog is not available in this environment yet.
        </div>
      )}
    </div>
  )
}

function JewelryLibraryFacetGroup({
  activeValue,
  ariaLabel,
  field,
  onFilterChange,
  options,
  searchPlaceholder,
  title,
}: {
  activeValue: string
  ariaLabel: string
  field: JewelryLibraryFilterField
  onFilterChange: (field: JewelryLibraryFilterField, value: string) => void
  options: JewelryLibraryFacetOption[]
  searchPlaceholder: string
  title: string
}) {
  const [facetSearch, setFacetSearch] = useState('')
  const visibleOptions = useMemo(() => {
    const normalized = facetSearch.trim().toLocaleLowerCase()
    if (!normalized) return options
    return options.filter((option) =>
      option.value.toLocaleLowerCase().includes(normalized),
    )
  }, [facetSearch, options])

  return (
    <section className={styles.libraryFacetGroup}>
      <h3 className={styles.libraryFacetTitle}>{title}</h3>
      <input
        aria-label={ariaLabel}
        className={`${styles.libraryFacetSearch} ph-no-capture`}
        onChange={(event) => setFacetSearch(event.target.value)}
        placeholder={searchPlaceholder}
        type="search"
        value={facetSearch}
      />
      <div className={styles.libraryFacetOptions}>
        {visibleOptions.length > 0 ? (
          visibleOptions.map((option) => {
            const isActive = activeValue === option.value

            return (
              <button
                type="button"
                aria-current={isActive ? 'true' : undefined}
                className={
                  isActive
                    ? styles.libraryFacetOptionActive
                    : styles.libraryFacetOption
                }
                key={`${field}:${option.value}`}
                onClick={() => onFilterChange(field, isActive ? '' : option.value)}
              >
                <span>{formatJewelryFacetValue(field, option.value)}</span>
                <span className={styles.libraryFacetOptionCount}>{option.count}</span>
              </button>
            )
          })
        ) : (
          <p className={styles.libraryFacetEmpty}>
            No available options in this group.
          </p>
        )}
      </div>
    </section>
  )
}

function JewelryLibraryResultCard({
  actionState,
  onAddToBoard,
  result,
}: {
  actionState: TradeBoardActionState
  onAddToBoard: (result: JewelryDatabaseResult) => void
  result: JewelryDatabaseResult
}) {
  const label = deriveJewelryLibraryLabel(result)
  const metadata = [
    result.activeListingsCount < 1
      ? 'No current dancers'
      : result.activeListingsCount === 1
        ? '1 available'
        : `${result.activeListingsCount} available`,
    result.collectionYear ? String(result.collectionYear) : null,
    result.material,
    result.mainStone,
    ...(result.searchTags ?? []).slice(0, 2),
  ].filter((value): value is string => Boolean(value))

  return (
    <article className={styles.libraryResultCard}>
      <div className={styles.libraryResultImageFrame}>
        {result.canonicalPhotoUrl ? (
          <div
            aria-label={result.designName}
            className={styles.libraryResultImage}
            role="img"
            style={{ backgroundImage: `url("${result.canonicalPhotoUrl}")` }}
          />
        ) : (
          <Gem aria-hidden="true" className={styles.libraryGemIcon} strokeWidth={1.4} />
        )}
      </div>
      <div className={styles.libraryResultBody}>
        <div className={styles.libraryBadgeRow}>
          <span className={styles.libraryTypeBadge}>
            {formatJewelryLibraryType(result.typePrefix)}
          </span>
          {label !== 'standard' ? (
            <span className={styles.libraryRarityBadge}>{label}</span>
          ) : null}
        </div>
        <h2 className={styles.libraryResultTitle}>{result.designName}</h2>
        <p className={styles.libraryResultCollection}>
          {result.collectionName || 'Unassigned Collection'}
        </p>
        <p className={styles.libraryResultItemNumber}>{result.itemNumber}</p>
        <div className={styles.libraryMetadataList}>
          {metadata.map((value, index) => (
            <span
              className={styles.libraryMetadataChip}
              key={`${result.designId}:${value}:${index}`}
            >
              {value}
            </span>
          ))}
        </div>
        <button
          type="button"
          className={styles.libraryAddButton}
          disabled={
            result.isOnMyBoard ||
            actionState.pendingKey === `library:${result.designId}`
          }
          onClick={() => onAddToBoard(result)}
        >
          {actionState.pendingKey === `library:${result.designId}`
            ? 'Adding...'
            : result.isOnMyBoard
              ? 'Already listed'
              : 'Add dancer'}
        </button>
      </div>
    </article>
  )
}

export type MessageCenterFilter =
  | 'all'
  | 'unread'
  | 'reports'
  | 'updates'
  | 'resources'
  | 'archived'

const MESSAGE_CENTER_FILTERS: readonly {
  key: MessageCenterFilter
  label: string
}[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'reports', label: 'Reports' },
  { key: 'updates', label: 'Updates' },
  { key: 'resources', label: 'Resources' },
  { key: 'archived', label: 'Archived' },
]

const MESSAGE_CATEGORY_LABELS: Record<string, string> = {
  account_activity: 'Account activity',
  customer_activity: 'Customer activity',
  business_update: 'Business update',
  monthly_report: 'Monthly report',
  platform_update: 'Platform update',
  help_update: 'Help update',
  blog: 'Blog',
  video: 'Video',
  announcement: 'Announcement',
}

const MESSAGE_PRIORITY_LABELS: Record<string, string> = {
  important: 'Important',
  action_required: 'Action needed',
}

function getMessageCategory(message: WorkspaceMessageSummary) {
  return message.category || message.messageType || 'announcement'
}

function isResourceMessage(message: WorkspaceMessageSummary) {
  const category = getMessageCategory(message)
  return category === 'blog' || category === 'video'
}

function isReportMessage(message: WorkspaceMessageSummary) {
  return getMessageCategory(message) === 'monthly_report'
}

function isUpdateMessage(message: WorkspaceMessageSummary) {
  const category = getMessageCategory(message)
  return (
    category === 'account_activity' ||
    category === 'platform_update' ||
    category === 'business_update' ||
    category === 'help_update' ||
    category === 'announcement' ||
    category === 'newsletter' ||
    category === 'support_response'
  )
}

export function filterMessageCenterMessages(
  messages: WorkspaceMessageSummary[],
  filter: MessageCenterFilter,
) {
  return messages.filter((message) => {
    if (filter === 'archived') return Boolean(message.archivedAt)
    if (message.archivedAt) return false
    if (filter === 'unread') return !message.isRead
    if (filter === 'reports') return isReportMessage(message)
    if (filter === 'updates') return isUpdateMessage(message)
    if (filter === 'resources') return isResourceMessage(message)
    return true
  })
}

export function getSafeMessageActionUrl(value: string | null | undefined) {
  const href = value?.trim()
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  try {
    const parsed = new URL(href)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function MessageBodyContent({
  body,
}: {
  body: WorkspaceMessageSummary['body']
}) {
  if (typeof body === 'string') {
    return body ? <p className={styles.messageBody}>{body}</p> : null
  }

  return (
    <div className={styles.messageStructuredBody}>
      {body.map((block, index) => {
        const key = `${block.type}:${index}`
        if (block.type === 'heading') {
          return block.text ? <h3 key={key}>{block.text}</h3> : null
        }
        if (block.type === 'metric') {
          return (
            <div className={styles.messageMetric} key={key}>
              <span>{block.label || 'Metric'}</span>
              <strong>{block.value ?? 'Not tracked for this month'}</strong>
            </div>
          )
        }
        if (block.type === 'list') {
          return block.items && block.items.length > 0 ? (
            <ul key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}:${itemIndex}`}>{item}</li>
              ))}
            </ul>
          ) : null
        }
        return block.text ? <p key={key}>{block.text}</p> : null
      })}
    </div>
  )
}

function LegacyMessagesCenterCard({
  state,
  actionState,
  onUpdateMessage,
  onMarkAllRead,
  onRetry,
}: {
  state: MessagesState
  actionState: MessagesActionState
  onUpdateMessage: (
    message: WorkspaceMessageSummary,
    patch: { read?: boolean; archived?: boolean },
  ) => void
  onMarkAllRead: () => void
  onRetry: () => void
}) {
  const [filter, setFilter] = useState<MessageCenterFilter>('all')
  const messages = (state.inbox?.messages ?? []).filter(
    (message): message is WorkspacePublicationSummary =>
      !isConversationItem(message),
  )
  const visibleMessages = filterMessageCenterMessages(messages, filter)
  const unreadCount = state.inbox?.unreadCount ?? 0

  return (
    <section className={`${styles.workspacePanel} ${styles.messageCenter}`}>
      <div className={styles.messageCenterHeader}>
        <div>
          <span className={styles.messageCenterEyebrow}>Receive-only inbox</span>
          <h1 className={styles.cardTitle}>Message Center</h1>
          <p className={styles.cardSubtitle}>
            Business reports, customer activity, resources, and Sparkle Suite updates.
          </p>
        </div>
        <div className={styles.messageCenterHeaderActions}>
          <span className={styles.messageUnreadSummary} aria-live="polite">
            {state.status === 'loading'
              ? 'Loading messages'
              : `${unreadCount} unread`}
          </span>
          <button
            type="button"
            className={styles.messageMarkAllButton}
            disabled={
              state.status !== 'ready' ||
              unreadCount === 0 ||
              actionState.pendingKey !== null
            }
            onClick={onMarkAllRead}
          >
            {actionState.pendingKey === 'read:all' ? 'Saving…' : 'Mark all read'}
          </button>
        </div>
      </div>

      <div className={styles.messageFilterBar} aria-label="Filter messages">
        {MESSAGE_CENTER_FILTERS.map((option) => {
          const count = filterMessageCenterMessages(messages, option.key).length
          return (
            <button
              key={option.key}
              type="button"
              className={`${styles.messageFilterButton} ${
                filter === option.key ? styles.messageFilterButtonActive : ''
              }`}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              {option.key === 'unread' || option.key === 'archived' ? (
                <span>{count}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {actionState.error ? (
        <div className={styles.actionError} role="alert">
          {actionState.error}
        </div>
      ) : null}
      {actionState.helperMessage ? (
        <div className={styles.helperMessage} aria-live="polite">
          {actionState.helperMessage}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className={styles.messageEmptyState} role="alert">
          <Mail aria-hidden="true" />
          <strong>Messages could not load</strong>
          <span>Try again to reconnect to your inbox.</span>
          <button type="button" className={styles.actionButton} onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : state.status === 'ready' && state.inbox ? (
        <div className={styles.messageList}>
          {visibleMessages.length > 0 ? (
            visibleMessages.map((message) => {
              const deliveryId = message.deliveryId || message.id
              const category = getMessageCategory(message)
              const categoryLabel =
                MESSAGE_CATEGORY_LABELS[category] ||
                MESSAGE_TYPE_LABELS[message.messageType ?? ''] ||
                'Update'
              const priorityLabel = message.priority
                ? MESSAGE_PRIORITY_LABELS[message.priority]
                : null
              const actionUrl = getSafeMessageActionUrl(message.actionUrl)
              const actionPending =
                actionState.pendingKey?.endsWith(`:${deliveryId}`) ?? false
              const title =
                message.title ||
                message.subject ||
                MESSAGE_TYPE_LABELS[message.messageType ?? ''] ||
                'Sparkle Suite update'
              const messageDate = message.deliveredAt || message.createdAt || null

              return (
                <article
                  key={deliveryId}
                  className={`${styles.messageCard} ${
                    message.isRead ? styles.messageCardRead : styles.messageCardUnread
                  }`}
                  aria-label={`${message.isRead ? 'Read' : 'Unread'} message: ${title}`}
                >
                  <div className={styles.messageCardAccent} aria-hidden="true" />
                  <div className={styles.messageCardBody}>
                    <div className={styles.messageMetadata}>
                      {!message.isRead ? (
                        <span className={styles.messageUnreadDot}>New</span>
                      ) : null}
                      <span className={styles.messageCategoryBadge}>{categoryLabel}</span>
                      {priorityLabel ? (
                        <span
                          className={`${styles.messagePriorityBadge} ${
                            message.priority === 'action_required'
                              ? styles.messagePriorityBadgeAction
                              : ''
                          }`}
                        >
                          {priorityLabel}
                        </span>
                      ) : null}
                      <time dateTime={messageDate ?? undefined}>
                        {formatCompactDateTime(messageDate)}
                      </time>
                    </div>
                    <h2 className={styles.messageTitle}>{title}</h2>
                    {message.summary ? (
                      <p className={styles.messageSummary}>{message.summary}</p>
                    ) : null}
                    {typeof message.body !== 'string' || message.body !== message.summary ? (
                      <MessageBodyContent body={message.body} />
                    ) : null}
                    {actionUrl ? (
                      actionUrl.startsWith('/') ? (
                        <Link className={styles.messageActionLink} href={actionUrl}>
                          {message.actionLabel || 'Open update'}
                          <ChevronRight aria-hidden="true" />
                        </Link>
                      ) : (
                        <a
                          className={styles.messageActionLink}
                          href={actionUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {message.actionLabel || 'Open update'}
                          <ExternalLink aria-hidden="true" />
                        </a>
                      )
                    ) : null}
                  </div>
                  <div className={styles.messageCardActions}>
                    <button
                      type="button"
                      className={styles.messageSecondaryAction}
                      disabled={actionPending || actionState.pendingKey === 'read:all'}
                      onClick={() =>
                        onUpdateMessage(message, { read: !message.isRead })
                      }
                    >
                      {actionPending
                        ? 'Saving…'
                        : message.isRead
                          ? 'Mark unread'
                          : 'Mark read'}
                    </button>
                    <button
                      type="button"
                      className={styles.messageSecondaryAction}
                      disabled={actionPending || actionState.pendingKey === 'read:all'}
                      onClick={() =>
                        onUpdateMessage(message, { archived: !message.archivedAt })
                      }
                    >
                      {message.archivedAt ? 'Return to inbox' : 'Archive'}
                    </button>
                  </div>
                </article>
              )
            })
          ) : (
            <div className={styles.messageEmptyState}>
              <Mail aria-hidden="true" />
              <strong>
                {filter === 'all'
                  ? 'Your inbox is clear'
                  : `No ${filter} messages`}
              </strong>
              <span>
                {filter === 'archived'
                  ? 'Messages you archive will stay available here.'
                  : 'New Sparkle Suite messages will appear here when they arrive.'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.messageLoadingState} aria-label="Loading Message Center">
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
          <div className={styles.loadingLine} />
        </div>
      )}
    </section>
  )
}

function getResourcesByType(
  resources: HelpResource[] | undefined,
  type: HelpResource['type'],
) {
  return resources?.filter((resource) => resource.type === type) ?? []
}

function getWorkflowResourcesByGroup(resources: HelpResource[] | undefined) {
  const workflows = getResourcesByType(resources, 'workflow')

  return HELP_RESOURCE_GROUP_ORDER.map((group) => ({
    group,
    resources: workflows.filter((resource) => resource.group === group),
  })).filter((section) => section.resources.length > 0)
}

export function HelpResourcesCard({
  state,
  hasPaidWorkspace: _hasPaidWorkspace,
  initialTab = 'help',
  learningContent,
  onContactSupport,
}: {
  state: ResourcesState
  hasPaidWorkspace: boolean
  initialTab?: 'learn' | 'help'
  learningContent?: ReactNode
  onContactSupport?: () => void
}) {
  const [activeResourceTab, setActiveResourceTab] = useState<'learn' | 'help'>(
    learningContent && initialTab === 'learn' ? 'learn' : 'help',
  )
  const hasLearningContent = Boolean(learningContent)
  const workflowGroups = getWorkflowResourcesByGroup(state.resources)
  const featureReferences = getResourcesByType(state.resources, 'feature_reference')
    .filter((resource) => resource.group === 'Feature Index')

  return (
    <div className={styles.workspacePanel}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>
            {hasLearningContent ? 'Resources' : 'Help & Resources'}
          </div>
          <div className={styles.cardSubtitle}>
            {hasLearningContent
              ? 'Watch a quick how-to, read a blog, or open a step-by-step guide.'
              : 'Pick what you are trying to do. Nic-Nac can walk you through the steps when you want help.'}
          </div>
        </div>
      </div>
      {hasLearningContent ? (
        <div className={styles.resourceHubTabs} role="tablist" aria-label="Resources">
          <button
            type="button"
            role="tab"
            aria-selected={activeResourceTab === 'learn'}
            className={
              activeResourceTab === 'learn'
                ? styles.resourceHubTabActive
                : styles.resourceHubTab
            }
            onClick={() => setActiveResourceTab('learn')}
          >
            Learn
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeResourceTab === 'help'}
            className={
              activeResourceTab === 'help'
                ? styles.resourceHubTabActive
                : styles.resourceHubTab
            }
            onClick={() => setActiveResourceTab('help')}
          >
            Help
          </button>
        </div>
      ) : null}
      {hasLearningContent && activeResourceTab === 'learn' ? (
        <div role="tabpanel" aria-label="Learn resources">
          {learningContent}
        </div>
      ) : (
        <>
          {state.status === 'ready' && state.resources ? (
            <div className={styles.playbookStack}>
              <div className={styles.playbookIntro}>
                <div>
                  <div className={styles.walletSettingsTitle}>Workflow Playbook</div>
                  <div className={styles.helperNote}>
                    Start with the outcome, then follow the same simple recipe every time.
                  </div>
                </div>
                <span className={styles.rosterTag}>Start here</span>
              </div>

              <details className={styles.playbookGroup} open>
                <summary className={styles.playbookGroupSummary}>
                  <span className={styles.disclosureChevron} aria-hidden="true">&gt;</span>
                  <span className={styles.playbookSummaryCopy}>
                    <span className={styles.customerName}>Using the Message Center</span>
                    <span className={styles.helperNote}>
                      Your one place for team conversations, rep connections, Support, and official updates.
                    </span>
                  </span>
                  <span className={styles.rosterTag}>Open guide</span>
                </summary>
                <div className={styles.playbookGuideBody}>
                  <div className={styles.guideField}>
                    <span className={styles.searchLabel}>Where to find it</span>
                    <p>
                      Select <strong>Messages</strong> at the top of your Workspace. You can also find
                      Message Center in Tools.
                    </p>
                  </div>
                  <div className={styles.guideField}>
                    <span className={styles.searchLabel}>Choose the view you need</span>
                    <ul>
                      <li><strong>All</strong> keeps everything together in one inbox.</li>
                      <li><strong>Team</strong> holds team and New Rep Onboarding conversations.</li>
                      <li><strong>Rep Network</strong> holds approved rep connections and message requests.</li>
                      <li><strong>Support</strong> keeps your questions, problems, ideas, replies, and status updates together.</li>
                      <li><strong>Sparkle Suite</strong> holds verified official updates. Those announcements are read-only.</li>
                      <li><strong>Archived</strong> keeps conversations you have set aside without losing them.</li>
                    </ul>
                  </div>
                  <div className={styles.guideField}>
                    <span className={styles.searchLabel}>Start or continue a conversation</span>
                    <p>
                      Open a message to read it. Reply controls appear only when that conversation allows a reply.
                      Select <strong>New message</strong> to message your team, request a connection with another eligible
                      Sparkle Suite rep, or contact Sparkle Suite Support.
                    </p>
                  </div>
                  <div className={styles.guideField}>
                    <span className={styles.searchLabel}>When you need Support</span>
                    <p>
                      Choose Support for a question, something that is not working, or an idea for Sparkle Suite.
                      The conversation stays in one thread so you can see the reply and current status in the same place.
                    </p>
                  </div>
                </div>
              </details>

              {workflowGroups.map((section) => (
                <details key={section.group} className={styles.playbookGroup}>
                  <summary className={styles.playbookGroupSummary}>
                    <span className={styles.disclosureChevron} aria-hidden="true">&gt;</span>
                    <span className={styles.playbookSummaryCopy}>
                      <span className={styles.customerName}>{section.group}</span>
                      <span className={styles.helperNote}>
                        {section.resources.length} guides
                      </span>
                    </span>
                    <span className={styles.rosterTag}>Open section</span>
                  </summary>
                  <div className={styles.playbookGuideList}>
                    {section.resources.map((resource) => (
                      <details key={resource.id} className={styles.playbookGuide}>
                        <summary className={styles.playbookGuideSummary}>
                          <span>
                            <span className={styles.customerName}>{resource.title}</span>
                            <span className={styles.helperNote}>{resource.summary}</span>
                          </span>
                          <span className={styles.rosterTag}>Open guide</span>
                        </summary>
                        <div className={styles.playbookGuideBody}>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Goal</span>
                            <p>{resource.goal}</p>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Use this when</span>
                            <p>{resource.useWhen}</p>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Before you start</span>
                            <ul>
                              {resource.beforeYouStart.map((item) => (
                                <li key={`${resource.id}-before-${item}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Steps</span>
                            <ol>
                              {resource.steps.map((step) => (
                                <li key={`${resource.id}-step-${step}`}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Good result</span>
                            <p>{resource.goodResult}</p>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Ask Nic-Nac</span>
                            <p>{resource.nicNacPrompt}</p>
                          </div>
                          <div className={styles.guideField}>
                            <span className={styles.searchLabel}>Still stuck</span>
                            <p>{resource.stillStuck}</p>
                          </div>
                          {resource.video ? (
                            <div className={styles.timelineList}>
                              <span className={styles.timelineItem}>
                                Video: {resource.video.title}
                              </span>
                              <span className={styles.timelineItem}>
                                {resource.video.status === 'ready'
                                  ? 'Ready to watch'
                                  : 'Video slot ready'}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}

              <details className={styles.featureIndex}>
                <summary className={styles.playbookGroupSummary}>
                  <span className={styles.disclosureChevron} aria-hidden="true">&gt;</span>
                  <div>
                    <div className={styles.walletSettingsTitle}>Feature Index</div>
                    <div className={styles.helperNote}>
                      Use this when you already know which Sparkle Suite tool you need.
                    </div>
                  </div>
                  <span className={styles.rosterTag}>Open section</span>
                </summary>
                <div className={styles.featureIndexGrid}>
                  {featureReferences.map((resource) => (
                    <div key={resource.id} className={styles.featureIndexItem}>
                      <div className={styles.customerName}>{resource.title}</div>
                      <div className={styles.helperNote}>{resource.summary}</div>
                    </div>
                  ))}
                </div>
              </details>

              <details className={styles.supportPath} open>
                <summary className={styles.playbookGroupSummary}>
                  <span className={styles.disclosureChevron} aria-hidden="true">&gt;</span>
                  <div>
                    <div className={styles.walletSettingsTitle}>Support Path</div>
                    <div className={styles.helperNote}>
                      Use the guides when you want a walkthrough. If something
                      feels broken, confusing, or worth improving, contact
                      Sparkle Suite Support in Messages.
                    </div>
                  </div>
                  <span className={styles.rosterTag}>Open section</span>
                </summary>
                <div className={styles.supportReportCallout}>
                  <div>
                    <div className={styles.walletSettingsTitle}>
                      Still need help?
                    </div>
                    <div className={styles.helperNote}>
                      Ask a question, report a problem, or share an idea in the
                      Message Center. Your reply and its status stay together.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={onContactSupport}
                  >
                    Contact Sparkle Suite Support
                  </button>
                </div>
              </details>
            </div>
          ) : state.status === 'error' ? (
            <div className={styles.playbookStack}>
              <div className={styles.emptyState}>
                Help resources are temporarily unavailable.
              </div>
              <div className={styles.supportReportCallout}>
                <div>
                  <div className={styles.walletSettingsTitle}>Still need help?</div>
                  <div className={styles.helperNote}>
                    Message Sparkle Suite Support even while the guides are unavailable.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={onContactSupport}
                >
                  Contact Sparkle Suite Support
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.cardFill}>
              <div className={styles.loadingLine} />
              <div className={styles.loadingLineShort} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SiteAnalyticsCard({ state }: { state: AnalyticsState }) {
  if (state.status === 'error') {
    return (
      <div className={styles.workspacePanel}>
        <div className={styles.emptyState}>
          Site analytics are temporarily unavailable.
        </div>
      </div>
    )
  }

  if (state.status !== 'ready' || !state.analytics) {
    return (
      <div className={styles.workspacePanel}>
        <div className={styles.cardFill}>
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.workspacePanel}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Site analytics</div>
          <div className={styles.cardSubtitle}>
            PostHog-ready traffic slot plus a local operating snapshot.
          </div>
        </div>
        <span className={styles.rosterTag}>
          {state.analytics.configured ? 'PostHog configured' : 'Awaiting PostHog keys'}
        </span>
      </div>
      {!state.analytics.configured ? (
        <div className={styles.helperNote}>
          Traffic charts will light up after PostHog keys are present in the environment. Privacy is already locked to no early identity linking and masked sensitive inputs.
        </div>
      ) : null}
      <div className={styles.metricGrid}>
        <div className={styles.metricBlock}>
              <span className={styles.metricLabel}>Active dancers</span>
          <span className={styles.metricValue}>
            {state.analytics.operationalSnapshot.activeListings}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Pending requests</span>
          <span className={styles.metricValue}>
            {state.analytics.operationalSnapshot.pendingRequests}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Upcoming shows</span>
          <span className={styles.metricValue}>
            {state.analytics.operationalSnapshot.upcomingShows}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Reachable customers</span>
          <span className={styles.metricValue}>
            {state.analytics.operationalSnapshot.reachableCustomers}
          </span>
        </div>
      </div>
      <div className={styles.timelineList}>
        <span className={styles.timelineItem}>
          Disable IP capture: {state.analytics.privacy.disablesIpCapture ? 'Yes' : 'No'}
        </span>
        <span className={styles.timelineItem}>
          Mask sensitive inputs: {state.analytics.privacy.masksSensitiveInputs ? 'Yes' : 'No'}
        </span>
        <span className={styles.timelineItem}>
          Identify after login only: {state.analytics.privacy.identifiesAfterLoginOnly ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  )
}

export function SiteSettingsCard({
  state,
  draft,
  actionState,
  hasUnsavedChanges = false,
  statusMessage,
  onDraftChange,
  onSocialHandleChange,
  onHomepageMediaChange,
  onHomepageMediaUpload,
  mediaUploadKey,
  mediaUploadFeedback,
  isBrittWithBling = false,
  canPreview,
  onPreview,
  onWriteAboutNarrative,
  onSave,
}: {
  state: SiteSettingsState
  draft?: SiteSettingsDraft | null
  actionState?: SiteSettingsActionState
  hasUnsavedChanges?: boolean
  statusMessage?: string | null
  onDraftChange?: (patch: Partial<SiteSettingsDraft>) => void
  onSocialHandleChange?: (platform: string, value: string) => void
  onHomepageMediaChange?: (
    key: PublicSiteMediaSlotKey,
    patch: Partial<NonNullable<SiteSettingsDraft['homepageMediaSlots']>[number]>,
  ) => void
  onHomepageMediaUpload?: (
    key: PublicSiteMediaSlotKey,
    file: File,
  ) => void
  mediaUploadKey?: PublicSiteMediaSlotKey | null
  mediaUploadFeedback?: {
    key: PublicSiteMediaSlotKey
    message: string
    tone: 'error' | 'success'
  } | null
  isBrittWithBling?: boolean
  canPreview?: boolean
  onPreview?: () => void
  onWriteAboutNarrative?: () => void
  onSave?: () => void
}) {
  const tickerTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [tickerLinkUrl, setTickerLinkUrl] = useState('')
  const [tickerLinkError, setTickerLinkError] = useState<string | null>(null)
  const [tickerLinkSelection, setTickerLinkSelection] = useState<{
    start: number
    end: number
    text: string
  } | null>(null)

  const addTickerText = (value: string) => {
    if (!onDraftChange) return
    const currentValue = draft?.tickerText ?? ''
    const textarea = tickerTextareaRef.current
    const start = textarea?.selectionStart ?? currentValue.length
    const end = textarea?.selectionEnd ?? start
    const prefix = currentValue.slice(0, start)
    const suffix = currentValue.slice(end)
    onDraftChange({ tickerText: `${prefix}${value}${suffix}` })
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + value.length, start + value.length)
    })
  }

  const linkSelectedTickerWords = () => {
    const currentValue = draft?.tickerText ?? ''
    const selection = tickerLinkSelection
    if (!selection || !selection.text.trim()) {
      setTickerLinkError('First highlight the exact words you want customers to click.')
      return
    }
    const nextTickerText = createTickerLinkFromSelection({
      tickerText: currentValue,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      destination: tickerLinkUrl,
    })
    if (nextTickerText) {
      const linkedTextLength = nextTickerText.length - currentValue.length + selection.text.length
      onDraftChange?.({ tickerText: nextTickerText })
      setTickerLinkUrl('')
      setTickerLinkError(null)
      setTickerLinkSelection(null)
      window.requestAnimationFrame(() => {
        tickerTextareaRef.current?.focus()
        tickerTextareaRef.current?.setSelectionRange(
          selection.start + linkedTextLength,
          selection.start + linkedTextLength,
        )
      })
      return
    }
    setTickerLinkError('Use a complete https:// or http:// link.')
  }

  const resetTickerLinksToPlainText = () => {
    const currentValue = draft?.tickerText ?? ''
    const plainText = makeTickerLinksPlainText(currentValue)
    onDraftChange?.({ tickerText: plainText })
    setTickerLinkSelection(null)
    setTickerLinkUrl('')
    setTickerLinkError(null)
    window.requestAnimationFrame(() => tickerTextareaRef.current?.focus())
  }

  const hasTickerLinks = /\[[^\]]+\]\([^()\s]+\)/.test(draft?.tickerText ?? '')

  if (state.status === 'error') {
    return (
      <div className={styles.rosterFallback}>
        Site settings will appear here once your public profile data loads.
      </div>
    )
  }

  if (state.status !== 'ready' || !state.settings || !draft) {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const aboutPortraitSlot = (draft.homepageMediaSlots ?? []).find(
    (slot) => slot.key === 'about_1',
  )

  return (
    <div className={styles.siteSettingsCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Customer-facing site setup</div>
          <div className={styles.cardSubtitle}>
            Keep your public profile, customer pages, and brand details tuned up.
          </div>
        </div>
        <div className={styles.siteSettingsSaveActions}>
          <span
            className={styles.siteSettingsSaveStatus}
            data-testid="site-settings-save-status"
            role="status"
            aria-live="polite"
          >
            {statusMessage ?? 'No unsaved changes.'}
          </span>
          <button
            type="button"
            className={styles.siteSettingsPreviewButton}
            onClick={onPreview}
            disabled={!canPreview}
          >
            Preview customer site
          </button>
          <button
            type="button"
            className={styles.siteSettingsSaveButton}
            onClick={onSave}
            disabled={actionState?.pending || !hasUnsavedChanges}
          >
            {actionState?.pending ? 'Saving...' : 'Save site settings'}
          </button>
        </div>
      </div>
      <div className={styles.calendarHeader}>
        <div className={styles.walletSettingsTitle}>Profile basics</div>
        <span className={styles.rosterTag}>
          Update what shoppers and recruits see across your public pages.
        </span>
      </div>
      <div className={styles.siteSettingsGrid}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Display name</span>
          <input
            className={styles.searchInput}
            value={draft.displayName}
            onChange={(event) =>
              onDraftChange?.({ displayName: event.target.value })
            }
          />
        </label>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Show name</span>
          <input
            className={styles.searchInput}
            value={draft.businessName}
            onChange={(event) =>
              onDraftChange?.({ businessName: event.target.value })
            }
          />
        </label>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Email</span>
          <input
            className={styles.searchInput}
            value={draft.email}
            onChange={(event) => onDraftChange?.({ email: event.target.value })}
          />
        </label>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Bomb Party rep store link</span>
          <input
            className={styles.searchInput}
            type="url"
            inputMode="url"
            value={draft.shopLink ?? ''}
            onChange={(event) => onDraftChange?.({ shopLink: event.target.value })}
            placeholder="https://bombparty.com/..."
          />
          <span className={styles.helperNote}>
            This powers the Shop buttons across your customer-facing site. Use the full store URL.
          </span>
        </label>
      </div>

      <div className={styles.siteSettingsSection}>
        <div className={styles.walletSettingsTitle}>Announcement ticker and Join Team page</div>
        <div className={styles.siteSettingsGrid}>
          <label className={styles.sortFieldWide}>
            <span className={styles.searchLabel}>Announcement ticker messages</span>
            <textarea
              ref={tickerTextareaRef}
              className={styles.siteSettingsTextarea}
              value={draft.tickerText}
              onChange={(event) => {
                setTickerLinkSelection(null)
                onDraftChange?.({ tickerText: event.target.value })
              }}
              onSelect={(event) => {
                const textarea = event.currentTarget
                const start = textarea.selectionStart
                const end = textarea.selectionEnd
                setTickerLinkSelection(
                  start === end
                    ? null
                    : { start, end, text: textarea.value.slice(start, end) },
                )
                setTickerLinkError(null)
              }}
            />
            <span className={styles.helperNote}>
              Use one announcement per line. Add emojis, then highlight only the words you want to link.
            </span>
            <div className={styles.tickerComposer}>
              <div>
                <span className={styles.searchLabel}>Add an emoji</span>
                <div className={styles.tickerEmojiRow}>
                  {['✨', '💎', '🎥', '🛍️', '🎉', '📣', '⏰', '💖'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={styles.tickerEmojiButton}
                      onClick={() => addTickerText(emoji)}
                      aria-label={`Add ${emoji} to the announcement ticker`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={styles.searchLabel}>Link selected words</span>
                <span className={styles.tickerLinkHint}>
                  {tickerLinkSelection?.text.trim()
                    ? `Ready to link: “${tickerLinkSelection.text}”`
                    : 'Highlight the exact words in your announcement first.'}
                </span>
                <div className={styles.tickerLinkBuilder}>
                  <input
                    className={styles.searchInput}
                    type="url"
                    value={tickerLinkUrl}
                    onChange={(event) => setTickerLinkUrl(event.target.value)}
                    placeholder="Paste the destination link"
                  />
                  <button
                    type="button"
                    className={styles.tickerLinkButton}
                    onClick={linkSelectedTickerWords}
                    disabled={!tickerLinkSelection?.text.trim() || !tickerLinkUrl.trim()}
                  >
                    Link selected words
                  </button>
                </div>
                {hasTickerLinks ? (
                  <button
                    type="button"
                    className={styles.tickerLinkResetButton}
                    onClick={resetTickerLinksToPlainText}
                  >
                    Make existing links plain text
                  </button>
                ) : null}
                {hasTickerLinks ? (
                  <span className={styles.tickerLinkHint}>
                    This fixes an older ticker link that made a whole message clickable. Your words stay; only the old link is removed.
                  </span>
                ) : null}
                {tickerLinkError ? <span className={styles.tickerLinkError}>{tickerLinkError}</span> : null}
              </div>
            </div>
          </label>
        </div>
        <div className={styles.siteSettingsToggleGrid}>
          <label className={styles.walletToggleRow}>
            <span className={styles.searchLabel}>Show announcement ticker on your public site</span>
            <input
              type="checkbox"
              checked={draft.tickerVisible}
              onChange={(event) =>
                onDraftChange?.({ tickerVisible: event.target.checked })
              }
            />
          </label>
          {state.status === 'ready' && state.settings?.joinTeamAccessEnabled ? (
            <label className={styles.walletToggleRow}>
              <span className={styles.searchLabel}>
                Show the “Join My Team” recruiting page on your public site
              </span>
              <input
                type="checkbox"
                checked={draft.showJoinPage}
                onChange={(event) =>
                  onDraftChange?.({ showJoinPage: event.target.checked })
                }
              />
            </label>
          ) : (
            <div className={styles.helperNote} role="status">
              <strong>Join Team: Coming soon.</strong> This recruiting page is
              currently available only to selected early-access team leaders.
            </div>
          )}
        </div>
      </div>

      <div className={styles.siteSettingsSection}>
        <div className={styles.walletSettingsTitle}>Branding and visuals</div>
        <div className={styles.siteSettingsGrid}>
          <label className={styles.sortFieldWide}>
            <span className={styles.sortLabel}>Customer-facing site theme</span>
            <select
              className={styles.sortSelect}
              value={draft.appearancePreset}
              onChange={(event) =>
                onDraftChange?.({
                  appearancePreset: event.target.value as SiteAppearancePreset,
                })
              }
            >
              {SITE_APPEARANCE_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className={styles.siteSettingsPreviewNote}>
              Applies only to your public customer-facing site. Your Sparkle
              Suite workspace keeps the standard workspace theme.
            </span>
          </label>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Team I manage</span>
            <input
              className={styles.searchInput}
              value={draft.teamName}
              onChange={(event) =>
                onDraftChange?.({ teamName: event.target.value })
              }
            />
          </label>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Team I belong to</span>
            <input
              className={styles.searchInput}
              value={draft.memberTeamName}
              onChange={(event) =>
                onDraftChange?.({ memberTeamName: event.target.value })
              }
            />
          </label>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Site tagline</span>
            <input
              className={styles.searchInput}
              value={draft.tagline}
              onChange={(event) =>
                onDraftChange?.({ tagline: event.target.value })
              }
            />
          </label>
          <label className={styles.sortFieldWide}>
            <span className={styles.searchLabel}>Hero title</span>
            <input className={styles.searchInput} value={draft.heroHeadline ?? ''} maxLength={180} onChange={(event) => onDraftChange?.({ heroHeadline: event.target.value })} />
            <span className={styles.siteSettingsPreviewNote}>This is the large heading customers see first on your homepage.</span>
          </label>
          <label className={styles.sortFieldWide}>
            <span className={styles.searchLabel}>Hero subtitle</span>
            <input className={styles.searchInput} value={draft.heroSubtitle ?? ''} maxLength={240} onChange={(event) => onDraftChange?.({ heroSubtitle: event.target.value })} />
            <span className={styles.siteSettingsPreviewNote}>This supporting sentence appears directly beneath the hero title.</span>
          </label>
          <label className={styles.sortField}>
            <span className={styles.sortLabel}>Hero motion</span>
            <select
              className={styles.sortSelect}
              value={draft.heroAnimationType}
              onChange={(event) =>
                onDraftChange?.({
                  heroAnimationType: event.target.value as SiteSettingsDashboardResult['heroAnimationType'],
                })
              }
            >
              <option value="sparkle_rise">Sparkle rise</option>
              <option value="soft_glow">Soft glow</option>
              <option value="still">Still</option>
            </select>
            <span className={styles.siteSettingsPreviewNote}>
              Hero visuals stay curated by your site appearance so the page keeps
              its polish on desktop and mobile.
            </span>
          </label>
        </div>
      </div>

      <div className={styles.siteSettingsSection}>
        <div>
          <div className={styles.walletSettingsTitle}>
            {isBrittWithBling ? 'Brittany custom media' : 'Homepage photos and videos'}
          </div>
          <p className={styles.siteSettingsPreviewNote}>
            {isBrittWithBling
              ? 'Manage the changeable media on Britt with Bling. Your theme and all standard site settings remain available above.'
              : 'Add one clean portrait photo and up to four customer videos.'}
          </p>
          {isBrittWithBling ? (
            <p className={styles.siteSettingsPreviewNote}>
              Hero and “The Rise of Her” stay managed for this custom site.
            </p>
          ) : null}
        </div>
        {isBrittWithBling ? (
          <label className={styles.walletToggleRow}>
            <span>
              <span className={styles.searchLabel}>
                Show the About Brittany and Sparkle Moments section
              </span>
              <span className={styles.helperNote}>
                Empty video spots stay hidden. Turn this off without deleting any saved media.
              </span>
            </span>
            <input
              type="checkbox"
              checked={aboutPortraitSlot?.sectionVisible === true}
              onChange={(event) =>
                onHomepageMediaChange?.('about_1', {
                  sectionVisible: event.target.checked,
                })
              }
            />
          </label>
        ) : null}
        <div className={styles.homepageMediaGrid}>
          <aside className={styles.homepageMediaHelp} aria-label="Video links and embeds">
            <strong>Video links and embeds</strong>
            <p>
              Use a public TikTok, YouTube Short, Instagram Reel, or Facebook Reel/video.
              Paste its link or the platform&apos;s embed code into the video spot you want.
              TikTok and YouTube play muted, loop, and do not show a pause control.
              Instagram and Facebook use their native player controls.
            </p>
          </aside>
          {(draft.homepageMediaSlots ?? EMPTY_HOMEPAGE_MEDIA_SLOTS).map((slot) => {
            const label =
              slot.key === 'showcase'
                ? isBrittWithBling
                  ? 'What is a Bomb Party? showcase video'
                  : 'Showcase video'
                : slot.key === 'about_1'
                  ? isBrittWithBling
                    ? 'About Brittany portrait'
                    : 'About portrait photo'
                  : isBrittWithBling
                    ? `Sparkle moment ${Number(slot.key.slice(-1)) - 1}`
                    : `About short video ${Number(slot.key.slice(-1)) - 1}`
            const allowsPhoto = slot.key === 'about_1'
            const allowsVideo = slot.key !== 'about_1'
            const isUploading = mediaUploadKey === slot.key
            const hasVisiblePhoto =
              allowsPhoto && Boolean(slot.imageUrl) && slot.isVisible !== false
            const hasVisibleVideo =
              allowsVideo &&
              Boolean(normalizeSupportedPublicVideoUrl(slot.videoUrl)) &&
              slot.isVisible !== false

            return (
              <section
                className={`${styles.homepageMediaCard} ${
                  allowsPhoto
                    ? styles.homepagePortraitMediaCard
                    : styles.homepageVideoMediaCard
                }`}
                key={slot.key}
              >
                <div className={styles.homepageMediaCardHeader}>
                  <strong>{label}</strong>
                  {hasVisiblePhoto ? <span>Photo added</span> : null}
                  {isBrittWithBling && hasVisibleVideo ? <span>Video added</span> : null}
                  {isBrittWithBling && slot.isVisible === false ? <span>Removed</span> : null}
                </div>
                {hasVisiblePhoto ? (
                  <div className={styles.homepagePortraitFramePreview}>
                    <img
                      className={styles.homepageMediaPreview}
                      src={slot.imageUrl}
                      alt={`${label} preview`}
                      style={{
                        '--homepage-portrait-focus-x': `${slot.portraitFocusX ?? 50}%`,
                        '--homepage-portrait-focus-y': `${slot.portraitFocusY ?? 20}%`,
                        '--homepage-portrait-zoom': slot.portraitZoom ?? 1.18,
                      } as CSSProperties}
                    />
                  </div>
                ) : null}
                {allowsPhoto ? (
                  <label className={styles.homepageMediaUploadButton}>
                    {isUploading
                      ? 'Uploading...'
                      : slot.imageUrl
                        ? 'Replace photo'
                        : 'Upload photo'}
                    <input
                      className={styles.homepageMediaFileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) onHomepageMediaUpload?.(slot.key, file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                ) : null}
                {mediaUploadFeedback?.key === slot.key ? (
                  <p
                    className={
                      mediaUploadFeedback.tone === 'success'
                        ? styles.homepageMediaUploadSuccess
                        : styles.homepageMediaUploadError
                    }
                    role="status"
                  >
                    {mediaUploadFeedback.message}
                  </p>
                ) : null}
                {allowsVideo ? (
                  <label className={styles.searchField}>
                    <span className={styles.searchLabel}>
                      Video link or embed
                    </span>
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Paste a public video link or embed code"
                      value={slot.videoUrl}
                      onChange={(event) => {
                        const videoUrl = event.target.value
                        onHomepageMediaChange?.(slot.key, {
                          videoUrl,
                          caption: '',
                          ...(isBrittWithBling
                            ? { isVisible: Boolean(videoUrl.trim()) }
                            : {}),
                        })
                      }}
                    />
                  </label>
                ) : null}
                {isBrittWithBling && hasVisibleVideo ? (
                  <div className={styles.homepageMediaCurrentState}>
                    <span>Current video is ready.</span>
                    <a href={slot.videoUrl} target="_blank" rel="noreferrer noopener">
                      Open video
                    </a>
                  </div>
                ) : null}
                {isBrittWithBling &&
                allowsVideo &&
                slot.isVisible !== false &&
                slot.videoUrl.trim() &&
                !hasVisibleVideo ? (
                  <p className={styles.homepageMediaUploadError} role="status">
                    This link is not a playable public video. Replace it before saving.
                  </p>
                ) : null}
                {hasVisiblePhoto ? (
                  <fieldset className={styles.homepagePortraitControls}>
                    <legend>Smart Frame</legend>
                    <span>Fine-tune only if the automatic preview needs it.</span>
                    <label>
                      <span>Zoom</span>
                      <input
                        type="range"
                        min="1"
                        max="1.5"
                        step="0.01"
                        value={slot.portraitZoom ?? 1.18}
                        onChange={(event) =>
                          onHomepageMediaChange?.(slot.key, {
                            portraitZoom: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Move subject up or down</span>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={slot.portraitFocusY ?? 20}
                        onChange={(event) =>
                          onHomepageMediaChange?.(slot.key, {
                            portraitFocusY: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Move subject left or right</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={slot.portraitFocusX ?? 50}
                        onChange={(event) =>
                          onHomepageMediaChange?.(slot.key, {
                            portraitFocusX: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </fieldset>
                ) : null}
                {allowsPhoto ? (
                  <label className={styles.searchField}>
                    <span className={styles.searchLabel}>Photo caption</span>
                    <input
                      className={styles.searchInput}
                      maxLength={240}
                      value={slot.caption}
                      onChange={(event) =>
                        onHomepageMediaChange?.(slot.key, { caption: event.target.value })
                      }
                    />
                  </label>
                ) : null}
                {hasVisiblePhoto ? (
                  <button
                    type="button"
                    className={styles.homepageMediaRemoveButton}
                    onClick={() =>
                      onHomepageMediaChange?.(slot.key, {
                        imageUrl: '',
                        ...(isBrittWithBling ? { isVisible: false } : {}),
                      })
                    }
                  >
                    Remove photo
                  </button>
                ) : null}
                {isBrittWithBling && hasVisibleVideo ? (
                  <button
                    type="button"
                    className={styles.homepageMediaRemoveButton}
                    onClick={() =>
                      onHomepageMediaChange?.(slot.key, {
                        videoUrl: '',
                        isVisible: false,
                      })
                    }
                  >
                    Remove video
                  </button>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>

      <div className={styles.siteSettingsSection}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.walletSettingsTitle}>About section narrative</div>
            <p className={styles.siteSettingsPreviewNote}>
              Build this with Nic-Nac: share your story, refine a few options
              together, then approve the one that feels right. Nic-Nac publishes
              the approved narrative directly to your customer-facing site.
            </p>
          </div>
          <button
            type="button"
            className={styles.previewSiteButton}
            onClick={onWriteAboutNarrative}
          >
            Write with Nic-Nac
          </button>
        </div>
      </div>

      <div className={styles.siteSettingsSection}>
        <div className={styles.walletSettingsTitle}>Social handles</div>
        <div className={styles.siteSettingsGrid}>
          {SOCIAL_HANDLE_FIELDS.map((field) => (
            <label key={field.key} className={styles.searchField}>
              <span className={styles.searchLabel}>{field.label}</span>
              <input
                className={styles.searchInput}
                value={draft.socialHandles[field.key] ?? ''}
                onChange={(event) =>
                  onSocialHandleChange?.(field.key, event.target.value)
                }
              />
            </label>
          ))}
        </div>
      </div>

      {actionState?.error ? (
        <div className={styles.actionError}>{actionState.error}</div>
      ) : null}
    </div>
  )
}

export function RecipesCard({
  state,
  draft,
  actionState,
  activeTab: controlledActiveTab,
  initialEditorMode = 'builder',
  initialTab,
  statusMessage,
  onActiveTabChange,
  onDraftChange,
  onSelectRecipe,
  onNewRecipe,
  onSave,
  onRemove,
  onUploadImage,
  onBuildDraft,
}: {
  state: RecipesState
  draft: RecipeDraft
  actionState?: RecipeActionState
  activeTab?: RecipeEditorTab
  initialEditorMode?: RecipeEditorMode
  initialTab?: RecipeEditorTab
  statusMessage?: string | null
  onActiveTabChange?: (tab: RecipeEditorTab) => void
  onDraftChange?: (patch: Partial<RecipeDraft>) => void
  onSelectRecipe?: (recipeId: string) => void
  onNewRecipe?: () => void
  onSave?: () => void
  onRemove?: (recipeId: string) => void
  onUploadImage?: (
    field: 'imageUrl' | 'modalImageUrl' | 'recipeCardImageUrls',
    file: File | null,
  ) => Promise<void> | void
  onBuildDraft?: () => void
}) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<RecipeEditorTab>(
    initialTab ?? (initialEditorMode === 'manual' ? 'edit' : 'current'),
  )
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab
  const [isRemovalConfirmationVisible, setIsRemovalConfirmationVisible] =
    useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{
    tab: RecipeEditorTab
    recipeId?: string
  } | null>(null)
  const [auditedRecipeIds, setAuditedRecipeIds] = useState<string[]>([])
  const [hasLoadedRecipeAudit, setHasLoadedRecipeAudit] = useState(false)

  useEffect(() => {
    try {
      const storedAudit = window.localStorage.getItem(RECIPE_AUDIT_STORAGE_KEY)
      const parsedAudit = storedAudit ? JSON.parse(storedAudit) : []
      if (Array.isArray(parsedAudit)) {
        setAuditedRecipeIds(
          parsedAudit.filter((recipeId): recipeId is string => typeof recipeId === 'string'),
        )
      }
    } catch {
      // A temporary audit aid should never block the recipe editor.
    } finally {
      setHasLoadedRecipeAudit(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedRecipeAudit) return

    try {
      window.localStorage.setItem(
        RECIPE_AUDIT_STORAGE_KEY,
        JSON.stringify(auditedRecipeIds),
      )
    } catch {
      // Keep the current-session checkmarks usable if browser storage is unavailable.
    }
  }, [auditedRecipeIds, hasLoadedRecipeAudit])

  if (state.status === 'error') {
    return (
      <div className={styles.rosterFallback}>
        Recipes will appear here once the Pantry editor can load.
      </div>
    )
  }

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const pendingKey = actionState?.pendingKey
  const canRemove = Boolean(draft.id)
  const isBuilderMode = activeTab === 'upload'
  const isEditMode = activeTab === 'edit'
  const hasUnsavedChanges = hasRecipeDraftChanges(draft, state.recipes)
  const subtitle = isBuilderMode
    ? 'Upload the two customer-facing food photos, then add recipe-source photos to read and format before you review and save.'
    : isEditMode
      ? 'Upload recipe-source photos, then use Read source photos and replace details to rebuild this draft before you save it to the Pantry.'
      : 'Review the recipes already on your customer site, then choose one to edit or upload a new recipe.'

  function applyTabChange(nextTab: RecipeEditorTab, recipeId?: string) {
    if (controlledActiveTab === undefined) setUncontrolledActiveTab(nextTab)
    onActiveTabChange?.(nextTab)
    setIsRemovalConfirmationVisible(false)
    setPendingNavigation(null)
    if (recipeId) {
      onSelectRecipe?.(recipeId)
    } else if (nextTab === 'upload') {
      onNewRecipe?.()
    }
  }

  function handleTabChange(nextTab: RecipeEditorTab, recipeId?: string) {
    if (nextTab !== activeTab && hasUnsavedChanges) {
      setPendingNavigation({ tab: nextTab, recipeId })
      return
    }
    applyTabChange(nextTab, recipeId)
  }

  function toggleRecipeAudit(recipeId: string) {
    setAuditedRecipeIds((currentIds) =>
      currentIds.includes(recipeId)
        ? currentIds.filter((currentId) => currentId !== recipeId)
        : [...currentIds, recipeId],
    )
  }

  return (
    <div className={styles.siteSettingsCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Recipes</div>
          <div className={styles.cardSubtitle}>
            {subtitle}
          </div>
        </div>
        <div className={styles.siteSettingsSaveActions}>
          <span
            className={styles.siteSettingsSaveStatus}
            data-testid="recipes-save-status"
            role="status"
            aria-live="polite"
          >
            {statusMessage ?? getRecipeSaveStatusText(actionState)}
          </span>
          {isBuilderMode || isEditMode ? (
            <button
              type="button"
              className={styles.siteSettingsSaveButton}
              data-testid="recipes-read-and-format-button"
              onClick={onBuildDraft}
              disabled={Boolean(pendingKey)}
            >
              {pendingKey === 'build-draft'
                ? 'Reading recipe photos...'
                : isEditMode
                  ? 'Read source photos and replace details'
                  : 'Read and format recipe'}
            </button>
          ) : null}
          {isBuilderMode || isEditMode ? (
            <button
              type="button"
              className={styles.siteSettingsSaveButton}
              data-testid="recipes-save-live-button"
              onClick={onSave}
              disabled={Boolean(pendingKey)}
            >
              {pendingKey === 'save' ? 'Saving to live site...' : 'Save to live site'}
            </button>
          ) : null}
        </div>
      </div>

      {actionState?.helperMessage ? (
        <div className={styles.helperMessage}>{actionState.helperMessage}</div>
      ) : null}
      {actionState?.error ? (
        <div className={styles.actionError}>{actionState.error}</div>
      ) : null}

      <div className={styles.recipeEditorLayout}>
        <div className={styles.siteSettingsSection}>
          <div className={styles.recipeEditorTabs} role="tablist" aria-label="Recipe editor">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'current'}
              className={`${styles.recipeEditorTab}${activeTab === 'current' ? ` ${styles.recipeEditorTabActive}` : ''}`}
              onClick={() => handleTabChange('current')}
            >
              Current recipes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isBuilderMode}
              className={`${styles.recipeEditorTab}${isBuilderMode ? ` ${styles.recipeEditorTabActive}` : ''}`}
              onClick={() => handleTabChange('upload')}
            >
              Upload new recipe
            </button>
          </div>

          <div className={styles.calendarHeader}>
            <span className={styles.rosterTag}>Recipe editor</span>
            <span className={styles.rosterTag}>
              {draft.isVisible ? 'Visible in Pantry' : 'Hidden draft'}
            </span>
          </div>

          {pendingNavigation ? (
            <div className={styles.recipeNavigationConfirmation} role="alert">
              <span>You have unsaved recipe changes.</span>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => setPendingNavigation(null)}
                disabled={Boolean(pendingKey)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className={styles.recipeRemoveConfirmButton}
                onClick={() =>
                  applyTabChange(pendingNavigation.tab, pendingNavigation.recipeId)
                }
                disabled={Boolean(pendingKey)}
              >
                Discard changes
              </button>
            </div>
          ) : null}

          {activeTab === 'current' ? (
            <div className={styles.recipeCurrentPanel}>
              <div>
                <div className={styles.walletSettingsTitle}>Recipes on your site</div>
                <div className={styles.siteSettingsPreviewNote}>
                  Choose a recipe to review its current photo and story, or open it to make changes.
                </div>
              </div>
              {state.recipes.length > 0 ? (
                <div className={styles.recipeCurrentGrid}>
                  {state.recipes.map((recipe) => (
                    <article className={styles.recipeCurrentCard} key={recipe.id}>
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.imageAlt || recipe.title} />
                      ) : (
                        <div className={styles.recipeCurrentImageFallback}>No food photo</div>
                      )}
                      <div className={styles.recipeCurrentCardBody}>
                        <div className={styles.recipeListTitle}>{recipe.title}</div>
                        <div className={styles.recipeListMeta}>
                          {recipe.isVisible ? 'Visible in Pantry' : 'Hidden draft'}
                          {recipe.category ? ` · ${recipe.category}` : ''}
                        </div>
                        {recipe.description ? <p>{recipe.description}</p> : null}
                        <label className={styles.recipeAuditToggle}>
                          <input
                            type="checkbox"
                            checked={auditedRecipeIds.includes(recipe.id)}
                            onChange={() => toggleRecipeAudit(recipe.id)}
                          />
                          <span>Audited</span>
                        </label>
                        <button
                          type="button"
                          className={styles.secondaryActionButton}
                          onClick={() => {
                            setIsRemovalConfirmationVisible(false)
                            handleTabChange('edit', recipe.id)
                          }}
                        >
                          Edit this recipe
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No recipes have been added yet. Use Upload new recipe to add the first one.</div>
              )}
            </div>
          ) : isBuilderMode ? (
          <>
          <div className={styles.recipeBuilderPanel}>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Title</span>
              <input
                className={styles.searchInput}
                placeholder="Chocolate-Dipped Strawberries"
                value={draft.title}
                onChange={(event) =>
                  onDraftChange?.({ title: event.target.value })
                }
              />
            </label>

            <div className={styles.siteSettingsGrid}>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Category</span>
                <select
                  className={styles.searchInput}
                  value={draft.category}
                  onChange={(event) =>
                    onDraftChange?.({ category: event.target.value })
                  }
                >
                  <option value="">Choose a category</option>
                  {BLING_KITCHEN_RECIPE_CATEGORIES.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Prep time</span>
                <input
                  className={styles.searchInput}
                  placeholder="20 minutes"
                  value={draft.prepTime}
                  onChange={(event) =>
                    onDraftChange?.({ prepTime: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Servings</span>
                <input
                  className={styles.searchInput}
                  inputMode="numeric"
                  placeholder="12"
                  value={draft.servings}
                  onChange={(event) =>
                    onDraftChange?.({ servings: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={styles.recipeBuilderImageGrid}>
              <RecipeImageField
                label="Outside food photo for Pantry card"
                field="imageUrl"
                imageUrl={draft.imageUrl}
                imageAlt={draft.imageAlt || draft.title}
                pendingKey={pendingKey}
                onDraftChange={onDraftChange}
                onUploadImage={onUploadImage}
              />
              <RecipeImageField
                label="Inside food photo for recipe view"
                field="modalImageUrl"
                imageUrl={draft.modalImageUrl}
                imageAlt={draft.imageAlt || draft.title}
                pendingKey={pendingKey}
                onDraftChange={onDraftChange}
                onUploadImage={onUploadImage}
              />
            </div>

            <RecipeCardSourceUploader
              imageUrls={draft.recipeCardImageUrls}
              pendingKey={pendingKey}
              onRemoveImage={(imageUrl) =>
                onDraftChange?.({
                  recipeCardImageUrls: draft.recipeCardImageUrls.filter(
                    (url) => url !== imageUrl,
                  ),
                })
              }
              onUploadImage={(file) => onUploadImage?.('recipeCardImageUrls', file)}
            />

          </div>

          <div className={styles.recipeDraftPreview}>
            <div className={styles.walletSettingsTitle}>Recipe Preview</div>
            {draft.description || draft.ingredientsText || draft.stepsText ? (
              <div className={styles.recipePreviewGrid}>
                {draft.description ? <p>{draft.description}</p> : null}
                {draft.ingredientsText ? (
                  <div>
                    <span className={styles.searchLabel}>Ingredients</span>
                    <ul>
                      {splitRecipeLines(draft.ingredientsText).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {draft.stepsText ? (
                  <div>
                    <span className={styles.searchLabel}>Steps</span>
                    <ol>
                      {splitRecipeLines(draft.stepsText).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {draft.note ? <p>{draft.note}</p> : null}
              </div>
            ) : (
              <div className={styles.emptyState}>
                Upload at least one readable recipe-card photo, then Nic-Nac can
                draft the description, ingredients, steps, and Heather-style note.
              </div>
            )}
          </div>

          </>
          ) : (
          <div className={styles.recipeManualEditPanel}>
            <div className={styles.recipeEditHeader}>
              <div>
                <div className={styles.walletSettingsTitle}>Editing {draft.title || 'recipe'}</div>
                <div className={styles.siteSettingsPreviewNote}>
                  Update what customers see, then save your changes when you are finished.
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => handleTabChange('current')}
                disabled={Boolean(pendingKey)}
              >
                Back to current recipes
              </button>
            </div>

            {draft.id ? (
              <>
            <div className={styles.recipeBuilderImageGrid}>
              <RecipeImageField
                label="Outside food photo for Pantry card"
                field="imageUrl"
                imageUrl={draft.imageUrl}
                imageAlt={draft.imageAlt || draft.title}
                pendingKey={pendingKey}
                onDraftChange={onDraftChange}
                onUploadImage={onUploadImage}
              />
              <RecipeImageField
                label="Inside food photo for recipe view"
                field="modalImageUrl"
                imageUrl={draft.modalImageUrl}
                imageAlt={draft.imageAlt || draft.title}
                pendingKey={pendingKey}
                onDraftChange={onDraftChange}
                onUploadImage={onUploadImage}
              />
            </div>

            <RecipeCardSourceUploader
              imageUrls={draft.recipeCardImageUrls}
              pendingKey={pendingKey}
              onRemoveImage={(imageUrl) =>
                onDraftChange?.({
                  recipeCardImageUrls: draft.recipeCardImageUrls.filter(
                    (url) => url !== imageUrl,
                  ),
                })
              }
              onUploadImage={(file) => onUploadImage?.('recipeCardImageUrls', file)}
            />

            <div className={styles.siteSettingsGrid}>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Title</span>
                <input
                  className={styles.searchInput}
                  placeholder="Chocolate-Dipped Strawberries"
                  value={draft.title}
                  onChange={(event) =>
                    onDraftChange?.({ title: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Category</span>
                <select
                  className={styles.searchInput}
                  value={draft.category}
                  onChange={(event) =>
                    onDraftChange?.({ category: event.target.value })
                  }
                >
                  <option value="">Choose category</option>
                  {BLING_KITCHEN_RECIPE_CATEGORIES.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Prep time</span>
                <input
                  className={styles.searchInput}
                  placeholder="20 minutes"
                  value={draft.prepTime}
                  onChange={(event) =>
                    onDraftChange?.({ prepTime: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Servings</span>
                <input
                  className={styles.searchInput}
                  inputMode="numeric"
                  placeholder="12"
                  value={draft.servings}
                  onChange={(event) =>
                    onDraftChange?.({ servings: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={styles.siteSettingsGrid}>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Slug</span>
                <input
                  className={styles.searchInput}
                  value={draft.slug}
                  placeholder="Auto-created from title"
                  onChange={(event) =>
                    onDraftChange?.({ slug: event.target.value })
                  }
                />
              </label>
            <label className={styles.walletToggleRow}>
              <span className={styles.searchLabel}>Visible in Pantry</span>
              <input
                type="checkbox"
                checked={draft.isVisible}
                onChange={(event) =>
                  onDraftChange?.({ isVisible: event.target.checked })
                }
              />
            </label>
              <label className={styles.sortFieldWide}>
                <span className={styles.searchLabel}>Description</span>
                <textarea
                  className={styles.siteSettingsTextarea}
                  value={draft.description}
                  onChange={(event) =>
                    onDraftChange?.({ description: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={styles.siteSettingsGrid}>
              <label className={styles.sortFieldWide}>
                <span className={styles.searchLabel}>Ingredients</span>
                <textarea
                  className={styles.siteSettingsTextarea}
                  value={draft.ingredientsText}
                  placeholder="One ingredient per line"
                  onChange={(event) =>
                    onDraftChange?.({ ingredientsText: event.target.value })
                  }
                />
              </label>
              <label className={styles.sortFieldWide}>
                <span className={styles.searchLabel}>Steps</span>
                <textarea
                  className={styles.siteSettingsTextarea}
                  value={draft.stepsText}
                  placeholder="One step per line"
                  onChange={(event) =>
                    onDraftChange?.({ stepsText: event.target.value })
                  }
                />
              </label>
              <label className={styles.sortFieldWide}>
                <span className={styles.searchLabel}>Note</span>
                <textarea
                  className={styles.siteSettingsTextarea}
                  value={draft.note}
                  onChange={(event) =>
                    onDraftChange?.({ note: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={styles.siteSettingsGrid}>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Image alt text</span>
                <input
                  className={styles.searchInput}
                  value={draft.imageAlt}
                  onChange={(event) =>
                    onDraftChange?.({ imageAlt: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Card crop position</span>
                <input
                  className={styles.searchInput}
                  value={draft.imagePosition}
                  onChange={(event) =>
                    onDraftChange?.({ imagePosition: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Modal crop position</span>
                <input
                  className={styles.searchInput}
                  value={draft.modalImagePosition}
                  onChange={(event) =>
                    onDraftChange?.({ modalImagePosition: event.target.value })
                  }
                />
              </label>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>TikTok URL</span>
                <input
                  className={styles.searchInput}
                  value={draft.tiktokUrl}
                  onChange={(event) =>
                    onDraftChange?.({ tiktokUrl: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={styles.actionRow}>
              {isRemovalConfirmationVisible ? (
                <div className={styles.recipeRemovalConfirmation} role="alert">
                  <span>Remove “{draft.title}” permanently?</span>
                  <button
                    type="button"
                    className={styles.secondaryActionButton}
                    onClick={() => setIsRemovalConfirmationVisible(false)}
                    disabled={Boolean(pendingKey)}
                  >
                    Keep recipe
                  </button>
                  <button
                    type="button"
                    className={styles.recipeRemoveConfirmButton}
                    onClick={() => draft.id && onRemove?.(draft.id)}
                    disabled={Boolean(pendingKey) || !canRemove}
                  >
                    Yes, remove recipe
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.secondaryActionButton}
                  onClick={() => setIsRemovalConfirmationVisible(true)}
                  disabled={Boolean(pendingKey) || !canRemove}
                >
                  Remove recipe
                </button>
              )}
            </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                Select a current recipe above. Its photos, story, ingredients, steps, and settings will load here for editing.
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecipeCardSourceUploader({
  imageUrls,
  pendingKey,
  onRemoveImage,
  onUploadImage,
}: {
  imageUrls: string[]
  pendingKey?: string | null
  onRemoveImage?: (imageUrl: string) => void
  onUploadImage?: (file: File | null) => Promise<void> | void
}) {
  const isUploading = pendingKey === 'upload:recipeCardImageUrls'

  return (
    <div className={styles.recipeSourcePanel}>
      <div className={styles.calendarHeader}>
        <div>
          <div className={styles.walletSettingsTitle}>Recipe-source photos</div>
          <div className={styles.siteSettingsPreviewNote}>
            Upload every card or page with ingredients, instructions, or Heather's tip. You can add multiple photos; they are read to format the recipe and are never shown to customers.
          </div>
        </div>
        <label className={styles.recipeUploadButton}>
          {isUploading ? 'Uploading...' : 'Upload recipe source'}
          <input
            type="file"
            accept="image/*"
            disabled={Boolean(pendingKey)}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null
              void onUploadImage?.(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      {imageUrls.length > 0 ? (
        <div className={styles.recipeSourceImageGrid}>
          {imageUrls.map((imageUrl) => (
            <div className={styles.recipeSourceImageCard} key={imageUrl}>
              <img src={imageUrl} alt="Recipe card source" />
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => onRemoveImage?.(imageUrl)}
                disabled={Boolean(pendingKey)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.recipeEditorImageEmpty}>
          No recipe-source photos uploaded yet.
        </div>
      )}
    </div>
  )
}

function RecipeImageField({
  label,
  field,
  imageUrl,
  imageAlt,
  pendingKey,
  onDraftChange,
  onUploadImage,
}: {
  label: string
  field: 'imageUrl' | 'modalImageUrl'
  imageUrl: string
  imageAlt: string
  pendingKey?: string | null
  onDraftChange?: (patch: Partial<RecipeDraft>) => void
  onUploadImage?: (
    field: 'imageUrl' | 'modalImageUrl',
    file: File | null,
  ) => Promise<void> | void
}) {
  const isUploading = pendingKey === `upload:${field}`

  return (
    <div className={styles.recipeImageField}>
      <div className={styles.recipeImageHeader}>
        <span className={styles.searchLabel}>{label}</span>
        <span className={styles.siteSettingsPreviewNote}>
          {imageUrl ? 'Uploaded to Sparkle storage' : 'Upload a photo'}
        </span>
      </div>
      {imageUrl ? (
        <img
          className={styles.recipeEditorImage}
          src={imageUrl}
          alt={imageAlt || label}
        />
      ) : (
        <div className={styles.recipeEditorImageEmpty}>No image selected.</div>
      )}
      <div className={styles.recipeImageActions}>
        <label className={styles.recipeUploadButton}>
          {isUploading ? 'Uploading...' : imageUrl ? 'Replace photo' : 'Upload photo'}
          <input
            type="file"
            accept="image/*"
            disabled={Boolean(pendingKey)}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null
              void onUploadImage?.(field, file)
              event.currentTarget.value = ''
            }}
          />
        </label>
        {imageUrl ? (
          <button
            type="button"
            className={styles.secondaryActionButton}
            onClick={() =>
              onDraftChange?.({ [field]: '' } as Partial<RecipeDraft>)
            }
            disabled={Boolean(pendingKey)}
          >
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  )
}

const DEFAULT_BUSINESS_CALCULATOR_INPUT: BusinessCalculatorInput = {
  averageShowSales: 1200,
  commissionRate: 25,
  showsPerMonth: 8,
  perShowExpenses: 30,
  monthlyExpenses: 150,
  monthlyProfitGoal: 2500,
}

const DEFAULT_SINGLE_SHOW_CALCULATOR_INPUT: SingleShowCalculatorInput = {
  showSales: 1200,
  commissionRate: 25,
  showExpenses: 30,
}

const BUSINESS_CALCULATOR_FIELDS: Array<{
  key: keyof BusinessCalculatorInput
  label: string
  prefix?: string
  suffix?: string
  min?: number
  step?: number
}> = [
  { key: 'averageShowSales', label: 'Average show sales', prefix: '$', min: 0, step: 25 },
  { key: 'commissionRate', label: 'Commission rate', suffix: '%', min: 0, step: 1 },
  { key: 'showsPerMonth', label: 'Shows per month', min: 0, step: 1 },
  { key: 'perShowExpenses', label: 'Per-show expenses', prefix: '$', min: 0, step: 5 },
  { key: 'monthlyExpenses', label: 'Monthly expenses', prefix: '$', min: 0, step: 10 },
  { key: 'monthlyProfitGoal', label: 'Monthly take-home goal', prefix: '$', min: 0, step: 50 },
]

const SINGLE_SHOW_CALCULATOR_FIELDS: Array<{
  key: keyof SingleShowCalculatorInput
  label: string
  prefix?: string
  suffix?: string
  min?: number
  step?: number
}> = [
  { key: 'showSales', label: 'Show sales', prefix: '$', min: 0, step: 25 },
  { key: 'commissionRate', label: 'Commission rate', suffix: '%', min: 0, step: 1 },
  { key: 'showExpenses', label: 'Show expenses', prefix: '$', min: 0, step: 5 },
]

type BusinessCalculatorTab = 'monthly' | 'single-show'

const WISPR_FLOW_INVITE_URL = 'https://wisprflow.ai/r?LOUIS20696'

const BUSINESS_TOOL_PLACEHOLDERS = ['Business Calculator', 'Business Cards'] as const

export function BusinessToolsCard() {
  return (
    <div className={styles.workspaceSectionStack}>
      <div className={styles.workspaceIntroCard}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>Business Tools</div>
            <div className={styles.cardSubtitle}>
              Practical add-ons for reps, gathered in one workspace tab as each
              tool becomes ready.
            </div>
          </div>
          <span className={styles.rosterTag}>Tool hub</span>
        </div>
      </div>

      <section className={styles.wisprFlowPanel}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.walletSettingsTitle}>Wispr Flow</div>
            <p className={styles.businessToolBody}>
              Talk to Nic-Nac without typing during a live show. Wispr Flow turns
              spoken thoughts into polished text across apps, so reps can keep
              moving while they draft prompts, show notes, customer follow-ups,
              and support details.
            </p>
          </div>
          <span className={styles.rosterTag}>Optional</span>
        </div>

        <div className={styles.wisprFlowUseGrid}>
          <div className={styles.wisprFlowUseCard}>
            <div className={styles.wisprFlowUseLabel}>During a show</div>
            <p className={styles.businessToolBody}>
              Speak a Nic-Nac request, capture a customer note, or draft a quick
              follow-up without stopping to type.
            </p>
          </div>
          <div className={styles.wisprFlowUseCard}>
            <div className={styles.wisprFlowUseLabel}>Why it helps</div>
            <p className={styles.businessToolBody}>
              Flow is built for faster voice dictation, automatic cleanup, and
              ready-to-send formatting in everyday text boxes.
            </p>
          </div>
        </div>

        <div className={styles.wisprFlowInviteRow}>
          <a
            className={styles.helperLink}
            href={WISPR_FLOW_INVITE_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open Louis&apos;s Wispr Flow invite
          </a>
          <span className={styles.wisprFlowInviteUrl}>{WISPR_FLOW_INVITE_URL}</span>
        </div>
      </section>

      <div className={styles.businessToolsGrid}>
        {BUSINESS_TOOL_PLACEHOLDERS.map((toolTitle) => (
          <section key={toolTitle} className={styles.businessToolCard}>
            <div className={styles.workspaceSectionHeader}>
              <div>
                <div className={styles.walletSettingsTitle}>{toolTitle}</div>
                <p className={styles.businessToolBody}>Coming Soon</p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function BusinessCalculatorCard() {
  const [input, setInput] = useState<BusinessCalculatorInput>(
    DEFAULT_BUSINESS_CALCULATOR_INPUT,
  )
  const [singleShowInput, setSingleShowInput] =
    useState<SingleShowCalculatorInput>(DEFAULT_SINGLE_SHOW_CALCULATOR_INPUT)
  const [activeTab, setActiveTab] = useState<BusinessCalculatorTab>('monthly')
  const result = calculateBusinessCalculator(input)
  const singleShowResult = calculateSingleShowCalculator(singleShowInput)

  function updateInput(key: keyof BusinessCalculatorInput, value: string) {
    const next = Number.parseFloat(value)
    setInput((current) => ({
      ...current,
      [key]: Number.isFinite(next) ? next : 0,
    }))
  }

  function updateSingleShowInput(
    key: keyof SingleShowCalculatorInput,
    value: string,
  ) {
    const next = Number.parseFloat(value)
    setSingleShowInput((current) => ({
      ...current,
      [key]: Number.isFinite(next) ? next : 0,
    }))
  }

  return (
    <div className={styles.workspaceSectionStack}>
      <div className={styles.workspaceIntroCard}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>Business Calculator</div>
            <div className={styles.cardSubtitle}>
              Estimate show take-home, monthly take-home, and the sales pace needed
              to hit a goal.
            </div>
          </div>
          <span className={styles.rosterTag}>Manual estimate</span>
        </div>
      </div>

      <div className={styles.calculatorTabs} role="tablist" aria-label="Calculator mode">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'monthly'}
          className={`${styles.calculatorTabButton} ${
            activeTab === 'monthly' ? styles.calculatorTabButtonActive : ''
          }`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Planner
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'single-show'}
          className={`${styles.calculatorTabButton} ${
            activeTab === 'single-show' ? styles.calculatorTabButtonActive : ''
          }`}
          onClick={() => setActiveTab('single-show')}
        >
          Single Show
        </button>
      </div>

      {activeTab === 'monthly' ? (
      <div className={styles.calculatorLayout}>
        <div className={styles.workspacePanel}>
          <div className={styles.walletSettingsTitle}>Your numbers</div>
          <div className={styles.calculatorInputGrid}>
            {BUSINESS_CALCULATOR_FIELDS.map((field) => (
              <label key={field.key} className={styles.calculatorField}>
                <span className={styles.searchLabel}>{field.label}</span>
                <span className={styles.calculatorInputShell}>
                  {field.prefix ? (
                    <span className={styles.calculatorAdornment}>{field.prefix}</span>
                  ) : null}
                  <input
                    type="number"
                    aria-label={field.label}
                    min={field.min}
                    step={field.step}
                    className={`${styles.calculatorInput} ph-no-capture`}
                    value={input[field.key]}
                    onChange={(event) => updateInput(field.key, event.target.value)}
                  />
                  {field.suffix ? (
                    <span className={styles.calculatorAdornment}>{field.suffix}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.workspacePanel}>
          <div className={styles.walletSettingsTitle}>Estimate</div>
          <div className={styles.calculatorResultList}>
            <CalculatorResultRow
              label="Estimated take-home per show"
              value={formatCalculatorMoney(
                result.takeHomePerShowBeforeMonthlyExpenses,
              )}
            />
            <CalculatorResultRow
              label="Estimated monthly take-home"
              value={formatCalculatorMoney(result.estimatedMonthlyTakeHome)}
              strong
            />
            <CalculatorResultRow
              label="Monthly gross volume"
              value={formatCalculatorMoney(result.grossSalesPerMonth)}
            />
            <CalculatorResultRow
              label="Estimated margin"
              value={`${result.estimatedMarginPercent.toFixed(2)}%`}
            />
            <CalculatorResultRow
              label="Sales needed per show"
              value={formatCalculatorMoney(result.salesNeededPerShowForGoal)}
            />
            <CalculatorResultRow
              label="Sales needed per month"
              value={formatCalculatorMoney(result.salesNeededPerMonthForGoal)}
            />
          </div>
          <div className={styles.helperNote}>
            Estimates use the numbers entered here only. Actual payouts, inventory,
            taxes, fees, and policies can vary.
          </div>
        </div>
      </div>
      ) : (
        <div className={styles.calculatorLayout}>
          <div className={styles.workspacePanel}>
            <div className={styles.walletSettingsTitle}>Show numbers</div>
            <div className={styles.calculatorInputGrid}>
              {SINGLE_SHOW_CALCULATOR_FIELDS.map((field) => (
                <label key={field.key} className={styles.calculatorField}>
                  <span className={styles.searchLabel}>{field.label}</span>
                  <span className={styles.calculatorInputShell}>
                    {field.prefix ? (
                      <span className={styles.calculatorAdornment}>{field.prefix}</span>
                    ) : null}
                    <input
                      type="number"
                      aria-label={field.label}
                      min={field.min}
                      step={field.step}
                      className={`${styles.calculatorInput} ph-no-capture`}
                      value={singleShowInput[field.key]}
                      onChange={(event) =>
                        updateSingleShowInput(field.key, event.target.value)
                      }
                    />
                    {field.suffix ? (
                      <span className={styles.calculatorAdornment}>{field.suffix}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.workspacePanel}>
            <div className={styles.walletSettingsTitle}>Single show estimate</div>
            <div className={styles.calculatorResultList}>
              <CalculatorResultRow
                label="Estimated show take-home"
                value={formatCalculatorMoney(singleShowResult.estimatedShowTakeHome)}
                strong
              />
              <CalculatorResultRow
                label="Gross commission"
                value={formatCalculatorMoney(singleShowResult.grossCommission)}
              />
              <CalculatorResultRow
                label="Expense impact"
                value={`${singleShowResult.expenseImpactPercent.toFixed(2)}%`}
              />
              <CalculatorResultRow
                label="Effective margin"
                value={`${singleShowResult.estimatedMarginPercent.toFixed(2)}%`}
              />
            </div>
            <div className={styles.helperNote}>
              Use this after a specific show to sanity-check what the show likely
              produced before broader monthly expenses.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TeamManagementCard({
  state = {
    status: 'locked',
    access: { enabled: false, status: 'not_enabled', source: null },
    participants: [],
  },
  actionState,
  publicTeamDraft = getJoinTeamRosterDraft(),
  teamName = '',
  joinTeamPreviewHref = '/amethyst/Join.html',
  onTeamNameChange,
  onSaveTeamName,
  onCreateParticipant,
  onRefreshInvite,
  onCopyInvite,
  onArchiveParticipant,
  onPublicTeamDraftChange,
  onUploadPublicTeamPhoto,
  onSavePublicTeamMember,
  onEditPublicTeamMember,
  onTogglePublicTeamMember,
  onMovePublicTeamMember,
  onRemovePublicTeamMember,
  onOpenMessages,
}: {
  state?: TeamManagementState
  actionState?: TeamManagementActionState
  publicTeamDraft?: JoinTeamRosterDraft
  teamName?: string
  joinTeamPreviewHref?: string
  onTeamNameChange?: (value: string) => void
  onSaveTeamName?: () => void
  onCreateParticipant?: (member: JoinTeamMember) => void
  onRefreshInvite?: (participantId: string) => void
  onCopyInvite?: (accessUrl?: string) => void
  onArchiveParticipant?: (participantId: string) => void
  onPublicTeamDraftChange?: (patch: Partial<JoinTeamRosterDraft>) => void
  onUploadPublicTeamPhoto?: (file: File | null) => void
  onSavePublicTeamMember?: () => void
  onEditPublicTeamMember?: (member: JoinTeamMember) => void
  onTogglePublicTeamMember?: (member: JoinTeamMember) => void
  onMovePublicTeamMember?: (memberId: string, direction: 'up' | 'down') => void
  onRemovePublicTeamMember?: (memberId: string) => void
  onOpenMessages?: (conversationId: string) => void
}) {
  const participants = state.participants ?? []
  const publicTeamRoster = state.publicTeamRoster ?? []
  const activeParticipants = participants.filter(
    (participant) => participant.status !== 'archived',
  )
  const unattachedParticipants = activeParticipants.filter(
    (participant) =>
      !publicTeamRoster.some(
        (member) =>
          participant.joinTeamMemberId === member.id ||
          (!participant.joinTeamMemberId &&
            participant.displayName.trim().toLowerCase() ===
              member.displayName.trim().toLowerCase()),
      ),
  )
  const isLocked = state.status === 'locked' || state.access?.enabled === false
  const isLoading = state.status === 'loading'

  if (isLocked) {
    return (
      <div className={styles.workspacePanel}>
        <div className={styles.workspaceSectionHeader}>
          <div>
            <div className={styles.cardTitle}>Team Management</div>
            <div className={styles.cardSubtitle}>
              Team Management is coming soon. It is not available to this
              workspace yet.
            </div>
          </div>
          <span className={styles.rosterTag}>Coming soon</span>
        </div>

        <div className={styles.teamUpgradeNotice}>
          <span>
            Create onboarding links, track rep progress, and answer onboarding
            questions when Team Management opens for more reps.
          </span>
        </div>

        <div className={styles.teamManagementGrid}>
          <section className={styles.teamManagementPanel}>
            <div className={styles.walletSettingsTitle}>Private onboarding actions</div>
            <div className={styles.helperNote}>
              When Team Management opens, each saved team member card will
              include its own private onboarding link and progress controls.
            </div>
            <button type="button" className={styles.actionButton} disabled>
              Coming soon
            </button>
          </section>
          <section className={styles.teamManagementPanel}>
            <div className={styles.walletSettingsTitle}>Progress tracking</div>
            <div className={styles.emptyState}>
              New-rep progress will appear here when Team Management opens.
            </div>
          </section>
          <section
            className={`${styles.teamManagementPanel} ${styles.teamPublicCardsPanel}`}
          >
            <div className={styles.walletSettingsTitle}>Public Team Cards</div>
            <div className={styles.emptyState}>
              Team member cards can be added to the public Join Team page after
              Team Management opens.
            </div>
          </section>
          <section className={styles.teamManagementPanel}>
            <div className={styles.walletSettingsTitle}>Onboarding messages</div>
            <div className={styles.emptyState}>
              Questions from onboarding sites appear in the Message Center so
              every conversation stays in one inbox.
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.workspacePanel}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Team Management</div>
          <div className={styles.cardSubtitle}>
            Create private New Rep Onboarding links, track onboarding progress, and
            open new-rep questions in the Message Center.
          </div>
        </div>
        <span className={styles.rosterTag}>
          {state.access?.status === 'manual_beta' ? 'Beta access' : 'Enabled'}
        </span>
      </div>

      {actionState?.error ? (
        <div className={styles.actionError}>{actionState.error}</div>
      ) : null}
      {actionState?.helperMessage ? (
        <div className={styles.helperMessage}>{actionState.helperMessage}</div>
      ) : null}

      <div className={styles.teamManagementGrid}>
        <section className={styles.teamManagementPanel}>
          <div className={styles.walletSettingsTitle}>Team I manage</div>
          <div className={styles.helperNote}>
            This is your team&apos;s name on the Join Team page and New Rep Onboarding
            links. It does not change the team you belong to.
          </div>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Managed team name</span>
            <input
              className={`${styles.searchInput} ph-no-capture`}
              placeholder="Your team name"
              value={teamName}
              onChange={(event) => onTeamNameChange?.(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.actionButton}
            disabled={actionState?.pendingKey === 'team-name' || isLoading}
            onClick={onSaveTeamName}
          >
            {actionState?.pendingKey === 'team-name' ? 'Saving team name...' : 'Save team name'}
          </button>
        </section>
        <PublicTeamRosterPanel
          members={publicTeamRoster}
          participants={activeParticipants}
          draft={publicTeamDraft}
          actionState={actionState}
          joinTeamPreviewHref={joinTeamPreviewHref}
          isLoading={isLoading}
          onDraftChange={onPublicTeamDraftChange}
          onUploadPhoto={onUploadPublicTeamPhoto}
          onSave={onSavePublicTeamMember}
          onEdit={onEditPublicTeamMember}
          onToggle={onTogglePublicTeamMember}
          onMove={onMovePublicTeamMember}
          onRemove={onRemovePublicTeamMember}
          onCreateParticipant={onCreateParticipant}
          onRefreshInvite={onRefreshInvite}
          onCopyInvite={onCopyInvite}
          onArchiveParticipant={onArchiveParticipant}
          onOpenMessages={onOpenMessages}
        />

        {unattachedParticipants.length > 0 ? (
          <section className={styles.teamManagementPanel}>
            <div className={styles.walletSettingsTitle}>Earlier onboarding links</div>
            <div className={styles.helperNote}>
              These older links are not attached to a saved team card yet. Their
              progress and messages remain available here.
            </div>
            {unattachedParticipants.map((participant) => (
              <div key={participant.id} className={styles.teamMessagePreview}>
                <div className={styles.workspaceSectionHeader}>
                  <div>
                    <strong>{participant.displayName}</strong>
                    <div className={styles.helperNote}>
                      {participant.progress.completed} of {participant.progress.total}{' '}
                      completed
                    </div>
                  </div>
                  {participant.unreadMessageCount > 0 ? (
                    <span className={styles.rosterTag}>
                      {participant.unreadMessageCount} new
                    </span>
                  ) : null}
                </div>
                {participant.progress.needsHelp > 0 ? (
                  <div className={styles.helperNote}>Needs help</div>
                ) : null}
                <div className={styles.helperNote}>
                  {participant.latestMessagePreview
                    ? `Latest: ${participant.latestMessagePreview}`
                    : participant.unreadMessageCount > 0
                      ? 'A new onboarding question is waiting in Messages.'
                      : 'No onboarding questions yet.'}
                </div>
                {participant.lastActivityAt ? (
                  <div className={styles.helperNote}>
                    Last activity {formatCompactDateTime(participant.lastActivityAt)}
                  </div>
                ) : null}
                <div className={styles.workspaceInlineActions}>
                  {participant.workspaceConversationId ||
                  participant.workspace_conversation_id ? (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() =>
                        onOpenMessages?.(
                          participant.workspaceConversationId ||
                            participant.workspace_conversation_id ||
                            REVIEW_TEAM_CONVERSATION_ID,
                        )
                      }
                    >
                      Open in Messages
                    </button>
                  ) : (
                    <span className={styles.helperNote}>
                      The conversation will open after this rep sends their first question.
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.helperButton}
                    disabled={
                      actionState?.pendingKey ===
                      `onboarding:refresh:${participant.id}`
                    }
                    onClick={() =>
                      participant.accessUrl
                        ? onCopyInvite?.(participant.accessUrl)
                        : onRefreshInvite?.(participant.id)
                    }
                  >
                    {participant.accessUrl ? 'Copy link' : 'Create fresh link'}
                  </button>
                  <button
                    type="button"
                    className={styles.helperButton}
                    disabled={actionState?.pendingKey === `archive:${participant.id}`}
                    onClick={() => onArchiveParticipant?.(participant.id)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  )
}

function findParticipantForRosterMember(
  member: JoinTeamMember,
  participants: TeamOnboardingParticipant[],
) {
  return (
    participants.find(
      (participant) => participant.joinTeamMemberId === member.id,
    ) ??
    participants.find(
      (participant) =>
        !participant.joinTeamMemberId &&
        participant.displayName.trim().toLowerCase() ===
          member.displayName.trim().toLowerCase(),
    )
  )
}

function PublicTeamRosterPanel({
  members,
  participants,
  draft,
  actionState,
  joinTeamPreviewHref,
  isLoading,
  onDraftChange,
  onUploadPhoto,
  onSave,
  onEdit,
  onToggle,
  onMove,
  onRemove,
  onCreateParticipant,
  onRefreshInvite,
  onCopyInvite,
  onArchiveParticipant,
  onOpenMessages,
}: {
  members: JoinTeamMember[]
  participants: TeamOnboardingParticipant[]
  draft: JoinTeamRosterDraft
  actionState?: TeamManagementActionState
  joinTeamPreviewHref: string
  isLoading: boolean
  onDraftChange?: (patch: Partial<JoinTeamRosterDraft>) => void
  onUploadPhoto?: (file: File | null) => void
  onSave?: () => void
  onEdit?: (member: JoinTeamMember) => void
  onToggle?: (member: JoinTeamMember) => void
  onMove?: (memberId: string, direction: 'up' | 'down') => void
  onRemove?: (memberId: string) => void
  onCreateParticipant?: (member: JoinTeamMember) => void
  onRefreshInvite?: (participantId: string) => void
  onCopyInvite?: (accessUrl?: string) => void
  onArchiveParticipant?: (participantId: string) => void
  onOpenMessages?: (conversationId: string) => void
}) {
  const [photoPermissionConfirmed, setPhotoPermissionConfirmed] = useState(false)
  const saveLabel = draft.id ? 'Save card changes' : 'Save team member card'
  const isPhotoUploading =
    actionState?.pendingKey === 'public-team:photo-upload'

  return (
    <section
      className={`${styles.teamManagementPanel} ${styles.teamPublicCardsPanel}`}
    >
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.walletSettingsTitle}>Public Team Cards</div>
          <div className={styles.helperNote}>
            Manage each person&apos;s public card and private onboarding in one
            place. Private links never appear on the customer-facing site.
          </div>
        </div>
        <Link
          className={styles.helperLink}
          href={joinTeamPreviewHref}
          target="_blank"
          rel="noreferrer"
        >
          Preview Join Team page
        </Link>
      </div>

      <div className={styles.teamMessagePreview}>
        <strong>Before you share the Join Team page</strong>
        <ul>
          <li>
            {members.some((member) => member.isVisible)
              ? 'At least one public team card is visible.'
              : 'Make one team card visible, or preview the honest no-cards state.'}
          </li>
          <li>
            Connect the current official starter-pack link, or leave it unconnected
            so the page tells visitors to ask you for current details.
          </li>
          <li>
            Create a private onboarding link and confirm its address shows the new
            rep&apos;s first name and your lead identity.
          </li>
          <li>Open onboarding questions through the Message Center.</li>
        </ul>
      </div>

      <div className={styles.teamRosterWorkspace}>
        <div className={styles.teamRosterEditor}>
          <div className={styles.walletSettingsTitle}>Add team member card</div>
          <div className={styles.helperNote}>
            Adding someone new? Save their card first, leave it hidden until
            you are ready to publish, then create their private onboarding link
            from the saved card.
          </div>
          <div className={styles.teamInputGrid}>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>First name</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="Lindsey"
                value={draft.displayName}
                onChange={(event) =>
                  onDraftChange?.({ displayName: event.target.value })
                }
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Show name</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="Mile High Fizz"
                value={draft.businessName}
                onChange={(event) =>
                  onDraftChange?.({ businessName: event.target.value })
                }
              />
            </label>
          </div>

          <div className={styles.teamPhotoWorkflow}>
            <div className={styles.teamPhotoInstructions}>
              <strong>Profile photo process</strong>
              <ol>
                <li>Save or download the team member&apos;s profile photo to your device.</li>
                <li>Confirm you have permission to publish it.</li>
                <li>Upload it, review the square preview, then save the card.</li>
              </ol>
              <span>
                Use JPG, PNG, or WebP up to 3 MB. A TikTok page link is not a
                photo file.
              </span>
            </div>

            <div className={styles.teamPhotoControls}>
              <div className={styles.teamPhotoPreview} aria-label="Profile photo preview">
                {draft.photoUrl ? (
                  <img src={draft.photoUrl} alt="Team member card preview" />
                ) : (
                  <span>No photo selected</span>
                )}
              </div>
              <div className={styles.teamPhotoActions}>
                <label className={styles.teamPhotoPermission}>
                  <input
                    type="checkbox"
                    checked={photoPermissionConfirmed}
                    onChange={(event) =>
                      setPhotoPermissionConfirmed(event.target.checked)
                    }
                  />
                  <span>
                    I have permission to publish this team member&apos;s photo on
                    the public Join Team page.
                  </span>
                </label>
                <label
                  className={`${styles.helperButton} ${styles.teamPhotoUploadButton} ${
                    !photoPermissionConfirmed || isPhotoUploading
                      ? styles.teamPhotoUploadButtonDisabled
                      : ''
                  }`}
                >
                  {isPhotoUploading ? 'Uploading photo...' : 'Upload profile photo'}
                  <input
                    className={styles.visuallyHiddenFileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!photoPermissionConfirmed || isPhotoUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      onUploadPhoto?.(file)
                      event.target.value = ''
                      setPhotoPermissionConfirmed(false)
                    }}
                  />
                </label>
              </div>
            </div>

          </div>

          <div className={styles.teamSocialGrid}>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>TikTok</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="https://www.tiktok.com/@show"
                value={draft.tiktok}
                onChange={(event) => onDraftChange?.({ tiktok: event.target.value })}
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Facebook</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="VIP group or page"
                value={draft.facebook}
                onChange={(event) =>
                  onDraftChange?.({ facebook: event.target.value })
                }
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Instagram</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="https://www.instagram.com/show"
                value={draft.instagram}
                onChange={(event) =>
                  onDraftChange?.({ instagram: event.target.value })
                }
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Website</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="https://example.com"
                value={draft.website}
                onChange={(event) =>
                  onDraftChange?.({ website: event.target.value })
                }
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>YouTube</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="https://www.youtube.com/@show"
                value={draft.youtube}
                onChange={(event) =>
                  onDraftChange?.({ youtube: event.target.value })
                }
              />
            </label>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Whatnot</span>
              <input
                className={`${styles.searchInput} ph-no-capture`}
                placeholder="https://www.whatnot.com/user/show"
                value={draft.whatnot}
                onChange={(event) => onDraftChange?.({ whatnot: event.target.value })}
              />
            </label>
          </div>

          <label className={styles.teamVisibilityToggle}>
            <input
              type="checkbox"
              checked={draft.isVisible}
              onChange={(event) =>
                onDraftChange?.({ isVisible: event.target.checked })
              }
            />
            <span>Visible on Join Team page</span>
          </label>

          <button
            type="button"
            className={styles.actionButton}
            disabled={actionState?.pendingKey === 'public-team:save' || isLoading}
            onClick={onSave}
          >
            {actionState?.pendingKey === 'public-team:save'
              ? 'Saving card...'
              : saveLabel}
          </button>
        </div>

        <div className={styles.teamRosterList} role="list">
          {members.length === 0 ? (
            <div className={styles.emptyState}>
              Public team cards will appear here before they show on the Join
              Team page.
            </div>
          ) : (
            members.map((member, index) => {
              const participant = findParticipantForRosterMember(
                member,
                participants,
              )
              const conversationId =
                participant?.workspaceConversationId ||
                participant?.workspace_conversation_id
              const isCreating =
                actionState?.pendingKey === `onboarding:create:${member.id}`
              const isRefreshing =
                participant &&
                actionState?.pendingKey ===
                  `onboarding:refresh:${participant.id}`

              return (
              <div key={member.id} className={styles.teamRosterCard} role="listitem">
                <div className={styles.teamRosterAvatar}>
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.photoAlt || member.displayName} />
                  ) : (
                    <span>{member.initials || member.displayName.slice(0, 1)}</span>
                  )}
                </div>
                <div className={styles.teamRosterCardBody}>
                  <div className={styles.workspaceSectionHeader}>
                    <div>
                      <strong>{member.businessName || 'Show name missing'}</strong>
                      <div className={styles.helperNote}>{member.displayName}</div>
                    </div>
                    <span className={styles.rosterTag}>
                      {member.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <div className={styles.teamRosterLinks}>
                    {member.links.tiktok ? <span>TikTok</span> : null}
                    {member.links.facebook ? <span>Facebook</span> : null}
                    {member.links.instagram ? <span>Instagram</span> : null}
                    {member.links.website ? <span>Website</span> : null}
                    {member.links.youtube ? <span>YouTube</span> : null}
                    {member.links.whatnot ? <span>Whatnot</span> : null}
                    {Object.values(member.links).every((value) => !value) ? (
                      <span>No links yet</span>
                    ) : null}
                  </div>
                  <div className={styles.teamOnboardingCardPanel}>
                    <div className={styles.workspaceSectionHeader}>
                      <div>
                        <strong>Private onboarding</strong>
                        <div className={styles.helperNote}>
                          Workspace only — never shown on the public Join Team page.
                        </div>
                      </div>
                      {participant ? (
                        <span className={styles.rosterTag}>
                          {participant.status.replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>

                    {!participant ? (
                      <button
                        type="button"
                        className={styles.helperButton}
                        disabled={Boolean(isCreating) || isLoading}
                        onClick={() => onCreateParticipant?.(member)}
                      >
                        {isCreating ? 'Creating link...' : 'Create onboarding link'}
                      </button>
                    ) : (
                      <>
                        <div className={styles.teamOnboardingProgressLine}>
                          <span>
                            {participant.progress.total > 0
                              ? `${participant.progress.completed} of ${participant.progress.total} steps completed`
                              : 'Onboarding has not started yet'}
                          </span>
                          {participant.progress.needsHelp > 0 ? (
                            <strong>Needs help</strong>
                          ) : null}
                          {participant.unreadMessageCount > 0 ? (
                            <strong>
                              {participant.unreadMessageCount} new message
                              {participant.unreadMessageCount === 1 ? '' : 's'}
                            </strong>
                          ) : null}
                        </div>

                        {participant.contactEmail ? (
                          <div className={styles.helperNote}>
                            Contact: {participant.contactEmail}
                          </div>
                        ) : null}
                        <div className={styles.helperNote}>
                          {participant.latestMessagePreview
                            ? `Latest: ${participant.latestMessagePreview}`
                            : participant.unreadMessageCount > 0
                              ? 'A new onboarding question is waiting in Messages.'
                              : 'No onboarding questions yet.'}
                        </div>
                        {participant.lastActivityAt ? (
                          <div className={styles.helperNote}>
                            Last activity{' '}
                            {formatCompactDateTime(participant.lastActivityAt)}
                          </div>
                        ) : null}

                        {participant.accessUrl ? (
                          <label className={styles.teamOnboardingLinkField}>
                            <span>Private onboarding link</span>
                            <input
                              className={`${styles.searchInput} ph-no-capture`}
                              readOnly
                              value={participant.accessUrl}
                              aria-label={`${member.displayName} private onboarding link`}
                            />
                          </label>
                        ) : (
                          <div className={styles.helperNote}>
                            For security, an older private link cannot be displayed
                            again. Create a fresh link to replace it.
                          </div>
                        )}

                        <div className={styles.workspaceInlineActions}>
                          {participant.accessUrl ? (
                            <>
                              <button
                                type="button"
                                className={styles.helperButton}
                                onClick={() => onCopyInvite?.(participant.accessUrl)}
                              >
                                Copy link
                              </button>
                              <a
                                className={styles.helperLink}
                                href={participant.accessUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open link
                              </a>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className={styles.helperButton}
                            disabled={Boolean(isRefreshing) || isLoading}
                            onClick={() => {
                              if (
                                participant.accessUrl &&
                                !window.confirm(
                                  `Replace ${member.displayName}'s private onboarding link? The previous link will stop working.`,
                                )
                              ) {
                                return
                              }
                              onRefreshInvite?.(participant.id)
                            }}
                          >
                            {isRefreshing
                              ? 'Creating fresh link...'
                              : participant.accessUrl
                                ? 'Replace link'
                                : 'Create fresh link'}
                          </button>
                          {conversationId ? (
                            <button
                              type="button"
                              className={styles.helperButton}
                              onClick={() => onOpenMessages?.(conversationId)}
                            >
                              Open in Messages
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={styles.helperButton}
                            disabled={
                              actionState?.pendingKey ===
                              `archive:${participant.id}`
                            }
                            onClick={() => onArchiveParticipant?.(participant.id)}
                          >
                            Archive onboarding
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.workspaceInlineActions}>
                    <button
                      type="button"
                      className={styles.helperButton}
                      onClick={() => onEdit?.(member)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.helperButton}
                      disabled={
                        actionState?.pendingKey ===
                        `public-team:toggle:${member.id}`
                      }
                      onClick={() => onToggle?.(member)}
                    >
                      {member.isVisible ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      className={styles.helperButton}
                      disabled={
                        index === 0 ||
                        actionState?.pendingKey === `public-team:move:${member.id}`
                      }
                      onClick={() => onMove?.(member.id, 'up')}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className={styles.helperButton}
                      disabled={
                        index === members.length - 1 ||
                        actionState?.pendingKey === `public-team:move:${member.id}`
                      }
                      onClick={() => onMove?.(member.id, 'down')}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className={styles.helperButton}
                      disabled={
                        actionState?.pendingKey ===
                        `public-team:remove:${member.id}`
                      }
                      onClick={() => {
                        if (
                          !confirmJoinTeamRosterRemoval(member)
                        ) {
                          return
                        }
                        onRemove?.(member.id)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

function CalculatorResultRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`${styles.calculatorResultRow} ${
        strong ? styles.calculatorResultRowStrong : ''
      }`}
    >
      <span className={styles.calculatorResultLabel}>{label}</span>
      <span className={styles.calculatorResultValue}>{value}</span>
    </div>
  )
}

function formatCalculatorMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function isSparkleSuiteTestBuyerPreview() {
  const mode = process.env.NEXT_PUBLIC_SPARKLE_STRIPE_TEST_BUYER_MODE
  return mode === 'true' || mode === '1'
}

function getSparkleSuiteCheckoutReview(
  checkoutMode?: AccountBillingDashboardResult['checkoutMode'],
  pricingSummary?: AccountBillingDashboardResult['pricing'],
) {
  const { pricing: publicPricing } = sparkleSuitePublicLandingContent
  const testBuyerPreview =
    checkoutMode === 'test_buyer' ||
    (checkoutMode === undefined && isSparkleSuiteTestBuyerPreview())
  const pricing = pricingSummary ?? {
    tier: 'standard' as const,
    founderSequence: null,
    setupFeeCents: 4999,
    monthlyAmountCents: 7499,
    founderRateMonths: 12,
    standardMonthlyAmountCents: 7499,
  }
  const setupFee = formatCalculatorMoney(pricing.setupFeeCents / 100)
  const monthlyAmount = formatCalculatorMoney(pricing.monthlyAmountCents / 100)
  const standardMonthlyAmount = formatCalculatorMoney(
    pricing.standardMonthlyAmountCents / 100,
  )
  const firstCheckoutTotal = formatCalculatorMoney(
    (pricing.setupFeeCents + pricing.monthlyAmountCents) / 100,
  )

  return {
    dueToday: testBuyerPreview
      ? '50 cents in Stripe test mode. No real money moves.'
      : `${setupFee} setup fee + ${monthlyAmount} first month = ${firstCheckoutTotal} before taxes or Stripe-calculated extras.`,
    dueTodayNote: testBuyerPreview
      ? 'Use this local-only path to feel the buyer flow before real checkout is turned on.'
      : 'These charges are due only when you complete Stripe checkout during your active trial. Stripe itemizes both before you pay.',
    renewal: testBuyerPreview
      ? '50 cents per month in Stripe test mode until cancelled.'
      : pricing.tier === 'founder'
        ? `Months 2–${pricing.founderRateMonths}: ${monthlyAmount}/month. Month ${pricing.founderRateMonths + 1} onward: ${standardMonthlyAmount}/month until cancelled.`
        : `${monthlyAmount}/month after the first checkout until cancelled.`,
    cancellation: 'Cancel anytime from billing. Access continues through the paid billing period.',
    included: [
      'Customer-facing site',
      'Dance Floor / dance floor',
      'LiveQ',
      ...publicPricing.included.slice(3),
    ],
  }
}

export function AccountBillingCard({
  state,
  actionState,
  onStartSubscription,
  onManageBilling,
  statusMessage,
  agreementAccepted = false,
  onAgreementAcceptedChange,
  mutationsDisabled = false,
}: {
  state: AccountBillingState
  actionState?: AccountBillingActionState
  onStartSubscription?: () => void
  onManageBilling?: () => void
  statusMessage?: string | null
  agreementAccepted?: boolean
  onAgreementAcceptedChange?: (accepted: boolean) => void
  mutationsDisabled?: boolean
}) {
  if (state.status === 'error') {
    return (
      <div className={styles.walletFallback}>
        {mutationsDisabled
          ? 'Billing details are unavailable during support access. Billing and payment changes remain disabled.'
          : 'Account and billing details will show here once Stripe data loads.'}
      </div>
    )
  }

  if (state.status !== 'ready' || !state.summary) {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const { summary } = state
  const workspaceAccess = summary.workspaceAccess
  const grandfatheredCheckout = summary.grandfatheredCheckout
  const isActiveWorkspaceTrial =
    workspaceAccess?.source === 'trial' && workspaceAccess.hasFullAccess
  const subscriptionStatus = summary.subscription
    ? summary.subscription.status.replace('_', ' ')
    : 'No active subscription'
  const subscriptionTitle = isActiveWorkspaceTrial
    ? '5-day trial active'
    : summary.subscription
    ? subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)
    : 'Not active yet'
  const checkoutReview = getSparkleSuiteCheckoutReview(
    summary.checkoutMode,
    summary.pricing,
  )

  return (
    <div className={styles.accountBillingCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Account</div>
          <div className={styles.accountMuted}>
            {grandfatheredCheckout
              ? '$39/month grandfathered plan - no setup fee'
              : summary.canStartSubscription
                ? summary.pricing?.tier === 'founder'
                  ? `Founding rep #${summary.pricing.founderSequence ?? '—'} · setup fee + founder monthly plan`
                  : 'Setup fee + monthly plan - cancel anytime'
                : 'Billing, payment methods, invoices, and cancellations are managed in Stripe.'}
          </div>
        </div>
        <span className={styles.accountStatusBadge}>{subscriptionTitle}</span>
      </div>

      {isActiveWorkspaceTrial ? (
        <div className={styles.helperMessage} role="status">
          Your full Sparkle Suite trial is active through{' '}
          {formatAccountBillingDate(workspaceAccess?.trialEndsAt ?? null)}.
          Start billing before then to keep your workspace and customer site
          available without interruption.
        </div>
      ) : workspaceAccess?.status === 'trial_expired' ? (
        <div className={styles.actionError} role="status">
          Your five-day trial has ended. Your work is saved; start billing to
          reopen the workspace and customer site.
        </div>
      ) : null}

      {grandfatheredCheckout ? (
        <section
          className={styles.checkoutReview}
          aria-label="Grandfathered Sparkle Suite billing"
        >
          <div className={styles.checkoutReviewHeader}>
            <span className={styles.checkoutReviewKicker}>Your plan</span>
            <h3 className={styles.checkoutReviewTitle}>
              Grandfathered Sparkle Suite membership
            </h3>
            <p className={styles.checkoutReviewCopy}>
              Your grandfathered rate is $39.00 per month with no setup fee.
            </p>
          </div>
          <a
            className={styles.actionButton}
            href={grandfatheredCheckout.href}
            target="_blank"
            rel="noreferrer"
            aria-disabled={mutationsDisabled || undefined}
            tabIndex={mutationsDisabled ? -1 : undefined}
            onClick={(event) => {
              if (mutationsDisabled) event.preventDefault()
            }}
          >
            Stripe Billing and Payments
          </a>
        </section>
      ) : null}

      {actionState?.error ? (
        <div className={styles.actionError}>{actionState.error}</div>
      ) : null}
      {statusMessage ? (
        <div className={styles.helperMessage}>{statusMessage}</div>
      ) : null}

      {summary.canStartSubscription && !grandfatheredCheckout ? (
        <div className={styles.termsAcceptance}>
          <section
            className={styles.checkoutReview}
            aria-label="Sparkle Suite checkout review"
          >
            <div className={styles.checkoutReviewHeader}>
              <span className={styles.checkoutReviewKicker}>Before checkout</span>
              <h3 className={styles.checkoutReviewTitle}>
                Review your Sparkle Suite plan
              </h3>
              <p className={styles.checkoutReviewCopy}>
                Stripe shows the final checkout details before you pay. Checkout
                alone does not send customer texts, emails, calendar changes, or
                provider messages.
              </p>
            </div>

            <div className={styles.checkoutReviewList}>
              <div className={styles.checkoutReviewItem}>
                <span className={styles.checkoutReviewLabel}>At checkout</span>
                <span className={styles.checkoutReviewValue}>
                  {checkoutReview.dueToday}
                </span>
                <span className={styles.checkoutReviewNote}>
                  {checkoutReview.dueTodayNote}
                </span>
              </div>
              <div className={styles.checkoutReviewItem}>
                <span className={styles.checkoutReviewLabel}>Renews</span>
                <span className={styles.checkoutReviewValue}>
                  {checkoutReview.renewal}
                </span>
              </div>
              <div className={styles.checkoutReviewItem}>
                <span className={styles.checkoutReviewLabel}>Cancel policy</span>
                <span className={styles.checkoutReviewValue}>
                  {checkoutReview.cancellation}
                </span>
              </div>
            </div>

            <div className={styles.checkoutUnlocks}>
              <span className={styles.checkoutReviewLabel}>
                After checkout unlocks
              </span>
              <ul className={styles.checkoutUnlockList}>
                {checkoutReview.included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className={styles.termsReadRow}>
            <span>Review the Sparkle Suite Terms and Conditions (optional).</span>
            <Link
              className={styles.termsLink}
              href="/terms-and-conditions?returnTo=%2Fnic-nac%3Fsection%3Daccount"
            >
              Read Terms and Conditions
            </Link>
          </div>
          <label className={styles.siteSettingsToggle}>
            <input
              type="checkbox"
              checked={agreementAccepted}
              disabled={mutationsDisabled}
              onChange={(event) =>
                onAgreementAcceptedChange?.(event.currentTarget.checked)
              }
            />
            <span>
              I understand the charge at checkout, the monthly renewal, and the
              cancel policy, and I accept the Sparkle Suite Terms and
              Conditions.
            </span>
          </label>
        </div>
      ) : null}

      <div className={styles.actionRow}>
        {summary.canStartSubscription && !grandfatheredCheckout ? (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onStartSubscription?.()}
            disabled={
              mutationsDisabled ||
              actionState?.pendingAction !== null ||
              !agreementAccepted
            }
          >
            {actionState?.pendingAction === 'subscribe'
              ? 'Opening checkout...'
              : 'Stripe Billing and Payments'}
          </button>
        ) : null}
        {summary.canManageBilling && !summary.canStartSubscription ? (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onManageBilling?.()}
            disabled={mutationsDisabled || actionState?.pendingAction !== null}
          >
            {actionState?.pendingAction === 'manage'
              ? 'Opening portal...'
              : 'Stripe Billing and Payments'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ReferralProgramCard({
  referral,
}: {
  referral: AccountBillingDashboardResult['referral']
}) {
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'link' | null>(null)
  const canCopyCode = Boolean(referral.code)
  const canCopyLink = Boolean(referral.link)

  async function copyReferralValue(
    target: 'code' | 'link',
    value: string | null,
  ) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedTarget(target)
    window.setTimeout(() => setCopiedTarget(null), 1800)
  }

  return (
    <div className={styles.referralCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Referral program</div>
          <div className={styles.accountMuted}>
            Share your code. After a referred rep has three paid subscription
            months, your account gets one month credited.
          </div>
        </div>
      </div>

      <div className={styles.referralCodePanel}>
        <div className={styles.referralCodeBlock}>
          <span className={styles.walletTransactionDate}>Your code</span>
          <strong>{referral.code ?? 'Generating soon'}</strong>
        </div>
        <div className={styles.referralActions}>
          <button
            type="button"
            className={styles.secondaryActionButton}
            disabled={!canCopyCode}
            onClick={() => copyReferralValue('code', referral.code)}
          >
            {copiedTarget === 'code' ? 'Copied' : 'Copy code'}
          </button>
          <button
            type="button"
            className={styles.secondaryActionButton}
            disabled={!canCopyLink}
            onClick={() => copyReferralValue('link', referral.link)}
          >
            {copiedTarget === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>

      {referral.link ? (
        <div className={styles.referralLinkValue}>{referral.link}</div>
      ) : null}

      <div className={styles.referralStats} aria-label="Referral status counts">
        <span>{referral.pendingCount} pending</span>
        <span>{referral.earnedCount} earned</span>
        <span>{referral.creditedCount} credited</span>
      </div>
    </div>
  )
}

export function ShowCalendarCard({
  state,
  referenceDate,
}: {
  state: CalendarState
  referenceDate?: Date
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => referenceDate ?? new Date())

  useEffect(() => {
    if (referenceDate) setVisibleMonthDate(referenceDate)
  }, [referenceDate])

  if (state.status === 'error') {
    return (
      <div className={styles.calendarFallback}>
        Show calendar will appear here once calendar data loads.
      </div>
    )
  }

  if (state.status !== 'ready' || !state.summary) {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const calendarEvents = [
    ...state.summary.upcomingEvents,
    ...state.summary.recentEvents,
  ]
  const metrics = getShowCalendarMetrics(
    state.summary.upcomingEvents,
    state.summary.recentEvents,
    visibleMonthDate,
    calendarEvents,
  )
  const calendarCells = buildShowCalendarCells(
    calendarEvents,
    visibleMonthDate,
  )
  const selectedEventDetails = selectedEvent
    ? getCalendarEventDetailGroups(selectedEvent)
    : []

  return (
    <div className={styles.calendarCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Calendar</div>
          <div className={styles.cardSubtitle}>
            Review upcoming shows, recent history, and what is visible on the public calendar.
          </div>
        </div>
        <span className={styles.rosterTag}>
          Read-only here. Ask Nic-Nac to add or edit shows.
        </span>
      </div>
      <div className={styles.metricGrid}>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Upcoming</span>
          <span className={styles.metricValue}>{metrics.upcomingCount}</span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>This month</span>
          <span className={styles.metricValue}>{metrics.thisMonthCount}</span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Recurring</span>
          <span className={styles.metricValue}>{metrics.recurringCount}</span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Recently wrapped</span>
          <span className={styles.metricValue}>{metrics.recentCount}</span>
        </div>
      </div>
      <div className={styles.calendarHeader}>
        <div className={styles.walletSettingsTitle}>{metrics.monthLabel}</div>
        <div className={styles.calendarNavControls} aria-label="Calendar month navigation">
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setVisibleMonthDate((current) => addCalendarMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setVisibleMonthDate(new Date())}
            aria-label="Current month"
          >
            Today
          </button>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setVisibleMonthDate((current) => addCalendarMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.calendarWeekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.calendarWeekday}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.calendarGrid}>
        {calendarCells.map((cell) => (
          <div
            key={cell.isoDate}
            className={`${styles.calendarCell} ${
              cell.isCurrentMonth ? '' : styles.calendarCellMuted
            } ${cell.events.length > 0 ? styles.calendarCellActive : ''} ${
              cell.isToday ? styles.calendarCellToday : ''
            }`}
          >
            <span className={styles.calendarCellDay}>{cell.dayNumber}</span>
            <div className={styles.calendarCellEvents}>
              {cell.events.slice(0, 2).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`${styles.calendarEventPill} ${getCalendarStatusClassName(event)}`}
                  onClick={() => setSelectedEvent(event)}
                  aria-label={`View details for ${getCalendarEventTitle(event)}`}
                >
                  {getCalendarEventStatusLabel(event)}: {getCalendarEventTitle(event)}
                </button>
              ))}
              {cell.events.length > 2 ? (
                <span className={styles.calendarEventMore}>
                  +{cell.events.length - 2} more
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.calendarPanels}>
        <div className={styles.calendarPanel}>
          <div className={styles.walletSettingsTitle}>Next up</div>
          <div className={styles.walletTransactionList}>
            {state.summary.upcomingEvents.length === 0 ? (
              <div className={styles.emptyState}>No upcoming shows on the calendar yet.</div>
            ) : (
              state.summary.upcomingEvents.slice(0, 4).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`${styles.walletTransactionRow} ${styles.calendarEventDetailButton}`}
                  onClick={() => setSelectedEvent(event)}
                  aria-label={`View details for ${getCalendarEventTitle(event)}`}
                >
                  <div className={styles.walletTransactionCopy}>
                    <span className={styles.walletTransactionTitle}>
                      {getCalendarEventTitle(event)}
                    </span>
                    <span className={styles.walletTransactionDate}>
                      {formatCalendarEventDate(event.eventTime, event.timeZone)} at{' '}
                      {formatCalendarEventTime(event.eventTime, event.timeZone)} on{' '}
                      {event.platform}
                    </span>
                  </div>
                  <div className={styles.timelineList}>
                    <span
                      className={`${styles.timelineItem} ${getCalendarStatusClassName(event)}`}
                    >
                      {getCalendarEventStatusLabel(event)}
                    </span>
                    {event.isRecurring ? (
                      <span className={styles.timelineItem}>Recurring</span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <div className={styles.calendarPanel}>
          <div className={styles.walletSettingsTitle}>Recently wrapped</div>
          <div className={styles.walletTransactionList}>
            {state.summary.recentEvents.length === 0 ? (
              <div className={styles.emptyState}>No completed or cancelled shows yet.</div>
            ) : (
              state.summary.recentEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`${styles.walletTransactionRow} ${styles.calendarEventDetailButton}`}
                  onClick={() => setSelectedEvent(event)}
                  aria-label={`View details for ${getCalendarEventTitle(event)}`}
                >
                  <div className={styles.walletTransactionCopy}>
                    <span className={styles.walletTransactionTitle}>
                      {getCalendarEventTitle(event)}
                    </span>
                    <span className={styles.walletTransactionDate}>
                      {formatCalendarEventDate(event.eventTime, event.timeZone)} on{' '}
                      {event.platform}
                    </span>
                  </div>
                  <span
                    className={`${styles.timelineItem} ${getCalendarStatusClassName(event)}`}
                  >
                    {getCalendarEventStatusLabel(event)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      {selectedEvent ? (
        <div
          className={styles.calendarEventDialogBackdrop}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className={styles.calendarEventDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.calendarEventDialogHeader}>
              <div>
                <div
                  id="calendar-event-dialog-title"
                  className={styles.calendarEventDialogTitle}
                >
                  {getCalendarEventTitle(selectedEvent)}
                </div>
                <div className={styles.calendarEventDialogSubtitle}>
                  {formatCalendarEventDate(selectedEvent.eventTime, selectedEvent.timeZone)} at{' '}
                  {formatCalendarEventTime(selectedEvent.eventTime, selectedEvent.timeZone)}
                </div>
              </div>
              <button
                type="button"
                className={styles.calendarEventDialogClose}
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.calendarEventDetailGrid}>
              {selectedEventDetails.map((detail) => (
                <div key={detail.label} className={styles.calendarEventDetailRow}>
                  <span className={styles.calendarEventDetailLabel}>{detail.label}</span>
                  {detail.items ? (
                    <ul className={styles.calendarEventDetailList}>
                      {detail.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className={styles.calendarEventDetailValue}>
                      {detail.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function WalletSummaryCard({
  state,
  actionState,
  autoRechargeDraft,
  onAutoRechargeDraftChange,
  onSaveAutoRechargeSettings,
  onLoadWallet,
  statusMessage,
  mutationsDisabled = false,
}: {
  state: WalletState
  actionState?: WalletActionState
  autoRechargeDraft?: WalletAutoRechargeDraft | null
  onAutoRechargeDraftChange?: (
    patch: Partial<WalletAutoRechargeDraft>,
  ) => void
  onSaveAutoRechargeSettings?: () => void
  onLoadWallet?: (amountCents: number) => void
  statusMessage?: string | null
  mutationsDisabled?: boolean
}) {
  if (state.status === 'error') {
    return (
      <div className={styles.walletFallback}>
        {mutationsDisabled
          ? 'SMS Wallet billing details are unavailable during support access. Funding and auto-recharge changes remain disabled.'
          : 'Wallet details will show here once billing data loads.'}
      </div>
    )
  }

  if (state.status !== 'ready' || !state.summary) {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const summary = {
    ...state.summary,
    estimatedTextsRemaining: getEstimatedTextsRemaining(state.summary.balanceMils),
  }
  const loadOptions = getWalletLoadOptions(summary)
  const thresholdOptions = getAutoRechargeThresholdOptions(summary)
  const amountOptions = getAutoRechargeAmountOptions(
    summary,
    autoRechargeDraft?.thresholdCents ?? getAutoRechargeDraft(summary).thresholdCents,
  )
  const reloadHistory = getWalletReloadHistory(summary.recentTransactions)

  return (
    <div className={styles.walletCard}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>SMS Wallet</div>
          <div className={styles.cardSubtitle}>
            Monitor text balance, reloads, and auto-recharge from one account view.
          </div>
        </div>
        <span className={styles.rosterTag}>
          {summary.autoRechargeEnabled ? 'Auto-recharge on' : 'Auto-recharge off'}
        </span>
      </div>
      <div className={styles.metricGrid}>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Current balance</span>
          <span className={styles.metricValue}>
            {formatWalletAmount(summary.balanceMils)}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Texts left</span>
          <span className={styles.metricValue}>
            {summary.estimatedTextsRemaining}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Threshold</span>
          <span className={styles.metricValue}>
            {formatWalletAmount(summary.autoRechargeThresholdMils)}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Reload</span>
          <span className={styles.metricValue}>
            {formatWalletAmount(summary.autoRechargeAmountMils)}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Tracked texts this month</span>
          <span className={styles.metricValue}>
            {summary.messagesSentThisMonth}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>SMS spend</span>
          <span className={styles.metricValue}>
            {formatWalletAmount(summary.messagesSpendThisMonthMils)}
          </span>
        </div>
      </div>
      <div className={styles.walletMetaRow}>
        <span className={styles.rosterTag}>
          Threshold {formatWalletAmount(summary.autoRechargeThresholdMils)}
        </span>
        <span className={styles.rosterTag}>
          Reload {formatWalletAmount(summary.autoRechargeAmountMils)}
        </span>
        <span className={styles.rosterTag}>
          Min load {formatWalletAmount(summary.minimumLoadAmountMils)}
        </span>
        {summary.autoRechargePending ? (
          <span className={styles.walletPendingTag}>Recharge pending</span>
        ) : null}
      </div>
      <div className={styles.walletTimeline}>
        <span className={styles.walletTimelineLabel}>
          Last load {formatWalletDate(summary.lastLoadedAt)}
        </span>
      </div>
      {autoRechargeDraft ? (
        <div className={styles.walletSettingsPanel}>
          <div className={styles.walletSettingsTitle}>Auto-recharge settings</div>
          <label className={styles.walletToggleRow}>
            <span className={styles.searchLabel}>Enable auto-recharge</span>
            <input
              type="checkbox"
              checked={autoRechargeDraft.enabled}
              disabled={mutationsDisabled}
              onChange={(event) =>
                onAutoRechargeDraftChange?.({ enabled: event.target.checked })
              }
            />
          </label>
          <div className={styles.walletSettingsGrid}>
            <label className={styles.sortField}>
              <span className={styles.sortLabel}>Threshold trigger</span>
              <select
                value={autoRechargeDraft.thresholdCents}
                className={styles.sortSelect}
                disabled={mutationsDisabled}
                onChange={(event) =>
                  onAutoRechargeDraftChange?.({
                    thresholdCents: Number.parseInt(event.target.value, 10),
                  })
                }
              >
                {thresholdOptions.map((option) => (
                  <option key={option.amountCents} value={option.amountCents}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.sortField}>
              <span className={styles.sortLabel}>Reload amount</span>
              <select
                value={autoRechargeDraft.amountCents}
                className={styles.sortSelect}
                disabled={mutationsDisabled}
                onChange={(event) =>
                  onAutoRechargeDraftChange?.({
                    amountCents: Number.parseInt(event.target.value, 10),
                  })
                }
              >
                {amountOptions.map((option) => (
                  <option key={option.amountCents} value={option.amountCents}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.bulkActionButton}
              disabled={
                mutationsDisabled ||
                actionState?.pendingSettings ||
                !onSaveAutoRechargeSettings
              }
              onClick={() => onSaveAutoRechargeSettings?.()}
            >
              {actionState?.pendingSettings ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      ) : null}
      <div className={styles.walletReferencePanel}>
        <div className={styles.walletSettingsTitle}>Billing reference</div>
        <div className={styles.walletReferenceList}>
          <span className={styles.timelineItem}>
            Approved SMS sends cost {formatWalletAmount(SMS_CHARGE_MILS)}
          </span>
          <span className={styles.timelineItem}>
            Minimum wallet load is {formatWalletAmount(summary.minimumLoadAmountMils)}
          </span>
          <span className={styles.timelineItem}>
            This month: {summary.messagesSentThisMonth} texts for{' '}
            {formatWalletAmount(summary.messagesSpendThisMonthMils)}
          </span>
        </div>
      </div>
      {actionState?.error ? (
        <div className={styles.actionError}>{actionState.error}</div>
      ) : null}
      {statusMessage ? (
        <div className={styles.helperMessage}>{statusMessage}</div>
      ) : null}
      <div className={styles.bulkActions}>
        {loadOptions.map((option) => (
          <button
            key={option.amountCents}
            type="button"
            className={styles.bulkActionButton}
            disabled={
              mutationsDisabled ||
              !onLoadWallet ||
              actionState?.pendingAmountCents === option.amountCents
            }
            onClick={() => onLoadWallet?.(option.amountCents)}
          >
            {actionState?.pendingAmountCents === option.amountCents
              ? 'Opening...'
              : option.label}
          </button>
        ))}
      </div>
      <div className={styles.walletSettingsTitle}>Reload history</div>
      <div className={styles.walletTransactionList}>
        {reloadHistory.length === 0 ? (
          <div className={styles.emptyState}>No reload history yet.</div>
        ) : (
          reloadHistory.map((transaction) => (
            <div key={transaction.id} className={styles.walletTransactionRow}>
              <div className={styles.walletTransactionCopy}>
                <span className={styles.walletTransactionTitle}>
                  {getWalletTransactionLabel(transaction)}
                </span>
                <span className={styles.walletTransactionDate}>
                  {formatWalletDate(transaction.createdAt)}
                </span>
              </div>
              <span className={styles.walletTransactionAmount}>
                {getWalletTransactionAmountPrefix(transaction.type)}
                {formatWalletAmount(transaction.amountMils)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function CustomerRosterCard({
  state,
  activeFilter,
  onFilterChange,
  customersOverride,
  searchQuery = '',
  onSearchQueryChange,
  sortOrder = 'newest',
  onSortOrderChange,
  actionState,
  onUnsubscribe,
  onCopySignupLink,
  onCopyVisibleContacts,
  activeComposerAudienceId,
  composerSubject,
  composerBody,
  composerPending,
  onOpenEmailComposer,
  onCloseEmailComposer,
  onComposerSubjectChange,
  onComposerBodyChange,
  onSendEmail,
  onCreate,
  onUpdate,
  onImport,
  readOnly = false,
}: {
  state: AudienceState
  activeFilter: RosterFilter
  onFilterChange: (filter: RosterFilter) => void
  customersOverride?: CustomerAudienceMember[]
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  sortOrder?: RosterSort
  onSortOrderChange?: (value: RosterSort) => void
  actionState?: AudienceActionState
  onUnsubscribe?: (audienceId: string, channel: 'sms' | 'email') => void
  onCopySignupLink?: () => void
  onCopyVisibleContacts?: (
    customers: CustomerAudienceMember[],
    channel: 'sms' | 'email',
  ) => void
  activeComposerAudienceId?: string | null
  composerSubject?: string
  composerBody?: string
  composerPending?: boolean
  onOpenEmailComposer?: (customer: CustomerAudienceMember) => void
  onCloseEmailComposer?: () => void
  onComposerSubjectChange?: (value: string) => void
  onComposerBodyChange?: (value: string) => void
  onSendEmail?: () => void
  onCreate?: (profile: CustomerProfileInput) => Promise<void> | void
  onUpdate?: (
    audienceId: string,
    profile: CustomerProfileInput,
  ) => Promise<void> | void
  onImport?: (
    contacts: CustomerAudienceImportInput[],
  ) => Promise<CustomerAudienceImportResult>
  readOnly?: boolean
}) {
  const emptyProfile = (): CustomerProfileInput => ({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    favoriteGemOrStone: '',
    favoriteMaterial: '',
    favoriteCut: '',
    favoriteCollection: '',
    notes: '',
    tags: '',
  })
  const profileFromCustomer = (customer: CustomerProfile): CustomerProfileInput => ({
    ...emptyProfile(),
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
    birthday: customer.birthday ?? '',
    favoriteGemOrStone: customer.favoriteGemOrStone ?? '',
    favoriteMaterial: customer.favoriteMaterial ?? '',
    favoriteCut: customer.favoriteCut ?? '',
    favoriteCollection: customer.favoriteCollection ?? '',
    notes: customer.notes ?? '',
    tags: customer.tags ?? '',
  })
  const [editor, setEditor] = useState<{
    audienceId: string | null
    profile: CustomerProfileInput
    pending: boolean
    error: string | null
  } | null>(null)
  const [importState, setImportState] = useState<{
    contacts: CustomerAudienceImportInput[]
    pending: boolean
    error: string | null
    success: string | null
  } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const openCreate = () =>
    setEditor({ audienceId: null, profile: emptyProfile(), pending: false, error: null })
  const openEdit = (customer: CustomerProfile) =>
    setEditor({
      audienceId: customer.id,
      profile: profileFromCustomer(customer),
      pending: false,
      error: null,
    })
  const updateEditorField = (field: keyof CustomerProfileInput, value: string) =>
    setEditor((current) =>
      current ? { ...current, profile: { ...current.profile, [field]: value } } : current,
    )
  const saveEditor = async () => {
    if (!editor) return
    if (!editor.profile.name.trim()) {
      setEditor((current) => current ? { ...current, error: 'A name is needed to save this customer.' } : current)
      return
    }
    setEditor((current) => current ? { ...current, pending: true, error: null } : current)
    try {
      if (editor.audienceId) {
        await onUpdate?.(editor.audienceId, editor.profile)
      } else {
        await onCreate?.(editor.profile)
      }
      setEditor(null)
    } catch (error) {
      setEditor((current) => current ? {
        ...current,
        pending: false,
        error: error instanceof Error ? error.message : 'Unable to save this customer.',
      } : current)
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const contacts = await parseCustomerImportFile(file)
      setImportState({ contacts, pending: false, error: null, success: null })
    } catch (error) {
      setImportState({
        contacts: [],
        pending: false,
        error: error instanceof Error ? error.message : 'Unable to read that spreadsheet.',
        success: null,
      })
    } finally {
      event.target.value = ''
    }
  }

  const saveImport = async () => {
    if (!importState?.contacts.length || !onImport) return
    setImportState((current) => current ? { ...current, pending: true, error: null, success: null } : current)
    try {
      const result = await onImport(importState.contacts)
      const skipped = result.skipped.length ? ` ${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} skipped.` : ''
      setImportState({
        contacts: [],
        pending: false,
        error: null,
        success: `${result.createdCount} added and ${result.updatedCount} updated.${skipped}`,
      })
    } catch (error) {
      setImportState((current) => current ? {
        ...current,
        pending: false,
        error: error instanceof Error ? error.message : 'Unable to import this customer list.',
      } : current)
    }
  }

  const downloadCustomerExport = async (
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault()
    setExportError(null)
    try {
      const response = await fetch('/api/nic-nac/customer-audience?format=csv', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Customer export request failed: ${response.status}`)
      }
      if (!(response.headers.get('content-type') ?? '').includes('text/csv')) {
        throw new Error('Customer export did not return a CSV file.')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') ?? ''
      const filename =
        disposition.match(/filename="?([^";]+)"?/i)?.[1] ??
        'sparkle-suite-customers.csv'
      const objectUrl = URL.createObjectURL(blob)
      const download = document.createElement('a')
      download.href = objectUrl
      download.download = filename
      document.body.appendChild(download)
      download.click()
      download.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Unable to download this customer list.',
      )
    }
  }

  if (state.status === 'error') {
    return (
      <div className={styles.rosterFallback}>
        Customer audience will show here once it loads.
      </div>
    )
  }

  if (state.status !== 'ready' || !state.summary) {
    return (
      <div className={styles.cardFill}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLineShort} />
      </div>
    )
  }

  const filteredCustomers = sortRosterCustomers(
    searchRosterCustomers(
      customersOverride ?? filterRosterCustomers(state.customers ?? [], activeFilter),
      searchQuery,
    ),
    sortOrder,
  )
  const duplicateSourceCustomers = customersOverride ?? state.customers ?? []
  const optedOutCount =
    state.summary.smsOptedOutCount + state.summary.emailOptedOutCount

  return (
    <div className={styles.rosterCard}>
      <div className={styles.rosterHeadingRow}>
        <div>
          <h2 className={styles.rosterHeading}>Customer List</h2>
          <p className={styles.rosterIntro}>Keep the details your customers choose to share in one place.</p>
        </div>
        {!readOnly ? <div className={styles.rosterPrimaryActions}>
          <button type="button" className={styles.bulkActionButton} onClick={openCreate} disabled={!onCreate}>
            Add customer
          </button>
          <label className={styles.bulkActionButton}>
            Import spreadsheet
            <input
              className={styles.customerImportInput}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImportFile}
              disabled={!onImport || importState?.pending}
            />
          </label>
          <a
            className={styles.bulkActionButton}
            href="/api/nic-nac/customer-audience?format=csv"
            download
            onClick={(event) => void downloadCustomerExport(event)}
          >
            <Download size={16} aria-hidden="true" />
            Download full list (CSV)
          </a>
        </div> : null}
      </div>
      {exportError ? (
        <div className={styles.actionError} role="alert">
          {exportError}
        </div>
      ) : null}
      <div className={styles.metricGrid}>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Total</span>
          <span className={styles.metricValue}>{state.summary.totalCustomers}</span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>SMS</span>
          <span className={styles.metricValue}>
            {state.summary.smsReachableCount}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Email</span>
          <span className={styles.metricValue}>
            {state.summary.emailReachableCount}
          </span>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Opted out</span>
          <span className={styles.metricValue}>{optedOutCount}</span>
        </div>
      </div>
      <div className={styles.rosterMetaRow}>
        <span className={styles.rosterTag}>
          +{state.summary.addedLast30DaysCount} in last 30 days
        </span>
        <div className={styles.filterBar} role="toolbar" aria-label="Filter roster">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.filterButton} ${
                activeFilter === option.value ? styles.filterButtonActive : ''
              }`}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <label className={styles.searchField}>
        <span className={styles.searchLabel}>Search customers</span>
        <input
          type="search"
          value={searchQuery}
          className={styles.searchInput}
          placeholder="Name, phone, or email"
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
        />
      </label>
      <label className={styles.sortField}>
        <span className={styles.sortLabel}>Sort roster</span>
        <select
          value={sortOrder}
          className={styles.sortSelect}
          onChange={(event) => onSortOrderChange?.(event.target.value as RosterSort)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {!readOnly ? <div className={styles.bulkActions}>
        <button
          type="button"
          className={styles.bulkActionButton}
          onClick={() => onCopyVisibleContacts?.(filteredCustomers, 'sms')}
        >
          Copy visible SMS
        </button>
        <button
          type="button"
          className={styles.bulkActionButton}
          onClick={() => onCopyVisibleContacts?.(filteredCustomers, 'email')}
        >
          Copy visible emails
        </button>
      </div> : null}
      <div className={styles.customerList} role="list" aria-label="Customer roster">
        {actionState?.error ? (
          <div className={styles.actionError}>{actionState.error}</div>
        ) : null}
        {actionState?.helperMessage ? (
          <div className={styles.helperMessage}>{actionState.helperMessage}</div>
        ) : null}
        {filteredCustomers.length === 0 ? (
          <div className={styles.emptyState}>No customers match this filter yet.</div>
        ) : (
          filteredCustomers.map((customer) => {
            const statuses = getCustomerChannelStatuses(customer)
            const timelineEntries = getCustomerTimeline(customer)
            const profileDetails = getCustomerProfileDetails(customer)
            const duplicateSummary = getCustomerDuplicateSummary(
              customer,
              duplicateSourceCustomers,
            )
            const isComposerOpen = activeComposerAudienceId === customer.id

            return (
              <div key={customer.id} className={styles.customerRow} role="listitem">
              <div className={styles.customerIdentity}>
                <span className={styles.customerName}>{customer.name}</span>
                <span className={styles.customerDate}>
                  Joined {formatRosterDate(customer.createdAt)}
                </span>
              </div>
              <div className={styles.customerContact}>
                <span>{customer.phone ?? 'No phone saved'}</span>
                <span>{customer.email ?? 'No email saved'}</span>
              </div>
              <div className={styles.badgeRow}>
                {getCustomerBadges(customer).map((badge) => (
                  <span
                    key={`${customer.id}-${badge.text}`}
                    className={`${styles.statusBadge} ${
                      badge.tone === 'positive'
                        ? styles.statusBadgePositive
                        : badge.tone === 'warning'
                          ? styles.statusBadgeWarning
                          : styles.statusBadgeNeutral
                    }`}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
              <div className={styles.statusGrid}>
                <div className={styles.statusDetail}>
                  <span className={styles.statusDetailLabel}>SMS status</span>
                  <span className={styles.statusDetailValue}>{statuses.sms}</span>
                </div>
                <div className={styles.statusDetail}>
                  <span className={styles.statusDetailLabel}>Email status</span>
                  <span className={styles.statusDetailValue}>{statuses.email}</span>
                </div>
              </div>
              {profileDetails.length ? (
                <dl
                  className={styles.customerProfileDetails}
                  aria-label={`Details for ${customer.name}`}
                >
                  {profileDetails.map((detail) => (
                    <div key={`${customer.id}-${detail.label}`} className={styles.customerProfileDetail}>
                      <dt>{detail.label}</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {!readOnly ? <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.helperButton}
                  disabled={!onUpdate}
                  onClick={() => openEdit(customer as CustomerProfile)}
                >
                  Edit details
                </button>
                {getCustomerActions(customer).map((action) => {
                  const actionKey = `${customer.id}:${action.channel}`
                  return (
                    <button
                      key={actionKey}
                      type="button"
                      className={styles.actionButton}
                      disabled={
                        !onUnsubscribe || actionState?.pendingKey === actionKey
                      }
                      onClick={() => onUnsubscribe?.(customer.id, action.channel)}
                    >
                      {actionState?.pendingKey === actionKey
                        ? 'Saving...'
                        : action.label}
                    </button>
                  )
                })}
                {getCustomerOutreachActions(customer).map((action) => (
                  <button
                    key={`${customer.id}-${action.kind}`}
                    type="button"
                    className={styles.helperButton}
                    disabled={!onOpenEmailComposer}
                    onClick={() => onOpenEmailComposer?.(customer)}
                  >
                    {action.label}
                  </button>
                ))}
                {getCustomerRecoveryActions(customer).map((action) =>
                  action.kind === 'open_signup' ? (
                    <a
                      key={`${customer.id}-${action.kind}`}
                      className={styles.helperLink}
                      href={SIGNUP_FORM_PATH}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {action.label}
                    </a>
                  ) : (
                    <button
                      key={`${customer.id}-${action.kind}`}
                      type="button"
                      className={styles.helperButton}
                      onClick={() => onCopySignupLink?.()}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div> : null}
              {isComposerOpen ? (
                <div className={styles.emailComposer}>
                  <label className={styles.searchField}>
                    <span className={styles.searchLabel}>Email subject</span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      value={composerSubject ?? ''}
                      onChange={(event) =>
                        onComposerSubjectChange?.(event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.searchField}>
                    <span className={styles.searchLabel}>Email message</span>
                    <textarea
                      className={styles.emailComposerTextarea}
                      value={composerBody ?? ''}
                      onChange={(event) =>
                        onComposerBodyChange?.(event.target.value)
                      }
                    />
                  </label>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      disabled={!onSendEmail || composerPending}
                      onClick={() => onSendEmail?.()}
                    >
                      {composerPending ? 'Sending...' : 'Send email'}
                    </button>
                    <button
                      type="button"
                      className={styles.helperButton}
                      disabled={composerPending}
                      onClick={() => onCloseEmailComposer?.()}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <div className={styles.timelineList}>
                {timelineEntries.map((entry) => (
                  <span key={`${customer.id}-${entry}`} className={styles.timelineItem}>
                    {entry}
                  </span>
                ))}
              </div>
              {needsFreshOptIn(customer) ? (
                <div className={styles.helperNote}>
                  Fresh consent must come from the customer.
                </div>
              ) : null}
              {duplicateSummary ? (
                <div className={styles.duplicateWarning}>{duplicateSummary}</div>
              ) : null}
              </div>
            )
          })
        )}
      </div>
      {editor ? (
        <section className={styles.customerEditor} aria-label={editor.audienceId ? 'Edit customer' : 'Add customer'}>
          <div className={styles.rosterHeadingRow}>
            <div>
              <h3 className={styles.editorHeading}>{editor.audienceId ? 'Edit customer' : 'Add customer'}</h3>
              <p className={styles.rosterIntro}>Profile details are editable. Email and SMS consent remain customer-controlled.</p>
            </div>
            <button type="button" className={styles.helperButton} onClick={() => setEditor(null)} disabled={editor.pending}>Close</button>
          </div>
          <div className={styles.customerEditorGrid}>
            {([
              ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address'],
              ['birthday', 'Birthday'], ['favoriteGemOrStone', 'Favorite gem or stone'],
              ['favoriteMaterial', 'Favorite material'], ['favoriteCut', 'Favorite cut'],
              ['favoriteCollection', 'Favorite collection'], ['tags', 'Tags'],
            ] as [keyof CustomerProfileInput, string][]).map(([field, label]) => (
              <label key={field} className={styles.sortField}>
                <span className={styles.sortLabel}>{label}</span>
                <input
                  className={styles.searchInput}
                  type={field === 'email' ? 'email' : 'text'}
                  inputMode={field === 'birthday' ? 'numeric' : undefined}
                  placeholder={field === 'birthday' ? 'MM-DD' : undefined}
                  value={editor.profile[field]}
                  onChange={(event) => updateEditorField(field, event.target.value)}
                />
              </label>
            ))}
            <label className={styles.sortFieldWide}>
              <span className={styles.sortLabel}>Notes</span>
              <textarea className={styles.emailComposerTextarea} value={editor.profile.notes} onChange={(event) => updateEditorField('notes', event.target.value)} />
            </label>
          </div>
          {editor.error ? <div className={styles.actionError}>{editor.error}</div> : null}
          <div className={styles.actionRow}>
            <button type="button" className={styles.actionButton} onClick={saveEditor} disabled={editor.pending || (!onCreate && !editor.audienceId) || (!onUpdate && Boolean(editor.audienceId))}>
              {editor.pending ? 'Saving...' : 'Save customer'}
            </button>
            <button type="button" className={styles.helperButton} onClick={() => setEditor(null)} disabled={editor.pending}>Cancel</button>
          </div>
        </section>
      ) : null}
      {importState ? (
        <section className={styles.customerEditor} aria-label="Import customer list">
          <div className={styles.rosterHeadingRow}>
            <div>
              <h3 className={styles.editorHeading}>Import customer list</h3>
              <p className={styles.rosterIntro}>
                {importState.contacts.length
                  ? `${importState.contacts.length} rows are ready to review.`
                  : 'Choose a CSV or Excel spreadsheet to import.'}
                {' '}Imported contacts do not receive SMS or email consent automatically.
              </p>
            </div>
            <button type="button" className={styles.helperButton} onClick={() => setImportState(null)} disabled={importState.pending}>Close</button>
          </div>
          <p className={styles.customerImportHint}>
            We recognize columns such as Name, First name, Last name, Email, Phone, Address, Birthday, Favorite gem or stone, Material, Cut, Collection, Notes, and Tags. Existing contacts match by email or phone within your workspace.
          </p>
          {importState.error ? <div className={styles.actionError}>{importState.error}</div> : null}
          {importState.success ? <div className={styles.helperMessage}>{importState.success}</div> : null}
          {importState.contacts.length ? (
            <div className={styles.actionRow}>
              <button type="button" className={styles.actionButton} onClick={saveImport} disabled={importState.pending || !onImport}>
                {importState.pending ? 'Importing...' : `Import ${importState.contacts.length} customer${importState.contacts.length === 1 ? '' : 's'}`}
              </button>
              <label className={styles.helperButton}>
                Choose another file
                <input className={styles.customerImportInput} type="file" accept=".csv,.xlsx" onChange={handleImportFile} disabled={importState.pending} />
              </label>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
