import type { Mark } from './marks3.mts'
// Pumpkin: 3 overlapping lobes (ribs as white seams), stem + leaf. Face drawn in white on top.
const pumpkin = (d: string) => `
  <path d="M12 6.2 Q11.6 3.6 12.8 2.2 L14.2 2.8 Q13 4.2 13.4 6.4Z" fill="${d}"/>
  <path d="M13.6 4.4 C15.4 2.4 18.4 2.6 19.4 4.0 C17.6 5.6 15.4 5.6 13.6 4.4Z" fill="${d}"/>
  <ellipse cx="7.4" cy="14.4" rx="6.0" ry="6.9" fill="${d}"/><ellipse cx="16.6" cy="14.4" rx="6.0" ry="6.9" fill="${d}"/>
  <ellipse cx="12" cy="14.2" rx="5.4" ry="7.4" fill="${d}" stroke="#fff" stroke-width="0.5"/>`
const W = '#fff'
const faces: Record<string, string> = {
  happy: `<path d="M7.2 12.4 L9.0 9.4 L10.8 12.4Z M13.2 12.4 L15.0 9.4 L16.8 12.4Z" fill="${W}"/><path d="M11.2 14.6 L12 13.4 L12.8 14.6Z" fill="${W}"/>
    <path d="M6.6 15.8 Q12 21.6 17.4 15.8 Q15.4 17.4 14.2 16.8 L13.6 17.8 L12.6 17.0 L11.4 17.0 L10.4 17.8 L9.8 16.8 Q8.6 17.4 6.6 15.8Z" fill="${W}"/>`,
  wink: `<path d="M7.2 12.4 L9.0 9.4 L10.8 12.4Z" fill="${W}"/><path d="M13.2 11.4 Q15 9.8 16.8 11.4" fill="none" stroke="${W}" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M7.4 15.4 Q12 21 16.6 15.4 Q12 17.6 7.4 15.4Z" fill="${W}"/>`,
  round: `<circle cx="8.9" cy="11.6" r="1.9" fill="${W}"/><circle cx="15.1" cy="11.6" r="1.9" fill="${W}"/>
    <circle cx="9.4" cy="12.0" r="0.85" fill="DCOL"/><circle cx="15.6" cy="12.0" r="0.85" fill="DCOL"/><path d="M10 16.2 Q12 18.4 14 16.2" fill="none" stroke="${W}" stroke-width="1.1" stroke-linecap="round"/>`,
  spooky: `<path d="M6.8 10.2 L10.8 11.6 L8.4 13.2Z M17.2 10.2 L13.2 11.6 L15.6 13.2Z" fill="${W}"/>
    <path d="M6.2 15.0 L7.8 16.4 L8.8 15.2 L10.0 17.0 L11.2 15.6 L12 17.4 L12.8 15.6 L14.0 17.0 L15.2 15.2 L16.2 16.4 L17.8 15.0 Q16.4 20.6 12 20.6 Q7.6 20.6 6.2 15.0Z" fill="${W}"/>`,
}
const jack = (k: string) => (d: string) => ({ vb: '0 0 24 24', inner: pumpkin(d) + faces[k].replaceAll("DCOL", d) })
export const MARKS3: Mark[] = [
  { id: 'jack-cute-A', label: 'Jack-o-lantern · happy', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: jack('happy') },
  { id: 'jack-cute-B', label: 'Jack-o-lantern · wink', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: jack('wink') },
  { id: 'jack-cute-C', label: 'Jack-o-lantern · round eyes', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: jack('round') },
  { id: 'jack-spooky', label: 'Jack-o-lantern · spooky', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: jack('spooky') },
]
