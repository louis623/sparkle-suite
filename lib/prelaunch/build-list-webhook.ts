import { after } from 'next/server'

export const BUILD_LIST_SIGNUP_EVENT = 'build_list_signup' as const
export const BUILD_LIST_SIGNUP_SOURCE = 'prelaunch_site' as const

export type BuildListSignupWebhookPayload = {
  event: typeof BUILD_LIST_SIGNUP_EVENT
  leadId: string
  name: string
  email: string
  phone: string | null
  tiktokHandle: string | null
  teamRepName: string | null
  setupPain: string | null
  smsConsent: boolean
  emailConsent: boolean
  shopName: string | null
  source: typeof BUILD_LIST_SIGNUP_SOURCE
  sourceDetail: string | null
  createdAt: string
}

export type BuildListSignupRow = {
  id: string
  name: string
  email: string
  phone?: string | null
  tiktok_handle?: string | null
  team_rep_name?: string | null
  setup_pain?: string | null
  sms_consent?: boolean | null
  email_consent?: boolean | null
  source?: string | null
  created_at?: string | null
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

function emptyToNull(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function buildBuildListSignupWebhookPayload(
  row: BuildListSignupRow,
): BuildListSignupWebhookPayload {
  return {
    event: BUILD_LIST_SIGNUP_EVENT,
    leadId: row.id,
    name: row.name,
    email: row.email,
    phone: emptyToNull(row.phone),
    tiktokHandle: emptyToNull(row.tiktok_handle),
    teamRepName: emptyToNull(row.team_rep_name),
    setupPain: emptyToNull(row.setup_pain),
    smsConsent: row.sms_consent === true,
    emailConsent: row.email_consent === true,
    shopName: null,
    source: BUILD_LIST_SIGNUP_SOURCE,
    sourceDetail: emptyToNull(row.source),
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
      signal: AbortSignal.timeout(5000),
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

    after(async () => {
      try {
        await postBuildListSignupWebhook(config, payload)
      } catch (error) {
        console.error('[prelaunch/waitlist] Build-list webhook failed.', error)
      }
    })
  } catch {
    console.error('[prelaunch/waitlist] Build-list webhook schedule failed.')
  }
}
