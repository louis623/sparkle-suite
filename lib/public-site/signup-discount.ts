/**
 * A rep's optional signup discount. Empty means the confirmation stays as it is.
 * The offer is the short phrase in "Your 15% off code", such as "15% off".
 */

export const SIGNUP_DISCOUNT_CODE_PATTERN = /^[A-Za-z0-9-]{1,40}$/
export const SIGNUP_DISCOUNT_OFFER_MAX = 40
export const SIGNUP_DISCOUNT_COPIED_MS = 2000
export const SIGNUP_DISCOUNT_CLIPBOARD_TIMEOUT_MS = 2500

export type SignupDiscountCopyOutcome = 'clipboard' | 'selected' | 'failed'

export type SignupDiscountCopyDeps = {
  writeText?: ((value: string) => Promise<void>) | null
  selectContents?: (element: unknown) => boolean
  timeoutMs?: number
}

type SignupDiscountInput = {
  signupDiscountCode?: string | null
  signupDiscountOffer?: string | null
} | null | undefined

export function normalizeSignupDiscountCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim()
  if (!SIGNUP_DISCOUNT_CODE_PATTERN.test(code)) return null
  return code
}

export function normalizeSignupDiscountOffer(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const offer = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!offer || offer.length > SIGNUP_DISCOUNT_OFFER_MAX) return null
  if (/[<>]/.test(offer)) return null
  return offer
}

export function signupDiscountLabel(offer: string | null): string {
  return offer ? `Your ${offer} code` : 'Your discount code'
}

export function presentSignupDiscount(input: SignupDiscountInput) {
  const code = normalizeSignupDiscountCode(input?.signupDiscountCode)
  if (!code) return null
  const offer = normalizeSignupDiscountOffer(input?.signupDiscountOffer)
  return { code, label: signupDiscountLabel(offer) }
}

export function signupDiscountCopyName(code: string, copied: boolean) {
  return copied ? `Copied ${code}` : `Copy ${code}`
}

export function signupDiscountCopyFeedback(outcome: SignupDiscountCopyOutcome) {
  if (outcome === 'failed') return null
  return { text: 'Copied!', clearAfterMs: SIGNUP_DISCOUNT_COPIED_MS }
}

type DiscountDocument = {
  createRange?: () => Range
}

type DiscountSelection = {
  removeAllRanges: () => void
  addRange: (range: Range) => void
}

type DiscountView = {
  getSelection?: () => DiscountSelection | null
}

export function selectSignupDiscountCode(
  codeElement: unknown,
  doc: DiscountDocument | null = typeof document !== 'undefined' ? document : null,
  view: DiscountView | null = typeof window !== 'undefined' ? window : null,
): boolean {
  if (!doc || codeElement == null || typeof doc.createRange !== 'function') return false
  const selection = view?.getSelection?.()
  if (!selection) return false
  const range = doc.createRange()
  range.selectNodeContents(codeElement as Node)
  selection.removeAllRanges()
  selection.addRange(range)
  const focusable = codeElement as { focus?: (options?: { preventScroll?: boolean }) => void }
  if (typeof focusable.focus === 'function') {
    try {
      focusable.focus({ preventScroll: true })
    } catch {
      focusable.focus()
    }
  }
  return true
}

function defaultWriteText(): ((value: string) => Promise<void>) | null {
  if (typeof navigator === 'undefined') return null
  const writeText = navigator.clipboard?.writeText
  if (typeof writeText !== 'function') return null
  return (value: string) => writeText.call(navigator.clipboard, value)
}

export async function copySignupDiscountCode(
  code: string,
  codeElement: unknown,
  deps: SignupDiscountCopyDeps = {},
): Promise<SignupDiscountCopyOutcome> {
  const writeText = Object.prototype.hasOwnProperty.call(deps, 'writeText')
    ? deps.writeText
    : defaultWriteText()
  const selectContents = deps.selectContents ?? ((element: unknown) => selectSignupDiscountCode(element))
  const timeoutMs = deps.timeoutMs ?? SIGNUP_DISCOUNT_CLIPBOARD_TIMEOUT_MS

  if (writeText) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        writeText(code),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('clipboard-timeout')), timeoutMs)
        }),
      ])
      return 'clipboard'
    } catch {
      // The browser blocked the clipboard, or it did not answer in time.
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  if (selectContents(codeElement)) return 'selected'
  return 'failed'
}
