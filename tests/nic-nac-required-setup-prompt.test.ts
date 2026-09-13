import { describe, expect, it } from 'vitest'
import { buildNicNacSystemPrompt } from '@/lib/nic-nac/prompt-builder'
import { buildRequiredSetupPrompt } from '@/lib/nic-nac/required-setup-prompt'

describe('required Nic-Nac setup prompt', () => {
  it('requires chat-based setup and brand-safe unlock', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('one question at a time')
    expect(prompt).toContain('Do not send the rep to an old checklist')
    expect(prompt).toContain(
      'Do not unlock the full dashboard until every required setup step is complete',
    )
    expect(prompt).toContain('rep has approved the final preview')
    expect(prompt).toContain('About page')
    expect(prompt).toContain('Dance Floor orientation')
    expect(prompt).toContain('The Light Box is ordered by Sparkle Suite after payment')
    expect(prompt).toContain('repApprovedPreview')
    expect(prompt).not.toContain('populate the Dance Floor before unlock')
  })

  it('uses clear account-basics language for customer-facing setup fields', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain(
      'What name do you want shown on your Sparkle Suite customer-facing website?',
    )
    expect(prompt).toContain('Ask one field at a time')
    expect(prompt).toContain('Do not dump the account-basics fields as a checklist')
    expect(prompt).toContain('Do not re-welcome the rep after they answer')
    expect(prompt).toContain(
      'If the latest user message answers "What should I call you?"',
    )
    expect(prompt).toContain(
      'Do not ask "What should I call you?" a second time',
    )
    expect(prompt).toContain(
      'Thanks, Jane. What name do you want shown on your Sparkle Suite customer-facing website?',
    )
    expect(prompt).toContain('What is your live show name?')
    expect(prompt).toContain('Bomb Party rep store link')
    expect(prompt).toContain('link customers use to shop or order from you')
    expect(prompt).toContain('Main live-show or social-media link')
    expect(prompt).toContain('conversationName')
    expect(prompt).toContain('customerFacingDisplayName')
    expect(prompt).toContain('liveShowName')
    expect(prompt).toContain('bombPartyRepStoreLink')
    expect(prompt).toContain(
      'After these account basics are captured, summarize them and ask the rep to confirm before marking account_basics complete',
    )
    expect(prompt).toContain(
      'Do not advance to the customer-facing site theme until the rep confirms the account basics summary',
    )
    expect(prompt).toContain(
      'Does that all look right before we choose the theme for your customer-facing site?',
    )
    expect(prompt).not.toContain('display name, business name, best contact detail, shop link')
    expect(prompt).not.toContain('Your business name')
    expect(prompt).not.toContain('Link to your shop or website')
  })

  it('offers customer-facing site theme choices without changing the workspace theme', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('Customer-facing site theme')
    expect(prompt).toContain('The app shows customer-facing Look cards automatically')
    expect(prompt).toContain('The Sparkle Suite Workspace keeps the standard workspace theme')
    expect(prompt).toContain('save the matching appearancePreset')
    expect(prompt).not.toContain('Do not offer theme, skin, or Look choices')
    expect(prompt).not.toContain('locked Morganite confirmation panel')
    expect(prompt).not.toContain('appearancePreset: "sparkle_suite_morganite"')
  })

  it('keeps welcome-copy setup from asking redundant tagline and intro questions', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain(
      'Welcome copy: capture a headline and one supporting welcome line',
    )
    expect(prompt).toContain(
      'Do not ask for both a tagline and a separate intro or welcome message if the rep already gave a usable supporting line',
    )
    expect(prompt).toContain(
      'If the rep says they already gave the welcome copy, reuse the prior answer instead of asking again',
    )
    expect(prompt).toContain(
      'Example: after "All are welcome. Enjoy the fizz, the bling, the sparkle, and the glam.", save it as the supporting welcome line',
    )
    expect(prompt).not.toContain('Welcome copy: tagline, banner, and customer-facing intro.')
  })

  it('requires About page options to preserve the rep-specific details', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain(
      'About page: preserve the rep-specific facts, names, humor, voice, and memorable details',
    )
    expect(prompt).toContain(
      'Do not replace concrete details with generic jewelry-show filler',
    )
    expect(prompt).toContain(
      'Do not complete the About page immediately after free-talk',
    )
    expect(prompt).toContain(
      'Show 2 or 3 polished About page choices and ask the rep to pick, blend, or revise',
    )
    expect(prompt).toContain(
      'After the rep picks or approves an About option, save the selected About copy and move on',
    )
    expect(prompt).toContain(
      'If the rep mentions being Gracie Bott, older, rescued from the shelter, running the household, banana and papaya habits, or wanting support for her cause, those details must appear in the About choices',
    )
    expect(prompt).toContain(
      'If an About draft drops the specifics the rep gave, rewrite it before showing it',
    )
    expect(prompt).not.toContain(
      'About page: invite the rep to free-talk, then turn that into 2 or 3 polished About page choices.',
    )
  })

  it('requires support escalation when Live Queue setup is blocked', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('Live Queue setup')
    expect(prompt).toContain('Live Queue is not optional')
    expect(prompt).toContain('If Live Queue setup is blocked')
    expect(prompt).toContain('Secret Rep ID Number')
    expect(prompt).toContain('use its private publisher pairing controls')
    expect(prompt).toContain('Never request, repeat, invent, or send a private publisher key through chat')
    expect(prompt).toContain('legacy identity references, not v2 publisher keys or proof of connection')
    expect(prompt).toContain('the upgraded publisher extension is required')
    expect(prompt).toContain(
      'Do not mark Live Queue setup complete from vague replies like yes, okay, install now, or set it up now',
    )
    expect(prompt).toContain('server rechecks fresh source readiness at completion')
    expect(prompt).toContain('answer: {}, and completeStep: true')
    expect(prompt).toContain('A valid empty Party Orders table can be ready')
    expect(prompt).toContain('Announce completion only after that tool succeeds')
    expect(prompt).toContain('Never re-open an already completed Live Queue setup')
    expect(prompt).toContain(
      'https://chromewebstore.google.com/detail/sparkle-suite-live-queue/kmodgfffflplfdlkkhadgimmobplhoih',
    )
    expect(prompt).toContain('Do not ask the rep to search')
    expect(prompt).toContain('request_required_setup_support')
    expect(prompt).toContain('notify Louis or support')
    expect(prompt).not.toContain('extension code')
    expect(prompt).not.toContain('generate a sync code')
    expect(prompt).not.toContain('come back later')
    expect(prompt).not.toContain('before your first live show')
    expect(prompt).not.toContain('Live Queue orientation')
  })

  it('does not include email and SMS updates as a required setup step', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).not.toContain('Email and SMS update readiness')
    expect(prompt).not.toContain('Do not send live customer messages during required setup')
    expect(prompt).not.toContain('update readiness')
  })

  it('requires the final preview approval panel without guessing link location', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('Do not guess where the preview link is')
    expect(prompt).toContain('The app shows the preview approval panel automatically')
    expect(prompt).toContain('Approve preview and unlock workspace')
    expect(prompt).toContain(
      'When the rep approves the final preview, call unlock_required_setup with repApprovedPreview: true',
    )
    expect(prompt).not.toContain('look for a preview link')
    expect(prompt).not.toContain('somewhere on this page')
  })

  it('keeps setup voice concise and avoids repetitive filler', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('Do not overuse Perfect')
    expect(prompt).toContain('Do not use Perfect more than once during required setup')
    expect(prompt).toContain('Do not begin setup transitions with "Perfect. Now"')
    expect(prompt).toContain(
      'Never output run-together sentence pairs like Perfect.Now, options:Here, or right away.I',
    )
    expect(prompt).toContain(
      'If support notification fails, explain the next support step without run-together sentences',
    )
    expect(prompt).toContain(
      'Use short confirmations like Got it, Thanks, That is saved, or We will use that',
    )
    expect(prompt).toContain('Do not amplify hype claims')
    expect(prompt).toContain(
      'Use customer-facing website, Sparkle Suite Workspace, Live Queue, Dance Floor, and customer-facing site theme',
    )
    expect(prompt).not.toContain('LiveQ')
    expect(prompt).not.toContain('TradeBoard')
  })

  it('explains Dance Floor and Light Box clearly before unlock', () => {
    const prompt = buildRequiredSetupPrompt()

    expect(prompt).toContain('Light Box')
    expect(prompt).toContain('The Light Box is ordered by Sparkle Suite after payment')
    expect(prompt).toContain(
      'The Light Box helps with consistent jewelry photos when a piece is not in the master jewelry library',
    )
    expect(prompt).toContain(
      'Do not require any Dance Floor inventory before unlock',
    )
    expect(prompt).toContain(
      'Dance Floor helps reps organize customer trade requests instead of chasing DMs, comments, and screenshots',
    )
  })

  it('adds required setup instructions without workspace tool sections in setup mode', () => {
    const prompt = buildNicNacSystemPrompt({
      mode: 'required_setup',
      intents: ['required_setup'],
      activeToolNames: [
        'get_required_setup_state',
        'ensure_live_queue_sync_code',
        'save_required_setup_answer',
        'request_required_setup_support',
        'unlock_required_setup',
      ],
    })

    expect(prompt).toContain('Required Nic-Nac setup mode')
    expect(prompt).toContain('ensure_live_queue_sync_code')
    expect(prompt).toContain('save_required_setup_answer')
    expect(prompt).toContain('unlock_required_setup')
    expect(prompt).toContain('Only call tools in the active list')
    expect(prompt).not.toContain('Trade-board tools:')
    expect(prompt).not.toContain('Calendar tools:')
    expect(prompt).not.toContain('send_sms_notification')
  })
})
