import { iconify, type Mark } from './marks3.mts'
const f = (n: number) => n.toFixed(2)
const I = (file: string) => (d: string) => iconify(file, d)
// Sleigh bell: round body, slot with end holes, ball clapper below, top loop.
const bell = (d: string, x: number, y: number, r: number, rot: number) => `<g transform="rotate(${rot} ${x} ${y})">
  <circle cx="${x}" cy="${f(y - r * 1.08)}" r="${f(r * 0.3)}" fill="none" stroke="${d}" stroke-width="${f(r * 0.17)}"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="${d}" stroke="#fff" stroke-width="0.7"/>
  <path d="M${f(x - r * 0.98)} ${f(y - r * 0.12)} Q${x} ${f(y + r * 0.08)} ${f(x + r * 0.98)} ${f(y - r * 0.12)}" fill="none" stroke="#fff" stroke-width="0.5"/>
  <path d="M${f(x - r * 0.48)} ${f(y + r * 0.46)} H${f(x + r * 0.48)}" stroke="#fff" stroke-width="${f(r * 0.13)}" stroke-linecap="round"/>
  <circle cx="${f(x - r * 0.5)}" cy="${f(y + r * 0.46)}" r="${f(r * 0.17)}" fill="#fff"/><circle cx="${f(x + r * 0.5)}" cy="${f(y + r * 0.46)}" r="${f(r * 0.17)}" fill="#fff"/>
  <path d="M${f(x - r * 0.5)} ${f(y - r * 0.55)} A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(x)} ${f(y - r * 0.72)}" fill="none" stroke="#fff" stroke-width="${f(r * 0.1)}" stroke-linecap="round"/></g>`
function bells(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M12 5.4 Q10.4 7.8 9.9 10.0 M12 5.4 Q13.6 7.8 14.1 10.0" fill="none" stroke="${d}" stroke-width="1.2" stroke-linecap="round"/>
  ${bell(d, 15.4, 15.6, 4.4, -16)}${bell(d, 8.6, 15.6, 4.4, 16)}
  <path d="M12 5.2 C10.4 2.6 7.4 2.8 7.8 5 C8.1 6.6 10.6 6.2 12 5.2Z M12 5.2 C13.6 2.6 16.6 2.8 16.2 5 C15.9 6.6 13.4 6.2 12 5.2Z" fill="${d}" stroke="#fff" stroke-width="0.5" stroke-linejoin="round"/>
  <circle cx="12" cy="5.3" r="1.05" fill="${d}" stroke="#fff" stroke-width="0.5"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'palm-v7-A', label: 'Palm v7 · A (Pinhead coconut palm, CC0)', status: 'CANDIDATE', iconScale: 0.64, source: 'Pinhead Icons coconut-palm-tree (CC0-1.0)', draw: I('pinhead_coconut-palm-tree.svg') },
  { id: 'palm-v7-B', label: 'Palm v7 · B (Temaki tree-palm, CC0)', status: 'CANDIDATE', iconScale: 0.64, source: 'Temaki tree-palm (CC0-1.0)', draw: I('temaki_tree-palm.svg') },
  { id: 'palm-v7-C', label: 'Palm v7 · C (Glyphs palm-tree-bold, MIT)', status: 'CANDIDATE', iconScale: 0.64, source: 'Glyphs palm-tree-bold (MIT)', draw: I('glyphs_palm-tree-bold.svg') },
  { id: 'jingle-bells-v2', label: 'Jingle bells v2 (sleigh bells)', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: bells },
]
