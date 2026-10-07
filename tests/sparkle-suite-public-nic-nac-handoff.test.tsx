import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const { admin }=vi.hoisted(()=>({admin:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:admin}))
import { POST } from '@/app/api/public/nic-nac/handoff/route'
import { normalizeCustomerWaitlistRow } from '@/lib/prelaunch/customer-waitlist'
import { CustomerWaitlistPanel } from '@/app/control-center/_components/CustomerWaitlistPanel'
import { SparkleSuitePublicNicNac } from '@/app/_components/sparkle-suite-public-nic-nac'
describe('retired public assistant and preserved inquiry history',()=>{
  it('does not mount a launcher or contact form',()=>{
    expect(renderToStaticMarkup(<SparkleSuitePublicNicNac />)).toBe('')
    expect(renderToStaticMarkup(<SparkleSuitePublicNicNac reviewMode />)).toBe('')
  })
  it('returns Gone without constructing a database client',async()=>{
    expect((await POST()).status).toBe(410)
    expect(admin).not.toHaveBeenCalled()
  })
  it('preserves inquiry source and question in the actual Control Center view', () => {
    const lead = normalizeCustomerWaitlistRow({
      id: 'test-receipt-1', name: 'Reviewer Example', email: 'reviewer@example.test',
      phone: null, source: 'public_nic_nac', lead_status: 'inquiry',
      operator_notes: 'Question only — not a build-queue signup. How does setup work?',
      account_activated_at: null, created_at: '2026-09-05T12:00:00Z',
    })
    const html = renderToStaticMarkup(<CustomerWaitlistPanel initialLeads={[lead]} />)
    expect(html).toContain('Nic-Nac question (not a queue signup)')
    expect(html).toContain('How does setup work?')
    expect(lead.source).toBe('public_nic_nac')
  })
})
