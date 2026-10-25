import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { landingPreviewDocument } from '../../lib/sparkle-suite/landing-demo-preview'
import { AMETHYST_APPEARANCE_PRESETS, AMETHYST_APPEARANCE_PRESET_IDS } from '../../lib/amethyst/appearance-presets'

async function main() {
  const [origin, output, sourceOrigin = origin] = process.argv.slice(2)
  if (!origin || !output) throw new Error('Usage: render-theme-poster-documents.ts ORIGIN OUTPUT')
  const response = await fetch(sourceOrigin + '/api/public/landing-demo/preview')
  if (!response.ok) throw new Error('Public demo preview unavailable')
  const html = await response.text()
  const match = html.match(/window\.AMETHYST_HOMEPAGE_TEMPLATE_DATA = (\{[^\n]+\});/)
  if (!match) throw new Error('Public demo display data missing')
  const data = JSON.parse(match[1])
  console.log(JSON.stringify({sourceOrigin,businessName:data.businessName,ticker:data.tickerTopText}))
  await mkdir(output, {recursive:true})
  for (const theme of AMETHYST_APPEARANCE_PRESET_IDS) {
    const document = await landingPreviewDocument({
      slug:'dudesfizzfest', businessName:data.businessName, headline:data.heroHeadline,
      subtitle:data.heroSub, ticker:data.tickerTopText, theme,
      themeLabel:AMETHYST_APPEARANCE_PRESETS[theme].label, themes:[],
    }, theme, origin)
    await writeFile(join(output, theme + '.html'), document)
  }
}
main().catch(error => { console.error(error); process.exitCode=1 })
