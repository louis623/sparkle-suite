import { buildSync } from 'esbuild'
const production = { 'process.env.NODE_ENV': '"production"' }
buildSync({ entryPoints: ['scripts/amethyst-server-entry.ts'], outfile: 'lib/amethyst/generated/homepage-server.cjs', bundle: true, platform: 'node', format: 'cjs', minify: true, define: production })
buildSync({ entryPoints: ['scripts/amethyst-browser-entry.ts'], outfile: 'public/amethyst/compiled/react.js', bundle: true, platform: 'browser', format: 'iife', minify: true, define: production })
buildSync({ entryPoints: ['public/amethyst/homepage.jsx', 'public/amethyst/tweaks-panel.jsx'], outdir: 'public/amethyst/compiled', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', tsconfigRaw: {}, minify: true, target: 'es2020' })
