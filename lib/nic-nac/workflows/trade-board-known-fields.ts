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

  const designName = itemNumber
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

  const material = normalizedText.match(
    /\b((?:Rhodium|Rose Gold|Gold|Silver|Sterling Silver)\s+Plating)\b/i,
  )?.[1]
  if (material) known.material = normalizeCapitalizedPhrase(material)

  const msrp = normalizedText.match(/\$\s*(\d+(?:\.\d{1,2})?)\s*(?:MSRP)?\b/i)
  if (msrp?.[1]) known.bpMsrp = Number(msrp[1])

  const quantity = normalizedText.match(
    /\b(?:qty|quantity|count)\s*(?:is|:|-)?\s*(\d+)\b/i,
  )
  if (quantity?.[1]) known.quantity = Number(quantity[1])

  const ringSize = normalizedText.match(
    /\b(?:ring\s*)?size\s*(?:is|:|-)?\s*([0-9](?:\.[0-9])?)\b/i,
  )
  if (ringSize?.[1]) known.ringSize = ringSize[1]

  return known
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
  if (typeof result.bpMsrp === 'number') {
    known.bpMsrp = result.bpMsrp
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
    const collectionName = normalizeCollectionName(prefix[1])
    return {
      collectionFamily: family ?? collectionFamilyFromName(collectionName),
      collectionName,
      collectionYear: prefix[2] ? Number(prefix[2]) : undefined,
    }
  }

  const suffix = text.match(
    /\b([A-Za-z]+(?:\s+(?:Birthday|Originals|Luxe|Stacks?))?)\s+collection\b(?:,?\s*(20\d{2}))?/i,
  )
  if (suffix?.[1]) {
    const collectionName = normalizeCollectionName(suffix[1])
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

function extractDesignNameNearItemNumber(
  text: string,
  itemNumber: string,
): string | null {
  const escapedItemNumber = escapeRegExp(itemNumber)
  const match = text.match(
    new RegExp(`\\b${escapedItemNumber}\\b\\s*(?:[,;:\\-=]|is)?\\s*([^.;\\n]+)`, 'i'),
  )
  const rawCandidate = match?.[1]?.split(/\s*,\s*/)[0]?.trim() ?? ''
  const candidate = rawCandidate.replace(/^["']|["']$/g, '').trim()
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
