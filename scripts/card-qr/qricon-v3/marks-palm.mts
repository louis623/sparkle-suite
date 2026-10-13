import type { Mark } from './marks3.mts'
const CX = 14.2, CY = 7.2
// Arching frond: rises then droops, tapered; mirrored for left-side fronds.
const frond = (d: string, len: number, rot: number, flip = false, w = 1.9) =>
  `<path transform="translate(${CX} ${CY}) rotate(${rot}) scale(${flip ? -1 : 1} 1)" d="M0 0 Q${len * 0.45} ${-w * 1.9} ${len} ${w * 1.1} Q${len * 0.5} ${-w * 0.5} 0 ${w * 0.55} Z" fill="${d}"/>`
const trunk = 'M5.2 23 Q6.4 13.6 13.4 7.6 L15 8.4 Q9.6 14.6 8.6 23 Z'
function palmA(d: string) { return { vb: '0 0 24 24', inner: `
  <path d="${trunk}" fill="${d}"/>
  ${frond(d, 9, -8)}${frond(d, 8.4, 28)}${frond(d, 8, -8, true)}${frond(d, 7.6, 30, true)}${frond(d, 6, -62, false, 1.6)}
  <circle cx="13" cy="9.4" r="1.15" fill="${d}"/><circle cx="15.4" cy="9.6" r="1.05" fill="${d}"/>
  <path d="M2 23.2 Q9 20.6 16 23.2 Z" fill="${d}"/>` } }
function palmB(d: string) {
  const notches = [[7.0,20.2],[7.5,17.6],[8.3,15.2],[9.4,13],[10.8,10.9],[12.3,9.1]].map(([x,y]) => `<path d="M${x - 1.4} ${y + 0.5} L${x + 1.6} ${y - 0.6}" stroke="#fff" stroke-width="0.55" stroke-linecap="round"/>`).join('')
  return { vb: '0 0 24 24', inner: `
  <path d="${trunk}" fill="${d}"/>${notches}
  ${frond(d, 9.4, -4, false, 1.5)}${frond(d, 8.6, 34, false, 1.5)}${frond(d, 8.8, -4, true, 1.5)}${frond(d, 8, 34, true, 1.5)}${frond(d, 6.4, -50, false, 1.3)}${frond(d, 6, -50, true, 1.3)}` } }
export const MARKS3: Mark[] = [
  { id: 'palm-curved-A', label: 'Palm tree · curved A (smooth trunk, island)', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: palmA },
  { id: 'palm-curved-B', label: 'Palm tree · curved B (ringed trunk, 6 fronds)', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: palmB },
]
