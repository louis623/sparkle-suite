import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { createChatDatabase } from './fixtures/sql-client'
import { prepareNicNacRequest, sendNicNacParts } from '@/lib/nic-nac/client-send'

const state = vi.hoisted(() => ({ client: null as any }))
vi.mock('@/lib/nic-nac/auth', () => ({ AuthError: class extends Error {}, getPaidNicNacContext: async () => ({repId:'synthetic-rep',rep:{auth_user_id:'synthetic-user'},supabase:state.client}) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => state.client }))
vi.mock('@/lib/nic-nac/run-telemetry', () => ({ logNicNacRun: async () => {}, normalizeRunUsage: () => ({}) }))
vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({logIncident: async()=>{},logToolExecution:async()=>{}}))
import { POST } from '@/app/api/nic-nac/route'

describe('composer sends through SDK, real POST and PostgreSQL persistence', () => {
  let db: Awaited<ReturnType<typeof createChatDatabase>>
  beforeAll(async()=>{db=await createChatDatabase();state.client=db.client},60000)
  beforeEach(async()=>{await db.sql.exec('truncate nic_nac_conversations')})
  afterAll(async()=>{await db.sql.close()})
  function chat(fetcher: typeof fetch) {
    return new Chat<UIMessage>({transport:new DefaultChatTransport({api:'http://local.test/api/nic-nac',fetch:fetcher,
      prepareSendMessagesRequest: args=>({body:prepareNicNacRequest({...args,conversationId:'synthetic-chat',mode:'workspace'})}),
    })})
  }
  it.each([false,true])('sends a new message with attachments=%s and stores its stable ID',async(withPhoto)=>{
    const api=vi.fn(async(url:any,init:any)=>POST(new Request(url,init)))
    const sdk=chat(api as typeof fetch), onFailure=vi.fn()
    const parts:UIMessage['parts']=[{type:'text',text:'Write a grocery list'}]
    if(withPhoto)parts.push({type:'file',mediaType:'image/png',url:'data:image/png;base64,AA==',filename:'photo.png'})
    await sendNicNacParts({sendMessage:sdk.sendMessage,id:'client-new',parts,onFailure})
    expect(onFailure).not.toHaveBeenCalled();expect(sdk.error).toBeUndefined();expect(api).toHaveBeenCalledTimes(1)
    expect(JSON.parse(api.mock.calls[0][1].body).submittedMessageId).toBe('client-new')
    const rows=await db.sql.query("select * from nic_nac_conversations where role='user'")
    expect(rows.rows).toHaveLength(1);expect(rows.rows[0].message_id).toBe('client-new');expect(rows.rows[0].parts).toEqual(parts)
    expect(sdk.messages.at(-1)?.role).toBe('assistant')
  })
  it('retries a failed transport with the same ID, without a duplicate user row',async()=>{
    let fail=true
    const api=vi.fn(async(url:any,init:any)=>{
      const response=await POST(new Request(url,init))
      if(fail){fail=false;throw new Error('Lost response after server commit')}
      return response
    })
    const sdk=chat(api as typeof fetch),onFailure=vi.fn(),parts:UIMessage['parts']=[{type:'text',text:'Write a grocery list'}]
    await sendNicNacParts({sendMessage:sdk.sendMessage,id:'retry-id',parts,onFailure})
    expect(sdk.status).toBe('error')
    sdk.clearError()
    await sendNicNacParts({sendMessage:sdk.sendMessage,id:'retry-id',parts,replace:true,onFailure})
    expect(sdk.error).toBeUndefined();expect(api).toHaveBeenCalledTimes(2)
    expect((await db.sql.query("select * from nic_nac_conversations where role='user'")).rows).toHaveLength(1)
  })
  it('reports a pre-transport SDK error with the exact retryable submission',async()=>{
    const api=vi.fn(),sdk=chat(api),onFailure=vi.fn(),parts:UIMessage['parts']=[{type:'text',text:'hello'}]
    await sendNicNacParts({sendMessage:sdk.sendMessage,id:'missing-id',parts,replace:true,onFailure})
    expect(api).not.toHaveBeenCalled();expect(onFailure).toHaveBeenCalledWith({id:'missing-id',role:'user',parts})
  })
  it('does not mark automatic assistant continuation as a new user submission',()=>{
    expect(prepareNicNacRequest({conversationId:'c',mode:'workspace',trigger:'submit-message',messages:[
      {id:'u',role:'user',parts:[{type:'text',text:'yes'}]}, {id:'a',role:'assistant',parts:[]},
    ]})).not.toHaveProperty('submittedMessageId')
  })
  it('claims only one reply when identical submissions arrive concurrently',async()=>{
    const makeRequest=()=>new Request('http://local.test/api/nic-nac',{method:'POST',body:JSON.stringify({conversationId:'synthetic-chat',mode:'workspace',submittedMessageId:'race',messages:[{id:'race',role:'user',parts:[{type:'text',text:'Write a grocery list'}]}]})})
    const responses=await Promise.all(Array.from({length:6},()=>POST(makeRequest())))
    expect(responses.some(response=>response.status===200)).toBe(true)
    expect(responses.every(response=>[200,409].includes(response.status))).toBe(true)
    const rows=(await db.sql.query('select * from nic_nac_conversations')).rows
    expect(rows.filter(row=>row.role==='user')).toHaveLength(1)
    expect(rows.filter(row=>row.role==='assistant')).toHaveLength(1)
    expect(rows.find(row=>row.role==='assistant')?.status).toBe('complete')
  })

})
