'use client'

import { useEffect, useRef } from 'react'
import styles from './InputRow.module.css'

const MAX_HEIGHT_PX = 160

export function InputRow({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow up to MAX_HEIGHT_PX, then internal scroll.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        if (disabled || !value.trim()) return
        onSubmit()
      }}
    >
      <textarea
        ref={taRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!disabled && value.trim()) onSubmit()
          }
        }}
        onPaste={(e) => {
          // Image paste: silent ignore. If clipboard has non-text/plain types
          // and no text/plain, prevent default; otherwise pass through.
          const types = Array.from(e.clipboardData?.types ?? [])
          const hasText = types.includes('text/plain')
          const hasNonText = types.some((t) => !t.startsWith('text/'))
          if (hasNonText && !hasText) {
            e.preventDefault()
          }
        }}
        placeholder={placeholder ?? 'Ask Thumper…'}
        rows={1}
        aria-disabled={disabled || undefined}
        disabled={disabled}
      />
      <button
        type="submit"
        className={styles.send}
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M2 12 L12 7 L2 2 L4 7 Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </form>
  )
}
