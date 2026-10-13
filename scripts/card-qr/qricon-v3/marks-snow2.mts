import type { Mark } from './marks3.mts'
const f = (n: number) => n.toFixed(2)
// One arm pointing up from center (12,12); branches = [distance from center, branch length].
function flake(arm: number, sw: number, bw: number, branches: number[][], hex: number, spike = 0) {
  return (d: string) => {
    let a = `<path d="M12 ${f(12 - hex)} V${f(12 - arm)}" stroke="${d}" stroke-width="${sw}" stroke-linecap="round"/>`
    a += `<path d="M${f(12 - sw * 0.75)} ${f(12 - arm + 1.2)} L12 ${f(12 - arm - 0.9)} L${f(12 + sw * 0.75)} ${f(12 - arm + 1.2)}Z" fill="${d}"/>`
    for (const [r, l] of branches) { const y = 12 - r, dx = l * Math.sin(Math.PI / 3.6), dy = l * Math.cos(Math.PI / 3.6)
      a += `<path d="M${f(12 - dx)} ${f(y - dy)} L12 ${f(y)} L${f(12 + dx)} ${f(y - dy)}" fill="none" stroke="${d}" stroke-width="${bw}" stroke-linecap="round" stroke-linejoin="round"/>` }
    const sp = spike ? `<path d="M12 ${f(12 - hex)} V${f(12 - spike)}" stroke="${d}" stroke-width="${bw}" stroke-linecap="round"/><circle cx="12" cy="${f(12 - spike - 0.9)}" r="${f(bw * 0.62)}" fill="${d}"/>` : ''
    const arms = Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60} 12 12)">${a}</g><g transform="rotate(${i * 60 + 30} 12 12)">${sp}</g>`).join('')
    const hx = Array.from({ length: 6 }, (_, i) => { const t = Math.PI / 6 + i * Math.PI / 3; return `${f(12 + Math.cos(t) * hex)} ${f(12 + Math.sin(t) * hex)}` }).join(' L')
    return { vb: '0 0 24 24', inner: `${arms}<path d="M${hx}Z" fill="${d}" stroke="${d}" stroke-width="0.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="${f(hex * 0.42)}" fill="#fff"/>` }
  }
}
export const MARKS3: Mark[] = [
  { id: 'snowflake-v3', label: 'Snowflake v3 (fuller)', status: 'CANDIDATE', iconScale: 0.74, source: 'original drawing (Sparkle Suite)', draw: flake(10.9, 1.4, 1.25, [[4.2, 3.0], [6.8, 3.4], [9.0, 2.0]], 2.6, 4.4) },
  { id: 'snowflake-v2-A', label: 'Snowflake v2 · A (2 branch pairs)', status: 'CANDIDATE', iconScale: 0.66, source: 'original drawing (Sparkle Suite)', draw: flake(10.2, 1.35, 1.25, [[5.0, 2.8], [7.6, 2.0]], 2.1) },
  { id: 'snowflake-v2-B', label: 'Snowflake v2 · B (3 branch pairs, ornate)', status: 'CANDIDATE', iconScale: 0.68, source: 'original drawing (Sparkle Suite)', draw: flake(10.6, 1.3, 1.1, [[4.0, 2.2], [6.2, 3.0], [8.4, 1.8]], 2.3) },
]
