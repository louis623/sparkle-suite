import type { Mark } from './marks3.mts'
// Right wing, mirrored for left. top: arch from body to tip; bottom: soft rounded scallops back to body.
function wing(lift: number, span: number, sc: number) {
  const tx = 12 + span, ty = 9.2 - lift
  const pts = [[tx - 2.4, 13.2 - lift * 0.3], [tx - 4.8, 14.2 - lift * 0.15], [tx - 6.6, 14.6], [13.4, 14.6]]
  let d = `M12.6 10.6 C14.6 ${8.6 - lift} ${tx - 4.2} ${6.4 - lift} ${tx} ${ty - 0.8} Q${tx - 0.4} ${ty + 2.6} ${pts[0][0]} ${pts[0][1]}`
  let prev = pts[0]
  for (const p of pts.slice(1)) { d += ` Q${(prev[0] + p[0]) / 2} ${(prev[1] + p[1]) / 2 - sc} ${p[0]} ${p[1]}`; prev = p }
  return d + ' Z'
}
function bat(lift: number, span: number, sc: number, eyes: boolean, dy = 0) {
  return (c: string) => {
    const w = wing(lift, span, sc)
    return { vb: '0 0 24 24', inner: `<g transform="translate(0 ${dy})"><path d="${w}" fill="${c}" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"/>
    <path d="${w}" transform="translate(24 0) scale(-1 1)" fill="${c}" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"/>
    <ellipse cx="12" cy="12.6" rx="2.3" ry="2.9" fill="${c}"/>
    <path d="M10.1 11.4 Q9.6 8.4 10.5 7.8 Q11.5 8.6 11.7 10.2 Z M13.9 11.4 Q14.4 8.4 13.5 7.8 Q12.5 8.6 12.3 10.2 Z" fill="${c}" stroke="${c}" stroke-width="0.5" stroke-linejoin="round"/>
    ${eyes ? `<circle cx="11.1" cy="11.9" r="0.42" fill="#fff"/><circle cx="12.9" cy="11.9" r="0.42" fill="#fff"/>` : ''}</g>` }
  }
}
export const MARKS3: Mark[] = [
  { id: 'bat-v2-A', label: 'Bat v2 · A (raised wings, dot eyes)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: bat(1.6, 10.0, 1.5, true, 1.6) },
  { id: 'bat-v2-B', label: 'Bat v2 · B (wide flat wings, dot eyes)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: bat(0.6, 10.4, 1.4, true) },
  { id: 'bat-v2-C', label: 'Bat v2 · C (raised wings, no face)', status: 'CANDIDATE', iconScale: 0.7, source: 'original drawing (Sparkle Suite)', draw: bat(2.6, 9.8, 1.6, false) },
]
