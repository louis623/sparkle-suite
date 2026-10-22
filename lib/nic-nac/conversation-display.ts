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
  // Retire the entire pending line, including preview wording and any trailing
  // "Reply yes". Sentence-by-sentence replacement left contradictory fragments.
  let noticeWritten = noticeElsewhere
  return text.trimEnd().split('\n').flatMap((line) => {
    if (!asksToConfirmSave(line) && !line.includes(MOVED_ON_MESSAGE)) return [line]
    if (noticeWritten) return []
    noticeWritten = true
    return [MOVED_ON_MESSAGE]
  }).join('\n').trimEnd()
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
  const pending = (part: unknown) => {
    const record = part as PreviewPart | null
    return record?.type === 'text' && typeof record.text === 'string' &&
      (asksToConfirmSave(record.text) || record.text.includes(MOVED_ON_MESSAGE))
  }
  const noticeIndex = message.parts.findLastIndex(pending)
  let changed = false
  const parts = message.parts.map((part, index) => {
    if (!pending(part)) return part
    const record = part as PreviewPart
    changed = true
    return { ...record, text: retireLastConfirmationLine(record.text!, index !== noticeIndex) }
  })
  if (!changed) return messages
  const copy = messages.slice()
  copy[target] = { ...message, parts }
  return copy
}
