import fs from 'node:fs'
import type { Mark } from './marks3.mts'
// Subpaths of Line Awesome hat-cowboy-side split (svgpathtools): 0 outer silhouette, 1 crown, 2 right brim, 3 band, 4 left brim.
const S: string[] = JSON.parse(fs.readFileSync(new URL('./src', import.meta.url).pathname + '/la_hat-cowboy-side.subpaths.json', 'utf8'))
const mk = (lines: number[]) => (d: string) => ({ vb: '0 0 32 32', inner: `<path d="${S[0]}" fill="${d}"/>` +
  lines.map((i) => `<path d="${S[i]}" fill="none" stroke="#fff" stroke-width="0.5" stroke-linejoin="round"/>`).join('') })
export const MARKS3: Mark[] = [
  { id: 'hat-side-solid', label: 'Cowboy hat side · solid + band (Line Awesome)', status: 'CANDIDATE', iconScale: 0.66, source: 'Line Awesome hat-cowboy-side (Apache-2.0), outer silhouette filled', draw: mk([2, 3, 4]) },
  { id: 'hat-side-solid-B', label: 'Cowboy hat side · solid + band + crown line', status: 'CANDIDATE', iconScale: 0.66, source: 'Line Awesome hat-cowboy-side (Apache-2.0), outer silhouette filled', draw: mk([1, 2, 3, 4]) },
]
