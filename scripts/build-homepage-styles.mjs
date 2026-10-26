import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';
import postcss from 'postcss';
const root = 'public/amethyst/';
const images = JSON.parse(readFileSync(root + 'hero-delivery.json', 'utf8'));
const html = readFileSync(root + 'Homepage.html', 'utf8');
const names = [...new Set([...html.matchAll(/href="(?:\/amethyst\/)?((?:bling-kitchen\/)?[a-z0-9-]+\.css)(?:\?[^\"]*)?"/g)].map(m => m[1]))];
mkdirSync(root + 'delivery', { recursive: true });
const manifest = {}, critical = {};
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
  const records = [];
  const aboveFold = /(?:^|[ .#])(?:hp-(?:sticky|header|brand|shop|ticker|trade-preview|live|lineup|calendar|hero|btn|container|saturate|fx|customer-media-icon)|slot|live-dot|watch-|gg-|beach-|mhf-|bwb-|bkf-|bk-home-|au-|nb-|hpw-|hpc-|sb-|rgc-|rg-|pr-|fo-|ga-|tg-)/;
  const tree = postcss.parse(css);
  tree.walkRules(rule => {
    if (rule.parent?.name?.includes('keyframes')) return;
    for (const selector of postcss.list.comma(rule.selector)) {
      const plain = selector.replace(/body(?:\.[\w-]+)*/g, 'body');
      if (!aboveFold.test(selector) && !/^(?::root|#root|html|body|\*|a|button|h[1-6]|p|img|svg|video)(?::[\w()-]+)?$/.test(plain.trim())) continue;
      const bodies = [...selector.matchAll(/body((?:\.[\w-]+)+)/g)].flatMap(m => m[1].slice(1).split('.'));
      const variants = /^\.mhf-/.test(selector) ? ['mile_high_fizz_hybrid'] : /^\.bwb-/.test(selector) ? ['britt_with_bling_hybrid'] : /^\.(?:bkf-|bk-home-)/.test(selector) ? ['bling_kitchen_hybrid'] : [];
      const presets = [...selector.matchAll(/data-appearance-preset=["']?([\w-]+)/g)].map(m=>m[1]);
      let fragment = selector + '{' + rule.nodes.map(n=>n.toString()).join(';') + '}';
      for(let parent=rule.parent; parent && parent.type!=='root'; parent=parent.parent) {
        if(parent.type==='atrule') fragment='@'+parent.name+' '+parent.params+'{'+fragment+'}';
      }
      records.push({ css: transformSync(fragment, {loader:'css',minify:true}).code.trim(), bodies, presets, variants });
    }
  });
  tree.walkAtRules(/keyframes$/, rule => records.push({css:transformSync(rule.toString(),{loader:'css',minify:true}).code.trim(),bodies:[],presets:[],variants:[]}));
  // Merge adjacent rules with the same applicability, preserving cascade order.
  // A comma-separated selector should not repeat a long declaration block.
  const groups = [];
  for (const record of records) {
    const previous = groups.at(-1);
    if (previous && JSON.stringify([previous.bodies, previous.presets, previous.variants]) === JSON.stringify([record.bodies, record.presets, record.variants])) previous.css += record.css;
    else groups.push({...record});
  }
  critical[name] = groups.map(record => ({...record, css: transformSync(record.css, {loader:'css',minify:true}).code.trim()}));
  css = transformSync(css, { loader: 'css', minify: true }).code;
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 16);
  const file = `${name.replaceAll('/', '-').replace('.css', '')}.${hash}.css`;
  writeFileSync(root + 'delivery/' + file, css);
  manifest[name] = '/amethyst/delivery/' + file;
}
writeFileSync(root + 'delivery/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(root + 'delivery/critical.json', JSON.stringify(critical));
console.log(`Built ${names.length} cacheable homepage stylesheets.`);
