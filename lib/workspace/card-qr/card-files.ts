import { readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
import type { CardQrDesign } from '@/lib/workspace/card-qr/design'
import { FlyerQrDecodeError, assertFlyerQrDecodes } from '@/lib/workspace/card-qr/flyer-decode'
import { resolveBizcard, type BizcardKey } from '@/lib/workspace/card-qr/bizcard-themes'
import { bizcardFrontCopy, bizcardName, bizcardSocial, bizcardWebsite } from '@/lib/workspace/card-qr/bizcard-copy'
import { buildBizcardPrintPdf, renderBizcardBack, renderBizcardFront } from '@/lib/workspace/card-qr/bizcard-render'
import { requireCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'
import type { loadCardQrContext } from '@/lib/workspace/card-qr/context'

type Context = Awaited<ReturnType<typeof loadCardQrContext>>
export type CardQrCardOutput = 'front' | 'back' | 'pdf'

export type CardQrCardFiles =
  | { status: 'being_built' }
  | { status: 'unknown_theme' }
  | { status: 'decode_failed'; key: BizcardKey; decoded: string | null }
  | { status: 'too_full'; key: BizcardKey; warnings: string[] }
  | { status: 'ok'; key: BizcardKey; front: Buffer | null; back: Buffer | null; pdf: Buffer | null; warnings: string[] }

/**
 * One renderer for the card preview, the PDF download and the approved proof snapshot,
 * so the printer gets exactly what the rep saw.
 */
export async function renderCardQrCardFiles(context: Context, design: CardQrDesign, theme: unknown, output: CardQrCardOutput): Promise<CardQrCardFiles> {
  const override = readCardQrDesignTheme(theme, context.settings.appearancePreset)
  const resolved = override
    ? resolveBizcard({ appearancePreset: override })
    : resolveBizcard({
        appearancePreset: context.settings.appearancePreset,
        publicSiteSlug: context.rep.public_site_slug,
        customDomain: context.customDomain,
      })
  if (resolved.status === 'being_built') return { status: 'being_built' }
  if (resolved.status !== 'ready') return { status: 'unknown_theme' }
  const key = resolved.key
  const qrUrl = requireCardQrShortUrl(context.origin, context.repId)
  const front = output === 'back'
    ? null
    : await renderBizcardFront({ key, ...bizcardFrontCopy({ ...context.settings, fullName: resolved.fullName }) })
  const social = bizcardSocial(context.settings.socialHandles, design.socialPlatform)
  const back = output === 'front'
    ? null
    : await renderBizcardBack({
        key,
        qrUrl,
        qrIcon: design.qrIcon,
        fields: design.fields,
        name: bizcardName(context.settings.displayName, resolved.fullName),
        email: context.settings.email,
        website: bizcardWebsite(context.customDomain),
        textLinkNumber: design.textLinkNumber,
        social: social.handle,
        socialPlatform: social.platform,
      })
  if (back) {
    const t = back.layout.tile
    try {
      await assertFlyerQrDecodes(back.png, qrUrl, { x: t.x, y: t.y, width: t.size, height: t.size })
    } catch (error) {
      return { status: 'decode_failed', key, decoded: error instanceof FlyerQrDecodeError ? error.decoded : null }
    }
  }
  if (output === 'pdf' && back?.overflow) return { status: 'too_full', key, warnings: back.warnings }
  const pdf = output === 'pdf' && front && back ? await buildBizcardPrintPdf({ front: front.png, back: back.png }) : null
  return { status: 'ok', key, front: front?.png ?? null, back: back?.png ?? null, pdf, warnings: back?.warnings ?? [] }
}
