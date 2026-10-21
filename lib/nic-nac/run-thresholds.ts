export type NicNacRunThresholdInput = {
  latencyMs: number
  inputTokens?: number | null
  totalTokens?: number | null
  estimatedContextTokens: number
  contextCompacted: boolean
  droppedMessageCount: number
}

export type NicNacRolloverReason =
  | 'high_input_tokens'
  | 'high_total_tokens'
  | 'context_compacted'
  | 'high_estimated_context'

export type NicNacRunThresholdResult = {
  rolloverRecommended: boolean
  reasons: NicNacRolloverReason[]
}

const HIGH_INPUT_TOKENS = 80_000
const HIGH_TOTAL_TOKENS = 90_000
const HIGH_ESTIMATED_CONTEXT_TOKENS = 20_000
const HIGH_PROVIDER_TOKENS_MIN_ESTIMATED_CONTEXT = 12_000

export function evaluateNicNacRunThresholds(
  input: NicNacRunThresholdInput,
): NicNacRunThresholdResult {
  const reasons: NicNacRolloverReason[] = []
  const chatIsLongEnough =
    input.estimatedContextTokens >= HIGH_PROVIDER_TOKENS_MIN_ESTIMATED_CONTEXT

  if ((input.inputTokens ?? 0) >= HIGH_INPUT_TOKENS && chatIsLongEnough) {
    reasons.push('high_input_tokens')
  }
  if ((input.totalTokens ?? 0) >= HIGH_TOTAL_TOKENS && chatIsLongEnough) {
    reasons.push('high_total_tokens')
  }
  if (input.contextCompacted && input.droppedMessageCount > 0) {
    reasons.push('context_compacted')
  }
  if (input.estimatedContextTokens >= HIGH_ESTIMATED_CONTEXT_TOKENS) {
    reasons.push('high_estimated_context')
  }

  return {
    rolloverRecommended: reasons.length > 0,
    reasons,
  }
}
