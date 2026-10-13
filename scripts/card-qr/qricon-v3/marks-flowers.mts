import type { Mark } from './marks3.mts'
const stemLeaf = (d: string, top: number) => `
  <path d="M12 ${top} V22.6" stroke="${d}" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M12 19.6 C13.6 16.4 16.6 15.4 19 15.8 C18 18.8 15 20.2 12 19.6Z" fill="${d}"/>
  <path d="M12 21 C10.6 18.6 8.4 17.8 6.2 18.2 C7.2 20.6 9.6 21.6 12 21Z" fill="${d}"/>`
function tulip(d: string) {
  return { vb: '0 0 24 24', inner: `${stemLeaf(d, 11.6)}
  <path d="M7.4 4.4 L9.6 6.8 L12 3.2 L14.4 6.8 L16.6 4.4 C17.4 8.8 16.4 12.6 12 12.8 C7.6 12.6 6.6 8.8 7.4 4.4Z" fill="${d}"/>
  <path d="M12 6.4 C11 8.4 11 10.4 12 12.2 M12 6.4 C13 8.4 13 10.4 12 12.2" fill="none" stroke="#fff" stroke-width="0.6" stroke-linecap="round"/>` }
}
function rose(d: string) {
  return { vb: '0 0 24 24', inner: `${stemLeaf(d, 12)}
  <path d="M6.2 6.4 C6.4 4 8.2 2.4 10 3 C10.8 1.8 13.2 1.8 14 3 C15.8 2.4 17.6 4 17.8 6.4 C18 10 15.6 12.8 12 12.8 C8.4 12.8 6 10 6.2 6.4Z" fill="${d}"/>
  <path d="M12.6 6.4 C12.6 7.4 11.2 7.4 11.1 6.4 C11 5 13.6 4.6 14.2 6.2 C14.8 8 12.8 9.4 11 8.8 C9 8 9.2 5 10.8 4 M7.4 8.6 C8.6 11 11 11.6 12.6 11.4 C14.8 11 16.4 9.4 16.8 7.6" fill="none" stroke="#fff" stroke-width="0.7" stroke-linecap="round"/>` }
}
function daisy(d: string) {
  const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="12" cy="3.6" rx="1.25" ry="2.9" transform="rotate(${i * 30} 12 7.6)" fill="${d}"/>`).join('')
  return { vb: '0 0 24 24', inner: `${stemLeaf(d, 12)}${petals}<circle cx="12" cy="7.6" r="2.7" fill="#fff"/><circle cx="12" cy="7.6" r="2.0" fill="${d}"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'flower-tulip', label: 'Flower · tulip', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: tulip },
  { id: 'flower-rose', label: 'Flower · rose', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: rose },
  { id: 'flower-daisy', label: 'Flower · daisy', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: daisy },
]
