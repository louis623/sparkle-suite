// Operator-only snapshot generation. Never run this as a deploy/migration step.
// The preserved Live source stays fixed until an explicitly approved replacement.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const commit='3f175871674e42dbc62d18419318941ea6a49935';
const root='lib/amethyst/legacy';
const show=path=>execFileSync('git',['show',commit+':'+path],{maxBuffer:50*1024*1024});
mkdirSync(root,{recursive:true});
for(const [name,source] of Object.entries({
 'public-asset-response.ts':'lib/amethyst/public-asset-response.ts',
 'homepage-template-data.ts':'lib/amethyst/homepage-template-data.ts',
 'homepage-bootstrap-response.ts':'app/api/amethyst/homepage-template/route.ts',
 'rep-ga4-tag.ts':'lib/amethyst/rep-ga4-tag.ts',
})){
 let code=show(source).toString().replace(/from (['"])\.\//g,'from $1../');
 if(name==='public-asset-response.ts')code=code.replace("from '@/lib/amethyst/rep-ga4-tag'","from './rep-ga4-tag'").replace("return join(process.cwd(), 'public', 'amethyst', assetPath)","return join(process.cwd(), 'lib', 'amethyst', 'legacy', 'assets', assetPath)");
 if(name==='homepage-bootstrap-response.ts')code=code.replace("from '@/lib/amethyst/homepage-template-data'","from './homepage-template-data'").replace('export async function GET(','export async function buildLegacyHomepageBootstrapResponse(');
 writeFileSync(join(root,name),'// Frozen Live source: '+commit+' / '+source+'\n// Only import/root adapters differ; do not modernize this compatibility path.\n'+code);
}
const entries=execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)',commit,'public/amethyst'],{encoding:'utf8'}).trim().split('\n');
const files={};
for(const entry of entries){const blob=entry.slice(0,40),path=entry.slice(41),asset=path.slice('public/amethyst/'.length);const bytes=show(path);const text=/\.(?:css|js|jsx|html|md|json|svg)$/.test(asset);let unchanged=false;try{unchanged=readFileSync(path).equals(bytes)}catch{}
 const snapshot=text||!unchanged;
 files[asset]={blob,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,source:snapshot?'snapshot':'shared'};
 if(snapshot){const target=join(root,'assets',asset);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes)}
}
writeFileSync(join(root,'manifest.json'),JSON.stringify({sourceCommit:commit,deployment:'dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P',files},null,2)+'\n');
console.log('Snapshotted pinned Live renderer and '+Object.keys(files).length+' asset records. No database/deployment access.');
