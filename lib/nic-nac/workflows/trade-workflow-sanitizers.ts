import type { TradeWorkflowKnownFields } from './trade-workflow-types'

const SAFE_CORRECTION_FIELDS = new Set([
  'designName',
  'collectionName',
  'collectionYear',
  'material',
  'mainStone',
  'canonicalPhotoUrl',
  'jewelryType',
  'specialFeatures',
  'lengthInfo',
  'searchTags',
])

export function normalizeTradeItemNumber(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z]{1,4}[0-9][A-Z0-9-]{2,20}$/.test(normalized)) return undefined
  return normalized
}

export function normalizeTradeMaterial(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed || trimmed.length > 80) return undefined
  return trimmed
}

export function normalizeTradeRingSize(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim().toUpperCase()
  if (!/^(?:[4-9]|1[0-3])(?:\.5)?$/.test(text)) return undefined
  return text
}

export function sanitizeTradeWorkflowKnownFields(
  fields: TradeWorkflowKnownFields,
): TradeWorkflowKnownFields {
  const sanitized: TradeWorkflowKnownFields = { ...fields }
  sanitized.itemNumber = normalizeTradeItemNumber(fields.itemNumber)
  sanitized.revealedItemNumber = normalizeTradeItemNumber(fields.revealedItemNumber)
  sanitized.material = normalizeTradeMaterial(fields.material)
  sanitized.revealedMaterial = normalizeTradeMaterial(fields.revealedMaterial)
  sanitized.revealedRingSize = normalizeTradeRingSize(fields.revealedRingSize)

  if (fields.catalogCorrectionFields) {
    sanitized.catalogCorrectionFields = sanitizeCatalogCorrectionFields(
      fields.catalogCorrectionFields,
    )
  }

  return removeUndefined(sanitized)
}

export function sanitizeCatalogCorrectionFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (!SAFE_CORRECTION_FIELDS.has(key)) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) sanitized[key] = trimmed
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value
      continue
    }
    if (value === null) {
      sanitized[key] = null
      continue
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      sanitized[key] = value.map((entry) => entry.trim()).filter(Boolean).slice(0, 8)
    }
  }
  return sanitized
}

function removeUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
