import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { transformSync } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { applySavedSignupDiscount } from '@/lib/public-site/signup-discount-settings'
import {
  SIGNUP_DISCOUNT_COPIED_MS,
  copySignupDiscountCode,
  presentSignupDiscount,
  selectSignupDiscountCode,
  signupDiscountCopyFeedback,
  signupDiscountCopyName,
} from '@/lib/public-site/signup-discount'
import {
  getSiteSettingsDashboard,
  updateSiteSettingsDashboard,
} from '@/lib/services/site-settings'

const homepageSource = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.jsx'), 'utf8')

function loadHomepageDiscount() {
  const start = homepageSource.indexOf('const SIGNUP_DISCOUNT_COPIED_MS')
  const end = homepageSource.indexOf('function Signup(')
  const slice = homepageSource.slice(start, end)
  const transformed = transformSync(slice, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  }).code
  const factory = new Function(
    'React',
    `${transformed}; return { presentSignupDiscount, copySignupDiscountCode, selectSignupDiscountCode, signupDiscountCopyFeedback, signupDiscountCopyName, SignupDiscountConfirmation };`,
  )
  return factory(React) as {
    presentSignupDiscount: typeof presentSignupDiscount
    copySignupDiscountCode: typeof copySignupDiscountCode
    selectSignupDiscountCode: typeof selectSignupDiscountCode
    signupDiscountCopyFeedback: typeof signupDiscountCopyFeedback
    signupDiscountCopyName: typeof signupDiscountCopyName
    SignupDiscountConfirmation: (props: { content?: { signupDiscountCode?: string; signupDiscountOffer?: string } }) => React.ReactElement | null
  }
}

const homepageDiscount = loadHomepageDiscount()

const presentCases = [
  {
    name: 'shows the saved code and offer line',
    input: { signupDiscountCode: ' MILEHIGHFIZZCUSTOMER ', signupDiscountOffer: ' 15% off ' },
    expected: { code: 'MILEHIGHFIZZCUSTOMER', label: 'Your 15% off code' },
  },
  {
    name: 'uses a plain discount line when the offer is blank',
    input: { signupDiscountCode: 'MILEHIGHFIZZCUSTOMER', signupDiscountOffer: '   ' },
    expected: { code: 'MILEHIGHFIZZCUSTOMER', label: 'Your discount code' },
  },
  {
    name: 'hides the code when none is saved',
    input: { signupDiscountCode: '', signupDiscountOffer: '15% off' },
    expected: null,
  },
  {
    name: 'hides an offer that has no code',
    input: { signupDiscountOffer: '15% off' },
    expected: null,
  },
  {
    name: 'hides a code that is not a single token',
    input: { signupDiscountCode: 'MILE HIGH', signupDiscountOffer: '15% off' },
    expected: null,
  },
] as const

