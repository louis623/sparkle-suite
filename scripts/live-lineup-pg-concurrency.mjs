#!/usr/bin/env node
// Isolated fixture only. No provider client, TCP connection, schema reset, or cluster lifecycle.
import { spawn } from 'node:child_process'
import { readFileSync, lstatSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const options = new Map()
for (const argument of process.argv.slice(2)) {
  const match = /^(--[a-z-]+)(?:=(.*))?$/.exec(argument)
  if (!match || options.has(match[1])) throw Error('Use unique --name=value arguments.')
  options.set(match[1], match[2] ?? true)
}
for (const key of options.keys()) if (!['--fixture-root','--user','--migration','--reviewer-migration','--dry-run'].includes(key)) throw Error('Unsupported argument.')
const root = options.get('--fixture-root'), user = options.get('--user')
assert.equal(typeof root, 'string', '--fixture-root is required')
assert.match(root, /^\/tmp\/sparkle-lineup-pg\.[A-Za-z0-9]{6,32}$/)
assert.equal(typeof user, 'string', '--user is required')
assert.match(user, /^[a-z_][a-z0-9_]{0,62}$/)
const socket = `${root}/socket`, database = 'sparkle_lineup_concurrency', port = '55439'
const migration = resolve(options.get('--migration') ?? 'supabase/migrations/20260910000100_live_lineup_v2.sql')
const reviewerMigration = resolve(options.get('--reviewer-migration') ?? 'supabase/migrations/20260910000200_reviewer_live_lineup_reset.sql')
assert.match(migration.replaceAll('\\','/'), /\/supabase\/migrations\/20260910000100_live_lineup_v2\.sql$/)
assert.match(reviewerMigration.replaceAll('\\','/'), /\/supabase\/migrations\/20260910000200_reviewer_live_lineup_reset\.sql$/)
const sql = readFileSync(migration, 'utf8')
const reviewerSql = readFileSync(reviewerMigration, 'utf8')
assert.ok(sql.includes('create function public.live_lineup_compare_swap(') && sql.includes('create function public.live_lineup_revoke_publisher(')
  && sql.includes('pg_advisory_xact_lock(hashtextextended(p_rep_id::text, 734918))'))
assert.ok(reviewerSql.includes('pg_advisory_xact_lock(hashtextextended(p_rep_id::text, 734918))'))
const digest = createHash('sha256').update(sql).digest('hex')
const reviewerDigest = createHash('sha256').update(reviewerSql).digest('hex')
const cases = ['initial CAS contenders', 'owner/publisher stale CAS, both winners', 'revoke/heartbeat, both lock orders',
  'concurrent publisher issuance cap', 'publisher issue time captured after tenant lock',
  'credential expiry while waiting', 'claim receipt lease expiry while waiting', 'source-lease expiry observation', 'generation/archive winner and atomic rollback',
  'reviewer reset/publisher issuance, both lock orders']
console.log(JSON.stringify({mode:options.has('--dry-run')?'dry-run':'execute',database,socket,port,migrationSha256:digest,reviewerMigrationSha256:reviewerDigest,cases}))
if (options.has('--dry-run')) {
  console.log('DRY RUN ONLY: no psql subprocess or database connection was created.')
  process.exit(0)
}
assert.equal(process.platform, 'linux', 'Execution is Linux Codespace fixture only.')
for (const path of [root, `${root}/data`, socket]) {
  const stat = lstatSync(path)
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid(), 'Fixture directories must be owned, nonsymlink directories.')
  assert.equal(realpathSync(path), path)
}
assert.ok(lstatSync(`${socket}/.s.PGSQL.${port}`).isSocket(), 'Explicit fixture Unix socket is missing.')
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('PG')))
Object.assign(env, {PGCONNECT_TIMEOUT:'3',PGPASSFILE:'/dev/null',PGSERVICEFILE:'/dev/null',PGSYSCONFDIR:root,LC_ALL:'C'})
let marker = 0
const sessions = []
class Session {
  constructor(name) {
    this.name=name; this.lines=[]; this.pending=null; this.closed=false; this.errors=''
    this.child=spawn('/usr/bin/psql',['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-h',socket,'-p',port,'-U',user,'-d',database],
      {env:{...env,PGAPPNAME:`sparkle_fixture_${name}`},stdio:['pipe','pipe','pipe']})
    sessions.push(this)
    createInterface({input:this.child.stdout}).on('line',line=>{
      if (this.pending && line===this.pending.tag) {
        const p=this.pending;this.pending=null;clearTimeout(p.timer);p.resolve(this.lines.splice(0))
      } else this.lines.push(line)
    })
    this.child.stderr.on('data',data=>{this.errors=(this.errors+data).slice(-2000)})
    const failed=()=>{this.closed=true;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error(`Fixture psql ${name} failed: ${this.errors}`));this.pending=null}}
    this.child.on('error',failed);this.child.on('exit',failed)
  }
  query(statement) {
    assert.ok(!this.closed && !this.pending, `Session ${this.name} is not available`)
    const tag=`fixture_done_${++marker}`
    return new Promise((resolvePromise,reject)=>{
      const timer=setTimeout(()=>{this.child.kill();reject(Error(`Fixture ${this.name} timed out; no result assumed`))},15000)
      this.pending={tag,timer,resolve:resolvePromise,reject}
      this.child.stdin.write(`${statement}\nSELECT '${tag}';\n`)
    })
  }
  stop() {this.child.stdin.end();if(!this.closed)this.child.kill()}
}
const quote = value => `'${String(value).replaceAll("'","''")}'`
const json = value => `${quote(JSON.stringify(value))}::jsonb`
const sleep = ms => new Promise(done=>setTimeout(done,ms))
const observer = new Session('observer')
let serial=0
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const cas = (f,expected,state,publisher=false) => `public.live_lineup_compare_swap(${quote(f.rep)},${expected},${json(state)},${publisher?quote(f.token):'null'})`
const countCas = (...args) => `SELECT count(*) FROM ${cas(...args)};`
const tokenHash = value => createHash('sha256').update(value).digest('hex')
const issuePublisher = (rep, token, label) => `public.live_lineup_issue_publisher(${quote(rep)},${quote(token)},${quote(tokenHash(token))},${quote(label)})`
const unauthorized = call => `DO $fixture$ BEGIN PERFORM * FROM ${call}; RAISE EXCEPTION 'Expected authorization rejection'; EXCEPTION WHEN SQLSTATE '28000' THEN NULL; END $fixture$;`
async function connection(name) {
  const s=new Session(name)
  s.pid=Number((await s.query("SET statement_timeout='12s'; SET idle_in_transaction_session_timeout='15s'; SELECT pg_backend_pid();"))[0])
  assert.ok(Number.isInteger(s.pid));return s
}
async function blocked(waiter,holder) {
  const deadline=Date.now()+6000
  while(Date.now()<deadline) {
    const value=await observer.query(`SELECT ${holder.pid}=ANY(pg_blocking_pids(${waiter.pid})) AND wait_event_type='Lock' FROM pg_stat_activity WHERE pid=${waiter.pid};`)
    if(value[0]==='t')return
    await sleep(25)
  }
  throw Error(`No observed lock barrier: ${waiter.name} behind ${holder.name}`)
}
async function seed({initial=false,shortToken=false,shortLease=false,generation=0}={}) {
  const n=++serial,rep=uuid(n),token=uuid(n+100),now=Date.now(),iso=t=>new Date(t).toISOString()
  const state={schemaVersion:2,revision:1,show:generation?{generation,partyIds:['p1'],excludedPartyIds:[],carryEntryIds:[],startedAt:iso(now)}:null,
    entries:[{id:'p1:a',name:'Synthetic A',orderedAt:now},{id:'p1:b',name:'Synthetic B',orderedAt:now}],order:['p1:a','p1:b'],held:[],revealedIds:[],undo:null,
    publisher:{id:token,claimId:uuid(n+200),epoch:1,lastSequence:0,leaseExpiresAt:iso(now+(shortLease?3000:90000))},
    lastReceivedAt:iso(now),lastReadyAt:iso(now),lastChangedAt:iso(now),parserState:'ready',sourceVersion:'fixture'}
  const f={rep,token,state}
  await observer.query(`INSERT INTO reps(id) VALUES(${quote(rep)}); INSERT INTO live_lineup_publisher_tokens(id,rep_id,token_hash,label,expires_at)
    VALUES(${quote(token)},${quote(rep)},${quote(createHash('sha256').update(rep).digest('hex'))},'Synthetic fixture',clock_timestamp()+interval '${shortToken?'3 seconds':'1 hour'}');
    ${initial?'':`INSERT INTO live_lineup_states VALUES(${quote(rep)},1,${json(state)},clock_timestamp());`}`)
  return f
}
const next = (f,tag) => ({...f.state,revision:2,sourceVersion:tag})
async function saved(f) {return JSON.parse((await observer.query(`SELECT state::text FROM live_lineup_states WHERE rep_id=${quote(f.rep)};`))[0])}
async function deadlinePassed(f,field) {
  // Clock wait is limited to the expiry case, after proving the other session blocks.
  const deadline=Date.now()+6000
  while(Date.now()<deadline) {
    const expression=field==='token'?`(SELECT expires_at FROM live_lineup_publisher_tokens WHERE id=${quote(f.token)})`
      : `${quote(f.state.publisher.leaseExpiresAt)}::timestamptz`
    if((await observer.query(`SELECT clock_timestamp()>${expression};`))[0]==='t')return
    await sleep(25)
  }
  throw Error('Fixture expiry deadline was not reached')
}
let sourceLeaseObservation
try {
  // These checks precede EVERY mutation, including role creation. Refuse a hosted,
  // existing application, non-superuser, TCP-enabled, or wrong data-directory cluster.
  const identity=JSON.parse((await observer.query(`SELECT json_build_object('db',current_database(),'user',current_user,
    'socket',inet_server_addr() IS NULL,'listen',current_setting('listen_addresses'),'data',current_setting('data_directory'),
    'super',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
    'relations',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'))::text;`))[0])
  assert.deepEqual(identity,{db:database,user,socket:true,listen:'',data:`${root}/data`,super:true,relations:0})
  assert.equal((await observer.query("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');"))[0],'0','Fixture roles already exist; use a fresh isolated cluster.')
  await observer.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb);
    CREATE TABLE public.reps(id uuid PRIMARY KEY,auth_user_id uuid,email text,account_classification text,finder_directory_visible boolean,custom_domain text,public_site_slug text);
    CREATE TABLE public.subscriptions(rep_id uuid PRIMARY KEY,stripe_livemode boolean,monthly_amount numeric,pricing_tier text,stripe_subscription_id text,stripe_customer_id text);
    CREATE TABLE public.live_queue(rep_id uuid PRIMARY KEY,sync_code text,queue jsonb,last_updated timestamptz);
    ${sql} ${reviewerSql}`)
  const a=await connection('a'),b=await connection('b')
  await a.query('SET ROLE service_role;');await b.query('SET ROLE service_role;')
  async function run(name,action) {await action();console.log(`PASS ${name}`)}
  await run('initial CAS: two live sessions, one committed row',async()=>{
    const f=await seed({initial:true})
    await a.query('BEGIN;');assert.deepEqual(await a.query(countCas(f,0,f.state)),['1'])
    const pending=b.query(countCas(f,0,{...f.state,sourceVersion:'loser'}));pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');assert.deepEqual(await pending,['0']);assert.equal((await saved(f)).sourceVersion,'fixture')
  })
  for(const ownerFirst of [true,false]) await run(`owner/publisher CAS: ${ownerFirst?'owner':'publisher'} wins`,async()=>{
    const f=await seed(),winner=next(f,'winner'),loser=next(f,'loser')
    await a.query('BEGIN;');assert.deepEqual(await a.query(countCas(f,1,winner,!ownerFirst)),['1'])
    const pending=b.query(countCas(f,1,loser,ownerFirst));pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');assert.deepEqual(await pending,['0']);assert.equal((await saved(f)).sourceVersion,'winner')
  })
  for(const revokeFirst of [true,false]) await run(`revoke/heartbeat: ${revokeFirst?'revoke':'heartbeat'} obtains locks first`,async()=>{
    const f=await seed(),revoke=`SELECT invalidated FROM live_lineup_revoke_publisher(${quote(f.rep)},${quote(f.token)});`
    await a.query('BEGIN;')
    if(revokeFirst)assert.deepEqual(await a.query(revoke),['t'])
    else assert.deepEqual(await a.query(countCas(f,1,next(f,'heartbeat'),true)),['1'])
    const pending=b.query(revokeFirst?unauthorized(cas(f,1,next(f,'late'),true)):revoke);pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');await pending
    const state=await saved(f);assert.equal(state.revision,revokeFirst?2:3);assert.equal(state.lastReceivedAt,null)
    assert.equal(state.publisher.lastSequence,-1);assert.deepEqual(state.order,f.state.order)
    assert.equal((await observer.query(`SELECT revoked_at IS NOT NULL FROM live_lineup_publisher_tokens WHERE id=${quote(f.token)};`))[0],'t')
  })
  await run('publisher issuance cap: concurrent ninth credential is rejected',async()=>{
    const rep=uuid(++serial),tokens=Array.from({length:9},(_,index)=>uuid(500+serial*10+index))
    await observer.query(`INSERT INTO reps(id) VALUES(${quote(rep)}); INSERT INTO live_lineup_publisher_tokens(id,rep_id,token_hash,label,expires_at)
      VALUES ${tokens.slice(0,7).map((token,index)=>`(${quote(token)},${quote(rep)},${quote(tokenHash(token))},${quote(`Existing ${index+1}`)},clock_timestamp()+interval '1 hour')`).join(',')};`)
    await a.query('BEGIN;')
    assert.deepEqual(await a.query(`SELECT count(*) FROM ${issuePublisher(rep,tokens[7],'Eighth')};`),['1'])
    const pending=b.query(`DO $fixture$ BEGIN PERFORM * FROM ${issuePublisher(rep,tokens[8],'Ninth')}; RAISE EXCEPTION 'Expected publisher cap'; EXCEPTION WHEN SQLSTATE '54000' THEN NULL; END $fixture$;`);pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');await pending
    assert.equal((await observer.query(`SELECT count(*) FROM live_lineup_publisher_tokens WHERE rep_id=${quote(rep)} AND revoked_at IS NULL AND expires_at>clock_timestamp();`))[0],'8')
  })
  await run('publisher issuance time: clock starts only after tenant lock',async()=>{
    const rep=uuid(++serial),token=uuid(800+serial),started=Date.parse((await observer.query('SELECT clock_timestamp();'))[0])
    await observer.query(`INSERT INTO reps(id) VALUES(${quote(rep)});`)
    await a.query(`BEGIN; SELECT pg_advisory_xact_lock(hashtextextended(${quote(rep)},734918));`)
    const pending=b.query(`SELECT created_at FROM ${issuePublisher(rep,token,'Delayed issue')};`);pending.catch(()=>{})
    await blocked(b,a);await sleep(1100);await a.query('COMMIT;')
    const created=Date.parse((await pending)[0])
    assert.ok(created-started>=900,'Issued timestamp was captured before the tenant lock cleared')
    assert.equal((await observer.query(`SELECT extract(epoch from (expires_at-created_at))::bigint FROM live_lineup_publisher_tokens WHERE id=${quote(token)};`))[0],'7776000')
  })
  await run('credential expires behind state lock: source CAS rejected',async()=>{
    const f=await seed({shortToken:true})
    await a.query(`BEGIN; SELECT revision FROM live_lineup_states WHERE rep_id=${quote(f.rep)} FOR UPDATE;`)
    const pending=b.query(unauthorized(cas(f,1,next(f,'late-token'),true)));pending.catch(()=>{})
    await blocked(b,a);await deadlinePassed(f,'token');await a.query('COMMIT;');await pending
    assert.equal((await saved(f)).revision,1)
  })
  await run('claim receipt lease expires behind state lock: no stale receipt',async()=>{
    const f=await seed({shortLease:true})
    await a.query(`BEGIN; SELECT revision FROM live_lineup_states WHERE rep_id=${quote(f.rep)} FOR UPDATE;`)
    const pending=b.query(`SELECT count(*) FROM live_lineup_claim_receipt(${quote(f.rep)},${quote(f.token)},${quote(f.state.publisher.claimId)});`);pending.catch(()=>{})
    await blocked(b,a);await deadlinePassed(f,'lease');await a.query('COMMIT;')
    assert.deepEqual(await pending,['0']);assert.equal((await saved(f)).revision,1)
  })
  await run('source lease expiry probe (observational, not service-path proof)',async()=>{
    const f=await seed({shortLease:true})
    await a.query(`BEGIN; SELECT revision FROM live_lineup_states WHERE rep_id=${quote(f.rep)} FOR UPDATE;`)
    const candidate=next(f,'lease-probe');candidate.publisher={...candidate.publisher,leaseExpiresAt:new Date(Date.now()+90000).toISOString()}
    const pending=b.query(countCas(f,1,candidate,true));pending.catch(()=>{})
    await blocked(b,a);await deadlinePassed(f,'lease');await a.query('COMMIT;')
    const result=await pending;assert.ok(result[0]==='0'||result[0]==='1')
    sourceLeaseObservation=result[0]==='1'?'CAS accepted precomputed source state after prior lease deadline; SQL does not recheck prior lease. Requires service-policy review.':'CAS rejected stale source lease.'
  })
  await run('generation change: winner archives once; concurrent stale writer cannot overwrite',async()=>{
    const f=await seed({generation:1}),candidate=next(f,'new-show');candidate.show={...candidate.show,generation:2}
    await a.query('BEGIN;');assert.deepEqual(await a.query(countCas(f,1,candidate)),['1'])
    const pending=b.query(countCas(f,1,{...candidate,sourceVersion:'loser'}));pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');assert.deepEqual(await pending,['0'])
    const rows=await observer.query(`SELECT generation||':'||revision FROM live_lineup_show_archives WHERE rep_id=${quote(f.rep)};`)
    assert.deepEqual(rows,['1:1']);assert.equal((await saved(f)).show.generation,2)
  })
  await run('archive conflict rolls back complete generation transition',async()=>{
    const f=await seed({generation:1}),candidate=next(f,'must-not-save');candidate.show={...candidate.show,generation:2}
    await observer.query(`INSERT INTO live_lineup_show_archives(rep_id,generation,revision,state) VALUES(${quote(f.rep)},1,1,${json(f.state)});`)
    await a.query(`DO $fixture$ BEGIN PERFORM * FROM ${cas(f,1,candidate)}; RAISE EXCEPTION 'Expected archive conflict'; EXCEPTION WHEN unique_violation THEN NULL; END $fixture$;`)
    assert.deepEqual(await saved(f),f.state)
  })
  async function seedReviewer(email,slug) {
    const rep=uuid(++serial),auth=uuid(900+serial)
    await observer.query(`INSERT INTO auth.users VALUES(${quote(auth)},${quote(email)},'{"reviewer_smoke_scope":"sparkle-suite-reviewer-v1"}');
      INSERT INTO public.reps(id,auth_user_id,email,account_classification,finder_directory_visible,custom_domain,public_site_slug)
        VALUES(${quote(rep)},${quote(auth)},${quote(email)},'demo',false,null,${quote(slug)});
      INSERT INTO public.subscriptions VALUES(${quote(rep)},false,0,'smoke',${quote(`sub_reviewer_smoke_${rep}`)},${quote(`cus_reviewer_smoke_${rep}`)});
      INSERT INTO public.live_queue VALUES(${quote(rep)},'REVIEWER','[]',null);`)
    return {rep,auth,email}
  }
  const resetReviewer = f => `public.reset_reviewer_live_lineup(${quote(f.rep)},${quote(f.auth)},${quote(f.email)})`
  await run('reviewer reset/publisher issuance: issuer obtains tenant lock first',async()=>{
    const f=await seedReviewer('sparkle-reviewer+preview@neonrabbit.net','sparkle-reviewer-preview'),token=uuid(1000+serial)
    await a.query('BEGIN;')
    assert.deepEqual(await a.query(`SELECT count(*) FROM ${issuePublisher(f.rep,token,'Concurrent issue')};`),['1'])
    const pending=b.query(`SELECT deleted_tokens FROM ${resetReviewer(f)};`);pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');assert.deepEqual(await pending,['1'])
    assert.equal((await observer.query(`SELECT count(*) FROM live_lineup_publisher_tokens WHERE rep_id=${quote(f.rep)};`))[0],'0')
  })
  await run('reviewer reset/publisher issuance: reset obtains tenant lock first',async()=>{
    const f=await seedReviewer('sparkle-reviewer+local@neonrabbit.net','sparkle-reviewer-local'),token=uuid(1100+serial)
    await a.query(`BEGIN; SELECT count(*) FROM ${resetReviewer(f)};`)
    const pending=b.query(`SELECT count(*) FROM ${issuePublisher(f.rep,token,'Post-reset issue')};`);pending.catch(()=>{})
    await blocked(b,a);await a.query('COMMIT;');assert.deepEqual(await pending,['1'])
    assert.equal((await observer.query(`SELECT count(*) FROM live_lineup_publisher_tokens WHERE rep_id=${quote(f.rep)} AND id=${quote(token)};`))[0],'1')
  })
  console.log(JSON.stringify({result:'fixture checks passed',migrationSha256:digest,sourceLeaseObservation,
    limitations:'Real multi-session SQL only; no application HTTP/auth/installed extension/provider verification. Fixture database retained; no cleanup performed.'}))
} catch(error) {
  console.error(`FAIL isolated fixture: ${error.message}`);process.exitCode=1
} finally {for(const session of sessions)session.stop()}
