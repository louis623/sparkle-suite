const test = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../chrome-extension/update-client.js');

test('idle installation clears obsolete downloaded status without erasing pending updates or cooldowns', async () => {
  const time=Date.parse('2026-11-16T22:00:00.000Z');
  function fixture(installed,values){
    const record={updates:{descriptorCheckedAt:time,chromeCheckedAt:time-1000,checkTarget:'2.0.10',...values}};
    const storage={get:async key=>({[key]:structuredClone(record[key])}),set:async patch=>Object.assign(record,structuredClone(patch))};
    const client=create({storage,key:'updates',version:installed,now:()=>time,
      fetchRelease:async()=>{assert.fail('recent descriptor must retain cooldown');},
      requestCheck:async()=>{assert.fail('cleanup must not request an update');},
      reload:()=>assert.fail('cleanup must not reload')});
    return {client,record};
  }
  for(const installed of ['2.0.9','2.0.10']){
    const f=fixture(installed,{downloadedVersion:'2.0.9',updateState:'downloaded'});
    await f.client.check();
    assert.equal(f.record.updates.downloadedVersion,null);
    assert.equal(await f.client.getState(),'unknown');
    assert.equal(f.record.updates.descriptorCheckedAt,time);
    assert.equal(f.record.updates.chromeCheckedAt,time-1000);
    assert.equal(f.record.updates.checkTarget,'2.0.10');
  }
  const failed=fixture('2.0.9',{downloadedVersion:'2.0.10',attemptVersion:'2.0.10',attemptAt:time-1000,updateState:'installing'});
  await failed.client.check();
  assert.equal(failed.record.updates.downloadedVersion,'2.0.10');
  assert.equal(failed.record.updates.attemptVersion,'2.0.10');
  assert.equal(failed.record.updates.attemptAt,time-1000);
  assert.equal(await failed.client.getState(),'installing');
  const newer=fixture('2.0.9',{downloadedVersion:'2.0.10',attemptVersion:'2.0.8',attemptAt:time-1000,updateState:'downloaded'});
  await newer.client.check();
  assert.equal(newer.record.updates.downloadedVersion,'2.0.10');
  assert.equal(newer.record.updates.attemptVersion,null);
  assert.equal(newer.record.updates.attemptAt,null);
  assert.equal(await newer.client.getState(),'downloaded');
  const complete=fixture('2.0.9',{downloadedVersion:'2.0.9',attemptVersion:'2.0.9',attemptAt:time-1000,updateState:'installing'});
  await complete.client.check();
  assert.equal(complete.record.updates.attemptVersion,null);
  assert.equal(complete.record.updates.attemptAt,null);
  assert.equal(complete.record.updates.downloadedVersion,null);
  assert.equal(await complete.client.getState(),'unknown');
  const concurrent=fixture('2.0.9',{downloadedVersion:'2.0.9',updateState:'downloaded'});
  await Promise.all([concurrent.client.check(),concurrent.client.noteDownload('2.0.10')]);
  assert.equal(concurrent.record.updates.downloadedVersion,'2.0.10');
  assert.equal(await concurrent.client.getState(),'downloaded');
});
