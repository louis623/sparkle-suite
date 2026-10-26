import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {shouldBlockAppWrite}=require('./browser-readonly.cjs');
const root=path.resolve(process.env.LIGHTHOUSE_TOOLS || '.local/lighthouse-tools/node_modules');
const {default:lighthouse}=await import(pathToFileURL(path.join(root,'lighthouse/core/index.js')));
const {default:puppeteer}=await import(pathToFileURL(path.join(root,'puppeteer-core/lib/puppeteer/puppeteer-core.js')));
const {default:desktopConfig}=await import(pathToFileURL(path.join(root,'lighthouse/core/config/desktop-config.js')));
const sharp=require('sharp');
const [base,output,mode='phone',selected='',repetitions='5']=process.argv.slice(2);
if(!base?.includes('.vercel.app')&&!(process.env.QA_LOCAL_PRODUCTION==='1'&&['127.0.0.1','localhost','host.docker.internal'].includes(new URL(base).hostname)))throw Error('Preview or explicitly enabled local production-test URL required');
fs.mkdirSync(output,{recursive:true});
const routes=JSON.parse(fs.readFileSync(process.env.REAL_ROUTE_MANIFEST || 'scripts/qa/hero-real-routes.json','utf8')).filter(r=>!selected||selected.split(',').some(s=>s===r.theme||s===r.slug));
const token=process.env.VERCEL_OIDC_TOKEN,origin=new URL(base).origin;
const summaryPath=path.join(output,`${mode}-lighthouse-summary.json`);
const results=process.env.QA_RESUME==='1'&&fs.existsSync(summaryPath)?JSON.parse(fs.readFileSync(summaryPath,'utf8')):[];
const seen=new Set();for(const result of results){const key=result.slug+':'+result.run;if(result.mode!==mode||result.requestedUrl!==base+'/'+result.slug||result.auditScope!=='navigation-metrics'||result.diagnosticOnly||seen.has(key))throw Error('Incompatible existing measurement');seen.add(key)}
for(const route of routes)for(let run=1;run<=Number(repetitions);run++){
 if(seen.has(route.slug+':'+run))continue;
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,defaultViewport:null,ignoreDefaultArgs:['--enable-automation'],args:['--autoplay-policy=document-user-activation-required',...(process.env.QA_CONTAINER==='1'?['--no-sandbox']:[])]});
 try{
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',request=>{if(process.env.QA_READ_ONLY==='1'&&shouldBlockAppWrite(request,base))return request.abort();if(process.env.QA_DIAG_BLOCK_CSS==='1' && request.url().includes('/amethyst/delivery/') && request.resourceType()==='stylesheet')return request.abort();if(process.env.QA_DIAG_BLOCK_GA==='1' && /googletagmanager|google-analytics/.test(request.url()))return request.abort();const headers={...request.headers()};if(process.env.QA_FORWARD_HOST&&new URL(request.url()).origin===origin){headers['x-forwarded-host']=process.env.QA_FORWARD_HOST;headers['x-forwarded-proto']='http'}if(token&&new URL(request.url()).origin===origin)headers['x-vercel-trusted-oidc-idp-token']=token;request.continue({headers}).catch(()=>{});});
  // Keep Lighthouse's standard navigation/throttling and scored performance
  // metrics, without unrelated post-navigation audits such as BFCache. These
  // do not alter the first-paint timing and add a second navigation per run.
  const config={extends:'lighthouse:default',...(mode==='desktop'?desktopConfig:{}),settings:{...(mode==='desktop'?desktopConfig.settings:{}),onlyAudits:['largest-contentful-paint','cumulative-layout-shift','first-contentful-paint','speed-index','total-blocking-time','screenshot-thumbnails','network-requests'],formFactor:mode==='phone'?'mobile':'desktop',screenEmulation:{mobile:mode==='phone',width:mode==='phone'?360:1440,height:mode==='phone'?800:900,deviceScaleFactor:1,disabled:false},disableFullPageScreenshot:true,...(process.env.QA_LH_METHOD?{throttlingMethod:process.env.QA_LH_METHOD}:{})}};
  const {lhr}=await lighthouse(base+'/'+route.slug,{logLevel:'error',output:'json'},config,page);
  // This DOM marker is only a post-audit diagnostic: Lighthouse's bf-cache
  // gatherer navigates away and back after timing collection. A missing marker
  // here is not evidence that the measured HTTP response used the SSR fallback.
  // Use hero-real-html and retained-node browser checks for that assertion.
  const a=lhr.audits;const documentRequest=a['network-requests']?.details?.items?.find(item=>item.resourceType==='Document'&&item.url===base+'/'+route.slug);const serverRendered=await page.evaluate(()=>document.querySelector('#root')?.getAttribute('data-server-rendered')==='true');const result={...route,mode,run,auditScope:'navigation-metrics',serverRendered,documentTransferBytes:documentRequest?.transferSize,documentResourceBytes:documentRequest?.resourceSize,lighthouseVersion:lhr.lighthouseVersion,fetchTime:lhr.fetchTime,requestedUrl:lhr.requestedUrl,finalUrl:lhr.finalDisplayedUrl,lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,fcp:a['first-contentful-paint'].numericValue,tbt:a['total-blocking-time'].numericValue,speedIndex:a['speed-index'].numericValue,score:lhr.categories.performance.score,settings:lhr.configSettings,diagnosticOnly:process.env.QA_DIAG_BLOCK_CSS==='1'||process.env.QA_DIAG_BLOCK_GA==='1',runtimeError:lhr.runtimeError,warnings:lhr.runWarnings};
  const prefix=path.join(output,`${mode}-${route.slug}-${run}`);
  let json=JSON.stringify(lhr,null,2);if(token)json=json.replaceAll(token,'[redacted]');fs.writeFileSync(prefix+'-lighthouse.json',json);
  if(run===1){
   const frames=a['screenshot-thumbnails']?.details?.items||[],overlays=[];
   for(let i=0;i<frames.length;i++){
    overlays.push({input:await sharp(Buffer.from(frames[i].data.replace(/^data:[^,]+,/,''),'base64')).resize({width:180,height:240,fit:'contain',background:'#eee'}).png().toBuffer(),left:i*180,top:25});
    overlays.push({input:Buffer.from(`<svg width="180" height="25"><text x="5" y="18" font-size="14">${(frames[i].timing/1000).toFixed(2)}s</text></svg>`),left:i*180,top:0});
   }
   if(frames.length)await sharp({create:{width:frames.length*180,height:265,channels:3,background:'white'}}).composite(overlays).png().toFile(prefix+'-lighthouse-filmstrip.png');
  }
  results.push(result);fs.writeFileSync(path.join(output,`${mode}-lighthouse-summary.json`),JSON.stringify(results,null,2));
  console.log(JSON.stringify({...result,settings:undefined}));
 }catch(e){console.error(JSON.stringify({slug:route.slug,mode,run,error:e.message}));process.exitCode=1;}finally{await browser.close();}
}
