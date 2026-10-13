import { iconify, type Mark } from './marks3.mts'
const I = (file: string) => (d: string) => iconify(file, d)
export const MARKS3: Mark[] = [
  { id: 'jack-v8-1', label: 'Jack-o-lantern · Fluent Emoji HC', status: 'CANDIDATE', iconScale: 0.62, source: 'Microsoft Fluent Emoji High Contrast jack-o-lantern (MIT)', draw: I('fluent-emoji-high-contrast_jack-o-lantern.svg') },
  { id: 'jack-v8-2', label: 'Jack-o-lantern · MDI pumpkin-carved', status: 'CANDIDATE', iconScale: 0.62, source: 'Material Design Icons pumpkin-carved (Apache-2.0)', draw: I('mdi_pumpkin-carved.svg') },
  { id: 'jack-v8-3', label: 'Jack-o-lantern · MingCute (spooky)', status: 'CANDIDATE', iconScale: 0.62, source: 'MingCute pumpkin-lantern-fill (Apache-2.0)', draw: I('mingcute_pumpkin-lantern-fill.svg') },
  { id: 'jack-v8-4', label: 'Jack-o-lantern · Griddy', status: 'CANDIDATE', iconScale: 0.62, source: 'Griddy Icons halloween-pumpkin (MIT)', draw: I('griddy-icons_halloween-pumpkin.svg') },
  { id: 'western-v2-1', label: 'Cowboy hat · Phosphor fill', status: 'CANDIDATE', iconScale: 0.64, source: 'Phosphor Icons cowboy-hat-fill (MIT)', draw: I('ph_cowboy-hat-fill.svg') },
  { id: 'western-v2-2', label: 'Cowboy hat · Line Awesome', status: 'CANDIDATE', iconScale: 0.64, source: 'Line Awesome hat-cowboy (Apache-2.0)', draw: I('la_hat-cowboy.svg') },
  { id: 'western-v2-3', label: 'Cowboy hat side · Line Awesome', status: 'CANDIDATE', iconScale: 0.64, source: 'Line Awesome hat-cowboy-side (Apache-2.0)', draw: I('la_hat-cowboy-side.svg') },
  { id: 'western-v2-4', label: "Woman's boot · Fluent Emoji HC", status: 'CANDIDATE', iconScale: 0.62, source: "Microsoft Fluent Emoji High Contrast womans-boot (MIT)", draw: I('fluent-emoji-high-contrast_womans-boot.svg') },
]
