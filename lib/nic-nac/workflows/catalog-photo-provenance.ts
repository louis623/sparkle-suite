export type CatalogPhotoProvenance = {
  disposition: 'catalog_source_saved' | 'catalog_photo_ignored'
  sourcePhotoId: string | null
  sourceSha256: string | null
  itemNumber: string | null
  recordedAt: string
}
export function readCatalogPhotoProvenance(metadata: Record<string, unknown>, designId: string): CatalogPhotoProvenance | null {
  if (typeof designId !== 'string' || !designId) return null
  const map = metadata.catalogPhotoProvenance
  if (!map || typeof map !== 'object' || Array.isArray(map) || !Object.hasOwn(map, designId)) return null
  const entry = (map as Record<string, unknown>)[designId]
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  const e = entry as CatalogPhotoProvenance
  if (!['catalog_source_saved', 'catalog_photo_ignored'].includes(e.disposition) ||
      !(e.sourcePhotoId === null || typeof e.sourcePhotoId === 'string') ||
      !(e.sourceSha256 === null || typeof e.sourceSha256 === 'string' && /^[a-f0-9]{64}$/i.test(e.sourceSha256)) ||
      !(e.itemNumber === null || typeof e.itemNumber === 'string') ||
      typeof e.recordedAt !== 'string' || !Number.isFinite(Date.parse(e.recordedAt))) return null
  return e
}
export function recordCatalogPhotoProvenance(metadata: Record<string, unknown>, designId: string, entry: CatalogPhotoProvenance): void {
  if (!designId || typeof designId !== 'string') return
  const map = metadata.catalogPhotoProvenance
  const previous = map && typeof map === 'object' && !Array.isArray(map) ? map as Record<string, unknown> : {}
  // Even malformed historical entries are never overwritten; the reader treats them as absent.
  if (Object.hasOwn(previous, designId)) return
  metadata.catalogPhotoProvenance = { ...previous, [designId]: { ...entry } }
}
