// Never publish these fixtures: they contain the rep's existing public projection.
// Download the public homepage-template response into an ignored local file,
// then pass its path, a loopback origin, and a local output directory here.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildAmethystHomepageBootstrapScript, buildAmethystHomepageTweakDefaults } from '../../lib/amethyst/homepage-template-data'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '../../lib/amethyst/appearance-presets'
import { buildSkinPreviewDocument } from '../../lib/amethyst/skin-preview'

async function main() {
  const [input, origin = 'http://localhost:3005', destination = '.local/saved-settings'] = process.argv.slice(2)
  if (!input) throw Error('Pass an ignored local public-bootstrap file')
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw Error('Saved-settings fixtures are loopback-only')
  const output = resolve(destination)
  const localRoot = resolve('.local')
  if (!output.startsWith(localRoot + '/') && !output.startsWith(localRoot + '\\')) throw Error('Write fixtures under ignored .local/')
  const text = await readFile(input, 'utf8')
  const source = text.match(/window\.AMETHYST_HOMEPAGE_TEMPLATE_DATA = (.+);\r?\n/)?.[1]
  if (!source) throw Error('Public projection format changed')
  const saved = JSON.parse(source)
  await mkdir(output, { recursive: true })
  const results = []
  for (const theme of AMETHYST_APPEARANCE_PRESET_IDS) {
    const defaults = buildAmethystHomepageTweakDefaults(saved, theme)
    const bootstrap = buildAmethystHomepageBootstrapScript(saved, [], theme, { targeted: true })
    const document = await buildSkinPreviewDocument(theme, 'homepage', origin, null, bootstrap)
    await writeFile(resolve(output, theme + '.html'), document)
    results.push({ theme, savedMotion: saved.heroMotion, effective: defaults.heroMotion, renderedOn: document.includes('data-hero-motion="on"') })
  }
  await writeFile(resolve(output, 'summary.json'), JSON.stringify({ businessName: saved.businessName, results }, null, 2))
  console.log(JSON.stringify({ themes: results.length, allMotionOn: results.every(r => r.renderedOn && !['still', 'none'].includes(String(r.effective))) }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
