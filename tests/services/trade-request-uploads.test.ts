import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

vi.mock('server-only', () => ({}))

import {
  assertTradeUploadInput,
  confirmTradeUpload,
  discardTradeUpload,
  createTradeUploadTicket,
  TRADE_UPLOAD_MAX_BYTES,
} from '@/lib/services/trade-request-uploads'

const listingId = '8ad67c12-9840-47be-8398-c9d1445fce15'
const repId = 'fb2e6061-54e5-4919-9d05-7d13b156c265'
const submissionId = 'c09ca847-9c84-4539-8ff2-9ff49d5f718b'
const uploadId = '20eb9934-7601-40c3-ae1e-adcb42fed4d2'
const ipHash = 'a'.repeat(64)

describe('private trade request uploads', () => {
  it('accepts common phone formats and a 5.12 MiB original; rejects large and unsupported files', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']) {
      expect(assertTradeUploadInput({ listingId, submissionId, contentType, byteSize: 5_363_712 }).contentType).toBe(contentType)
    }
    expect(assertTradeUploadInput({ listingId, submissionId, contentType: 'image/jpeg', byteSize: TRADE_UPLOAD_MAX_BYTES }).byteSize).toBe(25 * 1024 * 1024)
    expect(() => assertTradeUploadInput({ listingId, submissionId, contentType: 'image/png', byteSize: TRADE_UPLOAD_MAX_BYTES + 1 }))
      .toThrowError(expect.objectContaining({ code: 'TRADE_UPLOAD_TOO_LARGE' }))
    expect(() => assertTradeUploadInput({ listingId, submissionId, contentType: 'image/svg+xml', byteSize: 123 }))
      .toThrowError(expect.objectContaining({ code: 'TRADE_UPLOAD_UNSUPPORTED_TYPE' }))
  })

  it('delegates admission before signing, records signing time, and returns the actual ticket creation/deadline', async () => {
    const created = '2026-11-13T10:00:00.000Z'
    const admin = {rpc:vi.fn().mockResolvedValue({data:{raw_path:'private/raw',created_at:created}}),
      from:()=>({update:()=>({eq:()=>({is:()=>({select:()=>({maybeSingle:async()=>({data:{id:uploadId}})})})})})}),
      storage:{from:()=>({createSignedUploadUrl:async()=>({data:{signedUrl:'https://storage.example.test/private'}})})}}
    const result=await createTradeUploadTicket(admin as never,{listingId,submissionId,contentType:'image/jpeg',byteSize:16,ipHash,expectedRepId:repId})
    expect(result).toMatchObject({createdAt:created,expiresAt:'2026-11-13T12:00:00.000Z',uploadUrl:'https://storage.example.test/private'})
    expect(admin.rpc).toHaveBeenCalledWith('admit_swap_upload',expect.objectContaining({p_ip_hash:ipHash,p_expected_rep:repId,p_listing_id:listingId,p_submission_id:submissionId}))
  })
  it('decodes, normalizes, strips EXIF, and stores a rep-viewable private JPEG', async () => {
    const source = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#ff4499' } })
      .jpeg().withMetadata({ orientation: 1 }).toBuffer()
    const readyAt = new Date().toISOString()
    const ticket = {
      id: uploadId, listing_id: listingId, rep_id: repId,
      submission_id: submissionId, raw_path: `staging/${repId}/${uploadId}.jpg`,
      ready_path: null, declared_content_type: 'image/jpeg', declared_size_bytes: source.length,
      ready_size_bytes: null, created_at: readyAt, ready_at: null, consumed_request_id: null,
    }
    const uploaded = vi.fn().mockResolvedValue({ error: null })
    const removed = vi.fn().mockResolvedValue({ error: null })
    const updated = vi.fn().mockResolvedValue({error:null,data:{id:uploadId}})
    const guard = {eq:()=>guard,is:()=>guard,gt:()=>guard,select:()=>guard,maybeSingle:updated}
    const admin = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ticket, error: null }) }) }),
        update: () => guard,
      }),
      storage: { from: () => ({
        download: async () => ({ data: new Blob([new Uint8Array(source)]), error: null }),
        upload: uploaded, remove: removed,
      }) },
    }
    const result = await confirmTradeUpload(admin as never, { uploadId, listingId, submissionId, expectedRepId: repId })
    expect(result.ready).toBe(true)
    expect(new Date(result.expiresAt).getTime() - Date.now()).toBeGreaterThan(6.9 * 86400_000)
    const [path, output, options] = uploaded.mock.calls[0] as [string, Buffer, { contentType: string }]
    expect(path).toBe(`${repId}/trade-request-uploads/${uploadId}.jpg`)
    expect(options.contentType).toBe('image/jpeg')
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(1000)
    expect(metadata.exif).toBeUndefined()
    const [smallPath,smallOutput] = uploaded.mock.calls[1] as [string, Buffer]
    expect(smallPath).toBe(`${repId}/trade-request-uploads/${uploadId}.800.jpg`)
    expect((await sharp(smallOutput).metadata()).width).toBe(800)
    expect(updated).toHaveBeenCalled()
    updated.mockResolvedValueOnce({data:null,error:null})
    await expect(confirmTradeUpload(admin as never,{uploadId,listingId,submissionId})).rejects.toMatchObject({code:'TRADE_UPLOAD_NOT_READY'})
    expect(removed).toHaveBeenCalledWith([ticket.raw_path])
  })

  it('rejects a fake image before creating a rep-viewable object', async () => {
    const bad = new TextEncoder().encode('<svg><script>alert(1)</script></svg>')
    const uploaded = vi.fn()
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id: uploadId, listing_id: listingId, rep_id: repId, submission_id: submissionId,
        raw_path: `staging/${repId}/${uploadId}.png`, ready_path: null,
        declared_content_type: 'image/png', declared_size_bytes: bad.length,
        ready_size_bytes: null, created_at: new Date().toISOString(), ready_at: null,
        consumed_request_id: null,
      }, error: null }) }) }) }),
      storage: { from: () => ({ download: async () => ({ data: new Blob([bad]), error: null }), upload: uploaded }) },
    }
    await expect(confirmTradeUpload(admin as never, { uploadId, listingId, submissionId }))
      .rejects.toMatchObject({ code: 'TRADE_UPLOAD_UNREADABLE_IMAGE', statusCode: 415 })
    expect(uploaded).not.toHaveBeenCalled()
  })

  it('rejects cross-rep or cross-submission ticket confirmation before storage access', async () => {
    const storage = vi.fn()
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id: uploadId, listing_id: listingId, rep_id: repId, submission_id: submissionId,
        created_at: new Date().toISOString(), consumed_request_id: null,
      }, error: null }) }) }) }),
      storage: { from: storage },
    }
    await expect(confirmTradeUpload(admin as never, { uploadId, listingId, submissionId, expectedRepId: 'b97aa3f0-d99c-42b4-b0b9-839a0339422b' }))
      .rejects.toMatchObject({ code: 'TRADE_UPLOAD_NOT_FOUND' })
    expect(storage).not.toHaveBeenCalled()
  })

  it('returns a legacy full-only confirmation without demanding a thumbnail',async()=>{
    const admin={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:uploadId,listing_id:listingId,
      submission_id:submissionId,created_at:new Date().toISOString(),ready_at:new Date().toISOString(),ready_size_bytes:100,
      ready_path:'legacy.jpg',rendition_version:1}})})})}),storage:{from:vi.fn()}}
    expect((await confirmTradeUpload(admin as never,{uploadId,listingId,submissionId})).ready).toBe(true)
    expect(admin.storage.from).not.toHaveBeenCalled()
  })
  it('discards only paths returned by the server claim, and a consumed ticket wins before any removal',async()=>{
    const raw = 'staging/'+repId+'/'+uploadId+'.png'
    const remove = vi.fn().mockResolvedValue({error:null})
    const rpc = vi.fn().mockResolvedValueOnce({data:{id:uploadId,rep_id:repId,raw_path:raw}})
      .mockResolvedValueOnce({error:{message:'TRADE_UPLOAD_ALREADY_USED'}})
    const db = {rpc,storage:{from:()=>({remove})}}
    const identity = {listingId,submissionId,uploadId,expectedRepId:repId}
    expect(await discardTradeUpload(db as never,identity)).toEqual({discarded:true})
    expect(remove).toHaveBeenCalledWith([raw,repId+'/trade-request-uploads/'+uploadId+'.jpg',repId+'/trade-request-uploads/'+uploadId+'.800.jpg'])
    await expect(discardTradeUpload(db as never,identity)).rejects.toMatchObject({code:'TRADE_UPLOAD_ALREADY_USED'})
    expect(remove).toHaveBeenCalledTimes(1)
  })
  it('enforces 8, 40, 200, conservative byte reservations and run-scoped tombstone sweeps in PostgreSQL',async()=>{
    const db=new PGlite()
    try {
      await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema storage; create table storage.objects(id uuid,bucket_id text,name text,created_at timestamptz);
        create table public.reps(id uuid primary key);
        create table public.trade_listings(id uuid primary key, rep_id uuid, status text, quantity_available integer);
        create table public.trade_requests(id uuid primary key,reveal_screenshot_path text);
        create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      `)
      const base=readFileSync('supabase/migrations/20260923200000_trade_request_direct_uploads.sql','utf8')
      await db.exec(base.slice(base.indexOf('create table if not exists public.trade_request_upload_tickets'),base.indexOf('create or replace function')))
      await db.exec(readFileSync('supabase/migrations/20261113155801_swap_upload_lifecycle.sql','utf8'))
      await db.query('insert into reps values ($1)',[repId])
      await db.query("insert into trade_listings values ($1,$2,'available',9)",[listingId,repId])
      const admit=async(sub:string,hash=ipHash)=>{
        const id=randomUUID()
        const {rows}=await db.query<{v:{code?:string,raw_path?:string}}>('select admit_swap_upload($1,$2,$3,$4,$5,$6,$7) v',
          [id,listingId,sub,repId,hash,'image/jpeg',32])
        return {...rows[0].v,id}
      }
      const first=await admit(submissionId)
      expect(first.raw_path).toContain(first.id)
      for(let i=1;i<8;i++) expect((await admit(submissionId)).code).toBeUndefined()
      expect((await admit(submissionId)).code).toBe('TRADE_UPLOAD_SUBMISSION_LIMIT')
      for(let i=8;i<40;i++) await admit(randomUUID())
      expect((await admit(randomUUID())).code).toBe('TRADE_UPLOAD_PENDING_LIMIT')
      await db.query("update trade_request_upload_tickets set ready_path=rep_id||'/ready.jpg',ready_at=now(),ready_size_bytes=2,thumb_path=rep_id||'/thumb.jpg' where id=$1",[first.id])
      await db.query('select discard_swap_upload($1,$2,$3,$4)',[first.id,listingId,submissionId,repId])
      const held=await db.query<{raw_final:boolean,measured_bytes:number}>('select raw_final,measured_bytes from trade_upload_ledger where id=$1',[first.id])
      expect(held.rows[0]).toEqual({raw_final:false,measured_bytes:32})
      expect((await admit(randomUUID())).code).toBeUndefined()
      const run=randomUUID(),lease=randomUUID()
      expect((await db.query('select * from claim_swap_upload_sweep($1,$2,10)',[run,lease])).rows).toHaveLength(0)
      await db.query('insert into trade_swap_review_listings values($1,$2,$3)',[listingId,run,repId])
      expect((await db.query('select id from claim_swap_upload_sweep($1,$2,10)',[run,lease])).rows).toEqual([{id:first.id}])
      await db.query('select finish_swap_upload_sweep($1,$2)',[first.id,lease])
      expect((await db.query('select raw_final from trade_upload_ledger where id=$1',[first.id])).rows).toEqual([{raw_final:false}])
      await db.query("update trade_upload_ledger set signed_until=now()-interval '5 minutes',next_sweep=now()-interval '1 minute' where id=$1",[first.id])
      const finalLease=randomUUID()
      expect((await db.query('select id from claim_swap_upload_sweep($1,$2,10)',[run,finalLease])).rows).toEqual([{id:first.id}])
      await db.query('select finish_swap_upload_sweep($1,$2)',[first.id,finalLease])
      expect((await db.query('select raw_final,measured_bytes from trade_upload_ledger where id=$1',[first.id])).rows).toEqual([{raw_final:true,measured_bytes:32}])
      // Seed the independently counted issued/consumed ledger without creating reservations in another test.
      await db.query(`insert into trade_upload_ledger(id,listing_id,rep_id,submission_id,ip_hash,issued_at,signed_until,raw_path,consumed,raw_final,measured_bytes,next_sweep)
        select gen_random_uuid(),$1,$2,gen_random_uuid(),$3,now(),now(),'synthetic',true,true,1,now() from generate_series(1,200)`,[listingId,repId,'b'.repeat(64)])
      expect((await admit(randomUUID(),'b'.repeat(64))).code).toBe('TRADE_UPLOAD_TOTAL_LIMIT')
      await db.query(`insert into trade_upload_ledger(id,listing_id,rep_id,submission_id,ip_hash,issued_at,signed_until,raw_path,discarded,measured_bytes,next_sweep)
        select gen_random_uuid(),$1,$2,gen_random_uuid(),$3,now(),now()+interval '2 hours','synthetic',true,10,now() from generate_series(1,81)`,[listingId,repId,'c'.repeat(64)])
      expect((await admit(randomUUID(),'c'.repeat(64))).code).toBe('TRADE_UPLOAD_BYTE_LIMIT')
    } finally { await db.close() }
  },30_000)
})
