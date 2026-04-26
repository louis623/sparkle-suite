'use client'

import { forwardRef, useEffect, useRef } from 'react'
import styles from './InputRow.module.css'

const MAX_HEIGHT_PX = 160

export interface InputAttachment {
  id: string
  dataUrl: string
  mediaType: 'image/jpeg'
}

export interface InputRowProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  attachments: InputAttachment[]
  onPickFiles: (files: FileList | null, mode: 'gallery' | 'camera') => void
  onRemoveAttachment: (id: string) => void
  attachmentNotice?: string | null
  // Allow image-only sends. Submit enabled if either text or attachments.
  isStreaming?: boolean
}

export const InputRow = forwardRef<HTMLTextAreaElement, InputRowProps>(function InputRow(
  {
    value,
    onChange,
    onSubmit,
    disabled,
    placeholder,
    attachments,
    onPickFiles,
    onRemoveAttachment,
    attachmentNotice,
    isStreaming,
  },
  textareaRef
) {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // Stitch the forwarded ref so the parent can also call .focus().
  useEffect(() => {
    if (typeof textareaRef === 'function') textareaRef(innerRef.current)
    else if (textareaRef) textareaRef.current = innerRef.current
  }, [textareaRef])

  // Auto-grow up to MAX_HEIGHT_PX, then internal scroll.
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const hasAttachments = attachments.length > 0
  const canSubmit = !disabled && !isStreaming && (value.trim().length > 0 || hasAttachments)

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit()
      }}
    >
      {hasAttachments || attachmentNotice ? (
        <div className={styles.thumbRow} role="list" aria-label="Attached images">
          {attachments.map((a) => (
            <div key={a.id} className={styles.thumb} role="listitem">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.dataUrl} alt="" />
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={() => onRemoveAttachment(a.id)}
                aria-label="Remove attachment"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M2 2 L8 8 M8 2 L2 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
          {attachmentNotice ? (
            <div className={styles.thumbNotice}>{attachmentNotice}</div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.inputRow}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => cameraRef.current?.click()}
          aria-label="Take photo"
          disabled={disabled || isStreaming}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M5.4 4 L7 2.4 L11 2.4 L12.6 4 L15 4 A1.4 1.4 0 0 1 16.4 5.4 L16.4 13.6 A1.4 1.4 0 0 1 15 15 L3 15 A1.4 1.4 0 0 1 1.6 13.6 L1.6 5.4 A1.4 1.4 0 0 1 3 4 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="9.6" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => galleryRef.current?.click()}
          aria-label="Attach images"
          disabled={disabled || isStreaming}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <rect
              x="2"
              y="3"
              width="14"
              height="12"
              rx="1.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle cx="6" cy="7" r="1.2" fill="currentColor" />
            <path
              d="M2.6 13 L6.6 9 L9.6 12 L12.4 9.4 L15.4 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.hiddenFile}
          onChange={(e) => {
            onPickFiles(e.target.files, 'camera')
            // Reset so re-selecting the same file fires onChange.
            e.target.value = ''
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.hiddenFile}
          onChange={(e) => {
            onPickFiles(e.target.files, 'gallery')
            e.target.value = ''
          }}
          tabIndex={-1}
          aria-hidden="true"
        />

        <textarea
          ref={innerRef}
          className={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSubmit) onSubmit()
            }
          }}
          onFocus={() => {
            // iOS keyboard belt-and-suspenders.
            innerRef.current?.scrollIntoView({ block: 'nearest' })
          }}
          onPaste={(e) => {
            // Image paste: silent ignore if no text payload.
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
          disabled={!canSubmit}
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 12 L12 7 L2 2 L4 7 Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </form>
  )
})
