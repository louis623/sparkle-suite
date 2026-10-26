/* Read-only default-off proof for the immutable preview. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [base,output]=process.argv.slice(2);if(!base?.includes('.vercel.app'))throw Error('Explicit preview URL required');
const origin=new URL(base).origin,headers={};if(process.env.VERCEL_OIDC_TOKEN)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
const read=async pathname=>{const r=await fetch(origin+pathname,{headers});return {status:r.status,type:r.headers.get('content-type'),text:await r.text()}};
(async()=>{
 fs.mkdirSync(output,{recursive:true});const report={base,routes:[],assets:[],checkedAt:new Date().toISOString()};
 for(const route of JSON.parse(fs.readFileSync('scripts/qa/hero-real-routes.json'))){const r=await read('/'+route.slug);const result={...route,status:r.status,legacy:r.text.includes('/amethyst/render-v1/'),newSSR:r.text.includes('data-server-rendered="true"')};result.pass=result.status===200&&result.legacy&&!result.newSSR;report.routes.push(result)}
 for(const asset of ['Homepage.html','homepage.jsx','tweaks-panel.jsx','am01-unicorn.js','homepage.css']){const r=await read('/amethyst/render-v1/'+asset);report.assets.push({asset,status:r.status,type:r.type,legacyNamespace:!r.text.includes('/amethyst/render-v1/render-v1/')});}
 const privacy=await read('/privacy-policy');report.privacy={status:privacy.status,hasPolicy:/privacy policy/i.test(privacy.text),hasQuestionnaireCopy:/favorite|jewelry|preferences/i.test(privacy.text)};
 report.pass=report.routes.every(r=>r.pass)&&report.assets.every(r=>r.status===200&&r.legacyNamespace)&&report.privacy.status===200&&report.privacy.hasPolicy;
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(report.pass,true);
})().catch(error=>{console.error(error.message);process.exitCode=1});
