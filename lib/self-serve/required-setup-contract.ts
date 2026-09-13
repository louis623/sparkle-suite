/** Client-safe setup vocabulary and serializable state. No database or server imports. */
type JsonObject = Record<string, unknown>

export const REQUIRED_SETUP_STEPS = [
  { id: 'account_basics', label: 'Account basics', required: true },
  { id: 'site_skin', label: 'Customer-facing site theme', required: true },
  { id: 'welcome_copy', label: 'Welcome copy', required: true },
  { id: 'about_page', label: 'About page', required: true },
  { id: 'show_schedule', label: 'Show schedule', required: true },
  { id: 'customer_site_orientation', label: 'Customer-facing website orientation', required: true },
  { id: 'live_queue_setup', label: 'Live Queue setup', required: true },
  { id: 'trade_board_orientation', label: 'Dance Floor orientation', required: true },
  { id: 'final_preview_approval', label: 'Final preview approval', required: true },
] as const

export type RequiredSetupStepId = (typeof REQUIRED_SETUP_STEPS)[number]['id']
export type RequiredSetupStatus = 'checkout_required' | 'payment_pending' | 'required_setup' | 'setup_blocked' | 'dashboard_unlocked'
export type RequiredSetupSessionRow = {
  id: string
  rep_id: string
  status: string | null
  current_step: string | null
  completed_steps: unknown
  answers: unknown
  generated_copy: unknown
  support_state: unknown
  dashboard_unlocked_at: string | null
  created_at: string | null
  updated_at: string | null
}
export type RequiredSetupState = {
  id: string | null
  repId: string | null
  status: RequiredSetupStatus
  currentStep: RequiredSetupStepId
  completedSteps: RequiredSetupStepId[]
  steps: typeof REQUIRED_SETUP_STEPS
  answers: JsonObject
  generatedCopy: JsonObject
  supportState: JsonObject
  dashboardUnlockedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  nextStep: RequiredSetupStepId | null
  canUnlockDashboard: boolean
}
export type SaveRequiredSetupAnswerOptions = {
  generatedCopyPatch?: JsonObject
  supportStatePatch?: JsonObject
}
