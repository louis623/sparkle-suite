import type { Mark } from './marks3.mts'
// True isometric cube: regular hexagon outline, three equal rhombus faces.
const cube = (d: string, s: number, cy: number, seam: number, specks = '') => {
  const cx = 12, h = s * Math.sqrt(3) / 2
  const T = [cx, cy - s], UR = [cx + h, cy - s / 2], LR = [cx + h, cy + s / 2], B = [cx, cy + s], LL = [cx - h, cy + s / 2], UL = [cx - h, cy - s / 2]
  const p = (a: number[]) => a.map((v) => v.toFixed(2)).join(' ')
  return `<path d="M${p(T)} L${p(UR)} L${p(LR)} L${p(B)} L${p(LL)} L${p(UL)} Z" fill="${d}" stroke="${d}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M${p(UL)} L${cx} ${cy} L${p(UR)} M${cx} ${cy} L${p(B)}" fill="none" stroke="#fff" stroke-width="${seam}" stroke-linecap="round" stroke-linejoin="round"/>${specks}`
}
const fizz = (d: string) => `
  <circle cx="8.4" cy="3.4" r="1.45" fill="none" stroke="${d}" stroke-width="1.05"/>
  <circle cx="13.8" cy="2.1" r="1.0" fill="none" stroke="${d}" stroke-width="0.95"/>
  <circle cx="16.6" cy="5.2" r="0.8" fill="${d}"/><circle cx="11.4" cy="5.4" r="0.55" fill="${d}"/>
  <circle cx="5.4" cy="6.4" r="0.5" fill="${d}"/>
  <path d="M20.4 2.0 Q20.6 3.2 21.8 3.4 Q20.6 3.6 20.4 4.8 Q20.2 3.6 19.0 3.4 Q20.2 3.2 20.4 2.0Z" fill="${d}"/>`
export const MARKS3: Mark[] = [
  { id: 'bath-bomb-cube-C', label: 'Bath bomb · cube C (true cube, white seams)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)',
    draw: (d) => ({ vb: '0 0 24 24', inner: cube(d, 7.2, 15.6, 0.6) + fizz(d) }) },
  { id: 'bath-bomb-cube-D', label: 'Bath bomb · cube D (true cube, fizz specks on top)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)',
    draw: (d) => ({ vb: '0 0 24 24', inner: cube(d, 7.2, 15.6, 0.6, `<circle cx="10.2" cy="11.2" r="0.5" fill="#fff"/><circle cx="13.4" cy="12.2" r="0.42" fill="#fff"/><circle cx="12.3" cy="10" r="0.36" fill="#fff"/>`) + fizz(d) }) },
]
