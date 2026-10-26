import { NextResponse } from 'next/server'

import {
  fallbackPreferenceOptions,
  preferenceOptionsPayload,
} from '@/lib/sparkle-suite/jewelry-preferences'
import { loadPreferenceOptions } from '@/lib/sparkle-suite/load-preference-options'

export const dynamic = 'force-dynamic'

/**
 * Public lists for the rep-site homepage favorite pickers.
 * Finder serves the shared lists at
 * https://yoursparklefinder.com/api/public/finder/preference-options.
 * Live Finder still serves options from code until its beta migrations are applied.
 * This route uses that Finder list when SPARKLE_FINDER_PREFERENCE_OPTIONS_URL
 * is set, and otherwise the bundled copy. Hidden ids stay in this payload
 * with isHidden: true. Pickers skip them unless the customer already saved one.
 * If loading throws, this route still answers with the bundled copy.
 */
export async function GET() {
  try {
    const loaded = await loadPreferenceOptions()
    return NextResponse.json(
      { options: preferenceOptionsPayload(loaded.options), source: loaded.source },
      { headers: { 'cache-control': 'public, max-age=300' } },
    )
  } catch {
    return NextResponse.json(
      { options: preferenceOptionsPayload(fallbackPreferenceOptions), source: 'fallback' },
      { headers: { 'cache-control': 'public, max-age=60' } },
    )
  }
}
