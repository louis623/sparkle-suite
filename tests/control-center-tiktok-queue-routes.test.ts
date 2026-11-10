import { it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
const mocks = vi.hoisted(() => ({ access:vi.fn(), list:vi.fn().mockResolvedValue({items:[],dismissals:[]}) }))
vi.mock('@/lib/supabase/operator-auth', async importOriginal => ({ ...await importOriginal<object>(), getControlCenterAccess:mocks.access }))
vi.mock('@/lib/supabase/admin', () => ({createAdminClient:vi.fn(() => ({}))}))
vi.mock('@/lib/services/tiktok-video-queue', () => ({
  listTikTokQueue:mocks.list, createTikTokUploadTicket:vi.fn(), completeTikTokQueueItem:vi.fn(),
  archiveTikTokQueueItem:vi.fn(), reopenTikTokQueueItem:vi.fn(), reopenTikTokDismissal:vi.fn(), fetchTikTokThumbnail:vi.fn(),
}))
import { GET } from '@/app/api/control-center/tiktok-queue/route'
import { POST as upload } from '@/app/api/control-center/tiktok-queue/[itemId]/upload-ticket/route'
import { POST as complete } from '@/app/api/control-center/tiktok-queue/complete/route'
import { POST as archive } from '@/app/api/control-center/tiktok-queue/[itemId]/archive/route'
import { POST as reopen } from '@/app/api/control-center/tiktok-queue/[itemId]/reopen/route'
import { POST as thumbnail } from '@/app/api/control-center/tiktok-queue/[itemId]/thumbnail/route'
import { POST as dismissal } from '@/app/api/control-center/tiktok-queue/dismissals/reopen/route'

it('tiktok routes: owner session on every route, origin check on POST only, operator from session', async () => {
  const owner = {scope:'owner',method:'control_center_session',operator:{repId:'owner'}}
  const context = {params:Promise.resolve({itemId:'11111111-1111-4111-8111-111111111111'})}
  const request = (body = {}, origin = 'https://smoke.example') => new Request('https://smoke.example/api/control-center/tiktok-queue',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
  const handlers = [upload,archive,reopen,thumbnail]
  for (const access of [{...owner,scope:'rep'}, {...owner,method:'loc_service'}, {...owner,scope:'site_support'}]) {
    mocks.access.mockResolvedValue(access)
    expect((await GET(new Request('https://smoke.example/api/control-center/tiktok-queue'))).status).toBe(403)
    for (const handler of handlers) expect((await handler(request(),context)).status).toBe(403)
    expect((await complete(request())).status).toBe(403)
    expect((await dismissal(request())).status).toBe(403)
  }
  mocks.access.mockResolvedValue(owner)
  expect((await GET(new Request('https://smoke.example/api/control-center/tiktok-queue'))).status).toBe(200)
  for (const handler of handlers) expect((await handler(request({},'https://evil.example'),context)).status).toBe(403)
  expect((await complete(request({},''))).status).toBe(403)
  expect((await dismissal(request({repId:'bad',tiktokVideoId:'1'}))).status).toBe(400)
  expect((await upload(request({videoContentType:'video/webm',videoByteSize:1,posterContentType:'image/webp',posterByteSize:1}),context)).status).toBe(400)
  expect((await upload(request({videoContentType:'video/mp4',videoByteSize:52428801,posterContentType:'image/webp',posterByteSize:1}),context)).status).toBe(400)
  const uploadSource = readFileSync('app/api/control-center/tiktok-queue/[itemId]/upload-ticket/route.ts','utf8')
  expect(uploadSource).toContain('operatorRepId: access.operator.repId')
  expect(readFileSync('app/api/control-center/tiktok-queue/complete/route.ts','utf8')).toContain('operatorRepId: access.operator.repId')
  expect(readFileSync('app/control-center/tiktok-queue/page.tsx','utf8')).toContain('await requireOwnerDirectAccess()')
})
