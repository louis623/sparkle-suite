import { it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  paid:vi.fn(), access:vi.fn(), rpc:vi.fn().mockResolvedValue(undefined),
  settings:vi.fn().mockResolvedValue({homepageMediaSlots:[{key:'showcase',videoUrl:''}]}),
}))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext:mocks.paid, AuthError:class AuthError extends Error {} }))
vi.mock('@/lib/supabase/operator-auth', async importOriginal => ({ ...await importOriginal<object>(), getControlCenterAccess:mocks.access }))
vi.mock('@/lib/supabase/admin', () => ({createAdminClient:() => ({})}))
vi.mock('@/lib/services/site-settings', () => ({getSiteSettingsDashboard:mocks.settings}))
vi.mock('@/lib/services/tiktok-video-queue', () => ({tiktokQueueRpc:mocks.rpc}))
import { POST } from '@/app/api/nic-nac/site-settings/remove-video/route'
const own='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
function request(body={},origin='https://smoke.example') {
  return new Request('https://smoke.example/api/nic-nac/site-settings/remove-video',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({slotKey:'showcase',expectedUrl:'https://www.tiktok.com/embed/12345678',...body})})
}
it('tiktok remove: rep route uses session identity and rejects a non-owner target and cross-site request', async () => {
  mocks.paid.mockResolvedValue({repId:own,supabase:{}})
  mocks.access.mockResolvedValue({scope:'rep',method:'control_center_session',operator:{repId:own}})
  mocks.rpc.mockClear()
  expect((await POST(request({repId:other}))).status).toBe(403)
  expect((await POST(request({},'https://evil.example'))).status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect((await POST(request())).status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledWith(expect.anything(),'remove_tiktok_slot',expect.objectContaining({p_rep_id:own}))
})
it('tiktok remove: operator removal requires the existing interactive owner guard', async () => {
  mocks.access.mockResolvedValue({scope:'owner',method:'loc_service',operator:{repId:own}})
  expect((await POST(request({repId:other}))).status).toBe(403)
  mocks.access.mockResolvedValue({scope:'owner',method:'control_center_session',operator:{repId:own}})
  expect((await POST(request({repId:other}))).status).toBe(200)
  expect(mocks.rpc).toHaveBeenLastCalledWith(expect.anything(),'remove_tiktok_slot',expect.objectContaining({p_rep_id:other}))
})
