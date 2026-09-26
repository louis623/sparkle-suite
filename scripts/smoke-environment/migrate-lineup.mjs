// Explicit staging-only migration runner. Supply the database password through the environment.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pg from 'pg';
const files=['20260926000100_live_lineup_atomic_observations.sql','20260926000200_ss_live_lineup_audience_matches.sql'];
const host='db.pukemqiwlyqmyytxkdmo.supabase.co';
if(process.env.SPARKLE_ENVIRONMENT!=='smoke'||!process.env.SPARKLE_SMOKE_DB_PASSWORD)throw Error('Explicit Smoke environment and staging password required');
const client=new pg.Client({host,port:5432,database:'postgres',user:'postgres',password:process.env.SPARKLE_SMOKE_DB_PASSWORD,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
try {
 await client.connect();
 const identities=await client.query("select count(*)::int as total,count(*) filter(where email like '%@smoke.example.test' and account_classification='demo')::int as synthetic from reps");
 if(identities.rows[0].total!==3||identities.rows[0].synthetic!==3)throw Error('Staging synthetic identity invariant failed');
 const applied=[];
 await client.query('BEGIN');
 await client.query("set local lock_timeout='5s';set local statement_timeout='30s'");
 for(const file of files){
   const version=file.split('_')[0], sql=readFileSync(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
   const prior=await client.query('select version from supabase_migrations.schema_migrations where version=$1',[version]);
   if(prior.rowCount)throw Error('Migration already applied; inspect before rerunning '+version);
   const sha256=createHash('sha256').update(sql).digest('hex');
   if(process.argv.includes('--apply')){await client.query(sql);await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[version,file.replace(version+'_','').replace(/\.sql$/,''),[sql]]);}
   applied.push({file,sha256});
 }
 await client.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({host,mode:process.argv.includes('--apply')?'applied':'dry-run',migrations:applied}));
}catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Smoke migration failed:',error.code??error.message);process.exitCode=1;}finally{await client.end();}
