import type { Mark } from './marks3.mts'
// Soft cup bloom: rounded U with gentle scalloped top (3 soft bumps), no points.
const cup = (d: string, x: number, y: number, s: number, rot: number) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M-2.6 -1.6 Q-2.4 -3.4 -1.3 -3.0 Q-0.6 -4.0 0 -3.2 Q0.6 -4.0 1.3 -3.0 Q2.4 -3.4 2.6 -1.6 Q2.8 2.6 0 2.8 Q-2.8 2.6 -2.6 -1.6Z" fill="${d}" stroke="#fff" stroke-width="${0.5 / s}" stroke-linejoin="round"/></g>`
function bunch(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M12 21.6 Q11 15 7.4 10.2 M12 21.6 V8.4 M12 21.6 Q13 15 16.6 10.2" fill="none" stroke="${d}" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M11.6 20.4 C9.4 18.6 6.8 15.6 5.6 12.6 C8.6 13.6 10.8 16.4 11.6 20.4Z" fill="${d}" stroke="#fff" stroke-width="0.4"/>
  <path d="M12.4 20.4 C14.6 18.6 17.2 15.6 18.4 12.6 C15.4 13.6 13.2 16.4 12.4 20.4Z" fill="${d}" stroke="#fff" stroke-width="0.4"/>
  ${cup(d, 7.0, 8.8, 1.05, -18)}${cup(d, 17.0, 8.8, 1.05, 18)}${cup(d, 12, 5.6, 1.2, 0)}
  <path d="M10.2 17.8 Q12 18.6 13.8 17.8 L13.6 19.4 Q12 20.0 10.4 19.4Z" fill="${d}" stroke="#fff" stroke-width="0.45" stroke-linejoin="round"/>` }
}
export const MARKS3: Mark[] = [{ id: 'tulip-bunch', label: 'Tulip bunch', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: bunch }]
