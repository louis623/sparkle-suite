import type { Mark } from './marks3.mts'
type P = [number, number]
const f = (n: number) => n.toFixed(2)
const cb = (a: P, b: P, c: P, e: P, t: number): P => { const u = 1 - t; return [u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*e[0], u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*e[1]] }
const qb = (a: P, c: P, b: P, t: number): P => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]
const CR: P = [14.6, 6.8]
function trunk(d: string, w0: number, w1: number) {
  const a: P = [9.0, 23.4], b: P = [7.0, 17.0], c: P = [12.6, 11.4], e: P = CR
  const L: P[] = [], R: P[] = []
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, p = cb(a, b, c, e, t), q = cb(a, b, c, e, Math.min(1, t + 0.01)), r = cb(a, b, c, e, Math.max(0, t - 0.01))
    const dx = q[0] - r[0], dy = q[1] - r[1], m = Math.hypot(dx, dy), w = (w0 + (w1 - w0) * t) / 2
    L.push([p[0] - dy / m * w, p[1] + dx / m * w]); R.push([p[0] + dy / m * w, p[1] - dx / m * w])
  }
  return `<path d="M${[...L, ...R.reverse()].map((p) => p.map(f).join(' ')).join(' L')} Z" fill="${d}"/>`
}
// Leaf blade frond: spine crown->tip, width profile; notches = sharp V cuts on the lower edge.
function frond(d: string, end: P, C: P, W: number, notches: number[]) {
  const top: P[] = [], bot: P[] = [], N = 40
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = qb(CR, C, end, t), q = qb(CR, C, end, Math.min(1, t + 0.01)), r = qb(CR, C, end, Math.max(0, t - 0.01))
    const dx = q[0] - r[0], dy = q[1] - r[1], m = Math.hypot(dx, dy)
    let nx = -dy / m, ny = dx / m; if (ny < 0) { nx = -nx; ny = -ny }  // n points downward
    const prof = t < 0.32 ? Math.pow(Math.sin(t / 0.32 * Math.PI / 2), 0.7) : Math.pow(Math.cos((t - 0.32) / 0.68 * Math.PI / 2), 0.8)
    let cut = 1
    for (const c of notches) { const k = (t - c) / 0.035; if (k > -1 && k < 0.6) cut = Math.min(cut, k < 0 ? 0.05 + 0.95 * -k : 0.05 + 0.95 * k / 0.6) }
    top.push([p[0] - nx * W * 0.38 * prof, p[1] - ny * W * 0.38 * prof])
    bot.push([p[0] + nx * W * 0.62 * prof * cut, p[1] + ny * W * 0.62 * prof * cut])
  }
  return `<path d="M${[...top, ...bot.reverse()].map((p) => p.map(f).join(' ')).join(' L')} Z" fill="${d}" stroke="${d}" stroke-width="0.2" stroke-linejoin="round"/>`
}
type F = [P, P, number, number[]]
const UP: F[] = [[[22.2, 7.0], [18.8, 0.6], 1.6, [0.55, 0.72]], [[7.0, 6.6], [10.4, 0.4], 1.6, [0.55, 0.72]]]
const DR: F[] = [[[23.4, 13.2], [21.6, 6.2], 1.4, [0.62]], [[5.8, 13.4], [7.8, 6.2], 1.4, [0.62]]]
const DR2: F[] = [[[20.0, 17.0], [18.0, 9.4], 1.2, []], [[9.6, 16.8], [11.2, 9.4], 1.2, []]]
const mk = (fs: F[], k: number, tw: [number, number]) => (d: string) => ({ vb: '0 0 24 24', inner: trunk(d, tw[0], tw[1]) + fs.map(([e, c, w, n]) => frond(d, e, c, w * k, n)).join('') + `<circle cx="${CR[0]}" cy="${CR[1]}" r="0.7" fill="${d}"/>` })
export const MARKS3: Mark[] = [
  { id: 'palm-v6-1', label: 'Palm v6 · 1 (6 fronds)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: mk([...UP, ...DR, ...DR2], 1, [1.5, 0.75]) },
  { id: 'palm-v6-2', label: 'Palm v6 · 2 (4 fronds)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: mk([...UP, ...DR].map(([e, c, w]) => [e, c, w, []] as F), 1.1, [1.5, 0.75]) },
  { id: 'palm-v6-3', label: 'Palm v6 · 3 (6 slim fronds)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: mk([...UP, ...DR, ...DR2], 0.8, [1.3, 0.65]) },
]
