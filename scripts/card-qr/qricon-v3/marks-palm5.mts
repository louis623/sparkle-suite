import type { Mark } from './marks3.mts'
type P = [number, number]
const f = (n: number) => n.toFixed(2)
const qb = (a: P, c: P, b: P, t: number): P => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]
const CR: P = [14.4, 8.0]
function trunk(d: string, w0: number, w1: number) {
  const a: P = [7.4, 23.4], c: P = [8.0, 13.2], b: P = CR
  const L: P[] = [], R: P[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, p = qb(a, c, b, t), q = qb(a, c, b, Math.min(1, t + 0.01)), r = qb(a, c, b, Math.max(0, t - 0.01))
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
const SET_A: [P, P, number, number[]][] = [
  [[23.6, 12.4], [20.2, 2.4], 2.2, [0.5, 0.7]],
  [[20.6, 15.8], [19.0, 8.2], 1.8, [0.55]],
  [[20.2, 2.6], [17.2, 2.4], 1.7, []],
  [[4.8, 11.6], [8.4, 2.2], 2.2, [0.5, 0.7]],
  [[8.4, 15.2], [9.8, 8.0], 1.8, [0.55]],
  [[9.0, 2.2], [11.6, 2.2], 1.7, []],
]
function palmA(d: string) {
  return { vb: '0 0 24 24', inner: trunk(d, 1.6, 0.85) + SET_A.map(([e, c, w, n]) => frond(d, e, c, w, n)).join('') + `<circle cx="${CR[0]}" cy="${CR[1]}" r="0.95" fill="${d}"/>` }
}
function palmB(d: string) { // 5 fronds, smooth edges, a touch fuller
  const set = [SET_A[0], SET_A[1], SET_A[3], SET_A[4], [[16.6, 0.8], [15.0, 3.4], 1.8, []] as [P, P, number, number[]]]
  return { vb: '0 0 24 24', inner: trunk(d, 1.7, 0.9) + set.map(([e, c, w]) => frond(d, e, c, w * 1.1, [])).join('') + `<circle cx="${CR[0]}" cy="${CR[1]}" r="1" fill="${d}"/>` }
}
export const MARKS3: Mark[] = [
  { id: 'palm-v5-A', label: 'Palm v5 · A (6 notched fronds)', status: 'CANDIDATE', iconScale: 0.68, source: 'original drawing (Sparkle Suite)', draw: palmA },
  { id: 'palm-v5-B', label: 'Palm v5 · B (5 smooth fronds)', status: 'CANDIDATE', iconScale: 0.68, source: 'original drawing (Sparkle Suite)', draw: palmB },
]