describe('signup discount confirmation', () => {
  it.each(presentCases)('$name', ({ input, expected }) => {
    expect(presentSignupDiscount(input)).toEqual(expected)
    expect(homepageDiscount.presentSignupDiscount(input)).toEqual(expected)
  })

  it('drops an offer that is not safe to print and still shows the code', () => {
    expect(presentSignupDiscount({
      signupDiscountCode: 'MILEHIGHFIZZCUSTOMER',
      signupDiscountOffer: '<b>15% off</b>',
    })).toEqual({ code: 'MILEHIGHFIZZCUSTOMER', label: 'Your discount code' })
  })

  it('renders the code, offer line, monospace box, and a 44px Copy button', () => {
    const html = renderToStaticMarkup(React.createElement(homepageDiscount.SignupDiscountConfirmation, {
      content: { signupDiscountCode: 'MILEHIGHFIZZCUSTOMER', signupDiscountOffer: '15% off' },
    }))

    expect(html).toContain('Your 15% off code')
    expect(html).toContain('MILEHIGHFIZZCUSTOMER')
    expect(html).toContain('hp-signup-discount-code')
    expect(html).toContain('ui-monospace')
    expect(html).toContain('>Copy<')
    expect(html).toContain('aria-label="Copy MILEHIGHFIZZCUSTOMER"')
    expect(html).toContain('min-height:44px')
    expect(html).toContain('min-width:44px')
    expect(html).toContain('aria-live="polite"')
  })

  it('renders nothing when the rep has no signup code', () => {
    expect(renderToStaticMarkup(React.createElement(homepageDiscount.SignupDiscountConfirmation, {
      content: {},
    }))).toBe('')
    expect(renderToStaticMarkup(React.createElement(homepageDiscount.SignupDiscountConfirmation, {
      content: { signupDiscountOffer: '15% off' },
    }))).toBe('')
  })

  it('mounts the code only after the signup form succeeds', () => {
    const signup = homepageSource.slice(
      homepageSource.indexOf('function Signup('),
      homepageSource.indexOf('function Footer('),
    )
    expect(signup).toContain('submitState.status === "success" ? (')
    expect(signup).toContain('<SignupDiscountConfirmation content={CONTENT} />')
    expect(signup).toContain('{submitState.status === "success" ? null : (')
  })

  it('names the copy button and switches it to Copied! for about 2 seconds', () => {
    expect(signupDiscountCopyName('MILEHIGHFIZZCUSTOMER', false)).toBe('Copy MILEHIGHFIZZCUSTOMER')
    expect(signupDiscountCopyName('MILEHIGHFIZZCUSTOMER', true)).toBe('Copied MILEHIGHFIZZCUSTOMER')
    expect(homepageDiscount.signupDiscountCopyName('MILEHIGHFIZZCUSTOMER', true)).toBe('Copied MILEHIGHFIZZCUSTOMER')
    expect(signupDiscountCopyFeedback('clipboard')).toEqual({ text: 'Copied!', clearAfterMs: SIGNUP_DISCOUNT_COPIED_MS })
    expect(signupDiscountCopyFeedback('selected')).toEqual({ text: 'Copied!', clearAfterMs: 2000 })
    expect(signupDiscountCopyFeedback('failed')).toBeNull()
    expect(homepageDiscount.signupDiscountCopyFeedback('selected')?.text).toBe('Copied!')
    expect(homepageDiscount.signupDiscountCopyFeedback('selected')?.clearAfterMs).toBe(2000)
    expect(homepageSource).toContain('copied ? "Copied!" : "Copy"')
  })

  it.each([
    ['shared', copySignupDiscountCode],
    ['homepage', homepageDiscount.copySignupDiscountCode],
  ] as const)('copies with the clipboard (%s)', async (_name, copy) => {
    const selectContents = vi.fn(() => true)
    const writeText = vi.fn(async () => undefined)
    await expect(copy('MILEHIGHFIZZCUSTOMER', { id: 'code' }, { writeText, selectContents })).resolves.toBe('clipboard')
    expect(writeText).toHaveBeenCalledWith('MILEHIGHFIZZCUSTOMER')
    expect(selectContents).not.toHaveBeenCalled()
  })

  it.each([
    ['shared', copySignupDiscountCode],
    ['homepage', homepageDiscount.copySignupDiscountCode],
  ] as const)('selects the code when the clipboard is blocked (%s)', async (_name, copy) => {
    const codeElement = { id: 'code' }
    const selectContents = vi.fn(() => true)
    await expect(copy('MILEHIGHFIZZCUSTOMER', codeElement, {
      writeText: async () => {
        throw new Error('NotAllowedError')
      },
      selectContents,
    })).resolves.toBe('selected')
    expect(selectContents).toHaveBeenCalledWith(codeElement)
  })

  it.each([
    ['shared', copySignupDiscountCode],
    ['homepage', homepageDiscount.copySignupDiscountCode],
  ] as const)('selects the code when the clipboard never answers (%s)', async (_name, copy) => {
    const selectContents = vi.fn(() => true)
    await expect(copy('MILEHIGHFIZZCUSTOMER', { id: 'code' }, {
      writeText: () => new Promise(() => undefined),
      selectContents,
      timeoutMs: 20,
    })).resolves.toBe('selected')
    expect(selectContents).toHaveBeenCalled()
  })

  it.each([
    ['shared', copySignupDiscountCode],
    ['homepage', homepageDiscount.copySignupDiscountCode],
  ] as const)('selects the code when the browser has no clipboard API (%s)', async (_name, copy) => {
    const selectContents = vi.fn(() => true)
    await expect(copy('MILEHIGHFIZZCUSTOMER', { id: 'code' }, {
      writeText: null,
      selectContents,
    })).resolves.toBe('selected')
  })

  it('selects the visible code text for the clipboard fallback', () => {
    const codeElement = { id: 'code', focus: vi.fn() }
    const range = { selectNodeContents: vi.fn() }
    const selection = { removeAllRanges: vi.fn(), addRange: vi.fn() }
    const doc = { createRange: () => range }
    const view = { getSelection: () => selection }

    expect(selectSignupDiscountCode(codeElement, doc, view)).toBe(true)
    expect(homepageDiscount.selectSignupDiscountCode(codeElement, doc, view)).toBe(true)
    expect(range.selectNodeContents).toHaveBeenCalledWith(codeElement)
    expect(selection.removeAllRanges).toHaveBeenCalled()
    expect(selection.addRange).toHaveBeenCalledWith(range)
    expect(codeElement.focus).toHaveBeenCalled()
    expect(selectSignupDiscountCode(null, doc, view)).toBe(false)
  })

  it('puts the saved code on the public homepage payload and leaves other reps unchanged', async () => {
    const withCode = await applySavedSignupDiscount(defaultAmethystHomepageTemplateData, 'rep-lindsey', async () => ({
      code: 'MILEHIGHFIZZCUSTOMER',
      offer: '15% off',
    }))
    const withoutCode = await applySavedSignupDiscount(defaultAmethystHomepageTemplateData, 'rep-other', async () => null)
    const withoutRep = await applySavedSignupDiscount(defaultAmethystHomepageTemplateData, null, async () => {
      throw new Error('should not load')
    })

    expect(withCode.signupDiscountCode).toBe('MILEHIGHFIZZCUSTOMER')
    expect(withCode.signupDiscountOffer).toBe('15% off')
    expect(withoutCode.signupDiscountCode).toBeUndefined()
    expect(withoutRep).toBe(defaultAmethystHomepageTemplateData)

    const script = buildAmethystHomepageBootstrapScript(withCode)
    expect(script).toContain('MILEHIGHFIZZCUSTOMER')
    expect(script).toContain('15% off')
    expect(buildAmethystHomepageBootstrapScript(defaultAmethystHomepageTemplateData)).not.toContain('signupDiscountCode')
  })

  it('keeps the homepage unchanged when the discount lookup fails', async () => {
    const homepage = await applySavedSignupDiscount(defaultAmethystHomepageTemplateData, 'rep-lindsey', async () => {
      throw new Error('column signup_discount_code does not exist')
    })
    expect(homepage.signupDiscountCode).toBeUndefined()
  })
})

