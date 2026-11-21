const test = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../chrome-extension/update-client.js');

test('checks are single-flight, and finding a newer version does not reload', async () => {
  const record = {};
  let calls = 0, reloads = 0;
  const client = create({
    storage:{get:async key=>({[key]:structuredClone(record[key])}),set:async patch=>Object.assign(record,structuredClone(patch))},
    key:'updates',version:'2.0.13',
    fetchRelease:async()=>{throw Error('offline');},
    requestCheck:async()=>{calls++;return {status:'update_available',version:'2.0.14'};},
    reload:()=>{reloads++;},
  });
  const first = client.checkAndInstall({waitMs:0});
  assert.equal(first,client.checkAndInstall());
  assert.equal(await first,'downloaded');
  assert.equal(calls,1);
  assert.equal(reloads,0);
  assert.equal(await client.onUpdateAvailable('2.0.12'),false);
  assert.equal(await client.onUpdateAvailable('2.0.14'),true);
  assert.equal(reloads,1);
});

test('persisted per-target reload budgets span workers and reset at browser startup', async () => {
  let time = 10000, reloads = 0;
  const record = {};
  const make = (version = '2.0.13') => create({
    key:'updates',version,now:()=>time,
    storage:{get:async key=>({[key]:structuredClone(record[key])}),set:async patch=>Object.assign(record,structuredClone(patch))},
    requestCheck:async()=>({status:'no_update'}),reload:()=>{reloads++;},
  });
  assert.equal(await make().onUpdateAvailable('2.0.14'),true);
  const restarted = make();
  assert.equal(await restarted.checkAndInstall(),'failed');
  for (let i = 0; i < 10; i++) {
    time += 998;
    assert.equal(await make().onUpdateAvailable('2.0.14'),false);
  }
  for (let i=0;i<2;i++) {
    time += 60000;
    assert.equal(await make().onUpdateAvailable('2.0.14'),true);
  }
  time += 60000;
  assert.equal(await make().onUpdateAvailable('2.0.14'),false);
  assert.equal(reloads,3);
  assert.equal(await make('2.0.14').checkAndInstall(),'no_update');
  const newSession = make();
  await newSession.resetSession();
  assert.equal(await newSession.onUpdateAvailable('2.0.14'),true);
});
