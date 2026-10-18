import { describe, expect, it } from 'vitest'

import { buildPrelaunchSafeSmokeStatus } from '@/lib/prelaunch/safe-smoke-status'

describe('prelaunch safe smoke status', () => {
  it('summarizes blocked local smoke prerequisites without provider actions', () => {
    expect(
      buildPrelaunchSafeSmokeStatus({
        activeLaunchBuild: null,
        env: {},
      }),
    ).toEqual([
      {
        key: 'demo_account',
        label: 'Client account',
        status: 'blocked',
        detail: 'No active build is ready for local smoke yet.',
      },
      {
        key: 'stripe_test',
        label: 'Stripe test mode',
        status: 'blocked',
        detail:
          'Missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BUILD_FEE, STRIPE_PRICE_FOUNDER_MONTHLY, STRIPE_PRICE_STANDARD_MONTHLY.',
      },
      {
        key: 'signwell_sandbox',
        label: 'SignWell sandbox',
        status: 'blocked',
        detail:
          'Missing SIGNWELL_API_KEY, SIGNWELL_API_BASE_URL, SIGNWELL_TEMPLATE_ID.',
      },
      {
        key: 'live_actions',
        label: 'Live actions',
        status: 'guarded',
        detail:
          'SMS, live SignWell sends, live Stripe charges, calendar invites, and paid Nic-Nac calls stay off.',
      },
    ])
  })

  it('treats a Stripe test key as ready when prices resolve by lookup key', () => {
    const [stripe] = buildPrelaunchSafeSmokeStatus({
      activeLaunchBuild: null,
      env: {
        STRIPE_SECRET_KEY: 'sk_test_secret',
        STRIPE_WEBHOOK_SECRET: 'whsec_secret',
      },
    }).filter((item) => item.key === 'stripe_test')

    expect(stripe).toEqual({
      key: 'stripe_test',
      label: 'Stripe test mode',
      status: 'ready',
      detail:
        'Test key and webhook secret are present. Sparkle Suite prices resolve by lookup key.',
    })
  })

  it('marks demo, Stripe test, and SignWell sandbox ready when safe prerequisites exist', () => {
    expect(
      buildPrelaunchSafeSmokeStatus({
        activeLaunchBuild: {
          leadName: 'Sparkle Demo Lead',
          repId: 'rep-demo',
          status: 'ready',
        },
        env: {
          STRIPE_SECRET_KEY: 'sk_test_secret',
          STRIPE_WEBHOOK_SECRET: 'whsec_secret',
          STRIPE_PRICE_BUILD_FEE: 'price_build',
          STRIPE_PRICE_FOUNDER_MONTHLY: 'price_founder',
          STRIPE_PRICE_STANDARD_MONTHLY: 'price_standard',
          SIGNWELL_API_KEY: 'signwell_api_key',
          SIGNWELL_API_BASE_URL: 'https://www.signwell.com/api/v1',
          SIGNWELL_TEMPLATE_ID: 'template_demo',
        },
      }),
    ).toEqual([
      {
        key: 'demo_account',
        label: 'Client account',
        status: 'ready',
        detail: 'Sparkle Demo Lead is connected and ready for local smoke.',
      },
      {
        key: 'stripe_test',
        label: 'Stripe test mode',
        status: 'ready',
        detail: 'Test key, webhook secret, and Sparkle Suite test prices are present.',
      },
      {
        key: 'signwell_sandbox',
        label: 'SignWell sandbox',
        status: 'ready',
        detail: 'Sandbox payload config is present; sending still stays disabled.',
      },
      {
        key: 'live_actions',
        label: 'Live actions',
        status: 'guarded',
        detail:
          'SMS, live SignWell sends, live Stripe charges, calendar invites, and paid Nic-Nac calls stay off.',
      },
    ])
  })
})
