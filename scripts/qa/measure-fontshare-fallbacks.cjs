// Measure metrics without downloading or redistributing proprietary font files.
// The browser loads the already-used official CDN faces; only numbers are saved.
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/amethyst/fonts/manifest.json'));
 const fonts={boska:'Times New Roman',switzer:'Arial',melodrama:'Times New Roman',sharpie:'Arial',ranade:'Arial'};
 const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
 await page.setContent('<style>'+Object.keys(fonts).flatMap(f=>manifest[f].map(face=>face.css)).join('\n')+'</style>');
 const result={};
 for(const [family,fallbackFont] of Object.entries(fonts)){
  result[family]=[];
  for(const weight of [400,500,600,700])result[family].push(await page.evaluate(async({family,fallbackFont,weight})=>{
   const loaded=await document.fonts.load(`${weight} 100px "${family}"`);
   if(!loaded.length)throw Error('Missing font face: '+family);
   if(!document.fonts.check(`${weight} 100px "${family}"`))throw Error('Font did not load: '+family);
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   const sample='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 Real jewelry. Live reveals. Pure sparkle. Shop Bomb Party Browse the dance floor Join My Team Watch on TikTok Watch on Facebook';
   ctx.font=`${weight} 100px "${family}"`;const target=ctx.measureText(sample),zeroEm=ctx.measureText('0').width/100;
   ctx.font=`${weight>=600?700:400} 100px "${fallbackFont}"`;const fallback=ctx.measureText(sample);
   const ratio=target.width/fallback.width,percentage=n=>n.toFixed(2)+'%';
   return {fallbackFont:fallbackFont+(weight>=600?' Bold':''),weight,zeroEm,sizeAdjust:percentage(ratio*100),ascentOverride:percentage(target.fontBoundingBoxAscent/ratio),descentOverride:percentage(target.fontBoundingBoxDescent/ratio),lineGapOverride:'0.00%'};
  },{family,fallbackFont,weight}));
 }
 await browser.close();
 fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1});
