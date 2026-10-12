import type { Mark } from './marks3.mts'
function ladybug(d: string) {
  return { vb: '0 0 24 24', inner: `
  <path d="M10.6 4.6 Q9 2.2 7.2 1.8 M13.4 4.6 Q15 2.2 16.8 1.8" fill="none" stroke="${d}" stroke-width="1.1" stroke-linecap="round"/>
  <circle cx="7.1" cy="1.9" r="1" fill="${d}"/><circle cx="16.9" cy="1.9" r="1" fill="${d}"/>
  <ellipse cx="12" cy="6.6" rx="3.4" ry="2.6" fill="${d}"/>
  <ellipse cx="12" cy="15.2" rx="8.0" ry="7.9" fill="${d}" stroke="#fff" stroke-width="0.8"/>
  <path d="M12 7.4 V23" stroke="#fff" stroke-width="0.8"/>
  <circle cx="8.4" cy="11.6" r="1.35" fill="#fff"/><circle cx="15.6" cy="11.6" r="1.35" fill="#fff"/>
  <circle cx="7.2" cy="16.4" r="1.15" fill="#fff"/><circle cx="16.8" cy="16.4" r="1.15" fill="#fff"/>
  <circle cx="9.8" cy="19.8" r="1.0" fill="#fff"/><circle cx="14.2" cy="19.8" r="1.0" fill="#fff"/>` }
}
export const MARKS3: Mark[] = [{ id: 'ladybug', label: 'Ladybug', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: ladybug }]
