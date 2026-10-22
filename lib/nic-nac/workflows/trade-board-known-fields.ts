import type { UIMessage } from 'ai'
import type { TradeBoardIntakeKnownFields } from './trade-board-intake-types'

type CatalogToolPart = {
  type?: string
  state?: string
  output?: {
    results?: Array<Record<string, unknown>>
    design?: Record<string, unknown>
  }
}

export function mergeTradeBoardKnownFields(
  current: TradeBoardIntakeKnownFields,
  next: TradeBoardIntakeKnownFields,
): TradeBoardIntakeKnownFields {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined),
    ),
  }
}

export function extractKnownFieldsFromText(
  text: string,
): TradeBoardIntakeKnownFields {
  const known: TradeBoardIntakeKnownFields = {}
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  const rarityClassification = extractRarityClassification(normalizedText)
  if (rarityClassification) known.rarityClassification = rarityClassification
  const itemNumber = normalizedText.match(/\b[A-Z]{1,4}\d{3,}\b/i)?.[0]
  if (itemNumber) known.itemNumber = itemNumber.toUpperCase()

  const jewelryType = extractJewelryType(normalizedText)
  if (jewelryType) known.jewelryType = jewelryType

  const explicitDesignName = normalizedText.match(
    /\bdesign name\s*(?:is|:)?\s*["“]?([^".\n]+)/i,
  )?.[1]
  const designName = explicitDesignName
    ? explicitDesignName.split(',')[0]?.trim()
    : itemNumber
      ? extractDesignNameNearItemNumber(normalizedText, itemNumber)
      : null
  if (designName) known.designName = designName

  const collection = extractCollectionFields(normalizedText)
  if (collection.collectionFamily) known.collectionFamily = collection.collectionFamily
  if (collection.collectionName) known.collectionName = collection.collectionName
  if (collection.collectionYear) known.collectionYear = collection.collectionYear

  const mainStone = normalizedText.match(
    /\b(Lab[-\s]?Created\s+[A-Z][A-Za-z]+)\b/i,
  )?.[1]
  if (mainStone) known.mainStone = normalizeCapitalizedPhrase(mainStone)
  if (!known.mainStone) {
    const coloredStone = normalizedText.match(
      /\b(pink|blue|green|purple|red|orange|yellow|violet|teal|clear|black|white)\s+stones?\b/i,
    )?.[1]
    if (coloredStone) {
      known.mainStone = normalizeCapitalizedPhrase(`${coloredStone} stone`)
    }
  }

  const material = normalizedText.match(
    /\b((?:Rhodium|Rose Gold|Gold|Silver|Sterling Silver)\s+Plating)\b/i,
  )?.[1]
  if (material) known.material = normalizeCapitalizedPhrase(material)
  if (!known.material) {
    const bareMetal = normalizedText.match(
      /\b(rose gold|sterling silver|silver|gold)\b/i,
    )?.[1]
    if (bareMetal) known.material = normalizeCapitalizedPhrase(bareMetal)
  }

  const quantity = normalizedText.match(
    /\b(?:qty|quantity|count)\s*(?:is|:|-)?\s*(\d+)\b/i,
  )
  if (quantity?.[1]) known.quantity = Number(quantity[1])

  const ringSize = normalizedText.match(
    /\b(?:ring\s*)?size\s*(?:is|:|-)?\s*([0-9]{1,2}(?:\.[0-9])?)\b/i,
  )
  if (ringSize?.[1]) known.ringSize = ringSize[1]

  if (
    !known.rarityClassification &&
    known.itemNumber &&
    /\bstandard\b/i.test(normalizedText)
  ) {
    known.rarityClassification = 'standard'
  }

  return known
}

/** Known values win. User lines that name the piece fill anything still blank. */
export function enrichKnownFromPieceMessages(
  known: TradeBoardIntakeKnownFields,
  messages: Array<{ role?: string; parts?: unknown }>,
): TradeBoardIntakeKnownFields {
  const item = known.itemNumber?.trim().toUpperCase()
  if (!item) return known
  const text = messages
    .filter((message) => message.role === 'user')
    .map((message) => messageText(message.parts))
    .filter((line) => line.toUpperCase().includes(item))
    .join('\n')
  if (!text.trim()) return known
  return mergeTradeBoardKnownFields(extractKnownFieldsFromText(text), known)
}

function messageText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(
      (part): part is { type?: string; text?: string } =>
        Boolean(part) && typeof part === 'object',
    )
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
}

