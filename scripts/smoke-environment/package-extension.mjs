import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {verifyPackage} from '../verify-live-lineup-extension-package.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const inventory=readFileSync(resolve(root,'tests/manifests/sparkle-live-lineup-extension-package.txt'),'utf8');
const names=inventory.trim().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).sort();
export function buildSmokeSources() {
  const sources=new Map(names.map(name=>[name,readFileSync(resolve(root,'chrome-extension',name))]));
  const identity=JSON.parse(readFileSync(resolve(root,'scripts/smoke-environment/extension-identity.json'),'utf8'));
  const expectedId=[...createHash('sha256').update(Buffer.from(identity.key,'base64')).digest().subarray(0,16)].map(b=>String.fromCharCode(97+(b>>4),97+(b&15))).join('');
  if(expectedId!==identity.id)throw Error('Smoke public key identity mismatch');
  const manifest=JSON.parse(sources.get('manifest.json'));
  if(manifest.version!=='2.0.5')throw Error('Only authorized 2.0.5 package');
  manifest.name='Sparkle Suite Live Lineup — Smoke';
  manifest.description='Synthetic Smoke testing only. Never pair live Bomb Party orders.';
  manifest.key=identity.key;
  manifest.host_permissions=['https://myoffice.bombparty.com/*','https://sparkle-suite-smoke.vercel.app/*'];
  sources.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
  let worker=sources.get('background.js').toString('utf8');
  for(const [before,after] of [['const ENVIRONMENT = "production";','const ENVIRONMENT = "smoke";'],['https://www.yoursparklesuite.com/api/live-lineup/publish','https://sparkle-suite-smoke.vercel.app/api/live-lineup/publish']]) {
    if(worker.split(before).length!==2)throw Error('Expected one reviewed package substitution');
    worker=worker.replace(before,after);
  }
  sources.set('background.js',Buffer.from(worker));
  sources.set('popup.html',Buffer.from(sources.get('popup.html').toString('utf8').replace('<main>','<main><p role="note"><strong>SMOKE — synthetic orders only</strong><br>Use only a Smoke Workspace code. Never pair live Bomb Party orders.</p>')));
  return sources;
}
function crc32(body){let value=0xffffffff;for(const byte of body){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;}
export function zipSources(sources){const local=[],central=[];let offset=0;
 for(const [name,body]of sources){const nameBytes=Buffer.from(name),crc=crc32(body),l=Buffer.alloc(30),c=Buffer.alloc(46);
 l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt16LE(0x800,6);l.writeUInt32LE(crc,14);l.writeUInt32LE(body.length,18);l.writeUInt32LE(body.length,22);l.writeUInt16LE(nameBytes.length,26);
 c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(body.length,20);c.writeUInt32LE(body.length,24);c.writeUInt16LE(nameBytes.length,28);c.writeUInt32LE(offset,42);
 local.push(l,nameBytes,body);central.push(c,nameBytes);offset+=l.length+nameBytes.length+body.length;}
 const c=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(sources.size,8);end.writeUInt16LE(sources.size,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,c,end]);}
export function verifySmokeSources(sources){return verifyPackage({zip:zipSources(sources),approvedInventory:inventory,reviewedSources:sources,expectedVersion:'2.0.5',target:'smoke'});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const outArg=process.argv.find(x=>x.startsWith('--out='));if(!outArg)throw Error('Provide --out=absolute-folder');
 const out=resolve(outArg.slice(6));if(existsSync(out)||existsSync(out+'.zip'))throw Error('Refuse overwriting a previous package');
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const dirty=execFileSync('git',['status','--porcelain','--','chrome-extension','scripts/smoke-environment','scripts/verify-live-lineup-extension-package.mjs'],{cwd:root,encoding:'utf8'}).trim();
 if(dirty)throw Error('Commit the exact reviewed package sources before packaging');
 const sources=buildSmokeSources(),evidence=verifySmokeSources(sources);mkdirSync(out,{recursive:true});
 for(const [name,body]of sources){const path=resolve(out,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,body);}
 writeFileSync(out+'.zip',zipSources(sources));writeFileSync(out+'.evidence.json',JSON.stringify({sourceSha:sha,environment:'smoke',folder:out,...evidence},null,2)+'\n');
 console.log(JSON.stringify({sourceSha:sha,folder:out,zip:out+'.zip',sha256:evidence.sha256,version:'2.0.5',environment:'smoke'}));
}
