'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent,
} from 'react'
import {
  initialTipModel,
  stepDashboardTip,
  tipWaitMs,
  type TipModel,
  type TipPointer,
  type TipSignal,
  type TipStep,
} from './dashboard-tip-state'

const PRESS_SLOP_PX = 10

function pointerKind(pointerType: string): TipPointer {
  if (pointerType === 'touch') return 'touch'
  if (pointerType === 'pen') return 'pen'
  return 'mouse'
}

export function useDelayedHoverTip() {
  const rootRef = useRef<HTMLElement>(null)
  const [model, setModel] = useState<TipModel>(initialTipModel)
  const modelRef = useRef(model)
  const timerRef = useRef<number | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const ignoreMouseUntil = useRef(0)
  const pointerFocus = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current == null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const applyRef = useRef<(signal: TipSignal) => TipStep>(() => ({
    model: initialTipModel,
    preventClick: false,
  }))

  const apply = useCallback((signal: TipSignal) => {
    const result = stepDashboardTip(modelRef.current, signal)
    modelRef.current = result.model
    setModel(result.model)
    clearTimer()
    const wait = tipWaitMs(result.model)
    if (wait != null && result.model.startedAt != null) {
      const startedAt = result.model.startedAt
      timerRef.current = window.setTimeout(() => {
        applyRef.current({ type: 'clock', at: startedAt + wait })
      }, wait)
    }
    return result
  }, [clearTimer])

  useEffect(() => {
    applyRef.current = apply
  }, [apply])

  useEffect(() => () => clearTimer(), [clearTimer])

  useEffect(() => {
    if (model.phase !== 'open') return
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const root = rootRef.current
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) return
      apply({ type: 'dismiss' })
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [apply, model.phase])

  const open = model.phase === 'open'

  const handlers = {
    onPointerDown() {
      pointerFocus.current = true
    },
    onPointerUp() {
      pointerFocus.current = false
    },
    onPointerCancel() {
      pointerFocus.current = false
    },
    onPointerEnter(event: ReactPointerEvent<HTMLElement>) {
      const pointer = pointerKind(event.pointerType)
      if (pointer !== 'touch' && Date.now() < ignoreMouseUntil.current) return
      apply({
        type: 'pointer-enter',
        pointer,
        at: Date.now(),
      })
    },
    onPointerLeave(event: ReactPointerEvent<HTMLElement>) {
      const pointer = pointerKind(event.pointerType)
      if (pointer !== 'touch' && Date.now() < ignoreMouseUntil.current) return
      const rect = event.currentTarget.getBoundingClientRect()
      const stillOverCard =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      if (stillOverCard) return
      const active = document.activeElement
      apply({
        type: 'pointer-leave',
        pointer,
        focusInside: active instanceof Node && event.currentTarget.contains(active),
      })
    },
    onFocus() {
      if (pointerFocus.current) {
        pointerFocus.current = false
        return
      }
      apply({ type: 'focus' })
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      const next = event.relatedTarget
      apply({
        type: 'blur',
        staysInside: next instanceof Node && event.currentTarget.contains(next),
      })
    },
    onTouchStart(event: TouchEvent<HTMLElement>) {
      ignoreMouseUntil.current = Date.now() + 1_000
      const touch = event.changedTouches[0]
      pressOrigin.current = touch ? { x: touch.clientX, y: touch.clientY } : null
      apply({ type: 'touch-start', at: Date.now() })
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      const touch = event.changedTouches[0]
      const origin = pressOrigin.current
      if (!touch || !origin) return
      const dx = touch.clientX - origin.x
      const dy = touch.clientY - origin.y
      if (dx * dx + dy * dy < PRESS_SLOP_PX * PRESS_SLOP_PX) return
      pressOrigin.current = null
      apply({ type: 'touch-move' })
    },
    onTouchEnd() {
      pressOrigin.current = null
      apply({ type: 'touch-end' })
    },
    onTouchCancel() {
      pressOrigin.current = null
      apply({ type: 'touch-cancel' })
    },
    onContextMenu(event: MouseEvent<HTMLElement>) {
      const phase = modelRef.current.phase
      if (phase === 'open' || phase === 'pressing') event.preventDefault()
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key !== 'Escape') return
      apply({ type: 'dismiss' })
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      const result = apply({ type: 'click' })
      if (!result.preventClick) return
      event.preventDefault()
      event.stopPropagation()
    },
  }

  return { rootRef, open, handlers }
}
