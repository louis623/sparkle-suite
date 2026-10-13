import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function hashLockedSource(text, functionName=undefined) {
  let source=text.replace(/\r\n/g,'\n');
  if(functionName) {
    const start=source.indexOf(`function ${functionName}(`);
    if(start<0)throw Error(`Locked function missing: ${functionName}`);
    source=source.slice(start);
    const next=source.slice(1).search(/\nfunction [A-Za-z]/);
    if(next>=0)source=source.slice(0,next+1);
  }
  return createHash('sha256').update(source).digest('hex');
}

export function checkCustomerSiteLayoutLock(repoRoot=process.cwd()) {
  const fixture=JSON.parse(readFileSync(resolve(repoRoot,'tests/fixtures/customer-site-layout-lock.json'),'utf8'));
  for(const lock of fixture.locks) {
    const source=readFileSync(resolve(repoRoot,lock.path),'utf8');
    if(hashLockedSource(source,lock.function)!==lock.sha256) {
      throw Error(`Customer-site layout lock failed: ${lock.path}${lock.function?' / '+lock.function:''}. Skin approval does not authorize shared layout changes. Restore the approved source. Do not refresh the baseline without Louis approving the exact shared change.`);
    }
  }
  return fixture.locks.length;
}

if(import.meta.url===pathToFileURL(resolve(process.argv[1]||'')).href) {
  try {console.log(`Customer-site layout lock passed: ${checkCustomerSiteLayoutLock()} approved source checks.`);}
  catch(error) {console.error(error.message);process.exitCode=1;}
}
