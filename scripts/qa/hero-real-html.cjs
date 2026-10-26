/* Read-only HTTP proof on the same real rep routes as the browser matrix. */
const fs=require('node:fs'), path=require('node:path'), zlib=require('node:zlib'), crypto=require('node:crypto');
const [base,output]=process.argv.slice(2);
if(!base?.includes('.vercel.app'))throw Error('Preview URL required');
const origin=new URL(base).origin;
async function read(url){const headers={};if(new URL(url).origin===origin&&process.env.VERCEL_OIDC_TOKEN)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;return fetch(url,{headers});}
const plain=s=>s.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<style\b[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
(async()=>{
 fs.mkdirSync(output,{recursive:true});const results=[];
 for(const route of JSON.parse(fs.readFileSync('scripts/qa/hero-real-routes.json'))){
  const response=await read(base+'/'+route.slug),html=await response.text();
  const seed=html.match(/window\.AMETHYST_PUBLIC_IDENTITY=(\{[^<]+?\});window\.SPARKLE_FIRST_PAINT/);
  const identity=seed?JSON.parse(seed[1]):null;
  const text=plain(html.split('<body')[1]||'');
  const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].reduce((n,m)=>n+Buffer.byteLength(m[1]),0);
  results.push({...route,status:response.status,rawBytes:Buffer.byteLength(html),brotliEstimateBytes:zlib.brotliCompressSync(Buffer.from(html)).length,inlineStyleBytes:styles,cacheControl:response.headers.get('cache-control'),serverRendered:html.includes('data-server-rendered="true"'),h1:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m=>plain(m[1])),identity,repSentences:text.match(/[^.!?]* is the rep for [^.]+\./g),hasUTC:/\bUTC\b/.test(text),embeddedFont:html.includes('data:font/'),runtimeDev:/react(?:-dom)?\.development|babel-standalone/.test(html)});
  const result=results.at(-1);
  result.publicLocationPresent=!!identity&&(!identity.location||text.includes(identity.location));
  result.pass=result.status===200&&result.serverRendered&&!!identity&&result.h1.includes(identity.businessName)&&text.includes(identity.identity)&&result.publicLocationPresent&&!result.hasUTC&&!result.embeddedFont&&!result.runtimeDev;
 }
 const picture=await read(base+'/marketing/demo-themes/sunset_beach.webp');
 const pictureBytes=Buffer.from(await picture.arrayBuffer()),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const assetPaths=[Object.values(JSON.parse(fs.readFileSync('public/amethyst/delivery/manifest.json')))[0],'/amethyst/skins/sunset-beach/hero-first-paint.avif'];
 const manifest=JSON.stringify(JSON.parse(fs.readFileSync('public/amethyst/fonts/manifest.json')));
 const font=manifest.match(/\/amethyst\/fonts\/[^\s"\\]+\.woff2/);if(font)assetPaths.push(font[0]);
 const cacheableAssets=[];for(const asset of assetPaths){const response=await read(base+asset);cacheableAssets.push({path:asset,status:response.status,type:response.headers.get('content-type'),cacheControl:response.headers.get('cache-control')});await response.arrayBuffer()}
 const report={base,checkedAt:new Date().toISOString(),routes:results,cacheableAssets,landingPicture:{status:picture.status,type:picture.headers.get('content-type'),bytes:pictureBytes.length,matchesRepository:hash(pictureBytes)===hash(fs.readFileSync('public/marketing/demo-themes/sunset_beach.webp'))}};
 report.pass=results.every(r=>r.pass)&&cacheableAssets.every(a=>a.status===200)&&report.landingPicture.status===200&&report.landingPicture.matchesRepository;
 fs.writeFileSync(path.join(output,'real-route-html.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({routes:results.length,allSSR:results.every(r=>r.serverRendered&&r.status===200),maxRawBytes:Math.max(...results.map(r=>r.rawBytes)),landingPicture:report.landingPicture}));
 if(!report.pass){console.error(JSON.stringify({failedRoutes:results.filter(r=>!r.pass).map(r=>r.slug)}));process.exitCode=1;}
})().catch(e=>{console.error(e.message);process.exitCode=1});
