// Rebuild the self-hosted copies of the fonts already used by customer themes.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { getFallbackFontOverrideMetrics } = require('next/dist/compiled/@next/font/dist/google/get-fallback-font-override-metrics');
const directory = 'public/amethyst/fonts';
await mkdir(directory, { recursive: true });
await mkdir(`${directory}/licenses`, { recursive: true });
const families = ['Archivo','Archivo Black','Bitter','DM Sans','Fraunces','Great Vibes','Italiana','Lato','Nunito','Playfair Display','Quicksand'];
const manifest = {};
const fallbacks = JSON.parse(await readFile(`${directory}/fontshare-fallbacks.json`, 'utf8'));
for (const family of families) {
  fallbacks[family.toLowerCase()] = getFallbackFontOverrideMetrics(family);
  const variable = !['Archivo Black','Great Vibes','Italiana','Lato'].includes(family);
  const query = family.replaceAll(' ', '+') + (variable ? ':wght@400..700' : family === 'Lato' ? ':wght@400;700' : '');
  const url = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' } });
  if (!response.ok) throw Error(`${url}: ${response.status}`);
  const css = await response.text();
  const blocks = [...css.matchAll(/(?:\/\* ([^*]+) \*\/\s*)?(@font-face\s*\{[^}]+\})/g)];
  manifest[family.toLowerCase()] = [];
  for (const [, subset, block] of blocks) {
    const source = block.match(/url\((https:[^)]+)\)/)?.[1];
    if (!source) throw Error('Missing font source');
    const fontResponse = await fetch(source);
    if (!fontResponse.ok) throw Error(`Font ${fontResponse.status}`);
    const bytes = Buffer.from(await fontResponse.arrayBuffer());
    const filename = createHash('sha256').update(bytes).digest('hex').slice(0,16) + '.woff2';
    await writeFile(`${directory}/${filename}`, bytes);
    manifest[family.toLowerCase()].push({ css: block.replace(source, `/amethyst/fonts/${filename}`), file: filename, inline: subset === 'latin' || !subset });
  }
  console.log(family, manifest[family.toLowerCase()].length);
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family.toLowerCase().replaceAll(' ', '')}/OFL.txt`);
  if (!license.ok) throw Error(`Missing license: ${family}`);
  await writeFile(`${directory}/licenses/${family.toLowerCase().replaceAll(' ', '-')}.txt`, await license.text());
}
for (const family of ['Vend Sans','Boska','Switzer','Melodrama','Sharpie','Ranade']) {
  const slug = family.toLowerCase().replaceAll(' ', '-');
  const response = await fetch(`https://api.fontshare.com/v2/css?f[]=${slug}@400,500,600,700&display=swap`);
  if (!response.ok) throw Error(`${family}: ${response.status}`);
  const css = await response.text();
  manifest[family.toLowerCase()] = [];
  for (const [block] of css.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    const source = block.match(/url\(['"]?((?:https:)?\/\/[^)'" ]+\.woff2)[\s'"]*\)/)?.[1];
    if (!source) continue;
    // Preserve the existing provider delivery for proprietary Fontshare faces.
    // Do not redistribute those font files in the repository.
    const remote = block.replace(/src\s*:[^;]+;/, `src:url('${source.startsWith('//') ? 'https:'+source : source}') format('woff2');`);
    manifest[family.toLowerCase()].push({css: remote, file: '', inline: false});
  }
  console.log(family, manifest[family.toLowerCase()].length);
}
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2)+'\n');
await writeFile(`${directory}/fallbacks.json`, JSON.stringify(fallbacks, null, 2)+'\n');
