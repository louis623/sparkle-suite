import { describe, expect, it, vi } from 'vitest'
const { generateText } = vi.hoisted(() => ({generateText:vi.fn()}))
vi.mock('ai', () => ({generateText}))
import { POST } from '@/app/api/public/nic-nac/route'
describe('retired public Nic-Nac route', () => {
  it('returns Gone without invoking a model', async () => {
    expect((await POST()).status).toBe(410)
    expect(generateText).not.toHaveBeenCalled()
  })
})
