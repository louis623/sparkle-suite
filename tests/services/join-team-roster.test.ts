import { describe, expect, it, vi } from 'vitest'

import {
  removeJoinTeamMember,
  upsertJoinTeamMember,
} from '@/lib/services/join-team-roster'

describe('join team roster service', () => {
  it('rejects team-member birth years before touching the database', async () => {
    const supabase = { from: vi.fn() }
    await expect(
      upsertJoinTeamMember(supabase as never, 'rep-britt', {
        displayName: 'Rayna',
        birthday: '1990-09-22',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      userMessage: 'Birthday must use month and day in MM-DD format. Do not include a year.',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rejects unsafe social link schemes before saving public roster cards', async () => {
    const supabase = {
      from: vi.fn(),
    }

    await expect(
      upsertJoinTeamMember(supabase as never, 'rep-britt', {
        displayName: 'Rayna',
        businessName: 'Queen of Blingy Thingz',
        links: {
          tiktok: 'https://www.tiktok.com/@queenofblingythingz',
          website: 'javascript:alert(1)',
        },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      userMessage: 'Use a full http or https link for team member social links.',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deletes only the authenticated rep scoped member and returns the deleted id', async () => {
    const query = {
      delete: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'member-rayna' },
        error: null,
      }),
    }
    query.delete.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.select.mockReturnValue(query)
    const supabase = { from: vi.fn().mockReturnValue(query) }

    await expect(
      removeJoinTeamMember(supabase as never, 'rep-britt', 'member-rayna'),
    ).resolves.toEqual({ memberId: 'member-rayna' })

    expect(supabase.from).toHaveBeenCalledWith('join_team_members')
    expect(query.eq).toHaveBeenNthCalledWith(1, 'rep_id', 'rep-britt')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'id', 'member-rayna')
    expect(query.select).toHaveBeenCalledWith('id')
  })

  it('returns not found when no scoped roster member was deleted', async () => {
    const query = {
      delete: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    query.delete.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.select.mockReturnValue(query)
    const supabase = { from: vi.fn().mockReturnValue(query) }

    await expect(
      removeJoinTeamMember(supabase as never, 'rep-britt', 'member-missing'),
    ).rejects.toMatchObject({
      code: 'JOIN_TEAM_MEMBER_NOT_FOUND',
      statusCode: 404,
      userMessage: "I couldn't find that team member on your Join Team roster.",
    })
  })
})
