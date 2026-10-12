import { iconify, type Mark } from './marks3.mts'
const f2 = (n: number) => n.toFixed(2)
// ---------- Palm (original): thin tapered curved trunk + feathery drooping fronds ----------
type P = [number, number]
const qb = (a: P, c: P, b: P, t: number): P => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]
const trunk = (d: string, w0: number, w1: number) => {
  const a: P = [6.4, 23.2], c: P = [7.4, 12.4], b: P = [14.4, 7.4]
  const L: P[] = [], R: P[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, p = qb(a, c, b, t), q = qb(a, c, b, Math.min(1, t + 0.01)), r = qb(a, c, b, Math.max(0, t - 0.01))
    const dx = q[0] - r[0], dy = q[1] - r[1], m = Math.hypot(dx, dy), w = (w0 + (w1 - w0) * t) / 2
    L.push([p[0] - dy / m * w, p[1] + dx / m * w]); R.push([p[0] + dy / m * w, p[1] - dx / m * w])
  }
  return `<path d="M${[...L, ...R.reverse()].map((p) => p.map(f2).join(' ')).join(' L')} Z" fill="${d}"/>`
}
const CROWN: P = [14.4, 7.2]
// Feathery frond: spine curve + leaflets on both sides angled toward the tip.
function frond(d: string, end: P, ctrl: P, n: number, leaf: number, sw: number) {
  let s = `<path d="M${CROWN.join(' ')} Q${ctrl.join(' ')} ${end.join(' ')}" fill="none" stroke="${d}" stroke-width="${sw}" stroke-linecap="round"/>`
  for (let i = 1; i <= n; i++) {
    const t = 0.12 + 0.86 * i / n, p = qb(CROWN, ctrl, end, t), q = qb(CROWN, ctrl, end, t + 0.02)
    const dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m
    const len = leaf * (1 - t * 0.55)
    for (const side of [1, -1]) {
      const nx = -uy * side, ny = ux * side
      const tip: P = [p[0] + (nx * 0.75 + ux * 0.65) * len, p[1] + (ny * 0.75 + uy * 0.65) * len + len * 0.35]
      s += `<path d="M${f2(p[0])} ${f2(p[1])} L${f2(tip[0])} ${f2(tip[1])}" stroke="${d}" stroke-width="${f2(0.55 * (1 - t * 0.4))}" stroke-linecap="round"/>`
    }
  }
  return s
}
const FRONDS: [P, P][] = [[[22.6, 11.6], [19.6, 5.4]], [[21.4, 15.4], [19.2, 8.4]], [[6.0, 11.0], [9.2, 4.8]], [[7.4, 15.6], [9.4, 8.6]], [[18.4, 2.0], [16.8, 2.4]], [[10.0, 2.2], [12.4, 2.0]], [[14.6, 14.4], [15.6, 10.4]]]
function palmA(d: string) {
  return { vb: '0 0 24 24', inner: trunk(d, 1.5, 0.75) + FRONDS.slice(0, 6).map(([e, c]) => frond(d, e, c, 7, 2.6, 0.7)).join('') + `<circle cx="14.4" cy="7.3" r="0.9" fill="${d}"/>` }
}
// B: solid tapered blades with notched (sawtooth) lower edge, 6 fronds.
function blade(d: string, end: P, ctrl: P, w: number) {
  const up: P[] = [], lo: P[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, p = qb(CROWN, ctrl, end, t), q = qb(CROWN, ctrl, end, Math.min(1, t + 0.02)), r = qb(CROWN, ctrl, end, Math.max(0, t - 0.02))
    const dx = q[0] - r[0], dy = q[1] - r[1], m = Math.hypot(dx, dy), nx = -dy / m, ny = dx / m
    const hw = w * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.3)
    up.push([p[0] - nx * hw * 0.35, p[1] - ny * hw * 0.35])
    const notch = i % 2 ? 1 : 0.35
    lo.push([p[0] + nx * hw * notch + (dx / m) * 0.35 * (i % 2), p[1] + ny * hw * notch + (dy / m) * 0.35 * (i % 2) + hw * 0.25 * (i % 2)])
  }
  return `<path d="M${[...up, ...lo.reverse()].map((p) => p.map(f2).join(' ')).join(' L')} Z" fill="${d}" stroke="${d}" stroke-width="0.25" stroke-linejoin="round"/>`
}
function palmB(d: string) {
  const fl: [P, P][] = [[[22.6, 11.4], [19.6, 5.2]], [[20.4, 15.2], [19.4, 8.6]], [[6.2, 11.4], [9.2, 4.8]], [[8.4, 15.4], [9.0, 9.0]], [[19.8, 3.0], [17.0, 2.2]], [[9.4, 3.4], [11.8, 1.6]]]
  // mirror lower edge for left-going fronds so notches face down
  return { vb: '0 0 24 24', inner: trunk(d, 1.6, 0.8) + fl.map(([e, c]) => blade(d, e, c, e[0] < CROWN[0] ? -2.2 : 2.2)).join('') + `<circle cx="14.4" cy="7.3" r="0.95" fill="${d}"/>` }
}
// ---------- Bath bomb fizz (true cube from C + spray of dots and tiny stars) ----------
const cube = (d: string, s: number, cy: number, extra = '') => {
  const cx = 12, h = s * Math.sqrt(3) / 2
  const pts = [[cx, cy - s], [cx + h, cy - s / 2], [cx + h, cy + s / 2], [cx, cy + s], [cx - h, cy + s / 2], [cx - h, cy - s / 2]].map((p) => p.map(f2).join(' '))
  return `<path d="M${pts.join(' L')} Z" fill="${d}" stroke="${d}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M${pts[5]} L${cx} ${cy} L${pts[1]} M${cx} ${cy} L${pts[3]}" fill="none" stroke="#fff" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round"/>${extra}`
}
const star = (d: string, x: number, y: number, r: number) => `<path d="M${x} ${y - r} Q${f2(x + r * 0.16)} ${f2(y - r * 0.16)} ${x + r} ${y} Q${f2(x + r * 0.16)} ${f2(y + r * 0.16)} ${x} ${y + r} Q${f2(x - r * 0.16)} ${f2(y + r * 0.16)} ${x - r} ${y} Q${f2(x - r * 0.16)} ${f2(y - r * 0.16)} ${x} ${y - r}Z" fill="${d}"/>`
const dots = (d: string, a: number[][]) => a.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${d}"/>`).join('')
function fizzA(d: string) {
  return { vb: '0 0 24 24', inner: cube(d, 6.8, 16.6) +
    dots(d, [[12, 8.0, 0.6], [10.2, 6.6, 0.75], [13.9, 6.4, 0.55], [8.4, 5.0, 0.5], [12.4, 4.6, 0.85], [15.8, 4.6, 0.6], [10.4, 3.0, 0.45], [14.6, 2.4, 0.5], [6.6, 3.2, 0.4], [17.6, 2.6, 0.4], [12.2, 1.4, 0.4], [9.0, 1.6, 0.32]]) +
    star(d, 6.0, 6.2, 1.25) + star(d, 18.2, 6.0, 1.45) + star(d, 16.2, 1.4, 0.9) + star(d, 7.6, 1.2, 0.8) }
}
function fizzB(d: string) {
  const specks = dots('#fff', [[8.6, 18.6, 0.45], [7.2, 16.4, 0.35], [9.4, 21.0, 0.32], [15.0, 19.4, 0.42], [16.6, 17.2, 0.32], [14.2, 21.4, 0.3], [10.6, 12.0, 0.36], [13.4, 13.0, 0.3]])
  return { vb: '0 0 24 24', inner: cube(d, 6.8, 16.6, specks) +
    dots(d, [[11.2, 7.6, 0.55], [13.2, 6.4, 0.7], [10.0, 5.2, 0.5], [12.0, 3.8, 0.6], [14.8, 3.6, 0.45], [9.0, 2.6, 0.4], [13.2, 1.6, 0.38], [16.4, 6.2, 0.35], [7.6, 6.6, 0.35]]) +
    star(d, 6.2, 4.4, 1.4) + star(d, 17.8, 3.6, 1.6) + star(d, 11.0, 1.2, 0.85) }
}
// ---------- Halloween (original, cute) ----------
function batA(d: string) { // cute round bat: big ears, round body, scalloped wings, white eyes
  return { vb: '0 0 24 24', inner: `
  <path d="M12 8.2 C9.2 6.2 5.6 5.4 1.4 7.4 C2.6 8.6 3 9.8 2.8 11.4 C4.2 10.8 5.6 11.2 6.2 12.6 C7.2 11.6 8.4 11.8 9 13 L15 13 C15.6 11.8 16.8 11.6 17.8 12.6 C18.4 11.2 19.8 10.8 21.2 11.4 C21 9.8 21.4 8.6 22.6 7.4 C18.4 5.4 14.8 6.2 12 8.2Z" fill="${d}"/>
  <path d="M8.4 9.4 L8.2 4.6 L10.4 7.2 Q12 6.6 13.6 7.2 L15.8 4.6 L15.6 9.4 Q17 11 16.4 13.6 Q15.4 18 12 18 Q8.6 18 7.6 13.6 Q7 11 8.4 9.4Z" fill="${d}"/>
  <circle cx="10.3" cy="11.4" r="1.25" fill="#fff"/><circle cx="13.7" cy="11.4" r="1.25" fill="#fff"/>
  <circle cx="10.6" cy="11.6" r="0.55" fill="${d}"/><circle cx="14" cy="11.6" r="0.55" fill="${d}"/>
  <path d="M10.9 14.4 Q12 15.3 13.1 14.4" fill="none" stroke="#fff" stroke-width="0.6" stroke-linecap="round"/>
  <path d="M11.3 14.85 L11.55 15.6 L11.8 15.0" fill="#fff"/><path d="M12.2 15.0 L12.45 15.6 L12.7 14.85" fill="#fff"/>` }
}
function skullA(d: string) { // friendly skull: round dome, big round eyes, heart nose, smile with teeth
  return { vb: '0 0 24 24', inner: `
  <path d="M12 2.4 C6.6 2.4 3.4 6 3.4 10.6 C3.4 13.4 4.8 15.4 6.8 16.4 L6.8 19.4 Q6.8 21.6 9 21.6 L15 21.6 Q17.2 21.6 17.2 19.4 L17.2 16.4 C19.2 15.4 20.6 13.4 20.6 10.6 C20.6 6 17.4 2.4 12 2.4Z" fill="${d}"/>
  <circle cx="8.6" cy="11" r="2.4" fill="#fff"/><circle cx="15.4" cy="11" r="2.4" fill="#fff"/>
  <circle cx="9.1" cy="11.4" r="1.05" fill="${d}"/><circle cx="15.9" cy="11.4" r="1.05" fill="${d}"/>
  <path d="M12 15.6 L10.9 14.5 Q10.5 13.8 11.1 13.5 Q11.6 13.3 12 13.9 Q12.4 13.3 12.9 13.5 Q13.5 13.8 13.1 14.5Z" fill="#fff"/>
  <path d="M9.6 18 V20.2 M12 18 V20.4 M14.4 18 V20.2" stroke="#fff" stroke-width="0.75" stroke-linecap="round"/>` }
}
// ---------- Christmas (original) ----------
const xstar = (d: string, x: number, y: number, r: number) => { const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; return `${f2(x + rr * Math.cos(a))} ${f2(y + rr * Math.sin(a))}` }); return `<path d="M${p.join(' L')}Z" fill="${d}" stroke="${d}" stroke-width="0.4" stroke-linejoin="round"/>` }
function treeA(d: string) { // classic 3 tiers + star + trunk
  return { vb: '0 0 24 24', inner: `${xstar(d, 12, 2.9, 2.1)}
  <path d="M12 5.2 L16.6 10.2 H14.4 L18.6 15 H16 L20.4 19.6 H3.6 L8 15 H5.4 L9.6 10.2 H7.4 Z" fill="${d}" stroke="${d}" stroke-width="0.9" stroke-linejoin="round"/>
  <rect x="10.4" y="19.8" width="3.2" height="2.8" rx="0.5" fill="${d}"/>` }
}
function treeB(d: string) { // minimal rounded triangle with white ornaments + garland
  return { vb: '0 0 24 24', inner: `${xstar(d, 12, 2.8, 2.0)}
  <path d="M12 5.4 L19.4 19.6 H4.6 Z" fill="${d}" stroke="${d}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M9.6 11.2 Q12.6 12.4 14.4 10.6 M7.6 15.4 Q12 17.4 16.6 14.8" fill="none" stroke="#fff" stroke-width="0.6" stroke-linecap="round"/>
  <circle cx="11.4" cy="9.2" r="0.75" fill="#fff"/><circle cx="14" cy="13.6" r="0.85" fill="#fff"/><circle cx="9.4" cy="13.8" r="0.7" fill="#fff"/><circle cx="12" cy="17.8" r="0.8" fill="#fff"/><circle cx="16.2" cy="18" r="0.7" fill="#fff"/><circle cx="7.8" cy="18" r="0.7" fill="#fff"/>
  <rect x="10.6" y="20.4" width="2.8" height="2.2" rx="0.5" fill="${d}"/>` }
}
function candyCane(d: string) {
  const path = 'M9 21.6 V8.4 A4.2 4.2 0 0 1 17.4 8.4 V10'
  const stripes = [[7.6, 19.6], [7.6, 16.2], [7.6, 12.8], [7.8, 9.4]].map(([x, y]) => `<path d="M${x} ${y + 1.2} L${x + 2.8} ${y - 0.8}" stroke="#fff" stroke-width="1.1"/>`).join('')
  return { vb: '0 0 24 24', inner: `<path d="${path}" fill="none" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/>${stripes}
  <path d="M10.2 5.6 L11.8 7.6 M13.4 4.2 L13.2 6.6 M16.2 5.0 L14.6 7.0" stroke="#fff" stroke-width="1.1"/>
  <clipPath id="cc"><path d="${path}" fill="none"/></clipPath>` }
}
const I = (file: string) => (d: string) => iconify(file, d)
export const MARKS3: Mark[] = [
  { id: 'palm-thin-A', label: 'Palm · thin A (feathery fronds)', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: palmA },
  { id: 'palm-thin-B', label: 'Palm · thin B (notched blade fronds)', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: palmB },
  { id: 'bath-bomb-fizz-A', label: 'Bath bomb · fizz A (dot + star spray)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: fizzA },
  { id: 'bath-bomb-fizz-B', label: 'Bath bomb · fizz B (spray + specks on faces)', status: 'LOCKED', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: fizzB },
  { id: 'bat-cute', label: 'Bat · cute', status: 'CANDIDATE', iconScale: 0.64, source: 'original drawing (Sparkle Suite)', draw: batA },
  { id: 'bat-classic', label: 'Bat · classic silhouette', status: 'CANDIDATE', iconScale: 0.62, source: 'Material Design Icons mdi:bat (Apache-2.0)', draw: I('mdi_bat.svg') },
  { id: 'skull-friendly', label: 'Skull · friendly', status: 'CANDIDATE', iconScale: 0.6, source: 'original drawing (Sparkle Suite)', draw: skullA },
  { id: 'skull-simple', label: 'Skull · simple', status: 'CANDIDATE', iconScale: 0.6, source: 'MingCute skull-fill (Apache-2.0)', draw: I('mingcute_skull-fill.svg') },
  { id: 'xmas-tree-classic', label: 'Christmas tree · classic tiers + star', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: treeA },
  { id: 'xmas-tree-ornaments', label: 'Christmas tree · minimal with ornaments', status: 'CANDIDATE', iconScale: 0.62, source: 'original drawing (Sparkle Suite)', draw: treeB },
  { id: 'xmas-tree-pine', label: 'Christmas tree · pine silhouette', status: 'CANDIDATE', iconScale: 0.62, source: 'Tabler Icons christmas-tree-filled (MIT)', draw: I('tabler_christmas-tree-filled.svg') },
  { id: 'snowflake', label: 'Snowflake', status: 'CANDIDATE', iconScale: 0.6, source: 'MingCute snowflake-fill (Apache-2.0)', draw: I('mingcute_snowflake-fill.svg') },
  { id: 'ornament', label: 'Ornament bauble', status: 'CANDIDATE', iconScale: 0.6, source: 'MingCute christmas-ball-fill (Apache-2.0)', draw: I('mingcute_christmas-ball-fill.svg') },
  { id: 'candy-cane', label: 'Candy cane', status: 'CANDIDATE', iconScale: 0.6, source: 'original drawing (Sparkle Suite)', draw: candyCane },
  { id: 'santa-hat', label: 'Santa hat', status: 'CANDIDATE', iconScale: 0.6, source: 'MingCute christmas-hat-fill (Apache-2.0)', draw: I('mingcute_christmas-hat-fill.svg') },
  { id: 'gift-xmas', label: 'Gift box (reuse of candidate)', status: 'CANDIDATE', iconScale: 0.6, source: 'Phosphor Icons gift-fill (MIT)', draw: I('ph_gift-fill.svg') },
]
