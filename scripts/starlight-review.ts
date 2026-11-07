import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { transformSync } from 'esbuild'
import { buildSkinPreviewDocument, SKIN_PREVIEW_GUARDS } from '../lib/amethyst/skin-preview'
import { renderHomepageFirstPaint } from '../lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '../lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData as trade } from '../lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData as join } from '../lib/amethyst/join-template-data'
import { renderCardQrFlyerParts } from '../lib/workspace/card-qr/render'
import { resolveCardQrPalette } from '../lib/workspace/card-qr/palette'
import { renderBizcardFront, renderBizcardBack, buildBizcardPrintPdf } from '../lib/workspace/card-qr/bizcard-render'
import { assertFlyerQrDecodes } from '../lib/workspace/card-qr/flyer-decode'

async function main() {
const out=process.env.STARLIGHT_REVIEW_OUTPUT
if(!out||!path.isAbsolute(out))throw Error('Set STARLIGHT_REVIEW_OUTPUT to an absolute artifact directory')
fs.mkdirSync(out,{recursive:true})
const theme='starlight_christmas_hollow',key='starlight-christmas-hollow'
const navigation='<script>window.addEventListener("message",function(e){if(e.source===window&&e.data?.type==="sparkle-skin-preview-page"&&["homepage","trade","join","unsubscribe"].includes(e.data.page))location.href="/"+e.data.page+".html"+(e.data.fragment||"")});</script>'
for (const [label,publicSiteVariant] of Object.entries({standard:undefined,milehigh:'mile_high_fizz_hybrid',britt:'britt_with_bling_hybrid',kitchen:'bling_kitchen_hybrid','kitchen-framed':'bling_kitchen_hybrid'} as const)) {
 const saved={...homepage,repName:'Sasha',businessName:'Christmas Sparkle',heroHeadline:'Real jewelry. Live reveals. Pure sparkle.',heroSub:'Join Sasha for live jewelry reveals and a little holiday magic.',publicSiteVariant,...(label==='kitchen-framed'?{heroImageUrl:'/amethyst/skins/starlight-christmas-hollow/hero-poster.webp'}:{})}
 const source=fs.readFileSync('lib/amethyst/legacy/assets/Homepage.html','utf8')
 let html=await renderHomepageFirstPaint(source,{homepage:saved,join,trade,appearancePreset:theme},new URL('http://127.0.0.1:4326/'),buildAmethystHomepageBootstrapScript(saved,[],theme))
 const csp="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com; img-src 'self' https: data:; media-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'self'; object-src 'none'"
 html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'"><base href="/amethyst/">')
 html=html.replace(/<body([^>]*)>/,'<body$1><script>'+SKIN_PREVIEW_GUARDS.replace(".observe(document.getElementById('root'),",'.observe(document.body,')+'</script>')
 html=html.replace(/<body([^>]*)>/,'<body$1><aside style="padding:12px;background:#061326;color:#fff7e9;text-align:center">SAMPLE DESIGN · Starlight Christmas Hollow · '+label+' layout</aside>')
 fs.writeFileSync(path.join(out,'ssr-'+label+'.html'),html.replace('</body>',navigation+'</body>'))
}
for(const page of ['homepage','trade','join','unsubscribe'] as const){
 let html=await buildSkinPreviewDocument(theme,page,'http://127.0.0.1:4326')
 html=html.replace(/<script[^>]+src="https:\/\/unpkg.com\/(?:react@|react-dom@|@babel\/standalone@)[^>]*><\/script>/g,'')
 html=html.replace('</head>','<script src="/amethyst/compiled/react.js"></script></head>')
 html=html.replace(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g,(_,source)=>'<script>'+transformSync(source,{loader:'jsx',minify:true,target:'es2020'}).code.replace(/<\/script/gi,'<\\/script')+'</script>')
 html=html.replace("script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com","script-src 'unsafe-inline' http://127.0.0.1:4326")
 html=html.replace(/<body([^>]*)>/,'<body$1><div style="padding:12px;background:#061326;color:#fff7e9;text-align:center;font:14px system-ui">Starlight Christmas Hollow · SAMPLE DESIGN · <a style="color:#f2c77b" href="/homepage.html">Home</a> · <a style="color:#f2c77b" href="/trade.html">Dance Floor</a> · <a style="color:#f2c77b" href="/join.html">Join</a></div>')
 html=html.replace("var pages = {", "var pages = { 'homepage.html':'homepage','trade.html':'trade','join.html':'join','unsubscribe.html':'unsubscribe',")
 fs.writeFileSync(path.join(out,page+'.html'),html.replace('</body>',navigation+'</body>'))
}
const url='https://example.com/starlight-review'
const flyer=await renderCardQrFlyerParts({palette:resolveCardQrPalette({templateId:'match-site',appearancePreset:theme}),appearancePreset:theme,showTitle:'Christmas Sparkle',tagline:'A little holiday magic',firstName:'Sasha',website:'example.com',destinationUrl:url,showQr:true})
fs.writeFileSync(path.join(out,'flyer.png'),flyer.flyer)
const jpg=await sharp(flyer.flyer).jpeg({quality:92}).toBuffer()
fs.writeFileSync(path.join(out,'flyer.jpg'),jpg)
await assertFlyerQrDecodes(flyer.flyer,url,flyer.layout.qr)
await assertFlyerQrDecodes(jpg,url,flyer.layout.qr)
const front=await renderBizcardFront({key,showTitle:'Christmas Sparkle',firstName:'Sasha'})
const back=await renderBizcardBack({key,qrUrl:url,qrIcon:'none',name:'Sample Rep',email:'hello@example.com',website:'example.com',textLinkNumber:'',social:'@sampleshop',socialPlatform:'instagram',fields:{name:true,email:true,website:true,textLink:false,social:true,discount:false}})
fs.writeFileSync(path.join(out,'card-front.png'),front.png)
fs.writeFileSync(path.join(out,'card-back.png'),back.png)
fs.writeFileSync(path.join(out,'business-card-print.pdf'),await buildBizcardPrintPdf({front:front.png,back:back.png}))
fs.writeFileSync(path.join(out,'print-layout.json'),JSON.stringify({flyer:flyer.layout,front:front.boxes,back:back.layout,warnings:back.warnings,overflow:back.overflow},null,2))
console.log(JSON.stringify({output:out,flyerQr:'PNG and JPEG passed',cardWarnings:back.warnings,cardOverflow:back.overflow}))
}
main().catch(e=>{console.error(e);process.exitCode=1})
