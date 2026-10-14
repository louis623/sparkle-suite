import {
  DASHBOARD_TIP_HOVER_MS,
  DASHBOARD_TIP_LONG_PRESS_MS,
} from './rep-dashboard-tips'

export type TipPointer = 'mouse' | 'pen' | 'touch'

export type TipPhase = 'idle' | 'hovering' | 'pressing' | 'open'

export type TipModel = {
  phase: TipPhase
  startedAt: number | null
  swallowClick: boolean
}

export const initialTipModel: TipModel = {
  phase: 'idle',
  startedAt: null,
  swallowClick: false,
}

export type TipSignal =
  | { type: 'pointer-enter'; pointer: TipPointer; at: number }
  | { type: 'pointer-leave'; pointer: TipPointer; focusInside?: boolean }
  | { type: 'focus' }
  | { type: 'blur'; staysInside: boolean }
  | { type: 'touch-start'; at: number }
  | { type: 'touch-move' }
  | { type: 'touch-end' }
  | { type: 'touch-cancel' }
  | { type: 'clock'; at: number }
  | { type: 'click' }
  | { type: 'dismiss' }

export type TipStep = {
  model: TipModel
  preventClick: boolean
}

function idle(): TipModel {
  return { phase: 'idle', startedAt: null, swallowClick: false }
}

function opened(swallowClick = false): TipModel {
  return { phase: 'open', startedAt: null, swallowClick }
}

export function tipWaitMs(model: TipModel) {
  if (model.phase === 'hovering') return DASHBOARD_TIP_HOVER_MS
  if (model.phase === 'pressing') return DASHBOARD_TIP_LONG_PRESS_MS
  return null
}

export function stepDashboardTip(model: TipModel, signal: TipSignal): TipStep {
  const unchanged = { model, preventClick: false }

  switch (signal.type) {
    case 'pointer-enter': {
      if (signal.pointer === 'touch') return unchanged
      if (model.phase === 'open' || model.phase === 'hovering') return unchanged
      return {
        model: { phase: 'hovering', startedAt: signal.at, swallowClick: false },
        preventClick: false,
      }
    }
    case 'pointer-leave': {
      if (signal.pointer === 'touch') return unchanged
      if (signal.focusInside && model.phase === 'open') return unchanged
      if (model.phase === 'idle') return unchanged
      return { model: idle(), preventClick: false }
    }
    case 'focus': {
      if (model.phase === 'open') return unchanged
      return { model: opened(false), preventClick: false }
    }
    case 'blur': {
      if (signal.staysInside || model.phase === 'idle') return unchanged
      return { model: idle(), preventClick: false }
    }
    case 'touch-start': {
      if (model.phase === 'open') {
        return model.swallowClick
          ? { model: opened(false), preventClick: false }
          : unchanged
      }
      return {
        model: { phase: 'pressing', startedAt: signal.at, swallowClick: false },
        preventClick: false,
      }
    }
    case 'touch-move':
    case 'touch-cancel':
    case 'touch-end': {
      if (model.phase !== 'pressing') return unchanged
      return { model: idle(), preventClick: false }
    }
    case 'clock': {
      if (
        model.phase === 'hovering' &&
        model.startedAt != null &&
        signal.at - model.startedAt >= DASHBOARD_TIP_HOVER_MS
      ) {
        return { model: opened(false), preventClick: false }
      }
      if (
        model.phase === 'pressing' &&
        model.startedAt != null &&
        signal.at - model.startedAt >= DASHBOARD_TIP_LONG_PRESS_MS
      ) {
        return { model: opened(true), preventClick: false }
      }
      return unchanged
    }
    case 'click': {
      if (!model.swallowClick) return unchanged
      return { model: opened(false), preventClick: true }
    }
    case 'dismiss': {
      if (model.phase === 'idle') return unchanged
      return { model: idle(), preventClick: false }
    }
    default:
      return unchanged
  }
}
