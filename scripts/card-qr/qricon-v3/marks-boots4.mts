import { iconify, type Mark } from './marks3.mts'
export const MARKS3: Mark[] = [
  { id: 'boots-v4', label: 'Cowgirl boot v4 (traced from reference)', status: 'CANDIDATE', iconScale: 0.72, source: 'potrace of reference silhouette', draw: (d) => iconify('boots-v4.svg', d) },
  { id: 'boots-v4-B', label: 'Cowgirl boot v4 · B (thicker swirls)', status: 'CANDIDATE', iconScale: 0.72, source: 'potrace of reference, cutouts thickened', draw: (d) => iconify('boots-v4-B.svg', d) },
]
