import type { Mark } from './marks3.mts'
function candyCane(d: string) {
  const path = 'M8.6 22 V9 A4.4 4.4 0 0 1 17.4 9 V10.6'
  const bands = [[8.6, 19.6], [8.6, 15.2], [8.6, 10.8]].map(([x, y]) => `<path d="M${x - 3} ${y + 1.8} L${x + 3} ${y - 1.8}" stroke="#fff" stroke-width="1.6"/>`).join('')
  return { vb: '0 0 24 24', inner: `<defs><mask id="ccm"><path d="${path}" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/></mask></defs>
  <path d="${path}" fill="none" stroke="${d}" stroke-width="3.8" stroke-linecap="round"/>
  <g mask="url(#ccm)">${bands}<path d="M11.6 2.6 L12.6 7.6" stroke="#fff" stroke-width="1.6"/><path d="M15.6 4.0 L13.8 7.4" stroke="#fff" stroke-width="1.6"/><path d="M19.6 8.4 L15.2 8.4" stroke="#fff" stroke-width="1.6"/></g>` }
}
function santaHat(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M4.6 17 C5.6 11 8.6 5.2 13.4 4.0 C17.2 3.1 20.2 5.2 21.2 8.8 C21.8 11 21.8 13.2 21.4 15.0 L18.9 14.6 C19.0 12.6 18.6 10.8 17.6 9.4 C17.8 12 17.8 14.4 17.6 17 Z" fill="${d}"/>
  <rect x="2.6" y="16.4" width="16.6" height="5" rx="2.5" fill="${d}" stroke="#fff" stroke-width="0.9"/>
  <path d="M5.4 18.9 h0.01 M8.4 18.4 h0.01 M11.4 19.1 h0.01 M14.4 18.4 h0.01 M17 18.9 h0.01" stroke="#fff" stroke-width="0.9" stroke-linecap="round"/>
  <circle cx="20.4" cy="16.8" r="2.5" fill="${d}" stroke="#fff" stroke-width="0.9"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'candy-cane', label: 'Candy cane (bold stripes)', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: candyCane },
  { id: 'santa-hat', label: 'Santa hat (floppy, fur band, pom-pom)', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: santaHat },
]
