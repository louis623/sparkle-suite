import { vi } from 'vitest'
export const repId = '10000000-0000-4000-8000-000000000001'
export const listingId = '20000000-0000-4000-8000-000000000001'
export const swapId = '30000000-0000-4000-8000-000000000001'
export function dancer(overrides: Record<string, any> = {}) {
 return { id: listingId, rep_id: repId, status: 'available', listing_source: 'catalog', quantity_available: 1,
 rep_notes: null, trade_preferences: null, ring_size:'7', listing_photo_url:null, uses_canonical_photo:true,
 listed_at:'2026-11-14T12:00:00Z',created_at:'2026-11-14T12:00:00Z',deleted_at:null,
 design:{ id:'40000000-0000-4000-8000-000000000001',item_number:'RG100',design_name:'Sapphire',type_prefix:'RG',material:'Silver',main_stone:'Sapphire',canonical_photo_url:'/catalog.jpg',collection:{name:'Birthday'} }, ...overrides }
}
export function dbFixture(tables: Record<string, any[]> = {}) {
 const calls: any[] = []
 const path = (row: any,key: string) => key.split('.').reduce((r,k)=>r?.[k],row)
 const client: any = {
 from(table: string) {
  const call: any = {table, filters:[],select:'',operation:'read'}; calls.push(call)
  const q: any = {
   select(columns: string, options?: any) {call.select=columns;call.head=options?.head;return q},
   eq(k:string,v:any){call.filters.push(['eq',k,v]);return q},
   neq(k:string,v:any){call.filters.push(['neq',k,v]);return q},
   in(k:string,v:any){call.filters.push(['in',k,v]);return q},
   lt(k:string,v:any){call.filters.push(['lt',k,v]);return q},
   gt(k:string,v:any){call.filters.push(['gt',k,v]);return q},
   or(value:string){call.or=value;return q},
   order(k:string,opts:any={}){call.order=[k,opts.ascending!==false];return q},
   range(a:number,b:number){call.range=[a,b];return q},
   limit(n:number){call.limit=n;return q},
   update(value:any){call.operation='update';call.patch=value;return q},
   delete(){call.operation='delete';return q},
   maybeSingle(){call.single=true;return q},single(){call.single=true;return q},
   then(resolve:any,reject:any){
    let data=(tables[table]??[]).filter(row=>call.filters.every(([op,k,v]:any[])=>{
     const got=path(row,k);return op==='eq'?got===v:op==='neq'?got!==v:op==='in'?v.includes(got):op==='lt'?got<v:got>v
    }))
    if(call.or?.includes('fulfillment_status'))data=data.filter(row=>row.fulfillment_status!=='completed')
    if(call.order){const[k,asc]=call.order;data=[...data].sort((a,b)=>String(path(a,k)).localeCompare(String(path(b,k)))*(asc?1:-1))}
    if(call.range)data=data.slice(call.range[0],call.range[1]+1)
    if(call.limit)data=data.slice(0,call.limit)
    if(call.operation==='update')data.forEach(row=>Object.assign(row,call.patch))
    if(call.operation==='delete')tables[table]=(tables[table]??[]).filter(row=>!data.includes(row))
    return Promise.resolve({data:call.head?null:call.single?data[0]??null:data,error:null,count:data.length}).then(resolve,reject)
   }
  };return q
 },
 rpc:vi.fn(async()=>({data:null,error:null}))
 };return {client,calls,tables}
}
