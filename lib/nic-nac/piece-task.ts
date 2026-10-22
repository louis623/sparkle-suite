import type { UIMessage } from 'ai'

/** Vercel rejects request bodies over 4.5 MB. Stay well under that. */
export const NIC_NAC_REQUEST_BODY_LIMIT_BYTES = 4_500_000

const SHORT_REFERENCE_MAX = 500

export type PieceCloseReason = 'saved' | 'skipped' | 'cancelled'

export type PieceModelContext = {
  fromMessageId: string | null
  carryNotes: string[]
  unfinishedQuestion: string | null
}

export const EMPTY_PIECE_MODEL_CONTEXT: PieceModelContext = {
  fromMessageId: null,
  carryNotes: [],
  unfinishedQuestion: null,
}

export type PieceTurnBoundary =
  | { action: 'continue' }
  | {
      action: 'close'
      reason: 'skipped' | 'cancelled'
      askToFinish: boolean
      startsReplacement: boolean
    }

export function pieceNoteList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-8)
}

export function pieceCarryNote(args: {
  reason: PieceCloseReason
  itemNumber?: string | null
  material?: string | null
  jewelryType?: string | null
  designName?: string | null
}): string {
  const item = args.itemNumber?.trim()
  const detail =
    args.material?.trim() ||
    jewelryWord(args.jewelryType) ||
    args.designName?.trim() ||
    ''
  const subject = [item, detail].filter(Boolean).join(' ')
  if (args.reason === 'saved') return subject ? `Saved ${subject}` : 'Saved the piece'
  if (args.reason === 'skipped') return subject ? `Skipped ${subject}` : 'Skipped the piece'
  return subject ? `Cancelled ${subject}` : 'Cancelled the piece'
}

export function unfinishedPieceQuestion(itemNumber?: string | null): string {
  const item = itemNumber?.trim()
  return item ? `Want to finish ${item}?` : 'Want to finish this piece?'
}

function rarityWord(value?: string | null): string {
  const text = value?.trim().toLowerCase()
  if (text === 'diamond') return 'Diamond'
  if (text === 'unicorn') return 'Unicorn'
  if (text === 'standard') return 'standard'
  return ''
}

/** One plain notice. Details already given stay; photos do not. */
export function freshChatNotice(args: {
  itemNumber?: string | null
  ringSize?: string | null
  rarity?: string | null
  material?: string | null
  mainStone?: string | null
  designName?: string | null
}): string {
  const item = args.itemNumber?.trim()
  const details = [
    item,
    args.ringSize?.trim() ? `size ${args.ringSize.trim()}` : '',
    rarityWord(args.rarity),
    args.material?.trim(),
    args.mainStone?.trim(),
    args.designName?.trim(),
  ].filter(Boolean)
  const kept = details.length ? ` I still have ${details.join(', ')}.` : ''
  const finish = item ? ` Want to finish ${item}?` : ' Want to finish this piece?'
  return `I started a fresh chat.${kept}${finish} Send the photo again.`
}

export function sendPhotoAgainMessage(itemNumber?: string | null): string {
  const item = itemNumber?.trim()
  return item ? `Send the photo for ${item} again.` : 'Send the photo for this piece again.'
}

/** A fresh chat is asking the rep to pick up a piece whose photo was not carried. */
export function assistantIsResumingUnfinishedPiece(text: string): boolean {
  return /want to finish\b|send the photo for\b|not brought into this chat|that earlier photo was not brought|main photo I will save|belongs with that set/i.test(
    text,
  )
}

export function itemNumberFromResumeAsk(text: string): string | null {
  const match = text.match(
    /\b(?:want to finish|send the photo for|main photo I will save for)\s+([A-Za-z]{1,4}\d{3,})\b/i,
  )
  return match?.[1] ? match[1].toUpperCase() : null
}

export function statedItemNumber(text: string): string | null {
  const match = text.match(/\b[A-Z]{1,4}\d{3,}\b/i)
  return match ? match[0].toUpperCase() : null
}

const SHOW_SCHEDULE =
  /\b(show|tonight|today|occurrence|calendar|series)\b/i

export function decidePieceClose(text: string): 'skipped' | 'cancelled' | null {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  if (SHOW_SCHEDULE.test(normalized) && /\b(skip|cancel)\b/i.test(normalized)) {
    return null
  }
  if (
    /^\s*skip\b/i.test(normalized) ||
    /\bskip (this|the|that|it|these)\b/i.test(normalized)
  ) {
    return 'skipped'
  }
  if (
    /^\s*cancel(?:led)?\b/i.test(normalized) ||
    /\bcancel (this|the|that|it|these)\b/i.test(normalized) ||
    /\b(never mind|nevermind|do not add|don't add|dont add)\b/i.test(normalized)
  ) {
    return 'cancelled'
  }
  return null
}

function assistantIsHoldingThisPiece(text: string): boolean {
  return /the label says|couldn't read the item number|clearer label|main photo I will save|belongs with that set/i.test(
    text,
  )
}

/**
 * A saved, skipped, or cancelled piece ends here. A different item number,
 * while this one is still open, also ends it so its label and photos cannot
 * stick to the next piece. Photo yes/no and label questions stay on this piece.
 */
