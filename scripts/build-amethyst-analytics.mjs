import { mkdirSync, readFileSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(process.cwd(), 'node_modules/@qwik.dev/partytown');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const target = join(process.cwd(), 'public/amethyst/analytics-worker', version);
mkdirSync(target, { recursive: true });
for (const entry of readdirSync(join(root, 'lib'), { withFileTypes: true })) {
  if (entry.isFile() && /^partytown[\w.-]*\.(?:js|html)$/.test(entry.name)) copyFileSync(join(root, 'lib', entry.name), join(target, entry.name));
}
copyFileSync(join(root, 'LICENSE'), join(target, 'LICENSE'));
writeFileSync('public/amethyst/analytics-worker/manifest.json', JSON.stringify({ version, lib: `/amethyst/analytics-worker/${version}/` }, null, 2) + '\n');
