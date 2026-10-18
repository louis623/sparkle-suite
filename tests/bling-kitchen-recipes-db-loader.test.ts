import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.hoisted(() => vi.fn())
const resolveAmethystPreviewRepMock = vi.hoisted(() => vi.fn())
const getPublicSiteRecipesMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: (...args: unknown[]) =>
    resolveAmethystPreviewRepMock(...args),
}))

vi.mock('@/lib/services/site-recipes', () => ({
  getPublicSiteRecipes: (...args: unknown[]) => getPublicSiteRecipesMock(...args),
}))

import { GET } from '@/app/api/amethyst/pantry-template/route'

describe('BlingKitchen Pantry DB recipe loader', () => {
  beforeEach(() => {
    createAdminClientMock.mockReset()
    resolveAmethystPreviewRepMock.mockReset()
    getPublicSiteRecipesMock.mockReset()
    createAdminClientMock.mockReturnValue({ marker: 'admin' })
  })

  it('loads visible DB recipes before the Ready.ai fallback', async () => {
    resolveAmethystPreviewRepMock.mockResolvedValueOnce({
      id: 'rep-bling',
      email: 'blingkitchen19@gmail.com',
    })
    getPublicSiteRecipesMock.mockResolvedValueOnce([
      {
        id: 'recipe-db-1',
        repId: 'rep-bling',
        title: 'Nic-Nac Added Lasagna',
        slug: 'nic-nac-added-lasagna',
        description: 'Fresh from the DB.',
        category: 'Italian Classics',
        prepTime: '90 minutes',
        servings: 8,
        imageUrl: 'https://cdn.example.com/lasagna.jpg',
        imageAlt: '',
        imagePosition: 'center',
        modalImageUrl: 'https://cdn.example.com/lasagna-modal.jpg',
        modalImagePosition: 'center 20%',
        tiktokUrl: 'https://www.tiktok.com/@blingkitchen/video/123',
        ingredients: ['Pasta', 'Sauce'],
        steps: ['Layer', 'Bake'],
        note: 'Nic-Nac editable',
        sortOrder: 0,
        isVisible: true,
        sourceRecipeId: '',
        createdAt: null,
        updatedAt: null,
      },
    ])

    const response = await GET(
      new Request(
        'https://www.yoursparklesuite.com/api/amethyst/pantry-template?c=rep-bling&publicSiteSlug=blingkitchen',
      ),
    )
    const script = await response.text()

    expect(resolveAmethystPreviewRepMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      {
        publicSiteSlug: 'blingkitchen',
        repId: 'rep-bling',
        select: 'id, email',
      },
    )
    expect(getPublicSiteRecipesMock).toHaveBeenCalledWith(
      { marker: 'admin' },
      'rep-bling',
      { visibleOnly: true },
    )
    expect(script).toContain('"recipeCount":1')
    expect(script).toContain('"title":"Nic-Nac Added Lasagna"')
    expect(script).toContain('"image":"https://cdn.example.com/lasagna.jpg"')
    expect(script).not.toContain('"title":"Chocolate-Dipped Strawberries"')
    expect(script).toContain('"pantry":"/blingkitchen/in-the-pantry"')
  })

  it('falls back to the 26 source recipes only for BlingKitchen when DB is empty', async () => {
    resolveAmethystPreviewRepMock.mockResolvedValueOnce({
      id: 'rep-bling',
      email: 'blingkitchen19@gmail.com',
    })
    getPublicSiteRecipesMock.mockResolvedValueOnce([])

    const response = await GET(
      new Request(
        'https://www.yoursparklesuite.com/api/amethyst/pantry-template?publicSiteSlug=blingkitchen',
      ),
    )
    const script = await response.text()

    expect(script).toContain('"recipeCount":26')
    expect(script).toContain('"title":"Chocolate-Dipped Strawberries"')
  })

  it('does not leak Heather recipes to another targeted rep Pantry request', async () => {
    resolveAmethystPreviewRepMock.mockResolvedValueOnce({
      id: 'rep-other',
      email: 'other@example.test',
    })
    getPublicSiteRecipesMock.mockResolvedValueOnce([])

    const response = await GET(
      new Request(
        'https://www.yoursparklesuite.com/api/amethyst/pantry-template?c=rep-other&publicSiteSlug=othersparkles',
      ),
    )
    const script = await response.text()

    expect(response.status).toBe(404)
    expect(script).toBe('Not found')
    expect(script).not.toContain('Chocolate-Dipped Strawberries')
    expect(script).not.toContain('BlingKitchen')
    expect(script).not.toContain('/othersparkles/in-the-pantry')
  })
})
