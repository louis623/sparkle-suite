import './build-homepage-styles.mjs';
import './build-amethyst-analytics.mjs';
import { buildSync } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const names = ['tweaks-panel', 'homepage', 'trade', 'pantry', 'unsubscribe'];
buildSync({
  entryPoints: ['scripts/amethyst-server-entry.ts'],
  outfile: 'lib/amethyst/generated/homepage-server.cjs',
  bundle: true, platform: 'node', format: 'cjs', minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
buildSync({
  entryPoints: names.map(name => `public/amethyst/${name}.jsx`),
  outdir: 'public/amethyst/compiled', loader: { '.jsx': 'jsx' },
  jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  tsconfigRaw: {}, minify: true, target: 'es2019',
});
// Hashes and output are one build operation, including Windows (no shell JSON
// quoting). A source edit cannot silently leave an old cache key in the HTML.
for (const page of ['Homepage', 'Trade', 'Pantry', 'Unsubscribe']) {
  const file = `public/amethyst/${page}.html`;
  let html = readFileSync(file, 'utf8');
  for (const name of names) {
    const hash = createHash('sha256').update(readFileSync(`public/amethyst/compiled/${name}.js`)).digest('hex').slice(0, 16);
    html = html.replace(new RegExp(`(/amethyst/compiled/${name}\\.js)\\?v=[a-f0-9]+`, 'g'), `$1?v=${hash}`);
  }
  writeFileSync(file, html);
}
