// Shared presentation helpers: keep this module safe for the browser.
import { MOVED_ON_MESSAGE } from '@/lib/nic-nac/piece-task'

type PreviewPart = {
  type?: string
  text?: string
  output?: {
    needsAction?: string
    message?: string
    previewImageUrl?: string
    previewPhotoId?: string
    code?: string
  }
}

export function asksToConfirmSave(text: string): boolean {
  return /reply\s+["“']?yes\b|i(?:'|’)ll add it|i will add it|right main photo|main photo I(?:['’]ll| will) save|right piece to save|is this the right piece/i.test(
    text,
  )
}

export function retireLastConfirmationLine(text: string, noticeElsewhere = false): string {
  // An existing notice is not evidence that the pending question was removed.
  const hasNotice = text.includes(MOVED_ON_MESSAGE)
  const lines = text.replaceAll(MOVED_ON_MESSAGE, '').trimEnd().split(/(\n+|(?<=[.!?])[ \t]+)/)
  const target = lines.findLastIndex(asksToConfirmSave)
  if (target < 0) return text
  lines[target] = hasNotice || !noticeElsewhere ? MOVED_ON_MESSAGE : ''
  return lines.join('').trimEnd()
}

function visibleAssistantText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(
      (part): part is PreviewPart => Boolean(part) && typeof part === 'object',
    )
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
}

export function lastVisibleAssistantId<T extends { id?: string; role?: string; parts?: unknown }>(messages: T[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) continue
    if (visibleAssistantText(message.parts).trim() || message.parts.some((part: PreviewPart) =>
      part?.output?.needsAction === 'confirm_main_photo')) return message.id ?? null
  }
  return null
}

/**
 * Display copy only. Stored rows stay as they were saved. The last visible
 * assistant line is the only one that can show the moved-on sentence, and
 * only when that line is still asking the rep to confirm a save.
 */
export function retireSupersededPreviews<T extends { role?: string; parts?: unknown }>(
  messages: T[],
): T[] {
  let target = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') continue
    if (!visibleAssistantText(message.parts).trim()) continue
    target = index
    break
  }
  if (target < 0) return messages
  const message = messages[target]
  if (!message || !asksToConfirmSave(visibleAssistantText(message.parts))) return messages
  if (!Array.isArray(message.parts)) return messages
  // Earlier text parts in the same assistant turn are history too.
  const pendingIndex = message.parts.findLastIndex((part) => {
    const record = part as PreviewPart | null
    return record?.type === 'text' && typeof record.text === 'string' && asksToConfirmSave(record.text)
  })
  const noticeElsewhere = message.parts.some((part, index) => {
    const record = part as PreviewPart | null
    return index !== pendingIndex && record?.type === 'text' && record.text?.includes(MOVED_ON_MESSAGE)
  })
  let changed = false
  const parts = message.parts.map((part, index) => {
    if (index !== pendingIndex) return part
    if (!part || typeof part !== 'object') return part
    const record = part as PreviewPart
    if (record.type !== 'text' || typeof record.text !== 'string') return part
    if (!asksToConfirmSave(record.text)) return part
    changed = true
    return { ...record, text: retireLastConfirmationLine(record.text, noticeElsewhere) }
  })
  if (!changed) return messages
  const copy = messages.slice()
  copy[target] = { ...message, parts }
  return copy
}
