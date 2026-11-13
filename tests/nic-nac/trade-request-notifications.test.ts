import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import {describe,it,expect,vi} from 'vitest'
import {buildTradeRequestNotificationText,notifyRepOfTradeRequest} from '@/lib/nic-nac/trade-request-notifications'
import {isTradeRequestCardPart} from '@/lib/nic-nac/trade-request-card-parts'
import type {TradeRequestNotificationSummary} from '@/lib/services/types'

const base: TradeRequestNotificationSummary = {requestId:'request-1',repId:'rep-1',customerName:'Jamie',customerDescription:'',
  listing:{id:'listing-1',itemNumber:null,designName:'Moon Ring',collectionName:'Birthday',typePrefix:'RG'}}

describe('rep swap alerts',()=>{
  it.each([
    [{}, 'No photo, no details'],
    [{ customerDescription:'See photo' }, 'See photo'],
    [{ customerDescription:'Blue stones with silver' },'Blue stones with silver'],
    [{offeredFamily:'Birthday'},'No photo. Customer says it is a Birthday'],
    [{revealScreenshot:{objectPath:'private/x',expiresAt:'2099-01-01',contentType:'image/jpeg',sizeBytes:10,uploadedAt:'2026-01-01'}},'Photo attached. Collection and type not given, check the photo'],
  ] as const)('leads with name and requested dancer, then actual offer', (fields,expected)=>{
    const lines=buildTradeRequestNotificationText({...base,...fields}).split('\n\n')
    expect(lines[0]).toBe('Jamie wants Moon Ring')
    expect(lines[1]).toBe(expected)
    expect(lines[2]).toContain('tradeRequest=request-1')
  })
  it('uses one request-scoped transactional RPC with the actual text and a readable card',async()=>{
    const rpc=vi.fn().mockResolvedValue({error:null})
    await notifyRepOfTradeRequest({rpc} as never,base)
    const [name,args]=rpc.mock.calls[0]
    expect(name).toBe('rpc_notify_swap_request')
    expect(args).toMatchObject({p_rep_id:'rep-1',p_request_id:'request-1'})
    expect(isTradeRequestCardPart(args.p_parts[1])).toBe(true)
    expect(JSON.stringify(args.p_parts)).not.toContain('private/x')
  })
  it('rolls back failed alerts and delivers once across lost acknowledgements, competing retries and a new chat', async () => {
    const db = new PGlite()
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261113155611_dance_floor_swap_v5.sql'), 'utf8')
    const notificationSql = migration.match(/create function public\.rpc_notify_swap_request\([\s\S]*?end \$\$;/)?.[0]
    if (!notificationSql) throw new Error('Notification migration function missing')
    const requestId = 'c0000000-0000-4000-8000-000000000001'
    const repId = 'd0000000-0000-4000-8000-000000000001'
    const listingId = 'e0000000-0000-4000-8000-000000000001'
    const summary = { ...base, requestId, repId }
    try {
      await db.exec(`
        create table trade_listings(id uuid primary key, rep_id uuid);
        create table trade_requests(id uuid primary key, listing_id uuid, rep_alerted_at timestamptz);
        create table nic_nac_conversations(id uuid primary key default gen_random_uuid(), rep_id uuid,
          conversation_id uuid, message_id text, role text, parts jsonb not null, status text,
          support_session_id uuid, cleared_at timestamptz, created_at timestamptz default now(),
          constraint offline check(false));
      `)
      await db.exec(notificationSql)
      await db.query('insert into trade_listings values($1,$2)',[listingId,repId])
      await db.query('insert into trade_requests(id,listing_id) values($1,$2)',[requestId,listingId])
      let loseAcknowledgement = false
      const client = {rpc: async (_: string, args: {p_request_id: string; p_rep_id: string; p_parts: unknown}) => {
        await db.query('select rpc_notify_swap_request($1,$2,$3::jsonb)',[args.p_request_id,args.p_rep_id,JSON.stringify(args.p_parts)])
        if (loseAcknowledgement) {
          loseAcknowledgement = false
          throw new Error('Acknowledgement lost after commit')
        }
        return {error:null}
      }}
      const send = () => notifyRepOfTradeRequest(client as never, summary)
      await expect(send()).rejects.toThrow()
      expect((await db.query('select rep_alerted_at from trade_requests')).rows).toEqual([{rep_alerted_at:null}])
      expect((await db.query('select id from nic_nac_conversations')).rows).toHaveLength(0)
      await db.exec('alter table nic_nac_conversations drop constraint offline')
      loseAcknowledgement = true
      const outcomes = await Promise.allSettled([send(),send()])
      expect(outcomes.map(outcome => outcome.status).sort()).toEqual(['fulfilled','rejected'])
      await db.exec('update nic_nac_conversations set cleared_at=now()')
      await db.query("insert into nic_nac_conversations(rep_id,conversation_id,message_id,role,parts) values($1,gen_random_uuid(),'new-chat','user','[]')",[repId])
      await send()
      const messages = await db.query<{parts: Array<{text?:string}>}>("select parts from nic_nac_conversations where role='assistant'")
      expect(messages.rows).toHaveLength(1)
      expect(messages.rows[0].parts[0].text).toBe(buildTradeRequestNotificationText(summary))
      expect((await db.query('select rep_alerted_at is not null as alerted from trade_requests')).rows).toEqual([{alerted:true}])
    } finally {
      await db.close()
    }
  }, 60_000)

  it('propagates a failed transaction so another attempt can deliver',async()=>{
    await expect(notifyRepOfTradeRequest({rpc:async()=>({error:new Error('rollback')})} as never,base)).rejects.toThrow('rollback')
  })
})
