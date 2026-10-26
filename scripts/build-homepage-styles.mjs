import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';
const root = 'public/amethyst/';
const images = JSON.parse(readFileSync(root + 'hero-delivery.json', 'utf8'));
const html = readFileSync(root + 'Homepage.html', 'utf8');
const names = [...new Set([...html.matchAll(/href="(?:\/amethyst\/)?((?:bling-kitchen\/)?[a-z0-9-]+\.css)(?:\?[^\"]*)?"/g)].map(m => m[1]))];
mkdirSync(root + 'delivery', { recursive: true });
const manifest = {};
for (const name of names) {
  let css = readFileSync(root + name, 'utf8'), desktop = '', phone = '';
  for (const [index, [source, sizes]] of Object.entries(images).entries()) {
    const pattern = new RegExp(`url\\(['"]?${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?[^)'" ]*)?['"]?\\)`, 'g');
    if (!pattern.test(css)) continue;
    pattern.lastIndex = 0;
    const variable = `--ss-hero-image-${index}`;
    css = css.replace(pattern, `var(${variable})`);
    desktop += `${variable}:url('${sizes['1440'].url}');`;
    phone += `${variable}:url('${sizes['720'].url}');`;
  }
  css += `:root{${desktop}}@media(max-width:600px){:root{${phone}}}`;
  css = transformSync(css, { loader: 'css', minify: true }).code;
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 16);
  const file = `${name.replaceAll('/', '-').replace('.css', '')}.${hash}.css`;
  writeFileSync(root + 'delivery/' + file, css);
  manifest[name] = '/amethyst/delivery/' + file;
}
writeFileSync(root + 'delivery/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${names.length} cacheable homepage stylesheets.`);
