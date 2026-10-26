import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    // Existing renderer suites exercise V2. The rollout suite explicitly
    // unsets this test-only value to prove the application's deny-by-default.
    env: { REP_RENDER_V2_SLUGS: '*' },
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'server-only': resolve(__dirname, 'tests/server-only.ts'),
    },
  },
})
