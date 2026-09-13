export const JEWELRY_RARITY_CLASSIFICATIONS = [
  'standard',
  'diamond',
  'unicorn',
] as const

export type JewelryRarityClassification =
  (typeof JEWELRY_RARITY_CLASSIFICATIONS)[number]

export function normalizeJewelryRarityClassification(
  value: unknown,
): JewelryRarityClassification {
  return value === 'diamond' || value === 'unicorn' ? value : 'standard'
}

export function jewelryRarityToTradeBoardTier(
  value: unknown,
): 'everyday' | 'diamond' | 'unicorn' {
  const rarity = normalizeJewelryRarityClassification(value)
  return rarity === 'standard' ? 'everyday' : rarity
}