/**
 * Rarity the rep already said in this chat. A bare "no" only counts when
 * nothing more specific was said, so refusing a photo does not erase "standard".
 */
export function rarityFromConversation(
  messages: Array<{ role?: string; parts?: unknown }>,
): TradeBoardIntakeKnownFields['rarityClassification'] | undefined {
  let bareNo = false
  let found: TradeBoardIntakeKnownFields['rarityClassification'] | undefined
  for (const message of messages) {
    if (message.role !== 'user') continue
    const text = messageText(message.parts).replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (/^\s*no\s*[.!]?\s*$/i.test(text)) {
      bareNo = true
      continue
    }
    const rarity = extractRarityClassification(text)
    if (rarity) found = rarity
    else if (/\bstandard\b/i.test(text)) found = 'standard'
  }
  return found ?? (bareNo ? 'standard' : undefined)
}

function extractRarityClassification(
  text: string,
): TradeBoardIntakeKnownFields['rarityClassification'] | undefined {
  // Only parse a direct answer in rarity-question language. Material/stone
  // phrases such as "diamond cubic zirconia" are deliberately ignored.
  if (/^\s*unicorn\s*[.!]?\s*$/i.test(text) || /\b(?:this (?:piece|one) is|it is|it'?s)\s+(?:a\s+)?unicorn\b/i.test(text)) {
    return 'unicorn'
  }
  if (/^\s*diamond\s*[.!]?\s*$/i.test(text) || /\b(?:this (?:piece|one) is|it is|it'?s)\s+(?:a\s+)?diamond(?:\s+piece)?\b/i.test(text)) {
    return 'diamond'
  }
  if (
    /^\s*(?:no|neither|standard|normal|regular)(?:\s*[-—]\s*standard)?\s*[.!]?\s*$/i.test(text) ||
    (/\b(?:no|neither|standard|normal|regular)\b/i.test(text) &&
      /\b(?:diamond|unicorn|piece|one|rarity)\b/i.test(text))
  ) {
    return 'standard'
  }
  return undefined
}

export function extractKnownFieldsFromCatalogToolOutputs(
  messages: UIMessage[],
): TradeBoardIntakeKnownFields {
  const parts = messages.flatMap(
    (message) => (message.parts ?? []) as CatalogToolPart[],
  )
  const toolParts = parts
    .filter((part) =>
      ['tool-search_jewelry_database', 'tool-prepare_trade_board_work'].includes(
        part.type ?? '',
      ),
    )
    .filter((part) => part.state === 'output-available')
    .reverse()

  for (const part of toolParts) {
    const result = part.output?.design ?? part.output?.results?.[0]
    if (!result) continue
    const known = knownFieldsFromCatalogResult(result)
    if (known.itemNumber && known.designName) return known
  }

  return {}
}

export function knownFieldsFromCatalogResult(
  result: Record<string, unknown>,
): TradeBoardIntakeKnownFields {
  const known: TradeBoardIntakeKnownFields = {}
  if (typeof result.itemNumber === 'string' && result.itemNumber.trim()) {
    known.itemNumber = result.itemNumber.trim().toUpperCase()
  }
  if (typeof result.designName === 'string' && result.designName.trim()) {
    known.designName = result.designName.trim()
  }
  if (typeof result.collectionName === 'string' && result.collectionName.trim()) {
    known.collectionName = normalizeCollectionName(result.collectionName)
  }
  if (typeof result.collectionYear === 'number') {
    known.collectionYear = result.collectionYear
  }
  if (typeof result.material === 'string' && result.material.trim()) {
    known.material = normalizeCapitalizedPhrase(result.material)
  }
  if (typeof result.mainStone === 'string' && result.mainStone.trim()) {
    known.mainStone = normalizeCapitalizedPhrase(result.mainStone)
  }
  return known
}

export function normalizeCollectionName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bcollection\b$/i, '')
    .trim()
}

