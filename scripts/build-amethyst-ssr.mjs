import { buildSync } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
// Keep frozen legacy scripts byte-identical. Only SSR-owned copies skip the
// scene already present in the React tree (Sunset's card paint still runs).
mkdirSync('public/amethyst/ssr-motion', { recursive: true })
for (const name of ['neon-butterfly', 'halloween-pumpkin-witch', 'halloween-pumpkin-cat', 'gilded-autumn', 'am01-unicorn', 'rose-champagne', 'midnight-rose', 'fall-owl', 'thanksgiving-motion', 'pearl-rose', 'sunset-beach']) {
  const source = readFileSync(`public/amethyst/${name}.js`, 'utf8')
  writeFileSync(`public/amethyst/ssr-motion/${name}.js`, source.replace(/\.hp-hero(?![-\w])/g, '.hp-hero:not([data-ssr-hero])'))
}
// Bundle trusted CSS as immutable server data. Inlining the selected styles
// avoids mobile stylesheet round trips without tracing the entire public tree.
const styles = Object.fromEntries(['tokens', 'components', 'homepage', 'trade', 'join', 'britt-hero-buttons', 'gnome-garden', 'neon-butterfly', 'halloween-pumpkin-witch', 'halloween-pumpkin-cat', 'gilded-autumn', 'am01-unicorn', 'rose-champagne', 'sunset-beach', 'midnight-rose', 'fall-owl', 'gobble-and-fizz', 'pie-please', 'pearl-rose', 'ssr-hero-motion'].map(name => [name + '.css', readFileSync(`public/amethyst/${name}.css`, 'utf8')]))
writeFileSync('lib/amethyst/generated/homepage-styles.json', JSON.stringify(styles))
const production = { 'process.env.NODE_ENV': '"production"' }
buildSync({ entryPoints: ['scripts/amethyst-server-entry.ts'], outfile: 'lib/amethyst/generated/homepage-server.cjs', bundle: true, platform: 'node', format: 'cjs', minify: true, define: production })
buildSync({ entryPoints: ['scripts/amethyst-browser-entry.ts'], outfile: 'public/amethyst/compiled/react.js', bundle: true, platform: 'browser', format: 'iife', minify: true, define: production })
for (const page of ['homepage', 'trade', 'join']) buildSync({ entryPoints: ['lib/amethyst/v2/' + page + '.jsx'], outfile: 'public/amethyst/compiled/' + page + '.js', bundle: true, platform: 'browser', format: 'iife', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', tsconfigRaw: {}, minify: true, target: 'es2020', define: production })
buildSync({ entryPoints: ['public/amethyst/tweaks-panel.jsx'], outfile: 'public/amethyst/compiled/tweaks-panel.js', jsx: 'transform', jsxFactory: 'React.createElement', tsconfigRaw: {}, minify: true, target: 'es2020' })

const runtimeNames = ['compiled/tweaks-panel.js', 'dance-floor-ticker-label.js', 'live-lineup.js', 'responsive-image.js', 'sparkle-suite-footer-credit.js', 'compiled/homepage.js', 'compiled/trade.js', 'compiled/join.js']
writeFileSync('lib/amethyst/generated/page-runtimes.json', JSON.stringify(Object.fromEntries(runtimeNames.map(name => [name, readFileSync('public/amethyst/' + name, 'utf8')]))))
