import type { Mark } from './marks3.mts'
const faces = 'M11 7.6 L19.4 11.8 L11 16 L2.6 11.8 Z'
const left = 'M2.6 11.8 L11 16 L11 23.4 L2.6 19.2 Z'
const right = 'M19.4 11.8 L11 16 L11 23.4 L19.4 19.2 Z'
const fizz = (d: string) => `
  <circle cx="8" cy="3.6" r="1.5" fill="none" stroke="${d}" stroke-width="1.05"/>
  <circle cx="13.6" cy="2.2" r="1.05" fill="none" stroke="${d}" stroke-width="0.95"/>
  <circle cx="16.8" cy="5.4" r="0.8" fill="${d}"/><circle cx="11.2" cy="5.6" r="0.55" fill="${d}"/>
  <circle cx="4.6" cy="7" r="0.5" fill="${d}"/>
  <path d="M20.6 2.2 Q20.8 3.4 22 3.6 Q20.8 3.8 20.6 5 Q20.4 3.8 19.2 3.6 Q20.4 3.4 20.6 2.2Z" fill="${d}"/>`
// A: three tones (top light, left full, right mid), white seams
function cubeA(d: string) { return { vb: '0 0 24 24', inner: `
  <path d="${left}" fill="${d}"/><path d="${right}" fill="${d}" fill-opacity="0.68"/><path d="${faces}" fill="${d}" fill-opacity="0.34"/>
  <path d="M2.6 11.8 L11 16 L19.4 11.8 M11 16 L11 23.4" fill="none" stroke="#fff" stroke-width="0.7" stroke-linejoin="round"/>
  <circle cx="7.4" cy="17.6" r="0.5" fill="#fff"/><circle cx="5.2" cy="15.6" r="0.4" fill="#fff"/><circle cx="14.6" cy="18.8" r="0.45" fill="#fff"/>${fizz(d)}` } }
// B: outlined cube, solid sides, open (white) top with fizz specks
function cubeB(d: string) { return { vb: '0 0 24 24', inner: `
  <path d="${left}" fill="${d}"/><path d="${right}" fill="${d}" fill-opacity="0.72"/>
  <path d="${faces}" fill="#fff" stroke="${d}" stroke-width="1.3" stroke-linejoin="round"/>
  <circle cx="9" cy="11.6" r="0.6" fill="${d}"/><circle cx="12.8" cy="12.6" r="0.5" fill="${d}"/><circle cx="11.4" cy="10.2" r="0.45" fill="${d}"/>
  <path d="M11 16 L11 23.4" stroke="#fff" stroke-width="0.7"/>${fizz(d)}` } }
export const MARKS3: Mark[] = [
  { id: 'bath-bomb-cube-A', label: 'Bath bomb · cube A (tonal faces)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: cubeA },
  { id: 'bath-bomb-cube-B', label: 'Bath bomb · cube B (open top, fizz)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: cubeB },
]
