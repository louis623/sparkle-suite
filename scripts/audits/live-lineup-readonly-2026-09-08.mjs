// Read-only audit. Never sends queue updates; never prints keys or customer names.
import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(base!=='https://bqhzfkgkjyuhlsozpylf.supabase.co') throw new Error('Unexpected project');
const admin=createClient(base,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const reps=await admin.from('reps').select('id,public_site_slug').in('public_site_slug',['brittwithbling','milehighfizz','goforthebling','theblingkitchen','brisglowtique']);
if(reps.error)throw new Error(reps.error.message);
const queues=await admin.from('live_queue').select('id,rep_id,sync_code,queue,last_updated,created_at');
if(queues.error)throw new Error(queues.error.message);
const counts={};for(const q of queues.data)counts[q.rep_id]=(counts[q.rep_id]||0)+1;
const duplicateIds=Object.keys(counts).filter(id=>counts[id]>1);
const duplicateReps=duplicateIds.length?await admin.from('reps').select('id,public_site_slug').in('id',duplicateIds):{data:[],error:null};
if(duplicateReps.error)throw new Error(duplicateReps.error.message);
console.log(JSON.stringify({duplicateGroups:duplicateIds.map(id=>({rowCount:counts[id],repExists:duplicateReps.data.some(r=>r.id===id),publicSlug:duplicateReps.data.find(r=>r.id===id)?.public_site_slug??null,nonemptyRows:queues.data.filter(q=>q.rep_id===id&&Array.isArray(q.queue)&&q.queue.length>0).length}))}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),rowCount:queues.data.length,duplicateRepGroups:Object.values(counts).filter(n=>n>1).length,customers:reps.data.map(rep=>({slug:rep.public_site_slug,rows:queues.data.filter(q=>q.rep_id===rep.id).map(q=>({id:q.id,queueLength:Array.isArray(q.queue)?q.queue.length:null,lastUpdated:q.last_updated,ageSeconds:q.last_updated?Math.floor((Date.now()-Date.parse(q.last_updated))/1000):null,grandfatheredBritt:q.sync_code==='BWB-5819',unusedBritt:q.sync_code==='BWB-6538'}))}))},null,2));
const britt=reps.data.find(r=>r.public_site_slug==='brittwithbling');
const anon=createClient(base,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const exposure=await anon.from('live_queue').select('id,sync_code').eq('rep_id',britt.id);
console.log(JSON.stringify({anonymousRead:{status:exposure.status,rows:exposure.data?.length??0,syncCodeExposed:Boolean(exposure.data?.[0]?.sync_code),error:exposure.error?.code??null}}));
for(const slug of ['brittwithbling','goforthebling']){
 const response=await fetch('https://www.yoursparklesuite.com/api/amethyst/live-lineup?publicSiteSlug='+slug);
 const body=await response.json();
 console.log(JSON.stringify({publicLineup:slug,status:response.status,cache:response.headers.get('cache-control'),state:body.liveQueueState,lastUpdated:body.liveQueueLastUpdated,entryCount:body.liveQueueEntries?.length,error:body.error}));
}
