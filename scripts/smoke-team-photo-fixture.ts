/** Generates local-only portrait-card fixtures; never publishes or changes a rep. */
import { readFile, writeFile } from 'node:fs/promises'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData } from '../lib/amethyst/join-template-data'

async function main() {
  if (process.env.VERCEL_ENV === 'production') throw new Error('Local smoke fixture only')
  const html = await readFile('public/amethyst/Join.html', 'utf8')
  for (const skin of ['amethyst', 'neon_butterfly', 'morganite'] as const) {
    const script = buildAmethystJoinBootstrapScript({
      ...defaultAmethystJoinTemplateData,
      repName: 'Brittany', businessName: 'Portrait layout preview', teamName: 'Sample cards — no changes saved',
      repImageUrl: '/britt-with-bling/team-01-brittany.png',
      repImageFraming: {focusX:50,focusY:50,zoom:1,rotation:0,fit:'contain'},
      teamMembers: [
        {name:'Rayna',business:'Existing photo · whole image',state:'Sample only',imageUrl:'/britt-with-bling/team-02-rayna.png',socialLinks:{}},
        {name:'Britt',business:'Existing photo · cover frame',state:'Sample only',imageUrl:'/britt-with-bling/team-03-britt.png',photoFraming:{focusX:50,focusY:38,zoom:1,rotation:0},socialLinks:{}},
      ],
      hasRecruitingLink:false, bpReferralUrl:'',
    }, skin, {targeted:true})
    await writeFile(`public/amethyst/__team-photo-review-${skin}.html`, html.replace(/<script src="template-loader.js"[^>]*><\/script>/, `<script>${script}</script>`))
  }
  console.log('Local fixtures generated: /amethyst/__team-photo-review-{amethyst,neon_butterfly,morganite}.html#team. Remove generated HTML before deploying.')
}
void main()
