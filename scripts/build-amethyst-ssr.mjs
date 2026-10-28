import { buildSync } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
// Keep frozen legacy scripts byte-identical. Only SSR-owned copies skip the
// scene already present in the React tree (Sunset's card paint still runs).
mkdirSync('public/amethyst/ssr-motion', { recursive: true })
for (const name of ['neon-butterfly', 'halloween-pumpkin-witch', 'halloween-pumpkin-cat', 'gilded-autumn', 'am01-unicorn', 'rose-champagne', 'midnight-rose', 'fall-owl', 'thanksgiving-motion', 'pearl-rose', 'sunset-beach']) {
  const source = readFileSync(`public/amethyst/${name}.js`, 'utf8')
  writeFileSync(`public/amethyst/ssr-motion/${name}.js`, source.replace(/\.hp-hero(?![-\w])/g, '.hp-hero:not([data-ssr-hero])'))
}
const production = { 'process.env.NODE_ENV': '"production"' }
buildSync({ entryPoints: ['scripts/amethyst-server-entry.ts'], outfile: 'lib/amethyst/generated/homepage-server.cjs', bundle: true, platform: 'node', format: 'cjs', minify: true, define: production })
buildSync({ entryPoints: ['scripts/amethyst-browser-entry.ts'], outfile: 'public/amethyst/compiled/react.js', bundle: true, platform: 'browser', format: 'iife', minify: true, define: production })
buildSync({ entryPoints: { homepage: 'lib/amethyst/v2/homepage.jsx', 'tweaks-panel': 'public/amethyst/tweaks-panel.jsx' }, outdir: 'public/amethyst/compiled', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', tsconfigRaw: {}, minify: true, target: 'es2020' })
