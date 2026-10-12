// QR center marks v3 (review only, box). Same badge + style as v2 approved marks.
import fs from 'node:fs'
const SRC = new URL('./src', import.meta.url).pathname
export function iconify(file: string, color: string) {
  const s = fs.readFileSync(`${SRC}/${file}`, 'utf8')
  const vb = /viewBox="([^"]+)"/.exec(s)![1]
  const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replaceAll('currentColor', color)
  return { vb, inner }
}
export type Mark = { id: string; label: string; status: 'LOCKED' | 'CANDIDATE'; iconScale: number; source: string; draw: (d: string) => { vb: string; inner: string } }

// Original drawing: garden gnome (tall hat, round nose, full beard, boots).
function gnome(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M5.6 10.4 C7.2 6.6 9.6 3.4 13.2 1.6 C15.4 0.6 17.6 1.2 18.6 2.6 C17.0 2.4 15.8 3.0 15.4 4.4 C16.6 6.4 17.8 8.4 18.4 10.4 Z" fill="${d}" stroke="${d}" stroke-width="0.5" stroke-linejoin="round"/>
  <circle cx="19.2" cy="3.2" r="1.15" fill="${d}"/>
  <path d="M5.0 11.4 H19.0 C19.2 15.2 17.6 18.6 15.4 20.4 C14.6 21.6 13.4 22.6 12.0 23.0 C10.6 22.6 9.4 21.6 8.6 20.4 C6.4 18.6 4.8 15.2 5.0 11.4 Z" fill="${d}"/>
  <path d="M4.8 11.0 H19.2" stroke="#fff" stroke-width="0.9" stroke-linecap="round"/>
  <path d="M9.2 15.4 C8.9 17.2 9.6 18.8 10.6 20.0 M14.8 15.4 C15.1 17.2 14.4 18.8 13.4 20.0 M12 16.6 V20.8" fill="none" stroke="#fff" stroke-width="0.6" stroke-linecap="round"/>
  <ellipse cx="12" cy="13.3" rx="2.25" ry="1.85" fill="${d}" stroke="#fff" stroke-width="0.85"/>
  <path d="M8.0 12.9 Q8.9 12.3 9.6 12.9 M14.4 12.9 Q15.1 12.3 16.0 12.9" fill="none" stroke="#fff" stroke-width="0.7" stroke-linecap="round"/>` }
}
// Original drawing: fizzing bath bomb (sphere with seam, speckles, rising bubbles + sparkle).
function bathBomb(d: string) {
  return { vb: '0 0 24 24', inner: `
  <circle cx="10.6" cy="14" r="8" fill="${d}"/>
  <path d="M2.9 12.4 C6.4 14.6 14.4 14.8 18.4 12.1" fill="none" stroke="#fff" stroke-width="0.85" stroke-linecap="round"/>
  <path d="M5.6 9.4 A6.2 6.2 0 0 1 9.4 7.2" fill="none" stroke="#fff" stroke-width="1.05" stroke-linecap="round"/>
  <circle cx="7.4" cy="17.4" r="0.62" fill="#fff"/><circle cx="12.6" cy="18.6" r="0.55" fill="#fff"/>
  <circle cx="14.6" cy="16.4" r="0.45" fill="#fff"/><circle cx="9.9" cy="19.9" r="0.42" fill="#fff"/>
  <circle cx="17.9" cy="5.3" r="1.75" fill="none" stroke="${d}" stroke-width="1.05"/>
  <circle cx="21.3" cy="2.6" r="1.05" fill="none" stroke="${d}" stroke-width="0.95"/>
  <circle cx="14.7" cy="3.0" r="0.85" fill="${d}"/>
  <path d="M21.2 7.6 Q21.4 8.8 22.6 9.0 Q21.4 9.2 21.2 10.4 Q21.0 9.2 19.8 9.0 Q21.0 8.8 21.2 7.6Z" fill="${d}"/>` }
}
// Original drawing: daisy (12 long petals, white gap ring, solid center).
function daisy(d: string) {
  const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="12" cy="5.2" rx="1.75" ry="4.3" transform="rotate(${i * 30} 12 12)" fill="${d}"/>`).join('')
  return { vb: '0 0 24 24', inner: `${petals}<circle cx="12" cy="12" r="4.1" fill="#fff"/><circle cx="12" cy="12" r="3.15" fill="${d}"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'bath-bomb', label: 'Bath bomb (fizzing)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: bathBomb },
  { id: 'sparkling-heart', label: 'Heart · sparkling', status: 'CANDIDATE', iconScale: 0.62, source: 'Microsoft Fluent Emoji High Contrast (MIT)', draw: (d) => iconify('fluent-emoji-high-contrast_sparkling-heart.svg', d) },
  { id: 'palm-tree', label: 'Palm tree', status: 'CANDIDATE', iconScale: 0.62, source: 'Phosphor Icons (MIT)', draw: (d) => iconify('ph_tree-palm-fill.svg', d) },
  { id: 'peace', label: 'Peace sign', status: 'CANDIDATE', iconScale: 0.6, source: 'Phosphor Icons (MIT)', draw: (d) => iconify('ph_peace-fill.svg', d) },
  { id: 'gift', label: 'Gift box', status: 'CANDIDATE', iconScale: 0.6, source: 'Phosphor Icons (MIT)', draw: (d) => iconify('ph_gift-fill.svg', d) },
  { id: 'daisy', label: 'Daisy flower', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: daisy },
]