function extractCollectionFields(text: string): {
  collectionFamily?: string
  collectionName?: string
  collectionYear?: number
} {
  const family = extractCollectionFamily(text)
  const prefix = text.match(
    /\b(?:collection|coll)\b\s*(?:is|:|-)\s*([A-Za-z][A-Za-z\s]*?)(?:\s+Collection)?(?:[,\s]+(20\d{2}))?(?=\.|,|$)/i,
  )
  if (prefix?.[1]) {
    const collectionName = tidyCollectionName(prefix[1])
    return {
      collectionFamily: family ?? collectionFamilyFromName(collectionName),
      collectionName,
      collectionYear: prefix[2] ? Number(prefix[2]) : undefined,
    }
  }

  const suffix = text.match(
    /\b((?:[A-Za-z]+\s+){0,3}[A-Za-z]+)\s+collection\b(?:,?\s*(20\d{2}))?/i,
  )
  if (suffix?.[1]) {
    const collectionName = tidyCollectionName(suffix[1])
    return {
      collectionFamily: family ?? collectionFamilyFromName(collectionName),
      collectionName,
      collectionYear: suffix[2] ? Number(suffix[2]) : undefined,
    }
  }

  const standaloneBirthday = text.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+Birthday)(?:\s+Collection)?\s*,?\s*(20\d{2})\b/i,
  )
  if (standaloneBirthday?.[1]) {
    const collectionName = normalizeCapitalizedPhrase(
      normalizeCollectionName(standaloneBirthday[1]),
    )
    return {
      collectionFamily: 'Birthday',
      collectionName,
      collectionYear: standaloneBirthday[2]
        ? Number(standaloneBirthday[2])
        : undefined,
    }
  }

  return family ? { collectionFamily: family } : {}
}

function extractJewelryType(text: string): TradeBoardIntakeKnownFields['jewelryType'] | undefined {
  if (/\b(ring|rings)\b/i.test(text)) return 'RG'
  if (/\b(necklace|necklaces|pendant|pendants)\b/i.test(text)) return 'NK'
  if (/\b(earring|earrings|stud|studs|hoop|hoops)\b/i.test(text)) return 'ER'
  if (/\b(stack|stacks)\b/i.test(text)) return 'ST'
  if (/\b(bracelet|bracelets)\b/i.test(text)) return 'BR'
  return undefined
}

function extractCollectionFamily(text: string): string | undefined {
  if (/\bbirthday\b/i.test(text)) return 'Birthday'
  if (/\b(?:og|originals?)\b/i.test(text)) return 'OG'
  if (/\bsterling\b/i.test(text)) return 'Sterling'
  if (/\bstacks?\b/i.test(text)) return 'Stacks'
  if (/\bsimply\s+studs?\b/i.test(text)) return 'Simply Studs'
  if (/\bluxe\b/i.test(text)) return 'Luxe'
  return undefined
}

function collectionFamilyFromName(name: string): string | undefined {
  return extractCollectionFamily(name)
}

/** Birthday, OG, Luxe, Original, Sterling, and Stacks are named by the collection. */
const RAW_LABEL_TITLE =
  /smoke only|\bonly\s*-|item\s*#|style\s*#|not for sale|for smoke/i

/** Small print on a label is not a design name. */
export function looksLikeRawLabelTitle(value?: string | null): boolean {
  const text = value?.trim() ?? ''
  if (!text) return false
  return RAW_LABEL_TITLE.test(text)
}

/**
 * A title comes from the design the rep confirmed. Raw label text is dropped.
 * An empty proposal stays empty so a later save does not invent a name.
 */
export function pieceTitleFromConfirmedDetails(args: {
  proposed?: string | null
  confirmed?: string | null
}): string | undefined {
  const proposed = args.proposed?.trim()
  const confirmed = args.confirmed?.trim()
  if (!proposed) return undefined
  if (confirmed && proposed.toLowerCase() === confirmed.toLowerCase()) return confirmed
  if (
    confirmed &&
    proposed.toLowerCase().includes(confirmed.toLowerCase()) &&
    looksLikeRawLabelTitle(proposed)
  ) {
    return confirmed
  }
  if (looksLikeRawLabelTitle(proposed)) {
    return confirmed && !looksLikeRawLabelTitle(confirmed) ? confirmed : undefined
  }
  return proposed
}

export function impliedCollectionType(name?: string | null): string | undefined {
  const text = name?.trim()
  if (!text) return undefined
  return extractCollectionFamily(text)
}

const COLLECTION_LEAD =
  /^(?:the|a|an|my|this|that|in|for|from|our|to|into|is|it|was|its|correct)\s+/i

function tidyCollectionName(raw: string): string {
  let name = normalizeCollectionName(raw)
  for (let pass = 0; pass < 4 && COLLECTION_LEAD.test(name); pass += 1) {
    name = name.replace(COLLECTION_LEAD, '').trim()
  }
  return name
}

