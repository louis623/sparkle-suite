import { NextResponse } from 'next/server'

import {
  fallbackPreferenceOptions,
  visiblePreferenceOptions,
} from '@/lib/sparkle-suite/jewelry-preferences'
import { loadPreferenceOptions } from '@/lib/sparkle-suite/load-preference-options'

export const dynamic = 'force-dynamic'

/**
 * Public lists for the rep-site homepage favorite pickers.
 * Finder serves the shared lists at
 * https://yoursparklefinder.com/api/public/finder/preference-options.
 * Live Finder still serves options from code until its beta migrations are applied.
 * This route uses that Finder list when SPARKLE_FINDER_PREFERENCE_OPTIONS_URL
 * is set, and otherwise the bundled copy. Hidden options are left out of this
 * response; validators still accept them. If loading throws, this route still
 * answers with the bundled visible copy.
 */
export async function GET() {
  try {
    const loaded = await loadPreferenceOptions()
    return NextResponse.json(
      { options: visiblePreferenceOptions(loaded.options), source: loaded.source },
      { headers: { 'cache-control': 'public, max-age=300' } },
    )
  } catch {
    return NextResponse.json(
      { options: visiblePreferenceOptions(fallbackPreferenceOptions), source: 'fallback' },
      { headers: { 'cache-control': 'public, max-age=60' } },
    )
  }
}
