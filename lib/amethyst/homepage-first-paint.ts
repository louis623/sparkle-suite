import type { AmethystPreviewTemplateData } from './preview-template-data'
import { renderAmethystPageFirstPaint } from './page-first-paint'
export { earlyHomepageControls } from './hero-motion-controls'
export { renderAmethystPageFirstPaint } from './page-first-paint'
export function renderHomepageFirstPaint(html: string, data: AmethystPreviewTemplateData, requestUrl: URL, bootstrap: string) {
  return renderAmethystPageFirstPaint('homepage', html, data, requestUrl, bootstrap)
}
