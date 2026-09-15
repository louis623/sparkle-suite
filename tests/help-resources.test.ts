import { describe, expect, it } from 'vitest'

import { getHelpResources } from '@/lib/services/help-resources'

describe('help resources', () => {
  it('defaults to the launch Workflow Playbook guides before feature references', () => {
    const resources = getHelpResources()
    const workflowTitles = resources
      .filter((resource) => resource.type === 'workflow')
      .map((resource) => resource.title)

    expect(workflowTitles).toEqual([
      'Start here: Learn your Sparkle Suite workspace',
      'Finish setup and approve your customer site',
      'Update your customer-facing site',
      'Embed a TikTok video on your customer-facing site',
      'Get ready for a live show',
      'Use Live Queue during a show',
      'Use Live Lineup on a Mac',
      'Add a dancer to your Dance Floor',
      'Handle trade requests',
      'Manage customers and updates',
      'Billing and account basics',
      'Share your referral code',
      'Fix something or ask for help',
    ])

    const firstFeatureIndex = resources.findIndex(
      (resource) => resource.type === 'feature_reference',
    )
    const lastWorkflowIndex = resources.reduce(
      (lastIndex, resource, index) =>
        resource.type === 'workflow' ? index : lastIndex,
      -1,
    )

    expect(firstFeatureIndex).toBeGreaterThan(lastWorkflowIndex)
  })

  it('gives every workflow guide the standard operator-manual fields', () => {
    const workflows = getHelpResources().filter((resource) => resource.type === 'workflow')

    expect(workflows.length).toBe(13)

    for (const workflow of workflows) {
      expect(workflow.group).toMatch(/Setup|Live Shows|Dance Floor|Customers & Account|Help/)
      expect(workflow.goal).toBeTruthy()
      expect(workflow.useWhen).toBeTruthy()
      expect(workflow.beforeYouStart.length).toBeGreaterThanOrEqual(1)
      expect(workflow.steps.length).toBeGreaterThanOrEqual(3)
      expect(workflow.goodResult).toBeTruthy()
      expect(workflow.nicNacPrompt).toMatch(/\w/)
      expect(workflow.stillStuck).toBeTruthy()
    }
  })

  it('keeps a compact Feature Index underneath the workflows', () => {
    const featureReferences = getHelpResources()
      .filter((resource) => resource.type === 'feature_reference')
      .map((resource) => resource.title)

    expect(featureReferences).toEqual([
      'Customer Site',
      'Dance Floor',
      'Live Queue',
      'Live Event Calendar',
      'Email Updates',
      'SMS Updates',
      'Nic-Nac',
      'Billing',
      'Account / Settings',
    ])
  })

  it('covers the launch workflow video slots', () => {
    const resources = getHelpResources()

    const requiredVideoResourceIds = [
      'start-here-workspace',
      'update-customer-site',
      'add-jewelry-to-trade-board',
    ]

    for (const resourceId of requiredVideoResourceIds) {
      expect(resources.find((resource) => resource.id === resourceId)?.video).toMatchObject({
        provider: 'youtube',
        status: 'placeholder',
      })
    }
  })

  it('surfaces Live Queue rollout guidance for rep-facing searches', () => {
    const liveQueueResources = getHelpResources('live queue')
    const combinedText = liveQueueResources
      .map((resource) =>
        [
          resource.category,
          resource.title,
          resource.summary,
          resource.body,
          ...resource.quickActions,
        ].join(' '),
      )
      .join(' ')

    expect(liveQueueResources.length).toBeGreaterThanOrEqual(2)
    expect(combinedText).toContain('Nic-Nac')
    expect(combinedText).toContain('sync code')
    expect(combinedText).toContain('Party Filter')
    expect(combinedText).toContain('extension status')
    expect(combinedText).toContain('Web Store')
    expect(combinedText).toContain('unpacked')
    expect(combinedText).toContain('stale')
    expect(combinedText).toContain('empty')
  })

  it('gives reps a complete TikTok customer-site embed workflow', () => {
    const guide = getHelpResources('TikTok embed customer site')
      .find((resource) => resource.id === 'embed-tiktok-video-on-customer-site')

    expect(guide).toMatchObject({
      type: 'workflow',
      category: 'Customer Site',
      title: 'Embed a TikTok video on your customer-facing site',
    })
    expect(guide?.steps).toEqual([
      'Open the individual TikTok video you want customers to watch.',
      'Choose Share, then Embed, and copy the TikTok embed code. You can instead copy that individual video\'s full TikTok link.',
      'In the Sparkle Suite workspace, open Site Settings.',
      'Find Homepage photos and videos.',
      'Choose Showcase video for the main homepage feature, or choose About short video 1, 2, or 3 for a portrait video below your About story.',
      'Paste the TikTok embed code or full individual-video link into TikTok embed code or video URL.',
      'Wait for the auto-save indicator to confirm the change saved.',
      'Open Preview customer site and play the video to confirm it appears in the selected spot.',
    ])
    expect(guide?.body).toContain('profile link will not create a video embed')
    expect(guide?.nicNacPrompt).toContain('Showcase video or one of my three About short-video spots')
  })

  it('keeps Live Queue guidance honest about rollout and Web Store readiness', () => {
    const liveQueueText = getHelpResources('live queue')
      .map((resource) => [resource.title, resource.summary, resource.body].join(' '))
      .join(' ')

    expect(liveQueueText).toContain('coming soon or launch-gated')
    expect(liveQueueText).toContain('Web Store')
    expect(liveQueueText).not.toContain('fully live for every rep')
  })

  it('gives Mac users a complete Chrome setup path for Live Lineup', () => {
    const guide = getHelpResources('Mac Chrome Live Lineup')
      .find((resource) => resource.id === 'use-live-lineup-on-a-mac')

    expect(guide).toMatchObject({
      type: 'workflow',
      group: 'Live Shows',
      category: 'Live Queue',
      title: 'Use Live Lineup on a Mac',
      nicNacPrompt: 'Help me set up Live Lineup on my Mac.',
    })

    const guideText = [
      guide?.summary,
      guide?.body,
      ...(guide?.steps ?? []),
      guide?.goodResult,
      guide?.stillStuck,
    ].join(' ')

    expect(guideText).toContain('do not need a Windows PC')
    expect(guideText).toContain('google.com/chrome')
    expect(guideText).toContain('Open Chrome Web Store')
    expect(guideText).toContain('Party Orders')
    expect(guideText).toContain('iPhone or iPad')
    expect(guideText).toContain('Never send a private connection key in chat')
    expect(guide?.beforeYouStart).toContain(
      'A MacBook, iMac, or other Mac desktop. This needs Chrome on a computer, not an iPhone or iPad.',
    )
  })

  it('keeps Email and SMS update guidance honest about readiness', () => {
    const updateText = getHelpResources('email sms updates')
      .map((resource) => [resource.title, resource.summary, resource.body].join(' '))
      .join(' ')

    expect(updateText).toContain('coming soon or sandbox')
    expect(updateText).toContain('opted-in')
    expect(updateText).not.toContain('send production texts now')
  })

  it.each([
    ['sync code', 'use-live-queue-during-show'],
    ['Party Filter', 'use-live-queue-during-show'],
    ['Web Store', 'use-live-queue-during-show'],
    ['unpacked', 'use-live-queue-during-show'],
    ['stale queue', 'use-live-queue-during-show'],
    ['empty queue', 'use-live-queue-during-show'],
  ])('retrieves Live Queue help for "%s"', (query, expectedResourceId) => {
    expect(getHelpResources(query).map((resource) => resource.id)).toContain(expectedResourceId)
  })

  it('documents the custom domain forwarding policy and Nic-Nac support boundary', () => {
    const resource = getHelpResources()
      .find((helpResource) => helpResource.id === 'domain-forwarding')

    expect(resource).toMatchObject({
      category: 'Site settings',
      title: expect.stringContaining('domain'),
    })

    const combinedText = [
      resource?.summary,
      resource?.body,
      ...(resource?.quickActions ?? []),
    ].join(' ')

    expect(combinedText).toContain('yoursparklesuite.com/yourshowname')
    expect(combinedText).toContain('forwarding/redirect')
    expect(combinedText).toContain('do not use masked forwarding')
    expect(combinedText).toContain('premium tech help')
    expect(combinedText).toContain('Nic-Nac')
    expect(combinedText).toContain('provider-specific DNS setup')
  })

  it('documents flexible dancer intake with only the real photo/readability boundaries', () => {
    const guide = getHelpResources('add jewelry dance floor boxed display clear centered')
      .find((resource) => resource.id === 'add-jewelry-to-trade-board')

    expect(guide).toMatchObject({
      type: 'workflow',
      group: 'Dance Floor',
      title: 'Add a dancer to your Dance Floor',
      nicNacPrompt: 'Help me add a dancer to my Dance Floor.',
    })

    expect(guide?.steps).toEqual([
      'Open the Dance Floor and choose Add dancer, or tell Nic-Nac: “Help me add a dancer to my Dance Floor.”',
      'Send the item number or a readable item-info tag/photo so Nic-Nac can identify the dancer.',
      'Send a clear, close, centered photo of the jewelry itself. This is the photo customers will see on your Dance Floor.',
      'Let Nic-Nac check the jewelry database. It will use what you already sent and ask only for anything still missing.',
      'If Nic-Nac finds the dancer, confirm the match. If it cannot find it, send the missing details it asks for. For a ring, add the size if Nic-Nac asks for it.',
      'Review the dancer details and customer-facing photo. When they look right, confirm the add.',
    ])

    expect(guide?.body).toContain('item-info tag or label tells Nic-Nac which dancer it is')
    expect(guide?.body).toContain('photo customers see on the Dance Floor')
    expect(guide?.body).toContain('They do two different jobs')
    expect(guide?.body).toContain('A boxed display photo works')
    expect(guide?.beforeYouStart).toContain('Ring size, if it is a ring and you have the size')
    expect(guide?.body).not.toContain('packaging photos are not final board photos')
    expect(guide?.body).not.toContain('white background')
    expect(guide?.quickActions).toContain('Add a dancer to Dance Floor')
  })

  it('documents the customer reveal screenshot flow for trade requests', () => {
    const guide = getHelpResources('trade request reveal screenshot')
      .find((resource) => resource.id === 'handle-trade-requests')

    expect(guide).toMatchObject({
      type: 'workflow',
      group: 'Dance Floor',
      category: 'Trade Requests',
      title: 'Handle trade requests',
      nicNacPrompt: 'Help me handle my trade requests.',
    })

    const combinedText = [
      guide?.summary,
      guide?.body,
      ...(guide?.beforeYouStart ?? []),
      ...(guide?.steps ?? []),
      guide?.goodResult,
      guide?.stillStuck,
      ...(guide?.quickActions ?? []),
    ].join(' ')

    expect(combinedText).toContain('Customers describe the dancer they just revealed')
    expect(combinedText).toContain('recommended reveal screenshot')
    expect(combinedText).toContain('Dance Floor request inbox')
    expect(combinedText).toContain('Nic-Nac trade request cards')
    expect(combinedText).toContain('expires after 48 hours')
    expect(combinedText).toContain('same collection and same jewelry type')
    expect(combinedText).toContain('just-revealed item number')
    expect(combinedText).toContain('A missing screenshot alone should not block the trade')
    expect(guide?.quickActions).toContain('View reveal screenshot')
  })

  it.each([
    'domain',
    'forwarding',
    'custom domain',
  ])('retrieves domain forwarding help for "%s"', (query) => {
    expect(getHelpResources(query).map((resource) => resource.id)).toContain('domain-forwarding')
  })
})
