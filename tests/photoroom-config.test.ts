import { afterEach, describe, expect, it } from 'vitest'

import {
  getPhotoroomConfig,
  isPhotoroomEnabled,
  resetPhotoroomConfigCacheForTests,
} from '@/lib/photoroom/config'

const ORIGINAL_ENV = {
  PHOTOROOM_API_KEY: process.env.PHOTOROOM_API_KEY,
  PHOTOROOM_API_BASE_URL: process.env.PHOTOROOM_API_BASE_URL,
  PHOTOROOM_TIMEOUT_MS: process.env.PHOTOROOM_TIMEOUT_MS,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PHASE: process.env.NEXT_PHASE,
}
const mutableEnv = process.env as Record<string, string | undefined>

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  resetPhotoroomConfigCacheForTests()
}

describe('photoroom config', () => {
  afterEach(() => {
    restoreEnv()
  })

  it('stays disabled in development when the API key is missing', () => {
    delete mutableEnv.PHOTOROOM_API_KEY
    delete mutableEnv.PHOTOROOM_API_BASE_URL
    delete mutableEnv.PHOTOROOM_TIMEOUT_MS
    mutableEnv.NODE_ENV = 'development'
    delete mutableEnv.NEXT_PHASE
    resetPhotoroomConfigCacheForTests()

    expect(isPhotoroomEnabled()).toBe(false)
    expect(getPhotoroomConfig()).toBeNull()
  })

  it('loads a normalized config when the required env is present', () => {
    mutableEnv.PHOTOROOM_API_KEY = 'phot_test_123'
    mutableEnv.PHOTOROOM_API_BASE_URL = 'https://image-api.photoroom.test'
    mutableEnv.PHOTOROOM_TIMEOUT_MS = '9500'
    mutableEnv.NODE_ENV = 'development'
    delete mutableEnv.NEXT_PHASE
    resetPhotoroomConfigCacheForTests()

    expect(isPhotoroomEnabled()).toBe(true)
    expect(getPhotoroomConfig()).toEqual({
      apiKey: 'phot_test_123',
      baseUrl: 'https://image-api.photoroom.test',
      timeoutMs: 9500,
      provider: 'photoroom',
    })
  })

  it('keeps the core photo pipeline available when optional production enhancement is unconfigured', () => {
    delete mutableEnv.PHOTOROOM_API_KEY
    mutableEnv.NODE_ENV = 'production'
    delete mutableEnv.NEXT_PHASE
    resetPhotoroomConfigCacheForTests()

    expect(isPhotoroomEnabled()).toBe(false)
    expect(getPhotoroomConfig()).toBeNull()
  })
})