describe('signup discount setting', () => {
  it('reads a saved code and ignores a database that does not have the columns yet', async () => {
    const reps = {
      select: vi.fn(() => ({
        eq: () => ({
          single: async () => ({
            data: {
              display_name: 'Lindsey',
              business_name: 'Mile High Fizz',
              email: 'lindseychapman1188@gmail.com',
              phone: null,
              shop_link: null,
              social_handles: {},
            },
            error: null,
          }),
        }),
      })),
    }
    const saved = {
      from: vi.fn((table: string) => {
        if (table === 'reps') return reps
        if (table !== 'site_settings') throw new Error(table)
        return {
          select: (columns: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (columns.includes('signup_discount_code')) {
                  return {
                    data: { signup_discount_code: 'MILEHIGHFIZZCUSTOMER', signup_discount_offer: '15% off' },
                    error: null,
                  }
                }
                return { data: { banner_text: 'Live tonight', banner_visible: true }, error: null }
              },
            }),
          }),
        }
      }),
    }
    const missing = {
      from: vi.fn((table: string) => {
        if (table === 'reps') return reps
        return {
          select: (columns: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (columns.includes('signup_discount_code')) {
                  return {
                    data: null,
                    error: { code: '42703', message: 'column site_settings.signup_discount_code does not exist' },
                  }
                }
                return { data: { banner_text: 'Live tonight', banner_visible: true }, error: null }
              },
            }),
          }),
        }
      }),
    }

    const loaded = await getSiteSettingsDashboard(saved as never, 'rep-lindsey')
    expect(loaded.signupDiscountCode).toBe('MILEHIGHFIZZCUSTOMER')
    expect(loaded.signupDiscountOffer).toBe('15% off')
    expect(loaded.bannerText).toBe('Live tonight')
    expect(loaded.businessName).toBe('Mile High Fizz')

    const unchanged = await getSiteSettingsDashboard(missing as never, 'rep-lindsey')
    expect(unchanged.signupDiscountCode).toBeUndefined()
    expect(unchanged.signupDiscountOffer).toBeUndefined()
    expect(unchanged.bannerText).toBe('Live tonight')
  })

  it('saves a signup code and offer, and rejects a code that is not one token', async () => {
    const upsert = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: { banner_text: null, banner_visible: false },
          error: null,
        }),
      }),
    }))
    const reps = {
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              display_name: 'Lindsey',
              business_name: 'Mile High Fizz',
              email: 'lindseychapman1188@gmail.com',
              phone: null,
              shop_link: null,
              social_handles: {},
            },
            error: null,
          }),
        }),
      }),
    }
    const supabase = {
      from: (table: string) => {
        if (table === 'site_settings') return { upsert }
        if (table === 'reps') return reps
        throw new Error(table)
      },
    }

    const saved = await updateSiteSettingsDashboard(supabase as never, 'rep-lindsey', {
      signupDiscountCode: 'MILEHIGHFIZZCUSTOMER',
      signupDiscountOffer: '15% off',
    })
    expect(upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-lindsey',
        signup_discount_code: 'MILEHIGHFIZZCUSTOMER',
        signup_discount_offer: '15% off',
      },
      { onConflict: 'rep_id' },
    )
    expect(saved.signupDiscountCode).toBe('MILEHIGHFIZZCUSTOMER')
    expect(saved.signupDiscountOffer).toBe('15% off')

    const rejected = { from: vi.fn() }
    await expect(updateSiteSettingsDashboard(rejected as never, 'rep-lindsey', {
      signupDiscountCode: 'MILE HIGH',
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(rejected.from).not.toHaveBeenCalled()
  })
})

describe('signup discount migration', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261025223000_ss_signup_discount_code.sql'),
    'utf8',
  )
  const undo = readFileSync(
    resolve(process.cwd(), 'supabase/manual/20261025223000_ss_signup_discount_code_undo.sql'),
    'utf8',
  )

  it('adds the columns and a rollback that removes them, without writing a rep code', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS signup_discount_code TEXT')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS signup_discount_offer TEXT')
    expect(migration).toContain("signup_discount_code ~ '^[A-Za-z0-9-]{1,40}$'")
    expect(migration).toContain('char_length(signup_discount_offer) BETWEEN 1 AND 40')
    expect(migration).toContain("NOTIFY pgrst, 'reload schema';")
    expect(migration).not.toContain('MILEHIGHFIZZCUSTOMER')
    expect(migration).not.toContain('supabase db push')
    expect(undo).toContain('DROP COLUMN IF EXISTS signup_discount_offer')
    expect(undo).toContain('DROP COLUMN IF EXISTS signup_discount_code')
    expect(undo).toContain('DROP CONSTRAINT IF EXISTS site_settings_signup_discount_code_shape')
    expect(undo).toContain("NOTIFY pgrst, 'reload schema';")
  })
})
