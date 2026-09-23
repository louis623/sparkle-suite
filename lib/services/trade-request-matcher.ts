// Version 1 of the trade-family mapping. Only explicit aliases are comparable;
// unknown and legacy collection names require a rep to classify them.
export const TRADE_FAMILY_MAPPING_VERSION = 1

export type TradeScreening = {
  status: 'likely_match' | 'mismatch' | 'needs_verification'
  reason: string | null
}

const FAMILY_ALIASES: Record<string, string> = {
  og: 'og',
  'og collection': 'og',
  'original collection': 'og',
  birthday: 'birthday',
  'birthday collection': 'birthday',
  'birthday collections': 'birthday',
  sterling: 'sterling',
  'sterling collection': 'sterling',
  'sterling club': 'sterling',
}

const TYPE_ALIASES: Record<string, 'RG' | 'NK' | 'ER' | 'ST' | 'BR'> = {
  rg: 'RG', ring: 'RG', rings: 'RG',
  nk: 'NK', necklace: 'NK', necklaces: 'NK', pendant: 'NK', pendants: 'NK',
  er: 'ER', earring: 'ER', earrings: 'ER',
  st: 'ST', stack: 'ST', stacks: 'ST',
  br: 'BR', bracelet: 'BR', bracelets: 'BR',
}

export function normalizeTradeFamily(value: string | null | undefined): string | null {
  if (!value) return null
  const text = value.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text || ['unknown', 'not sure', 'unsure', 'other', 'manual', 'legacy', 'none'].includes(text)) return null
  if (/\bbirthday\b/.test(text) && !/\b(non|not)\s+birthday\b/.test(text)) return 'birthday'
  // Distinct named collections compare only by exact normalized name. The
  // explicit aliases above are the only cross-name equivalences.
  return FAMILY_ALIASES[text] ?? `named:${text}`
}

export function normalizeTradeType(value: string | null | undefined): 'RG' | 'NK' | 'ER' | 'ST' | 'BR' | null {
  return value ? TYPE_ALIASES[value.trim().toLowerCase()] ?? null : null
}

export function screenTradeOffer(
  offeredFamily: string | null | undefined,
  offeredType: string | null | undefined,
  requestedFamily: string | null | undefined,
  requestedType: string | null | undefined,
): TradeScreening {
  const offerFamily = normalizeTradeFamily(offeredFamily)
  const requestFamily = normalizeTradeFamily(requestedFamily)
  const offerType = normalizeTradeType(offeredType)
  const requestType = normalizeTradeType(requestedType)
  if (!offerFamily || !requestFamily || !offerType || !requestType) {
    return { status: 'needs_verification', reason: 'The collection family or jewelry type needs rep verification.' }
  }
  if (offerFamily !== requestFamily) {
    return { status: 'mismatch', reason: `The offered ${offeredFamily?.trim()} collection does not match the requested ${requestedFamily?.trim()} collection.` }
  }
  if (offerType !== requestType) {
    return { status: 'mismatch', reason: 'The offered jewelry type does not match the requested dancer.' }
  }
  return { status: 'likely_match', reason: null }
}
