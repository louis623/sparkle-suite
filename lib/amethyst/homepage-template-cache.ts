import { loadAmethystPreviewTemplateData } from './preview-template-data'

// V2 homepage only. Cache template configuration briefly, never events or lineup.
const templates = new Map<string, { expires: number; value: ReturnType<typeof loadAmethystPreviewTemplateData> }>()
export function loadHomepageV2Template(repId: string, publicSiteSlug: string) {
  const key = `${repId}:${publicSiteSlug}`
  const existing = templates.get(key)
  if (existing && existing.expires > Date.now()) return existing.value
  if (templates.size >= 32) templates.delete(templates.keys().next().value!)
  const value = loadAmethystPreviewTemplateData({ repId, publicSiteSlug })
  templates.set(key, { expires: Date.now() + 15_000, value })
  void value.catch(() => { if (templates.get(key)?.value === value) templates.delete(key) })
  return value
}
