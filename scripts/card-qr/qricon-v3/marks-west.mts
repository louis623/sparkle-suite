import type { Mark } from './marks3.mts'
const heart = (x: number, y: number, s: number, c = '#fff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 1.6 C-2.2 0.2 -2.2 -1.6 -1.1 -1.6 C-0.5 -1.6 -0.1 -1.2 0 -0.8 C0.1 -1.2 0.5 -1.6 1.1 -1.6 C2.2 -1.6 2.2 0.2 0 1.6Z" fill="${c}"/>`
const boot = (d: string) => `
  <path d="M1 0.6 L3.8 1.8 L6.6 0.6 L6.4 7.6 C7.4 8.6 10.2 9.8 12.6 10.6 Q14.6 11.3 14.2 12.6 Q13.8 13.3 12.4 13.3 L4.6 13.3 L4.0 15.8 H1.7 L1.4 13.0 Q0.8 12 1 10Z" fill="${d}" stroke="#fff" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M2 3.6 Q3.8 6.8 5.6 3.6" fill="none" stroke="#fff" stroke-width="0.5" stroke-linecap="round"/>
  ${heart(3.8, 8.2, 0.62)}
  <path d="M6.6 9.4 Q9.4 10.8 12.2 11.6" fill="none" stroke="#fff" stroke-width="0.45" stroke-linecap="round"/>`
function boots(d: string) {
  return { vb: '0 0 24 24', inner: `<g transform="translate(8.0 2.4)">${boot(d)}</g><g transform="translate(2.4 5.4)">${boot(d)}</g>` }
}
function hat(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M7.4 13.4 C7.0 9.4 7.6 5.4 9.8 4.8 C10.8 4.5 11.4 5.4 12 6.0 C12.6 5.4 13.2 4.5 14.2 4.8 C16.4 5.4 17.0 9.4 16.6 13.4Z" fill="${d}"/>
  <path d="M7.3 10.0 H16.7 M7.3 11.9 H16.7" stroke="#fff" stroke-width="0.5"/>
  ${heart(12, 10.95, 0.42)}
  <path d="M1.4 8.6 C2.4 12.8 6 15.8 12 15.8 C18 15.8 21.6 12.8 22.6 8.6 C21.2 11.0 18.6 12.6 16.6 13.0 C15 13.3 13.6 13.4 12 13.4 C10.4 13.4 9 13.3 7.4 13.0 C5.4 12.6 2.8 11.0 1.4 8.6Z" fill="${d}" stroke="#fff" stroke-width="0.6" stroke-linejoin="round"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'cowgirl-boots', label: 'Cowgirl boots', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: boots },
  { id: 'cowgirl-hat', label: 'Cowgirl hat', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: hat },
]