export function pieceTurnBoundary(args: {
  latestUserText: string
  previousAssistantText: string
  activeItemNumber?: string | null
  latestTurnIsPhotoConfirmation: boolean
}): PieceTurnBoundary {
  const stated = statedItemNumber(args.latestUserText)
  const active = args.activeItemNumber?.trim().toUpperCase() || null
  const explicit = decidePieceClose(args.latestUserText)
  const holding =
    args.latestTurnIsPhotoConfirmation ||
    assistantIsHoldingThisPiece(args.previousAssistantText)
  const replacement = Boolean(stated && active && stated !== active)

  if (explicit) {
    return {
      action: 'close',
      reason: explicit,
      askToFinish: false,
      startsReplacement: replacement,
    }
  }
  if (replacement && !holding) {
    return {
      action: 'close',
      reason: 'cancelled',
      askToFinish: true,
      startsReplacement: true,
    }
  }
  return { action: 'continue' }
}

export function repConfirmedPrintedLabelNumber(args: {
  latestUserText: string
  previousAssistantText: string
  itemNumber?: string | null
}): boolean {
  if (!/couldn't read the item number|clearer label photo/i.test(args.previousAssistantText)) {
    return false
  }
  const item = args.itemNumber?.trim().toUpperCase()
  const stated = statedItemNumber(args.latestUserText)
  return Boolean(item && stated && stated === item)
}

function jewelryWord(type?: string | null): string {
  if (type === 'ER') return 'earrings'
  if (type === 'NK') return 'necklace'
  if (type === 'RG') return 'ring'
  if (type === 'BR') return 'bracelet'
  if (type === 'ST') return 'set'
  return ''
}

function isDataImageUrl(url: string): boolean {
  return /^data:image\//i.test(url.trim())
}

function isShortPhotoReference(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed || trimmed.length > SHORT_REFERENCE_MAX || isDataImageUrl(trimmed)) {
    return false
  }
  if (trimmed.startsWith('/api/nic-nac/intake-photos/')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

function shortPhotoReference(url: string, filename?: string): string {
  const id = url.match(/intake-photos\/([A-Za-z0-9_-]{1,80})/)?.[1]
  if (id) return `[earlier photo ${id}]`
  if (filename && filename.length < 80 && !filename.includes('data:')) {
    return `[earlier photo ${filename}]`
  }
  return '[earlier photo already saved]'
}

function scrubDataImageUrls(part: unknown): unknown {
  let json: string
  try {
    json = JSON.stringify(part)
  } catch {
    return part
  }
  if (!json?.includes('data:image')) return part
  const scrubbed = json.replace(
    /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
    '[earlier photo already saved]',
  )
  try {
    return JSON.parse(scrubbed)
  } catch {
    return part
  }
}

function stripHistoricalPhotoBytes(message: UIMessage): UIMessage {
  const parts = message.parts ?? []
  let changed = false
  const next = parts.flatMap((part) => {
    const file = part as {
      type?: string
      mediaType?: string
      url?: string
      filename?: string
    }
    if (
      file.type === 'file' &&
      typeof file.mediaType === 'string' &&
      file.mediaType.startsWith('image/') &&
      typeof file.url === 'string' &&
      !isShortPhotoReference(file.url)
    ) {
      changed = true
      return [
        {
          type: 'text' as const,
          text: shortPhotoReference(file.url, file.filename),
        },
      ]
    }
    const scrubbed = scrubDataImageUrls(part)
    if (scrubbed !== part) changed = true
    return [scrubbed]
  })
  if (!changed) return message
  return { ...message, parts: next as UIMessage['parts'] }
}

/** Keep photo bytes on the latest user message only. Earlier photos become a short reference. */
export function prepareNicNacSendMessages(messages: UIMessage[]): UIMessage[] {
  let latestUserIndex = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      latestUserIndex = index
      break
    }
  }
  return messages.map((message, index) =>
    index === latestUserIndex ? message : stripHistoricalPhotoBytes(message),
  )
}

export function nicNacSendPayloadBytes(messages: UIMessage[]): number {
  return new TextEncoder().encode(JSON.stringify(prepareNicNacSendMessages(messages))).length
}

/**
 * The model sees the current piece, plus short notes from pieces already
 * closed. Earlier photo bytes are never included.
 */
export function scopeMessagesToCurrentPiece(args: {
  messages: UIMessage[]
  fromMessageId?: string | null
  carryNotes?: string[]
  unfinishedQuestion?: string | null
}): UIMessage[] {
  const notes = (args.carryNotes ?? []).map((note) => note.trim()).filter(Boolean)
  const question = args.unfinishedQuestion?.trim() || ''
  const preface: UIMessage[] = []
  if (notes.length > 0 || question) {
    preface.push({
      id: 'piece-context-note',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: [...notes, question].filter(Boolean).join('. '),
        },
      ],
    })
  }

  let window = args.messages
  const fromMessageId = args.fromMessageId?.trim()
  if (fromMessageId) {
    const start = args.messages.findIndex((message) => message.id === fromMessageId)
    if (start !== -1) window = args.messages.slice(start)
  }
  return [...preface, ...prepareNicNacSendMessages(window)]
}
