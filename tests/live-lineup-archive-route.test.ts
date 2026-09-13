import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({auth:vi.fn(),support:vi.fn(),admin:vi.fn(),list:vi.fn(),read:vi.fn(),recover:vi.fn()}))
vi.mock('@/lib/nic-nac/auth', () => ({getPaidNicNacContext:mocks.auth,AuthError:class AuthError extends Error {}}))
vi.mock('@/lib/operator-support/request-context', () => ({getOperatorSupportRequestContext:mocks.support}))
vi.mock('@/lib/supabase/admin', () => ({createAdminClient:mocks.admin}))
vi.mock('@/lib/live-lineup/archive-recovery', () => ({listLineupArchives:mocks.list,readLineupArchive:mocks.read,recoverLineupArchive:mocks.recover}))
import { AuthError } from '@/lib/nic-nac/auth'
import { LineupServiceError } from '@/lib/live-lineup/service'
import { ServiceError } from '@/lib/services/errors'
import { GET, POST } from '@/app/api/workspace/live-lineup/archives/route'
const origin = 'https://www.yoursparklesuite.com', url = `${origin}/api/workspace/live-lineup/archives`
const db = {synthetic:true}
const post = (body: unknown, from = origin) => new Request(url, {method:'POST',headers:{origin:from,'content-type':'application/json'},body:JSON.stringify(body)})
beforeEach(() => {
  vi.resetAllMocks(); mocks.auth.mockResolvedValue({repId:'owner'}); mocks.support.mockReturnValue(null); mocks.admin.mockReturnValue(db)
  mocks.list.mockResolvedValue({archives:[],nextBeforeGeneration:null}); mocks.read.mockResolvedValue({generation:0,candidates:[]}); mocks.recover.mockResolvedValue({revision:8})
})
it('bounds owner-only lists and private detail without caching or CORS', async () => {
  const response = await GET(new Request(url))
  expect(response.status).toBe(200)
  expect(mocks.list).toHaveBeenCalledWith(db,'owner',{beforeGeneration:undefined,limit:10})
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(response.headers.get('access-control-allow-origin')).toBeNull()
  await GET(new Request(url+'?beforeGeneration=12'))
  expect(mocks.list).toHaveBeenLastCalledWith(db,'owner',{beforeGeneration:12,limit:10})
  await GET(new Request(url+'?generation=0'))
  expect(mocks.read).toHaveBeenCalledWith(db,'owner',0)
})
it.each(['generation=-1','generation=01','generation=1.5','generation=9007199254740992','generation=','beforeGeneration=no','generation=1&generation=2','generation=1&beforeGeneration=2','repId=victim','limit=99999'])('rejects ambiguous/unbounded query %s', async query => {
  expect((await GET(new Request(url+'?'+query))).status).toBe(400)
  expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled()
})
it('authenticates before private reads and refuses support-scope bypass', async () => {
  mocks.auth.mockRejectedValueOnce(new AuthError('Sign in'))
  expect((await GET(new Request(url))).status).toBe(401)
  expect(mocks.admin).not.toHaveBeenCalled()
  mocks.support.mockReturnValue({synthetic:true})
  expect((await GET(new Request(url))).status).toBe(403)
  expect(mocks.list).not.toHaveBeenCalled()
})
it('recovery uses server owner and preserves explicit selection/revision guards', async () => {
  const input={repId:'victim',archiveGeneration:1,archiveRevision:4,expectedRevision:7,entryIds:['p1:a'],confirmed:true}
  expect((await POST(post(input))).status).toBe(200)
  expect(mocks.recover).toHaveBeenCalledWith(db,'owner',input)
})
it('does not relax paid access for archive reads or recovery', async () => {
  mocks.auth.mockRejectedValue(new ServiceError({code:'subscription_required',message:'Synthetic unpaid account',statusCode:402}))
  expect((await GET(new Request(url))).status).toBe(402)
  expect((await POST(post({}))).status).toBe(402)
  expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.recover).not.toHaveBeenCalled()
})
it('rejects cross-origin, oversized, and invalid media mutations before recovery', async () => {
  expect((await POST(post({},'https://evil.example'))).status).toBe(403)
  expect(mocks.auth).not.toHaveBeenCalled()
  expect((await POST(post({padding:'a'.repeat(524_288)}))).status).toBe(413)
  const invalid = post({}); invalid.headers.set('content-type','text/plain')
  expect((await POST(invalid)).status).toBe(415)
  expect(mocks.recover).not.toHaveBeenCalled()
})
it('returns a conflict without automatic recovery retry', async () => {
  mocks.recover.mockRejectedValue(new LineupServiceError('revision_conflict',409))
  const response=await POST(post({}))
  expect(response.status).toBe(409); expect(await response.json()).toEqual({error:'revision_conflict'})
  expect(mocks.recover).toHaveBeenCalledTimes(1)
})