function extractDesignNameNearItemNumber(
  text: string,
  itemNumber: string,
): string | null {
  const escapedItemNumber = escapeRegExp(itemNumber)
  const match = text.match(
    new RegExp(`\\b${escapedItemNumber}\\b\\s*(?:[,;:\\-=]|is)?\\s*([^.;\\n]+)`, 'i'),
  )
  const rawCandidate = match?.[1]?.split(/\s*,\s*/)[0]?.trim() ?? ''
  const candidate = trimDesignCandidate(
    rawCandidate.replace(/^["']|["']$/g, '').trim(),
  )
  if (!candidate) return null
  if (
    !/\b(rings?|earrings?|necklaces?|bracelets?|pendants?|stacks?|hoops?|studs?)\b/i.test(
      candidate,
    )
  ) {
    return null
  }
  return candidate
}

function trimDesignCandidate(candidate: string): string {
  return candidate
    .split(/\b(?:size|collection|standard|diamond|unicorn)\b/i)[0]
    ?.replace(/[,:\-]\s*$/, '')
    .trim() ?? ''
}

function normalizeCapitalizedPhrase(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part,
        )
        .join('-'),
    )
    .join(' ')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const NOT_A_DESIGN_TITLE =
  /\b(label|photo|save|skip|yes|blur|crop|collection|standard|diamond|unicorn|size|here'?s|send|reply|remove|dance floor|piece to save)\b/i

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** A title next to the item number, even when it is not the word ring or necklace. */
function designTitleNearItem(text: string, itemNumber: string): string | null {
  const match = text.match(
    new RegExp(`\\b${escapeRegExp(itemNumber)}\\b\\s*(?:[,;:\\-=]|is)?\\s*([^.;\\n]+)`, 'i'),
  )
  const candidate = trimDesignCandidate(
    (match?.[1]?.split(/\s*,\s*/)[0] ?? '').replace(/^["']|["']$/g, '').trim(),
  )
  if (!candidate || candidate.length < 3) return null
  if (NOT_A_DESIGN_TITLE.test(candidate)) return null
  const words = candidate.split(/\s+/)
  if (words.length < 2 || words.length > 8) return null
  if (!/^[A-Z0-9]/.test(candidate)) return null
  return candidate
}

function fieldsFromToolPart(
  part: unknown,
  itemNumber: string,
): TradeBoardIntakeKnownFields {
  if (!part || typeof part !== 'object') return {}
  const record = part as {
    type?: string
    input?: Record<string, unknown>
    output?: Record<string, unknown>
  }
  const type = record.type ?? ''
  if (!/add_listing|prepare_trade_board|search_jewelry/i.test(type)) return {}
  const input = record.input ?? {}
  const output = record.output ?? {}
  const named = String(input.itemNumber ?? output.itemNumber ?? '')
    .trim()
    .toUpperCase()
  if (named && named !== itemNumber) return {}
  const known: TradeBoardIntakeKnownFields = {}
  const designName = stringField(input.designName) ?? stringField(output.designName)
  if (designName && !looksLikeRawLabelTitle(designName)) known.designName = designName
  const collectionName = stringField(input.collectionName) ?? stringField(output.collectionName)
  if (collectionName) known.collectionName = normalizeCollectionName(collectionName)
  const material = stringField(input.material) ?? stringField(output.material)
  if (material) known.material = material
  const mainStone = stringField(input.mainStone) ?? stringField(output.mainStone)
  if (mainStone) known.mainStone = mainStone
  const ringSize = stringField(input.ringSize) ?? stringField(output.ringSize)
  if (ringSize) known.ringSize = ringSize
  const rarity = stringField(input.rarityClassification) ?? stringField(output.rarityClassification)
  if (rarity === 'standard' || rarity === 'diamond' || rarity === 'unicorn') {
    known.rarityClassification = rarity
  }
  return known
}

/**
 * Details the rep already gave, including a design name that lived only on an
 * earlier tool call. Stored session values win over a later guess.
 */
export function recoverStoredPieceDetails(
  known: TradeBoardIntakeKnownFields,
  messages: Array<{ role?: string; parts?: unknown }>,
): TradeBoardIntakeKnownFields {
  const item = known.itemNumber?.trim().toUpperCase()
  if (!item) return known
  let filled = { ...known }
  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : []
    for (const part of parts) {
      filled = mergeTradeBoardKnownFields(filled, fieldsFromToolPart(part, item))
    }
    const text = messageText(message.parts)
    if (!text.toUpperCase().includes(item)) continue
    filled = mergeTradeBoardKnownFields(filled, extractKnownFieldsFromText(text))
    if (!filled.designName) {
      const title = designTitleNearItem(text, item)
      if (title) filled = { ...filled, designName: title }
    }
  }
  return mergeTradeBoardKnownFields(filled, known)
}
