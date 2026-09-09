// Source of truth for shared service-layer types. Imports flow OUT of this
// file; nothing in `types.ts` imports from another service file. trade-board.ts,
// trade-requests.ts, trade-fulfillment.ts, and jewelry-database.ts all import
// types from here. trade-board.ts re-exports the legacy types for backward
// compatibility with the existing 4 callers of @/lib/services/trade-board.

// ============================================================================
// Postgres enums — mirrored verbatim from supabase/migrations/006_*.sql
// Do NOT add values that don't exist in the DB.
// ============================================================================

export type ListingStatus = 'available' | 'pending_trade' | 'traded' | 'removed'
export type TradeRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'
export type FulfillmentStatus = 'approved' | 'shipped' | 'completed'
export type JewelryType = 'RG' | 'NK' | 'ER' | 'ST' | 'BR'
export type ListingSource = 'catalog' | 'non_item_number'
export type RemovalReason = 'sold' | 'keeping' | 'mistake' | 'other'
export type RejectionReason = 'msrp_mismatch' | 'not_interested' | 'changed_mind' | 'other'

// ============================================================================
// trade-board domain — existing types (preserved shape)
// ============================================================================

export interface TradeListingDesign {
  id: string
  item_number: string
  design_name: string
  material: string | null
  main_stone: string | null
  bp_msrp: number | null
  canonical_photo_url: string | null
  type_prefix: JewelryType
  collection: { id: string; name: string } | null
}

export interface TradeListingWithDesign {
  id: string
  rep_id: string
  /** Physical copies represented by this single visible Dance Floor dancer. */
  quantity_available?: number
  listing_source?: ListingSource
  status: ListingStatus
  rep_notes: string | null
  trade_preferences: string | null
  ring_size?: string | null
  listing_photo_url: string | null
  uses_canonical_photo: boolean
  manual_type_prefix?: JewelryType | null
  manual_collection_family?: string | null
  manual_collection_name?: string | null
  manual_size?: string | null
  manual_photo_url?: string | null
  listed_at: string | null
  removal_reason: RemovalReason | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  design: TradeListingDesign | null
}

export interface BoardResult {
  listings: TradeListingWithDesign[]
  summary: {
    totalPieces: number
    totalMsrp: number
    typeBreakdown: Record<JewelryType, number>
    pendingRequestCount: number
  }
}

export interface RemoveListingResult {
  listingId: string
  designName: string
  previousStatus: ListingStatus
  cancelledRequestId?: string
  cancelledRequestCustomerName?: string
}

export interface RestoreListingInput {
  listingId?: string
  itemNumber?: string
}

export interface RestoreListingResult {
  listingId: string
  designName: string
  status: 'available'
  deletedAt: string
  recoveryWindowDays: 7 | 30
}

export interface PurgeRemovedListingsResult {
  purgedCount: number
  cutoffIso: string
}

