import { NextResponse } from 'next/server'

import { fallbackPreferenceOptions } from '@/lib/sparkle-suite/jewelry-preferences'
import { loadPreferenceOptions } from '@/lib/sparkle-suite/load-preference-options'

export const dynamic = 'force-dynamic'

/**
 * Public lists for the rep-site homepage favorite pickers.
 * The loader uses the bundled copy unless a Finder URL is configured,
 * and this route still answers with that copy if loading throws.
 */
export async function GET() {
  try {
    const loaded = await loadPreferenceOptions()
    return NextResponse.json(
      { options: loaded.options, source: loaded.source },
      { headers: { 'cache-control': 'public, max-age=300' } },
    )
  } catch {
    return NextResponse.json(
      { options: fallbackPreferenceOptions, source: 'fallback' },
      { headers: { 'cache-control': 'public, max-age=60' } },
    )
  }
}
