import { after, NextResponse } from 'next/server'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { LOOK_PREVIEW_DEBOUNCE_MS } from '@/lib/look-preview/policy'
import { attachLookPreview, noteLookPreviewSave, processLookPreview } from '@/lib/look-preview/queue'
import { ServiceError } from '@/lib/services/errors'
import {
  getSiteSettingsDashboard,
  updateSiteSettingsDashboard,
} from '@/lib/services/site-settings'

function scheduleLookPreview(repId: string, waitMs: number) {
  after(async () => {
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
    await processLookPreview(repId).catch(() => undefined)
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const settings = await getSiteSettingsDashboard(supabase, repId)
    const preview = await attachLookPreview(repId, settings)
    if (preview.schedule) scheduleLookPreview(repId, LOOK_PREVIEW_DEBOUNCE_MS)
    return NextResponse.json(preview.settings)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.userMessage,
        },
        { status: error.statusCode },
      )
    }

    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repId, supabase } = await getPaidNicNacContext()
    const settings = await updateSiteSettingsDashboard(supabase, repId, body ?? {})
    const preview = await noteLookPreviewSave(repId, settings)
    if (preview.schedule) scheduleLookPreview(repId, LOOK_PREVIEW_DEBOUNCE_MS)

    return NextResponse.json({
      ok: true,
      settings: preview.settings,
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.userMessage,
        },
        { status: error.statusCode },
      )
    }

    throw error
  }
}
