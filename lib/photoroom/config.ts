import { z } from 'zod'

import type { PhotoroomProviderConfig } from '@/lib/services/photo-enhancement-types'

const photoroomEnvSchema = z.object({
  PHOTOROOM_API_KEY: z.string().min(1),
  PHOTOROOM_API_BASE_URL: z.string().url().optional(),
  PHOTOROOM_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
})

type CachedPhotoroomConfig = {
  config: PhotoroomProviderConfig | null
  enabled: boolean
  cacheKey: string
}

let cached: CachedPhotoroomConfig | null = null

function getCacheKey() {
  return JSON.stringify({
    apiKey: process.env.PHOTOROOM_API_KEY ?? null,
    baseUrl: process.env.PHOTOROOM_API_BASE_URL ?? null,
    timeoutMs: process.env.PHOTOROOM_TIMEOUT_MS ?? null,
    nextPhase: process.env.NEXT_PHASE ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  })
}

function loadPhotoroomConfig(): {
  config: PhotoroomProviderConfig | null
  enabled: boolean
} {
  const cacheKey = getCacheKey()
  if (cached?.cacheKey === cacheKey) {
    return cached
  }

  const result = photoroomEnvSchema.safeParse(process.env)
  if (result.success) {
    cached = {
      config: {
        provider: 'photoroom',
        apiKey: result.data.PHOTOROOM_API_KEY,
        baseUrl: result.data.PHOTOROOM_API_BASE_URL ?? 'https://image-api.photoroom.com',
        timeoutMs: result.data.PHOTOROOM_TIMEOUT_MS ?? 8000,
      },
      enabled: true,
      cacheKey,
    }
    return cached
  }

  if (process.env.NEXT_PHASE === 'phase-production-build') {
    cached = { config: null, enabled: false, cacheKey }
    return cached
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[photoroom] Missing required environment variables in production:',
      result.error.flatten().fieldErrors,
    )
    cached = { config: null, enabled: false, cacheKey }
    return cached
  }

  console.warn(
    '[photoroom] Photoroom not configured - enhancement routes will stay disabled:',
    result.error.flatten().fieldErrors,
  )
  cached = { config: null, enabled: false, cacheKey }
  return cached
}

export function getPhotoroomConfig(): PhotoroomProviderConfig | null {
  return loadPhotoroomConfig().config
}

export function isPhotoroomEnabled(): boolean {
  return loadPhotoroomConfig().enabled
}

export function resetPhotoroomConfigCacheForTests() {
  cached = null
}
