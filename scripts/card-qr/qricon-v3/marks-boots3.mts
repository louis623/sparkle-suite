import type { Mark } from './marks3.mts'
const SIL = 'M5.4 2.0 Q7.6 4.6 9.8 4.4 Q12.0 4.6 14.2 2.0 L12.8 12.2 C13.4 13.6 15.8 14.6 18.6 15.6 L22.4 17.5 Q22.3 18.3 21.0 18.3 L11.8 18.3 Q10.9 17.5 10.0 18.0 L9.0 21.8 L6.2 21.8 L6.4 17.8 C5.6 14 5.0 8 5.4 2.0Z'
const boot = (d: string, sep = false) => `
  <path d="${SIL}" fill="${d}" ${sep ? 'stroke="#fff" stroke-width="0.9"' : `stroke="${d}" stroke-width="0.4"`} stroke-linejoin="round"/>
  <path d="M6.4 18.2 H10.2" stroke="#fff" stroke-width="0.45"/>
  <path d="M6.9 6.6 Q9.6 13.6 12.6 6.6" fill="none" stroke="#fff" stroke-width="0.55" stroke-linecap="round"/>
  <path d="M8.1 7.0 Q9.6 10.8 11.3 7.0" fill="none" stroke="#fff" stroke-width="0.5" stroke-linecap="round"/>
  <path d="M13.4 14.4 Q16.6 16.2 20.6 17.0" fill="none" stroke="#fff" stroke-width="0.5" stroke-linecap="round"/>
  <path transform="translate(9.4 14.8) scale(0.5)" d="M0 1.6 C-2.2 0.2 -2.2 -1.6 -1.1 -1.6 C-0.5 -1.6 -0.1 -1.2 0 -0.8 C0.1 -1.2 0.5 -1.6 1.1 -1.6 C2.2 -1.6 2.2 0.2 0 1.6Z" fill="#fff"/>`
export const MARKS3: Mark[] = [
  { id: 'boots-v3', label: 'Cowgirl boot v3 (single)', status: 'CANDIDATE', iconScale: 0.68, source: 'original drawing (Sparkle Suite)', draw: (d) => ({ vb: '0 0 24 24', inner: `<g transform="translate(-1.8 0)">${boot(d)}</g>` }) },
  { id: 'boots-v3-B', label: 'Cowgirl boots v3 · B (pair)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: (d) => ({ vb: '0 0 24 24', inner: `<g transform="translate(1.4 -0.6) scale(0.9)">${boot(d)}</g><g transform="translate(-3.2 2.0) scale(0.9)">${boot(d, true)}</g>` }) },
]