export interface GetMyBoardFilters {
  statusFilter?: ListingStatus
  collectionFilter?: string
  typeFilter?: JewelryType
  sortBy?: 'created_at' | 'listed_at' | 'msrp' | 'design_name' | 'collection'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ============================================================================
// trade-board domain — new types
// ============================================================================

export interface AddListingInput {
  itemNumber: string
  /** Exact internal catalog variant selected by a trusted Sparkle Suite surface. */
  designId?: string
  clickwrapAccepted?: boolean
  collectionName?: string
  collectionYear?: number
  material?: string
  mainStone?: string
  ringSize?: string
  repNotes?: string
  tradePreferences?: string
  listingPhotoUrl?: string // when omitted, falls back to canonical photo
  /** Stable key for replaying one logical physical-piece add. */
  idempotencyKey?: string
  /** Stable digest of the logical add inputs; guards key reuse with new data. */
  inputSignature?: string
}

export interface AddListingResult {
  listingId: string
  designId: string
  itemNumber: string
  designName: string
  status: ListingStatus
  usesCanonicalPhoto: boolean
  quantityAvailable: number
  groupedWithExisting: boolean
  /** True when this response confirms an earlier committed add instead of a new piece. */
  mutationReplayed: boolean
}

export interface BatchListingItem {
  itemNumber: string
  material?: string
  mainStone?: string
  ringSize?: string
  repNotes?: string
  tradePreferences?: string
  listingPhotoUrl?: string
  idempotencyKey?: string
  inputSignature?: string
}

export interface AddNonItemNumberListingInput {
  jewelryType: JewelryType
  collectionFamily: string
  collectionName?: string | null
  size?: string | null
  photoUrl: string
  repNotes?: string | null
  tradePreferences?: string | null
}

export interface AddNonItemNumberListingResult {
  listingId: string
  listingSource: 'non_item_number'
  displayName: string
  status: ListingStatus
}

export interface AddListingBatchInput {
  items: BatchListingItem[]
  clickwrapAccepted?: boolean
}

export interface AddListingBatchResult {
  added: AddListingResult[]
  pending: {
    needCollection: Array<{
      itemNumber: string
      designId: string
      designName: string
    }>
    needFullInfo: Array<{ itemNumber: string }>
  }
}

export interface UpdateListingInput {
  repNotes?: string | null
  tradePreferences?: string | null
  ringSize?: string | null
  listingPhotoUrl?: string | null
  // When true, clears listing_photo_url and sets uses_canonical_photo=true
  useCanonicalPhoto?: boolean
}

export interface UpdateListingResult {
  listingId: string
  status: ListingStatus
}

// ============================================================================
// calendar / show management domain
// ============================================================================

export type EventStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface DiscountCode {
  code: string
  description: string
}

export type StreamingDestinationPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'whatnot'
  | 'custom'

export interface StreamingDestinationInput {
  platform: string
  url: string
  label?: string
}

export interface StreamingDestination {
  platform: StreamingDestinationPlatform
  url: string
  label?: string
}

export interface RecurringShowInput {
  cadence: 'daily' | 'weekly' | 'weekday'
  duration: '1_month' | '3_months' | 'ongoing'
  occurrenceCount?: number
  mode?: 'exact_count' | 'series'
}

export interface CalendarEvent {
  id: string
  repId: string
  platform: string
  eventTime: string
  timeZone: string
  durationMinutes: number
  title: string | null
  description: string | null
  discountCodes: DiscountCode[]
  featuredCollections: string[] | null
  streamingDestinations?: StreamingDestination[]
  isRecurring: boolean
  recurrenceGroupId: string | null
  recurrenceRule: string | null
  status: EventStatus
  createdAt: string
  updatedAt: string
}

export interface AddShowInput {
  platform: string
  eventTime: string
  timeZone?: string
  durationMinutes?: number
  title?: string
  description?: string
  discountCodes?: DiscountCode[]
  featuredCollections?: string[]
  streamingDestinations?: StreamingDestinationInput[]
  recurring?: RecurringShowInput
}

export interface AddShowResult {
  events: CalendarEvent[]
  count: number
}

export interface ListShowsInput {
  status?: EventStatus | EventStatus[]
  upcoming?: boolean
  limit?: number
}

export interface ListShowsResult {
  events: CalendarEvent[]
  totalCount: number
}

export interface UpdateShowInput {
  platform?: string
  eventTime?: string
  timeZone?: string
  durationMinutes?: number
  title?: string
  description?: string
  discountCodes?: DiscountCode[]
  featuredCollections?: string[]
  streamingDestinations?: StreamingDestinationInput[]
  applyToSeries?: boolean
}

export interface UpdateShowResult {
  event: CalendarEvent
  updatedCount: number
}

export interface CancelShowResult {
  event: CalendarEvent
}

export interface CancelShowSeriesResult {
  events: CalendarEvent[]
  cancelledCount: number
}

export interface PauseShowSeriesResult {
  events: CalendarEvent[]
  pausedCount: number
  pauseUntil: string
}

export interface ShowStatusTransitionResult {
  event: CalendarEvent
}

export type ShowReminderChannel = 'sms' | 'email'

export interface ShowReminderPreferences {
  repId: string
  enabled: boolean
  channels: ShowReminderChannel[]
  leadMinutes: number
  includeDiscountCodes: boolean
  includeFeaturedCollections: boolean
  source: 'default' | 'saved'
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SetShowReminderPreferencesInput {
  enabled?: boolean
  channels?: ShowReminderChannel[]
  leadMinutes?: number
  includeDiscountCodes?: boolean
  includeFeaturedCollections?: boolean
}

export interface ShowReminderOverride {
  eventId: string
  repId: string
  enabled: boolean
  channels: ShowReminderChannel[]
  leadMinutes: number
  includeDiscountCodes: boolean
  includeFeaturedCollections: boolean
  source: 'event_override'
  createdAt?: string | null
  updatedAt?: string | null
}

export type SetShowReminderOverrideInput = SetShowReminderPreferencesInput

// ============================================================================
// trade-requests domain
// ============================================================================

export interface SubmitTradeRequestInput {
  listingId: string
  customerName: string
  customerDescription: string
  submissionId?: string
  clickwrapAcknowledged?: boolean
  expectedRepId?: string
}

export interface SubmitTradeRequestResult {
  requestId: string
  listingId: string
  mutationReplayed?: boolean
}

export interface TradeRequestRevealScreenshot {
  objectPath: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  expiresAt: string
}

export interface CustomerAudienceSignupInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  smsConsent: boolean
  emailConsent: boolean
  marketingConsent: boolean
  address?: string
  birthday?: string
  favoriteGemOrStone?: string
  favoriteMaterial?: string
  favoriteCut?: string
  favoriteCollection?: string
  notes?: string
  tags?: string[]
}

export interface CustomerAudienceSignupResult {
  audienceId: string
}

export interface CustomerAudienceUnsubscribeInput {
  repId: string
  phone?: string
  email?: string
  unsubscribeSms: boolean
  unsubscribeEmail: boolean
}

export interface CustomerAudienceUnsubscribeResult {
  updatedCount: number
  smsUpdatedCount: number
  emailUpdatedCount: number
}

export type CustomerAudienceChannel = 'all' | 'sms' | 'email' | 'marketing'

export interface GetCustomerAudienceFilters {
  channelFilter?: CustomerAudienceChannel
  /** `null` is reserved for authenticated full-list exports. */
  limit?: number | null
}

export interface CustomerAudienceMember {
  id: string
  name: string
  phone: string | null
  email: string | null
  address?: string | null
  /** Month/day only (`MM-DD`); birthdays are never stored with a year. */
  birthday?: string | null
  favoriteGemOrStone?: string | null
  favoriteMaterial?: string | null
  favoriteCut?: string | null
  favoriteCollection?: string | null
  notes?: string | null
  tags?: string[]
  smsConsent: boolean
  emailConsent: boolean
  marketingConsent: boolean
  canReceiveSms: boolean
  canReceiveEmail: boolean
  consentDate: string | null
  createdAt: string
  smsOptedOutAt: string | null
  emailOptedOutAt: string | null
  stopKeywordReceivedAt: string | null
}

export interface CustomerAudienceSummary {
  totalCustomers: number
  smsReachableCount: number
  emailReachableCount: number
  marketingConsentCount: number
  smsOptedOutCount: number
  emailOptedOutCount: number
  addedLast30DaysCount: number
}

export interface CustomerAudienceResult {
  summary: CustomerAudienceSummary
  customers: CustomerAudienceMember[]
}

/**
 * Editable rep-owned contact information. Consent and opt-out fields are
 * deliberately absent: they can only change through the dedicated consent
 * and unsubscribe flows.
 */
export interface CustomerAudienceProfileInput {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  /** Month/day only (`MM-DD`); a birth year is never accepted or stored. */
  birthday?: string | null
  favoriteGemOrStone?: string | null
  favoriteMaterial?: string | null
  favoriteCut?: string | null
  favoriteCollection?: string | null
  notes?: string | null
  tags?: string[]
}

export interface CustomerAudienceContactCreateInput
  extends CustomerAudienceProfileInput {}

export interface CustomerAudienceContactUpdateInput {
  audienceId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  birthday?: string | null
  favoriteGemOrStone?: string | null
  favoriteMaterial?: string | null
  favoriteCut?: string | null
  favoriteCollection?: string | null
  notes?: string | null
  tags?: string[]
}

export interface CustomerAudienceImportInput extends CustomerAudienceProfileInput {}

export interface CustomerAudienceImportResult {
  createdCount: number
  updatedCount: number
  skipped: Array<{ row: number; reason: string }>
}

export type CustomerAudienceChangeActorKind =
  | 'customer'
  | 'rep'
  | 'nic_nac'
  | 'system'

export interface CustomerAudienceChangeContext {
  actorKind: CustomerAudienceChangeActorKind
  actorRepId?: string | null
  nicNacConversationId?: string | null
  nicNacRunId?: string | null
}

export type WalletTransactionType =
  | 'load'
  | 'sms_charge'
  | 'refund'
  | 'adjustment'
  | 'auto_recharge'

export interface WalletTransactionSummary {
  id: string
  type: WalletTransactionType
  amountMils: number
  description: string | null
  createdAt: string
}

export interface WalletDashboardResult {
  balanceMils: number
  balanceUsd: number
  estimatedTextsRemaining: number
  messagesSentThisMonth: number
  messagesSpendThisMonthMils: number
  messagesSpendThisMonthUsd: number
  autoRechargeEnabled: boolean
  autoRechargePending: boolean
  autoRechargeThresholdMils: number
  autoRechargeThresholdUsd: number
  autoRechargeAmountMils: number
  autoRechargeAmountUsd: number
  minimumLoadAmountMils: number
  minimumLoadAmountUsd: number
  lastLoadedAt: string | null
  recentTransactions: WalletTransactionSummary[]
}

export type HeroAnimationType = 'still' | 'sparkle_rise' | 'soft_glow'
export type CustomerSiteTemplate = 'amethyst'
export type PublicSiteMediaSlotKey =
  | 'showcase'
  | 'about_1'
  | 'about_2'
  | 'about_3'
  | 'about_4'

export interface PublicSiteMediaSlot {
  key: PublicSiteMediaSlotKey
  caption: string
  imageUrl: string
  videoUrl: string
  /** Explicitly false means the rep removed this media and fallbacks must stay off. */
  isVisible?: boolean
  /** Brittany-only publication state for the About/Sparkle Moments section. */
  sectionVisible?: boolean
  portraitFocusX?: number
  portraitFocusY?: number
  portraitZoom?: number
}

export type SiteAppearancePreset =
  | 'amethyst'
  | 'sparkle_suite_morganite'
  | 'black_diamond'
  | 'moonstone'
  | 'alpine_opal'
  | 'emerald_garden'
  | 'gnome_garden'
  | 'rose_gold'
  | 'garnet'
  | 'amber'
  | 'velvet'
  | 'rose_quartz'

export interface SiteSettingsDashboardResult {
  displayName: string
  businessName: string
  email: string
  phone: string
  /** The rep-owned store destination used by public customer-site Shop actions. */
  shopLink?: string
  bannerText: string
  bannerVisible: boolean
  tickerText: string
  tickerVisible: boolean
  danceFloorVisible?: boolean
  liveLineupVisible?: boolean
  tagline: string
  heroHeadline?: string
  heroSubtitle?: string
  heroImageUrl: string
  heroAnimationType: HeroAnimationType
  /** The team this rep manages. This remains the public Join Team identity. */
  teamName: string
  /** The upline or other team this rep belongs to, if any. */
  memberTeamName?: string
  /** Operator-provisioned early access for the public Join Team feature. */
  joinTeamAccessEnabled?: boolean
  showJoinPage: boolean
  customerSiteTemplate: CustomerSiteTemplate
  appearancePreset: SiteAppearancePreset
  socialHandles: Record<string, string>
  socialVisibility?: import('@/lib/public-site/social-visibility').SocialVisibility
  aboutHeading?: string
  aboutSubheading?: string
  aboutNarrative?: string
  homepageMediaSlots?: PublicSiteMediaSlot[]
}

export interface UpdateSiteSettingsDashboardInput {
  displayName?: string
  businessName?: string
  email?: string
  phone?: string
  shopLink?: string
  bannerText?: string
  bannerVisible?: boolean
  tickerText?: string
  tickerVisible?: boolean
  danceFloorVisible?: boolean
  liveLineupVisible?: boolean
  tagline?: string
  heroHeadline?: string
  heroSubtitle?: string
  heroImageUrl?: string
  heroAnimationType?: HeroAnimationType
  teamName?: string
  memberTeamName?: string
  showJoinPage?: boolean
  customerSiteTemplate?: string
  appearancePreset?: SiteAppearancePreset | string
  socialHandles?: Record<string, string>
  socialVisibility?: import('@/lib/public-site/social-visibility').SocialVisibility
  aboutHeading?: string
  aboutSubheading?: string
  aboutNarrative?: string
  homepageMediaSlots?: PublicSiteMediaSlot[]
}

export type AccountBillingSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'trialing'

export interface AccountBillingSubscriptionSummary {
  status: AccountBillingSubscriptionStatus
  planType: 'monthly'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  cancelledAt: string | null
  livemode: boolean
}

export interface AccountBillingPaymentMethodSummary {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface AccountBillingInvoiceSummary {
  id: string
  createdAt: string
  amountPaidCents: number
  currency: string
  status: string | null
  hostedInvoiceUrl: string | null
  invoicePdfUrl: string | null
}

export interface AccountBillingReferralSummary {
  code: string | null
  link: string | null
  pendingCount: number
  earnedCount: number
  creditedCount: number
}

export interface AccountWorkspaceAccessSummary {
  hasFullAccess: boolean
  source: 'subscription' | 'trial' | 'none'
  status: string
  subscriptionStatus: string | null
  trialStartsAt: string | null
  trialEndsAt: string | null
}

export interface AccountBillingGrandfatheredCheckout {
  href: string
  monthlyAmountCents: number
  buildFeeCents: 0
}

export interface AccountBillingPricingSummary {
  tier: 'founder' | 'standard'
  founderSequence: number | null
  setupFeeCents: number
  monthlyAmountCents: number
  founderRateMonths: number
  standardMonthlyAmountCents: number
}

export interface AccountBillingDashboardResult {
  stripeConfigured: boolean
  checkoutMode: 'standard' | 'test_buyer'
  subscription: AccountBillingSubscriptionSummary | null
  paymentMethod: AccountBillingPaymentMethodSummary | null
  invoices: AccountBillingInvoiceSummary[]
  referral: AccountBillingReferralSummary
  workspaceAccess?: AccountWorkspaceAccessSummary
  pricing?: AccountBillingPricingSummary
  grandfatheredCheckout: AccountBillingGrandfatheredCheckout | null
  canStartSubscription: boolean
  canManageBilling: boolean
}

export type RepMessageType =
  | 'monthly_report'
  | 'newsletter'
  | 'announcement'
  | 'support_request'
  | 'support_response'

export type MessageDirection = 'nr_to_rep' | 'rep_to_nr'

export interface RepMessageSummary {
  id: string
  messageType: RepMessageType
  direction: MessageDirection
  subject: string | null
  body: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface GetRepMessagesFilters {
  limit?: number
  messageType?: RepMessageType
  unreadOnly?: boolean
}

export interface RepMessagesDashboardResult {
  unreadCount: number
  messages: RepMessageSummary[]
}

export interface CreateRepSupportMessageInput {
  subject: string
  body: string
}

export type HelpResourceType =
  | 'workflow'
  | 'feature_reference'
  | 'troubleshooting'
  | 'support'

export type HelpResourceGroup =
  | 'Setup'
  | 'Live Shows'
  | 'Dance Floor'
  | 'Customers & Account'
  | 'Help'
  | 'Feature Index'
  | 'Support'

export interface HelpResource {
  id: string
  type: HelpResourceType
  group: HelpResourceGroup
  category: string
  title: string
  summary: string
  body: string
  goal: string
  useWhen: string
  beforeYouStart: string[]
  steps: string[]
  goodResult: string
  nicNacPrompt: string
  stillStuck: string
  relatedFeatureIds: string[]
  quickActions: string[]
  video?: {
    title: string
    provider: 'youtube'
    status: 'placeholder' | 'ready'
    url?: string
  }
}

export interface SiteAnalyticsPrivacySummary {
  disablesIpCapture: boolean
  masksSensitiveInputs: boolean
  identifiesAfterLoginOnly: boolean
}

export interface SiteAnalyticsOverview {
  pageViews30d: number | null
  uniqueVisitors30d: number | null
  topTrafficSource: string | null
  topDeviceType: string | null
}

export interface SiteAnalyticsBreakdownItem {
  label: string
  value: number
}

export interface SiteAnalyticsOperationalSnapshot {
  activeListings: number
  pendingRequests: number
  upcomingShows: number
  reachableCustomers: number
}

export interface SiteAnalyticsDashboardResult {
  configured: boolean
  privacy: SiteAnalyticsPrivacySummary
  overview: SiteAnalyticsOverview
  topPages: SiteAnalyticsBreakdownItem[]
  trafficSources: SiteAnalyticsBreakdownItem[]
  deviceMix: SiteAnalyticsBreakdownItem[]
  operationalSnapshot: SiteAnalyticsOperationalSnapshot
}

export interface JoinTeamMemberLinks {
  tiktok?: string
  facebook?: string
  instagram?: string
  website?: string
  youtube?: string
  whatnot?: string
}

export interface JoinTeamMember {
  id: string
  repId: string
  displayName: string
  businessName: string
  state: string
  city: string
  initials: string
  photoUrl: string
  photoAlt: string
  imageClassName: string
  bio: string
  links: JoinTeamMemberLinks
  sortOrder: number
  isVisible: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface UpsertJoinTeamMemberInput {
  id?: string
  displayName: string
  businessName?: string
  state?: string
  city?: string
  initials?: string
  photoUrl?: string
  photoAlt?: string
  imageClassName?: string
  bio?: string
  links?: JoinTeamMemberLinks
  sortOrder?: number
  isVisible?: boolean
}

export interface ReorderJoinTeamRosterInput {
  memberIds: string[]
}

export interface PublicSiteRecipe {
  id: string
  repId: string
  title: string
  slug: string
  description: string
  category: string
  prepTime: string
  servings: number | null
  imageUrl: string
  imageAlt: string
  imagePosition: string
  modalImageUrl: string
  modalImagePosition: string
  tiktokUrl: string
  ingredients: string[]
  steps: string[]
  note: string
  sortOrder: number
  isVisible: boolean
  sourceRecipeId: string
  recipeSourceImageUrls: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface UpsertPublicSiteRecipeInput {
  id?: string
  title: string
  slug?: string
  description?: string
  category?: string
  prepTime?: string
  servings?: number | null
  imageUrl?: string
  imageAlt?: string
  imagePosition?: string
  modalImageUrl?: string
  modalImagePosition?: string
  tiktokUrl?: string
  ingredients?: string[]
  steps?: string[]
  note?: string
  sortOrder?: number
  isVisible?: boolean
  sourceRecipeId?: string
  recipeSourceImageUrls?: string[]
}

export interface ReorderPublicSiteRecipesInput {
  recipeIds: string[]
}

export interface LiveQueueSnapshot {
  syncCode: string
  queue: string[]
  queueLength: number
  currentCustomer: string | null
  onDeckCustomer: string | null
  lastUpdated: string | null
  ageSeconds: number | null
  staleAfterSeconds: number
  isFresh: boolean
}

export interface PrelaunchWaitlistInput {
  name: string
  email: string
  phone: string
  tiktokHandle: string
  teamRepName: string
  setupPain?: string
  smsConsent: boolean
  emailConsent: boolean
}

export interface PrelaunchWaitlistInsert {
  name: string
  email: string
  phone: string | null
  tiktok_handle: string
  team_rep_name: string
  setup_pain: string | null
  sms_consent: boolean
  email_consent: boolean
  source: 'prelaunch_site'
}

export type PrelaunchWaitlistWelcomeEmailStatus =
  | 'not_attempted'
  | 'sent'
  | 'skipped'
  | 'failed'

export interface PrelaunchIntakeInput {
  fullName: string
  email: string
  phone: string
  businessName: string
  tiktokHandle: string
  instagramHandle: string
  facebookUrl: string
  teamName?: string
  teamSize: string
  primaryPlatform: string
  streamingFrequency: string
  currentSetup: string
  setupGoal: string
  deviceSetup: string
  brandVibe?: string
  colorPreferences?: string
  specialRequests?: string
  referralCode?: string
  smsConsent: boolean
  emailConsent: boolean
}

export interface PrelaunchIntakeValidated {
  fullName: string
  email: string
  phone: string
  businessName: string
  tiktokHandle?: string
  instagramHandle?: string
  facebookUrl?: string
  teamName?: string
  teamSize: string
  primaryPlatform: string
  streamingFrequency: string
  currentSetup: string
  setupGoal: string
  deviceSetup: string
  brandVibe?: string
  colorPreferences?: string
  specialRequests?: string
  referralCode?: string
  smsConsent: true
  emailConsent: true
}

export type PrelaunchPrequalificationStatus = 'qualified' | 'needs_review'

export interface PrelaunchIntakeInsert {
  full_name: string
  email: string
  phone: string
  business_name: string
  tiktok_handle: string | null
  instagram_handle: string | null
  facebook_url: string | null
  team_name: string | null
  team_size: string
  primary_platform: string
  streaming_frequency: string
  current_setup: string
  setup_goal: string
  device_setup: string
  brand_vibe: string | null
  color_preferences: string | null
  special_requests: string | null
  referral_code: string | null
  sms_consent: boolean
  email_consent: boolean
  prequalification_status: PrelaunchPrequalificationStatus
  fit_flags: string[]
  waitlist_id: string | null
  scout_input_status: 'ready'
  warmup_sequence_status: 'intake_received'
  source: 'prelaunch_intake'
}

export interface GetTradeRequestsFilters {
  statusFilter?: TradeRequestStatus // default: 'pending'
  limit?: number
}

export interface TradeRequestWithListing {
  id: string
  status: TradeRequestStatus
  customerName: string
  customerDescription: string
  revealScreenshot?: TradeRequestRevealScreenshot | null
  rejectionReason: RejectionReason | null
  repNotes: string | null
  createdAt: string
  updatedAt: string
  listing: {
    id: string
    repId: string
    listingSource?: ListingSource
    listingPhotoUrl: string | null
    usesCanonicalPhoto: boolean
    repFacingNote?: string | null
    design: {
      id: string | null
      itemNumber: string | null
      designName: string
      collectionName: string | null
      material: string | null
      mainStone: string | null
      bpMsrp: number | null
      canonicalPhotoUrl: string | null
      typePrefix: JewelryType
    }
  }
}

export interface TradeRequestNotificationSummary {
  requestId: string
  repId: string
  customerName: string
  customerDescription: string
  revealScreenshot?: TradeRequestRevealScreenshot | null
  listing: {
    id: string
    listingSource?: ListingSource
    itemNumber: string | null
    designName: string
    collectionName: string | null
    typePrefix: JewelryType
    bpMsrp: number | null
  }
}

export interface ApproveTradeResult {
  requestId: string
  fulfillmentId: string
  listingId: string
  customerName: string
  quantityAvailable: number
}

export interface RejectTradeResult {
  requestId: string
  listingId: string
  listingRestored: boolean
}

export interface GetTradeHistoryOptions {
  limit?: number
}

export interface TradeHistoryItem {
  requestId: string
  listingId: string
  customerName: string
  status: TradeRequestStatus
  fulfillmentStatus: FulfillmentStatus | null
  createdAt: string
  completedAt: string | null
  fulfillmentDays: number | null
  design: {
    itemNumber: string | null
    designName: string
    bpMsrp: number | null
    typePrefix: JewelryType
    collectionName: string | null
  }
}

export interface TradeHistoryResult {
  items: TradeHistoryItem[]
  summary: {
    totalCompleted: number
    totalMsrpTraded: number
    avgFulfillmentDays: number | null
    repeatCustomers: Array<{ customerName: string; count: number }>
  }
}

// ============================================================================
// trade-swaps domain
// ============================================================================

export type TradeSwapReplacementStatus =
  | 'added_to_board'
  | 'needs_catalog_details'
  | 'needs_ring_size'

export interface ApproveTradeSwapInput {
  requestId: string
  revealedItemNumber: string
  revealedMaterial?: string
  revealedRingSize?: string
  repNotes?: string
}

export interface ApproveTradeSwapResult {
  swapId: string
  requestId: string
  fulfillmentId: string
  outgoingListingId: string
  customerName: string
  revealedItemNumber: string
  revealedDesignId: string | null
  replacementListingId: string | null
  replacementStatus: TradeSwapReplacementStatus
}

export interface TradeSwapCleanupItem {
  swapId: string
  requestId: string
  customerName: string
  outgoingListingId: string
  revealedItemNumber: string
  revealedRingSize: string | null
  replacementStatus: TradeSwapReplacementStatus
  createdAt: string
}

export interface ResolveTradeSwapReplacementInput {
  swapId: string
  replacementListingId: string
}

export interface ResolveTradeSwapReplacementResult {
  swapId: string
  requestId: string
  replacementListingId: string
  replacementStatus: 'added_to_board'
  fulfillmentId: string | null
}

// ============================================================================
// trade-fulfillment domain
// ============================================================================

export type UpdateFulfillmentInput =
  | {
      requestId: string
      nextStatus: FulfillmentStatus
      shippingNotes?: string
      addToBoard?: boolean
    }
  | {
      customerName: string
      nextStatus: FulfillmentStatus
      shippingNotes?: string
      addToBoard?: boolean
    }

export interface UpdateFulfillmentResult {
  fulfillmentId: string
  requestId: string
  previousStatus: FulfillmentStatus
  status: FulfillmentStatus
  completedAt: string | null
  changed: boolean
  shouldPromptAddToBoard: boolean
}

export interface FulfillmentQueueItem {
  fulfillmentId: string
  requestId: string
  status: FulfillmentStatus
  customerName: string
  designName: string
  itemNumber: string | null
  statusUpdatedAt: string
  daysSinceLastUpdate: number
}

// ============================================================================
// jewelry-database domain
// ============================================================================

export interface SearchJewelryInput {
  query: string
  jewelryType?: JewelryType
  collection?: string
  material?: string
  mainStone?: string
  label?: 'diamond' | 'unicorn' | 'standard'
  collectionYear?: number
  limit?: number
}

export interface JewelryDatabaseResult {
  designId: string
  itemNumber: string
  designName: string
  material: string | null
  mainStone: string | null
  bpMsrp: number | null
  canonicalPhotoUrl: string | null
  typePrefix: JewelryType
  collectionName: string | null
  collectionYear: number | null
  searchTags: string[]
  isOnMyBoard: boolean
  activeListingsCount: number
}

export type ResolveItemNumberResult =
  | {
      found: false
      itemNumber: string
      ambiguous?: boolean
      requestedMaterial?: string | null
      requestedMainStone?: string | null
      variantCandidates?: Array<{
        designId: string
        itemNumber: string
        designName: string
        material: string | null
        mainStone: string | null
        collectionName: string | null
        collectionYear: number | null
      }>
    }
  | {
      found: true
      design: {
        id: string
        itemNumber: string
        designName: string
        material: string | null
        mainStone: string | null
        bpMsrp: number | null
        canonicalPhotoUrl: string | null
        typePrefix: JewelryType
        collectionId: string | null
        collectionName: string | null
        collectionYear: number | null
        searchTags: string[]
      }
      hasCollection: boolean
    }

export interface CreateDesignInput {
  designId?: string
  itemNumber: string
  designName: string
  piecePhotoUrl: string
  material?: string
  mainStone?: string
  bpMsrp?: number
  collectionName?: string
  collectionYear?: number | null
  searchTags?: string[]
  specialFeatures?: string
  lengthInfo?: string
  photoPipeline?: PhotoPipelineStatePatch
  createdByRepId?: string | null
  conversationId?: string | null
}

export interface CreateDesignResult {
  designId: string
  itemNumber: string
  collectionId: string | null
  collectionName: string | null
  collectionYear: number | null
  searchTags: string[]
  typePrefix: JewelryType
}

export interface UpdateDesignCollectionInput {
  designId: string
  collectionName: string
  collectionYear?: number | null
}

export interface UpdateDesignCollectionResult {
  designId: string
  collectionId: string
  collectionName: string
}

export interface UpdateCanonicalPhotoResult {
  designId: string
  canonicalPhotoUrl: string
}

export type JewelryCatalogChangeType =
  | 'create_design'
  | 'report_issue'
  | 'correct_design_fields'
  | 'replace_canonical_photo'

export type JewelryCatalogIssueType =
  | 'wrong_item_number'
  | 'wrong_collection'
  | 'wrong_collection_year'
  | 'wrong_design_name'
  | 'wrong_msrp'
  | 'wrong_jewelry_type'
  | 'wrong_material'
  | 'wrong_stone'
  | 'wrong_tags'
  | 'bad_photo'
  | 'duplicate'
  | 'other'

export interface WriteJewelryCatalogChangeInput {
  designId: string
  repId?: string | null
  conversationId?: string | null
  changeType: JewelryCatalogChangeType
  issueType?: JewelryCatalogIssueType | null
  reason?: string | null
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
}

export interface JewelryCatalogCorrectionPatch {
  designName?: string
  collectionName?: string
  collectionYear?: number | null
  material?: string | null
  mainStone?: string | null
  bpMsrp?: number | null
  specialFeatures?: string | null
  lengthInfo?: string | null
  searchTags?: string[]
  canonicalPhotoUrl?: string
}

export interface ReportJewelryCatalogIssueInput {
  itemNumber: string
  repId: string
  conversationId?: string | null
  issueType: JewelryCatalogIssueType
  reason: string
  correction?: JewelryCatalogCorrectionPatch
}

export interface ReportJewelryCatalogIssueResult {
  designId: string
  itemNumber: string
  changedFields: string[]
  issueLogged: boolean
  corrected: boolean
}

export type PhotoPipelineStatus =
  | 'pending'
  | 'staged'
  | 'preflight_failed'
  | 'ready'
  | 'processing'
  | 'qa_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'error'

export interface PhotoPipelineStatePatch {
  originalPath?: string | null
  originalUrl?: string | null
  enhancedUrl?: string | null
  provider?: string | null
  status?: PhotoPipelineStatus
  preflightScore?: number | null
  preflightIssues?: unknown[] | null
  qaDecision?: 'approve' | 'review' | 'hold' | 'reject' | null
  qaConfidence?: number | null
  processedAt?: string | null
}

export interface UpdatePhotoPipelineStateResult {
  designId: string
  photoPipelineStatus: PhotoPipelineStatus
  enhancedPhotoUrl: string | null
}
