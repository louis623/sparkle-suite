// Read-only checks for production asset identity on an authenticated preview.
const fs=require('node:fs'),crypto=require('node:crypto');
const [base,output]=process.argv.slice(2);
const assets=['/marketing/demo-themes/sunset_beach.webp','/amethyst/compiled/homepage.js','/amethyst/skins/sunset-beach/hero-approved-720-v2.webp','/amethyst/skins/sunset-beach/hero-approved-1440.webp','/amethyst/skins/sunset-beach/hero-poster-720.webp'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const rows=[];
 for(const asset of assets){
  const response=await fetch(new URL(asset,base),{redirect:'error',headers:process.env.VERCEL_OIDC_TOKEN?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{}});
  const bytes=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync('public'+asset);
  rows.push({asset,status:response.status,type:response.headers.get('content-type'),bytes:bytes.length,sha256:hash(bytes),matchesRepository:hash(bytes)===hash(local)});
 }
 fs.writeFileSync(output,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
 if(rows.some(r=>r.status!==200||!r.matchesRepository))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
