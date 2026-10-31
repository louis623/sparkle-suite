import { expect, it, vi } from 'vitest'
import { resolveCustomerDomainSiteState } from '@/lib/amethyst/customer-domain-site'

it.each(['milehighfizz', null])('resolves custom-domain gate identity in the existing single strict query: %s', async publicSiteSlug => {
  const admin = {} as never
  const createAdminClient = vi.fn(() => admin)
  const resolveAmethystPreviewRep = vi.fn().mockResolvedValue({ id: 'fixture-mhf', public_site_slug: publicSiteSlug })
  const state = await resolveCustomerDomainSiteState('milehighfizz.com', { createAdminClient, resolveAmethystPreviewRep })
  expect(state).toEqual({ kind: 'serve', host: 'milehighfizz.com', repId: 'fixture-mhf', publicSiteSlug })
  expect(createAdminClient).toHaveBeenCalledOnce()
  expect(resolveAmethystPreviewRep).toHaveBeenCalledOnce()
  expect(resolveAmethystPreviewRep).toHaveBeenCalledWith(admin,
    { repId: 'milehighfizz.com', select: 'id, public_site_slug', strict: true })
})
