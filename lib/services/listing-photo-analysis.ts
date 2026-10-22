import { analyzeServerImageQuality } from './server-image-quality'
import { ServiceError } from './errors'

/** Wait for the read-only check before any photo upload or listing mutation.
 * Only analysis is raced: a late result can never resume the save after timeout.
 */
export async function analyzeListingPhoto(bytes: Uint8Array) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      analyzeServerImageQuality(bytes),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Photo analysis deadline exceeded')), 20_000)
      }),
    ])
  } catch (cause) {
    throw new ServiceError({
      code: 'LISTING_PHOTO_ANALYSIS_UNAVAILABLE',
      message: 'Listing photo analysis failed',
      userMessage: "I couldn't read that photo, so I haven't saved this piece. Please send the jewelry photo again.",
      statusCode: 503,
      cause,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}
