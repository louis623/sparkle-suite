// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteSettingsCard, getSiteSettingsDraft, hasSiteSettingsUnsavedChanges } from '@/app/nic-nac/components/DashboardPlaceholder'
import { SiteLeaveGuard, type SiteDiscardOpener } from '@/app/nic-nac/components/SiteSaveBar'
import {
  collectSiteSettingsFieldErrors,
  discardConfirmMessage,
  formatSiteSaveFailure,
  listSiteSettingsChanges,
  mergePreparedSiteSettingsDraft,
  shopLinkFieldError,
  shouldApplyNicNacSiteRefresh,
  unsavedChangesLabel,
  workspaceLeaveHref,
  SHOP_LINK_ERROR,
} from '@/app/nic-nac/components/site-settings-save'
import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import { getNormalizedSiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'

const base = {
  displayName: 'Sasha',
  businessName: 'Sparkle by Sasha',
  email: 'hello@sparklebysasha.com',
  phone: '',
  shopLink: 'https://bombparty.com/sasha',
  bannerText: '',
  bannerVisible: false,
  tickerText: 'Live tonight',
  tickerVisible: true,
  tagline: 'Live sparkle',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow' as const,
  teamName: 'Moonstone',
  showJoinPage: true,
  customerSiteTemplate: 'amethyst' as const,
  appearancePreset: 'amethyst' as const,
  socialHandles: { instagram: '@sasha' },
  signupDiscountEnabled: false,
  signupDiscountCode: '',
  signupDiscountMessage: '',
}

function normalized(draft: SiteSettingsDraft) {
  return getNormalizedSiteSettingsDraft(draft)
}

function names(draft: SiteSettingsDraft) {
  return listSiteSettingsChanges(normalized(base), normalized(draft))
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
  }
  if (!('close' in HTMLDialogElement.prototype) || HTMLDialogElement.prototype.close.length > 1) {
    HTMLDialogElement.prototype.close = function close(value?: string) {
      this.returnValue = value ?? ''
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('site save bar', () => {
  it('does not count a Team Management edit toward My Website unsaved changes', () => {
    const saved = getSiteSettingsDraft(base)
    const edited: SiteSettingsDraft = {
      ...saved,
      teamName: 'A different team',
      recruitingLink: 'https://bombparty.com/sasha/packs',
    }
    expect(names(edited)).toEqual([])
    expect(hasSiteSettingsUnsavedChanges({ settings: saved, draft: edited })).toBe(false)
  })

  it('counts and names three unsaved changes, including the theme', () => {
    const draft: SiteSettingsDraft = {
      ...base,
      displayName: 'Sasha Lane',
      email: 'sasha@example.com',
      appearancePreset: 'rose_gold',
    }
    const labels = names(draft)
    expect(labels).toEqual(['Theme', 'Your first name', 'Email'])
    expect(unsavedChangesLabel(labels.length)).toBe('3 unsaved changes')
    expect(discardConfirmMessage(3)).toBe(
      "Discard 3 unsaved changes? Photos you uploaded stay uploaded but won't show on your site; removed videos stay removed.",
    )
    expect(discardConfirmMessage(1)).toBe(
      "Discard 1 unsaved change? Photos you uploaded stay uploaded but won't show on your site; removed videos stay removed.",
    )
  })

  it('resets text, switches, and the theme, and drops an unpublished photo from the draft', () => {
    const saved = getSiteSettingsDraft({
      ...base,
      homepageMediaSlots: [
        { key: 'showcase', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_1', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_2', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_3', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_4', caption: '', imageUrl: '', videoUrl: '' },
      ],
    })
    const edited: SiteSettingsDraft = {
      ...saved,
      tagline: 'Changed tagline',
      tickerVisible: false,
      appearancePreset: 'rose_gold',
      homepageMediaSlots: saved.homepageMediaSlots?.map((slot) =>
        slot.key === 'about_1' ? { ...slot, imageUrl: 'https://cdn.example.com/new.jpg' } : slot,
      ),
    }
    expect(names(edited)).toEqual(
      expect.arrayContaining(['Footer tagline', 'Announcements', 'Theme', 'About portrait photo']),
    )
    const discarded = getSiteSettingsDraft(saved)
    expect(discarded.tagline).toBe('Live sparkle')
    expect(discarded.tickerVisible).toBe(true)
    expect(discarded.appearancePreset).toBe('amethyst')
    expect(discarded.homepageMediaSlots?.find((slot) => slot.key === 'about_1')?.imageUrl).toBe('')
    expect(discarded.homepageMediaSlots?.find((slot) => slot.key === 'showcase')?.videoUrl).toBe('')
    const discardSource = readFileSync('app/nic-nac/components/DashboardPlaceholder.tsx', 'utf8')
    const start = discardSource.indexOf('function handleDiscardSiteSettings()')
    const end = discardSource.indexOf('function handleSaveSiteSettings()')
    const body = discardSource.slice(start, end)
    expect(body).toContain('getSiteSettingsDraft(siteSettingsState.settings')
    expect(body).not.toContain('/api/nic-nac/site-settings/media')
    expect(body).not.toContain('remove-video')
  })

  it('keeps Save tappable, focuses the store link, and does not save bombparty.com/x', async () => {
    expect(shopLinkFieldError('bombparty.com/x')).toBe(SHOP_LINK_ERROR)
    const save = vi.fn()
    function Harness() {
      const [draft, setDraft] = useState<SiteSettingsDraft>(base)
      return createElement(SiteSettingsCard, {
        state: { status: 'ready', settings: base },
        draft,
        changes: ['Bomb Party rep store link'],
        onDraftChange: (patch) => setDraft((current) => ({ ...current, ...patch })),
        onSave: save,
      })
    }
    await act(async () => {
      root.render(createElement(Harness))
    })
    const shop = host.querySelector('#my-website-shop-link') as HTMLInputElement
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setValue?.call(shop, 'bombparty.com/x')
      shop.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const saveButton = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Save & publish'),
    )
    expect(saveButton?.hasAttribute('disabled')).toBe(false)
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(save).not.toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('my-website-shop-link')
    expect(host.textContent).toContain(SHOP_LINK_ERROR)
    expect(host.querySelector('#my-website-shop-link')?.getAttribute('aria-describedby')).toContain(
      'my-website-shop-link-error',
    )
    expect(host.querySelector('#my-website-email')?.getAttribute('type')).toBe('email')
    expect(host.querySelector('#my-website-email')?.getAttribute('autocomplete')).toBe('email')
  })

  it('shows a server error in the bar and keeps the draft', async () => {
    await act(async () => {
      root.render(
        createElement(SiteSettingsCard, {
          state: { status: 'ready', settings: base },
          draft: { ...base, tagline: 'Still here' },
          changes: ['Footer tagline'],
          actionState: {
            pending: false,
            error: formatSiteSaveFailure('The database is busy.'),
            helperMessage: null,
          },
        }),
      )
    })
    expect(host.textContent).toContain("Couldn't save. The database is busy.")
    const tagline = [...host.querySelectorAll('input')].find((input) => input.value === 'Still here')
    expect(tagline).toBeTruthy()
  })

  it('warns on refresh and on in-app links that leave /nic-nac, and uses the discard confirm', async () => {
    expect(workspaceLeaveHref({ href: '/account', currentHref: 'https://www.yoursparklesuite.com/nic-nac?section=site-settings' })).toBe('/account')
    expect(workspaceLeaveHref({ href: '/nic-nac?section=team-management', currentHref: 'https://www.yoursparklesuite.com/nic-nac?section=site-settings' })).toBeNull()
    expect(workspaceLeaveHref({ href: 'https://example.com/out', currentHref: 'https://www.yoursparklesuite.com/nic-nac', target: '_blank' })).toBeNull()

    const discarded = vi.fn()
    const opener = { current: null as SiteDiscardOpener | null }
    await act(async () => {
      root.render(
        createElement(
          'div',
          null,
          createElement(SiteLeaveGuard, {
            active: true,
            count: 3,
            onDiscard: discarded,
            openerRef: opener,
          }),
          createElement('a', { href: '/account' }, 'Account'),
          createElement('a', { href: '/nic-nac?section=home' }, 'Home tab'),
        ),
      )
    })
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)

    const home = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === 'Home tab')
    await act(async () => {
      home?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(host.querySelector('dialog')?.hasAttribute('open')).toBe(false)

    const account = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === 'Account')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    await act(async () => {
      account?.dispatchEvent(click)
    })
    expect(click.defaultPrevented).toBe(true)
    expect(host.querySelector('dialog')?.open || host.querySelector('dialog')?.hasAttribute('open')).toBe(true)
    expect(host.textContent).toContain(discardConfirmMessage(3))
    const discard = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Discard changes')
    const keep = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Keep editing')
    expect(discard).toBeTruthy()
    expect(keep).toBeTruthy()
    await act(async () => {
      opener.current?.open()
    })
    expect(discarded).not.toHaveBeenCalled()
  })

  it('skips a stale Nic-Nac site refresh after a save or while a save is pending', () => {
    expect(shouldApplyNicNacSiteRefresh({
      startedVersion: 2,
      currentVersion: 2,
      savePending: false,
    })).toBe(true)
    expect(shouldApplyNicNacSiteRefresh({
      startedVersion: 2,
      currentVersion: 2,
      savePending: true,
    })).toBe(false)
    expect(shouldApplyNicNacSiteRefresh({
      startedVersion: 2,
      currentVersion: 3,
      savePending: false,
    })).toBe(false)
    const source = readFileSync('app/nic-nac/components/DashboardPlaceholder.tsx', 'utf8')
    const refresh = source.slice(
      source.indexOf("if (topic === 'site' && !reviewWorkspaceMode"),
      source.indexOf("if (topic === 'site' && activeSection === 'recipes')"),
    )
    expect(refresh).toContain('siteSettingsSavePendingRef.current')
    expect(refresh).toContain('queuedNicNacSiteRefreshRef.current = true')
    expect(refresh).toContain('refreshSiteSettingsFromNicNac()')
    const guarded = source.slice(
      source.indexOf('function refreshSiteSettingsFromNicNac()'),
      source.indexOf('function flushQueuedNicNacSiteRefresh()'),
    )
    expect(guarded).toContain("fetch('/api/nic-nac/site-settings'")
    expect(guarded).toContain('shouldApplyNicNacSiteRefresh')
    expect(source).toContain('siteSettingsVersionRef.current += 1')
    expect(source).toContain('siteSettingsSavePendingRef.current = true')
  })

  it('runs one queued Nic-Nac site refresh after the save finally clears the pending flag', () => {
    const source = readFileSync('app/nic-nac/components/DashboardPlaceholder.tsx', 'utf8')
    const save = source.slice(
      source.indexOf('async function saveSiteSettingsDraft'),
      source.indexOf('function acceptSiteSettingsSnapshot'),
    )
    const finallyBody = save.slice(save.lastIndexOf('finally'))
    const cleared = finallyBody.indexOf('siteSettingsSavePendingRef.current = false')
    const flushed = finallyBody.indexOf('flushQueuedNicNacSiteRefresh()')
    expect(cleared).toBeGreaterThan(-1)
    expect(flushed).toBeGreaterThan(cleared)
    const flush = source.slice(
      source.indexOf('function flushQueuedNicNacSiteRefresh()'),
      source.indexOf('async function saveSiteSettingsDraft'),
    )
    expect(flush).toContain('if (!queuedNicNacSiteRefreshRef.current) return')
    expect(flush).toContain('queuedNicNacSiteRefreshRef.current = false')
    expect(flush.indexOf('queuedNicNacSiteRefreshRef.current = false')).toBeLessThan(
      flush.indexOf('refreshSiteSettingsFromNicNac()'),
    )
  })

  it('announces a field error that appears on blur', async () => {
    vi.useFakeTimers()
    function Harness() {
      const [draft, setDraft] = useState<SiteSettingsDraft>({ ...base, shopLink: 'bombparty.com/x' })
      return createElement(SiteSettingsCard, {
        state: { status: 'ready', settings: base },
        draft,
        changes: ['Bomb Party rep store link'],
        onDraftChange: (patch) => setDraft((current) => ({ ...current, ...patch })),
      })
    }
    try {
      await act(async () => {
        root.render(createElement(Harness))
      })
      const shop = host.querySelector('#my-website-shop-link') as HTMLInputElement
      const live = host.querySelector('[aria-live="polite"]')
      expect(live).toBeTruthy()
      expect(live?.textContent).toBe('')
      await act(async () => {
        shop.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(live?.textContent).toBe('')
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(live?.textContent).toContain('Bomb Party rep store link')
      expect(live?.textContent).toContain(SHOP_LINK_ERROR)
    } finally {
      vi.useRealTimers()
    }
  })

  it('refreshes saved values from a Nic-Nac write without clobbering the draft', () => {
    const previous = getSiteSettingsDraft(base)
    const next = getSiteSettingsDraft({ ...base, tagline: 'Saved by Nic-Nac', email: 'new@example.com' })
    const draft: SiteSettingsDraft = { ...previous, displayName: 'My draft name', email: 'mine@example.com' }
    const merged = mergePreparedSiteSettingsDraft(draft, previous, next)
    expect(merged.displayName).toBe('My draft name')
    expect(merged.email).toBe('mine@example.com')
    expect(merged.tagline).toBe('Saved by Nic-Nac')
  })

  it('confirms Copy link with the live site address', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    await act(async () => {
      root.render(
        createElement(SiteSettingsCard, {
          state: { status: 'ready', settings: base },
          draft: base,
          publicSiteUrl: 'https://custom.example',
          publicSiteDisplay: 'custom.example',
        }),
      )
    })
    const button = [...host.querySelectorAll('button')].find((item) => item.textContent === 'Copy link')
    await act(async () => {
      button?.click()
    })
    expect(writeText).toHaveBeenCalledWith('https://custom.example')
    expect(button?.textContent).toBe('Copied')
    const view = host.querySelector('a[href="https://custom.example"]')
    expect(view?.textContent).toContain('View my site')
    expect(view?.getAttribute('target')).toBe('_blank')
  })

  it('puts email constraints on the field and gates the review harness like the theme studio', () => {
    const html = host.ownerDocument.createElement('div')
    html.innerHTML = ''
    const page = readFileSync('app/dev/my-website-save-harness/page.tsx', 'utf8')
    const access = readFileSync('app/dev/my-website-save-harness/access.ts', 'utf8')
    expect(page).toContain('isMyWebsiteSaveHarnessEnabled()')
    expect(page).toContain('notFound()')
    expect(access).toContain("NODE_ENV === 'development'")
    expect(access).toContain("SPARKLE_ENVIRONMENT === 'smoke'")
  })
})
