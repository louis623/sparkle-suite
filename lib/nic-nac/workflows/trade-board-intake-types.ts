export type TradeBoardIntakeWorkflowType = 'trade_board_add_listing'

export type TradeBoardIntakeStatus =
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'needs_human_review'

export type TradeBoardIntakePhase =
  | 'started'
  | 'details_capture'
  | 'photo_capture'
  | 'catalog_match'
  | 'ready_to_add'
  | 'adding'
  | 'completed'
  | 'cancelled'
  | 'needs_human_review'

export type TradeBoardPhotoDeclaredRole =
  | 'label_details'
  | 'jewelry_front'
  | 'unknown'
  | 'other'

export type TradeBoardPhotoVisualRole =
  | 'jewelry'
  | 'label_or_packaging'
  | 'uncertain'

export type TradeBoardPhotoQuality =
  | 'usable'
  | 'warning'
  | 'blocked'
  | 'unknown'

export type TradeBoardIntakeNextAction =
  | 'ask_for_item_number'
  | 'ask_for_label_details_photo'
  | 'ask_for_jewelry_front_photo'
  | 'ask_for_collection'
  | 'ask_for_collection_type_and_size'
  | 'ask_for_rarity_classification'
  | 'confirm_non_item_number_piece'
  | 'confirm_extracted_details'
  | 'call_search_jewelry_database'
  | 'call_add_listing'
  | 'ask_photo_role_clarification'
  | 'escalate_to_human_review'

export type TradeBoardIntakeToolPolicySource =
  | 'mode_required_setup'
  | 'active_workflow'
  | 'latest_turn_intent'
  | 'fallback_memory'
  | 'fallback_resources'

export type TradeBoardIntakeCatalogMode = 'item_number' | 'non_item_number'

export type TradeBoardIntakeJewelryType = 'RG' | 'NK' | 'ER' | 'ST' | 'BR'

export type TradeBoardIntakeRarityClassification =
  | 'standard'
  | 'diamond'
  | 'unicorn'

export interface TradeBoardIntakeKnownFields {
  itemNumber?: string
  jewelryType?: TradeBoardIntakeJewelryType
  quantity?: number
  designName?: string
  collectionFamily?: string
  collectionName?: string
  collectionYear?: number
  material?: string
  mainStone?: string
  ringSize?: string
  repNotes?: string
  tradePreferences?: string
  duplicatePhysicalConfirmed?: boolean
  rarityClassification?: TradeBoardIntakeRarityClassification
}

export interface TradeBoardIntakePhotoState {
  id?: string
  conversationMessageId?: string
  attachmentIndex: number
  declaredRole: TradeBoardPhotoDeclaredRole
  visualRole: TradeBoardPhotoVisualRole
  roleConfirmed: boolean
  imageUrl?: string
  contentSha256?: string
  quality: TradeBoardPhotoQuality
  qualityScore?: number
  qualityIssues: string[]
  notes: string[]
  visualRoleSource?: string
}

export interface TradeBoardIntakeSessionState {
  id: string
  repId: string
  conversationId: string
  workflowType: TradeBoardIntakeWorkflowType
  catalogMode: TradeBoardIntakeCatalogMode
  status: TradeBoardIntakeStatus
  phase: TradeBoardIntakePhase
  known: TradeBoardIntakeKnownFields
  missing: string[]
  blockers: string[]
  warnings: string[]
  metadata: Record<string, unknown>
  photos: TradeBoardIntakePhotoState[]
  createdListingIds?: string[]
  createdDesignId?: string
  lastUserMessageId?: string
  createdAt?: string
  updatedAt?: string
  expiresAt?: string
}

export interface TradeBoardIntakePromptState {
  workflow: {
    id: string
    type: TradeBoardIntakeWorkflowType
    catalogMode: TradeBoardIntakeCatalogMode
    status: TradeBoardIntakeStatus
    phase: TradeBoardIntakePhase
  }
  known: TradeBoardIntakeKnownFields
  photos: Array<{
    id?: string
    index: number
    declaredRole: TradeBoardPhotoDeclaredRole
    visualRole: TradeBoardPhotoVisualRole
    roleConfirmed: boolean
    quality: TradeBoardPhotoQuality
    notes: string[]
  }>
  missing: string[]
  blockers: string[]
  nextAction: TradeBoardIntakeNextAction
  hardRules: string[]
}
