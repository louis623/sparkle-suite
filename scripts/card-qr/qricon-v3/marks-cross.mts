import type { Mark } from './marks3.mts'
const cross = (d: string) => `<rect x="10.3" y="2" width="3.4" height="20.4" rx="1.1" fill="${d}"/><rect x="4.6" y="6.6" width="14.8" height="3.4" rx="1.1" fill="${d}"/>`
const spark = (d: string, x: number, y: number, r: number) => `<path d="M${x} ${y - r} Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y} Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r} Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y} Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z" fill="${d}"/>`
export const MARKS3: Mark[] = [
  { id: 'cross-A', label: 'Cross · A (Latin, rounded)', status: 'CANDIDATE', iconScale: 0.6, source: 'original drawing (Sparkle Suite)', draw: (d) => ({ vb: '0 0 24 24', inner: cross(d) }) },
  { id: 'cross-B', label: 'Cross · B (with sparkles)', status: 'CANDIDATE', iconScale: 0.6, source: 'original drawing (Sparkle Suite)', draw: (d) => ({ vb: '0 0 24 24', inner: cross(d) + spark(d, 18.6, 3.0, 1.9) + spark(d, 20.6, 13.4, 1.2) + spark(d, 5.2, 15.6, 1.3) }) },
]
