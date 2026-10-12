import type { Mark } from './marks3.mts'
const f = (n: number) => n.toFixed(2)
const cube = (d: string, s: number, cy: number) => {
  const cx = 12, h = s * Math.sqrt(3) / 2
  const pts = [[cx, cy - s], [cx + h, cy - s / 2], [cx + h, cy + s / 2], [cx, cy + s], [cx - h, cy + s / 2], [cx - h, cy - s / 2]].map((p) => p.map(f).join(' '))
  return `<path d="M${pts.join(' L')} Z" fill="${d}" stroke="${d}" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M${pts[5]} L${cx} ${cy} L${pts[1]} M${cx} ${cy} L${pts[3]}" fill="none" stroke="#fff" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"/>`
}
const star = (d: string, x: number, y: number, r: number) => `<path d="M${f(x)} ${f(y - r)} Q${f(x + r * 0.16)} ${f(y - r * 0.16)} ${f(x + r)} ${f(y)} Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)} Q${f(x - r * 0.16)} ${f(y + r * 0.16)} ${f(x - r)} ${f(y)} Q${f(x - r * 0.16)} ${f(y - r * 0.16)} ${f(x)} ${f(y - r)}Z" fill="${d}"/>`
// Deterministic spray: dots fan up from the cube top and spill down both sides toward the badge edge.
function spray(d: string, seed: number, n: number, s: number, cy: number, stars: number) {
  let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)
  const top = cy - s, out: string[] = [], placed: number[][] = []
  const inCube = (x: number, y: number) => Math.abs(x - 12) < s * 0.87 + 1.2 && y > top - 1.0 && y < cy + s + 1
  let tries = 0
  while (placed.length < n && tries++ < 5000) {
    const a = -Math.PI / 2 + (rnd() * 2 - 1) * Math.PI * 0.78  // fan, wide enough to spill down the sides
    const dist = 1.2 + Math.pow(rnd(), 0.8) * 10.4
    const x = 12 + Math.cos(a) * dist * 1.05, y = top + 0.4 + Math.sin(a) * dist
    if (Math.hypot(x - 12, y - 12) > 11.2 || inCube(x, y)) continue
    const rad = 0.22 + (1 - dist / 11.6) * 0.55 * rnd() + 0.12
    if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + rad + 0.35)) continue
    placed.push([x, y, rad])
  }
  placed.forEach(([x, y, rad], i) => out.push(i < stars ? star(d, x, y, rad * 2.4 + 0.35) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${d}"/>`))
  return out.join('')
}
export const MARKS3: Mark[] = [
  { id: 'bath-bomb-fizz-C', label: 'Bath bomb · fizz C (big burst, lowered cube)', status: 'LOCKED', iconScale: 0.74, source: 'original drawing (Sparkle Suite)',
    draw: (d) => ({ vb: '0 0 24 24', inner: cube(d, 5.4, 17.6) + spray(d, 7, 58, 5.4, 17.6, 7) }) },
  { id: 'bath-bomb-fizz-D', label: 'Bath bomb · fizz D (denser, more stars)', status: 'LOCKED', iconScale: 0.74, source: 'original drawing (Sparkle Suite)',
    draw: (d) => ({ vb: '0 0 24 24', inner: cube(d, 5.6, 17.4) + spray(d, 101, 80, 5.6, 17.4, 11) }) },
]
