import type { Mark } from './marks3.mts'
const f = (n: number) => n.toFixed(2)
const bow = (d: string, x: number, y: number, k: number) => `<g transform="translate(${x} ${y}) scale(${k})">
  <path d="M0 0 C-1.6 -2.6 -4.6 -2.6 -4.4 -0.2 C-4.3 1.6 -1.8 1.4 0 0Z M0 0 C1.6 -2.6 4.6 -2.6 4.4 -0.2 C4.3 1.6 1.8 1.4 0 0Z" fill="${d}" stroke="#fff" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M-0.4 0.4 L-2.6 4.0 L-1.4 3.8 L-0.8 4.8 L0.4 0.6Z M0.4 0.4 L2.6 4.0 L1.4 3.8 L0.8 4.8 L-0.4 0.6Z" fill="${d}" stroke="#fff" stroke-width="0.6" stroke-linejoin="round"/>
  <circle r="1.05" fill="${d}" stroke="#fff" stroke-width="0.6"/></g>`
const bell = (d: string, x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${d}" stroke="#fff" stroke-width="0.8"/>
  <path d="M${f(x - r * 0.62)} ${f(y + r * 0.18)} H${f(x + r * 0.62)}" stroke="#fff" stroke-width="${f(r * 0.17)}" stroke-linecap="round"/>
  <circle cx="${x}" cy="${f(y + r * 0.5)}" r="${f(r * 0.16)}" fill="#fff"/>
  <path d="M${f(x - r * 0.45)} ${f(y - r * 0.5)} A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(x + r * 0.1)} ${f(y - r * 0.68)}" fill="none" stroke="#fff" stroke-width="${f(r * 0.1)}" stroke-linecap="round"/>`
function bells(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M12 6.8 L8.2 11.4 M12 6.8 L15.8 11.4" stroke="${d}" stroke-width="1.1" stroke-linecap="round"/>
  ${bell(d, 8.0, 15.6, 5.0)}${bell(d, 16.2, 15.6, 5.0)}${bow(d, 12, 6.2, 1.05)}` }
}
function wreath(d: string) {
  const lobes = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return `<circle cx="${f(12 + Math.cos(a) * 7.4)}" cy="${f(11.6 + Math.sin(a) * 7.4)}" r="2.35" fill="${d}"/>` }).join('')
  const berries = [[-0.9, 1], [-0.75, 0.92], [0.5, 1.1], [0.62, 1], [2.4, 1.05], [2.55, 0.95], [3.7, 1.05], [-2.3, 1.0]].map(([a]) => a)
  const bd = [-0.8, 0.55, 2.45, 3.75, -2.3].map((a) => { const x = 12 + Math.cos(a) * 7.4, y = 11.6 + Math.sin(a) * 7.4; return `<circle cx="${f(x)}" cy="${f(y)}" r="0.62" fill="#fff"/><circle cx="${f(x + 0.95)}" cy="${f(y + 0.55)}" r="0.52" fill="#fff"/>` }).join('')
  void berries
  return { vb: '0 0 24 24', inner: `<circle cx="12" cy="11.6" r="7.4" fill="none" stroke="${d}" stroke-width="3.6"/>${lobes}
  <circle cx="12" cy="11.6" r="4.4" fill="#fff"/>${bd}${bow(d, 12, 19.4, 1.0)}` }
}
export const MARKS3: Mark[] = [
  { id: 'jingle-bells', label: 'Jingle bells', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: bells },
  { id: 'wreath', label: 'Wreath', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: wreath },
]
