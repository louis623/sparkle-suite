import { after } from 'next/server'

export const BUILD_LIST_SIGNUP_EVENT = 'build_list_signup' as const
export const BUILD_LIST_SIGNUP_SOURCE = 'prelaunch_site' as const

export type BuildListSignupWebhookPayload = {
  event: typeof BUILD_LIST_SIGNUP_EVENT
  leadId: string
  name: string
  email: string
  shopName: string | null
  source: typeof BUILD_LIST_SIGNUP_SOURCE
  createdAt: string
}

type BuildListWebhookConfig = {
  url: string
  key: string
}

let missingConfigLogged = false

function readEnv(name: 'BUILD_LIST_WEBHOOK_URL' | 'BUILD_LIST_WEBHOOK_KEY') {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function resetBuildListWebhookConfigLogForTests() {
  missingConfigLogged = false
}

export function readBuildListWebhookConfig(): BuildListWebhookConfig | null {
  const url = readEnv('BUILD_LIST_WEBHOOK_URL')
  const key = readEnv('BUILD_LIST_WEBHOOK_KEY')
  if (!url || !key) {
    if (!missingConfigLogged) {
      missingConfigLogged = true
      console.warn(
        '[prelaunch/waitlist] Build-list webhook skipped because BUILD_LIST_WEBHOOK_URL and BUILD_LIST_WEBHOOK_KEY are not both set.',
      )
    }
    return null
  }
  return { url, key }
}

export function buildBuildListSignupWebhookPayload(row: {
  id: string
  name: string
  email: string
  created_at?: string | null
}): BuildListSignupWebhookPayload {
  return {
    event: BUILD_LIST_SIGNUP_EVENT,
    leadId: row.id,
    name: row.name,
    email: row.email,
    shopName: null,
    source: BUILD_LIST_SIGNUP_SOURCE,
    createdAt: row.created_at || new Date().toISOString(),
  }
}

async function postBuildListSignupWebhook(
  config: BuildListWebhookConfig,
  payload: BuildListSignupWebhookPayload,
) {
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(
        `[prelaunch/waitlist] Build-list webhook failed: ${response.status}`,
      )
    }
  } catch {
    console.error('[prelaunch/waitlist] Build-list webhook failed.')
  }
}

export function notifyBuildListSignupAfterResponse(
  payload: BuildListSignupWebhookPayload,
) {
  try {
    const config = readBuildListWebhookConfig()
    if (!config) return

    after(() => postBuildListSignupWebhook(config, payload))
  } catch {
    console.error('[prelaunch/waitlist] Build-list webhook schedule failed.')
  }
}
