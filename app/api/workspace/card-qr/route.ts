import { NextResponse } from 'next/server'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import { resolveBizcard } from '@/lib/workspace/card-qr/bizcard-themes'
import {
  cardQrErrorResponse,
  loadCardQrContext,
} from '@/lib/workspace/card-qr/context'
import {
  readCardQrProfile,
  saveCardQrProfile,
} from '@/lib/workspace/card-qr/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function profilePayload(input: {
  destinationUrl: string
  settings: {
    displayName: string
    businessName: string
    email: string
    appearancePreset: string
    socialHandles: Record<string, string>
  }
  profile: Awaited<ReturnType<typeof readCardQrProfile>>['profile']
  persistence: 'database' | 'unavailable'
  siteCardKey?: string | null
}) {
  return {
    destinationUrl: input.destinationUrl,
    displayName: input.settings.displayName,
    businessName: input.settings.businessName,
    email: input.settings.email,
    appearancePreset: input.settings.appearancePreset,
    socialHandles: input.settings.socialHandles,
    profile: input.profile,
    persistence: input.persistence,
    siteCardKey: input.siteCardKey ?? null,
  }
}

function siteCardKey(context: Awaited<ReturnType<typeof loadCardQrContext>>) {
  const resolved = resolveBizcard({
    appearancePreset: context.settings.appearancePreset,
    publicSiteSlug: context.rep.public_site_slug,
    customDomain: context.customDomain,
  })
  return resolved.status === 'ready' ? resolved.key : null
}

export async function GET(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const loaded = await readCardQrProfile(context.supabase, context.repId)
    return NextResponse.json(
      profilePayload({
        destinationUrl: context.destinationUrl,
        settings: context.settings,
        profile: loaded.profile,
        persistence: loaded.persistence,
        siteCardKey: siteCardKey(context),
      }),
    )
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    const context = await loadCardQrContext(request)
    const body = await request.json().catch(() => {
      throw new SyntaxError('Invalid request payload.')
    })
    const design = parseCardQrDesign(
      body && typeof body === 'object' ? (body as { design?: unknown }).design : null,
    )
    const saved = await saveCardQrProfile(context.supabase, {
      repId: context.repId,
      destinationUrl: context.destinationUrl,
      appearancePreset: context.settings.appearancePreset,
      design,
    })

    return NextResponse.json({
      ok: true,
      ...profilePayload({
        destinationUrl: context.destinationUrl,
        settings: context.settings,
        profile: saved.profile,
        persistence: saved.persistence,
      }),
      design,
      iconStored: saved.iconStored,
      cardStored: saved.cardStored,
      notice:
        saved.persistence === 'database'
          ? 'Saved to your profile.'
          : 'Saved in this browser. The Smoke profile table is not on this database yet.',
    })
  } catch (error) {
    return cardQrErrorResponse(error)
  }
}
