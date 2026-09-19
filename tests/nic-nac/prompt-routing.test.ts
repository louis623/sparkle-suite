import { describe, expect, it } from 'vitest'
import { buildNicNacSystemPrompt } from '@/lib/nic-nac/prompt-builder'

describe('Nic-Nac routed system prompt', () => {
  it('builds a compact live-show prompt without unrelated tool inventory', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['show_memory'],
      activeToolNames: [
        'get_show_session_context',
        'start_show_session',
        'end_show',
        'record_show_session_event',
      ],
    })

    expect(prompt).toContain('You are Nic-Nac')
    expect(prompt).toContain("Nic-Nac's personality foundation is September Virgo")
    expect(prompt).toContain("Nic-Nac is named after one of Louis's pet rabbits")
    expect(prompt).toContain('Mention Virgo only if asked or in light/playful chat')
    expect(prompt).toContain('Stay mission-focused: Sparkle Suite/Finder')
    expect(prompt).toContain('get_show_session_context')
    expect(prompt).toContain('end_show')
    expect(prompt).toContain('record_show_session_event')
    expect(prompt).toContain('zero-provider database tools')
    expect(prompt).toContain('Do not pre-announce tool calls')
    expect(prompt).not.toContain('You have twenty-nine tools')
    expect(prompt).not.toContain('send_sms_notification')
    expect(prompt.length).toBeLessThan(8_000)
  })

  it('teaches durable memory turns to save explicit safe preferences instead of refusing memory', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['memory', 'show_memory'],
      activeToolNames: [
        'read_recent_rep_notes',
        'write_rep_note',
        'get_show_session_context',
        'start_show_session',
        'end_show',
        'record_show_session_event',
      ],
    })

    expect(prompt).toContain('Safe explicit rep preferences are supported')
    expect(prompt).toContain("memoryType:'preference'")
    expect(prompt).toContain("memorySource:'explicit'")
    expect(prompt).toContain(
      'Do not claim lasting memory is unavailable when write_rep_note is active',
    )
    expect(prompt).toContain('record_show_session_event')
    expect(prompt.length).toBeLessThan(8_500)
  })

  it('includes trade-board safety without loading calendar or notification copy', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['trade_board'],
      activeToolNames: [
        'list_my_trade_board',
        'remove_listing',
        'restore_listing',
        'add_listing',
        'update_listing',
        'search_jewelry_database',
      ],
    })

    expect(prompt).toContain('remove_listing requires the approval dialog')
    expect(prompt).not.toContain('clickwrapAccepted')
    expect(prompt).not.toContain('they own the piece')
    expect(prompt).toContain('recovery window')
    expect(prompt).toContain('If add_listing is active and the rep provides a missing field')
    expect(prompt).toContain('do not say add_listing is unavailable')
    expect(prompt).toContain('A rep can own multiple physical dancers with the same item number')
    expect(prompt).toContain('If search_jewelry_database says isOnMyBoard:true during an add flow')
    expect(prompt).toContain(
      'Are we adding a second identical physical piece?',
    )
    expect(prompt).toContain('Quantity comes from the latest rep message')
    expect(prompt).toContain('For current Dance Floor questions, answer only from the latest list_my_trade_board result')
    expect(prompt).toContain("mode:'batch'")
    expect(prompt).toContain('NEEDS_FULL_INFO')
    expect(prompt).toContain('create_design')
    expect(prompt).toContain(
      'When the rep starts "Add a dancer to the Dance Floor", offer three ways to start',
    )
    expect(prompt).toContain('type the item number')
    expect(prompt).toContain('upload a clear item-info tag or label photo')
    expect(prompt).toContain('say they do not have an item number')
    expect(prompt).toContain(
      'Dance-floor-only vs catalog is Nic-Nac discretion, not forced',
    )
    expect(prompt).toContain(
      'If the rep says Bomb Party, a good-looking jewelry image is enough',
    )
    expect(prompt).toContain('Collection Type and Size')
    expect(prompt).toContain('Order does not matter')
    expect(prompt).toContain('Use photos and facts in whatever order the rep provides them')
    expect(prompt).toContain('If the item exists, confirm the match before add_listing')
    expect(prompt).toContain('If missing, ask for whichever single input is actually missing or unusable')
    expect(prompt).toContain(
      'Treat messy item numbers, design names, "add this one", corrections, and script/tool refs as add-flow turns',
    )
    expect(prompt).toContain('Two quality checks only')
    expect(prompt).toContain('readable item details')
    expect(prompt).toContain('website-worthy jewelry image')
    expect(prompt).toContain('Accept clear rep-provided collection')
    expect(prompt).toContain(
      'Do not require packaging proof after the rep gives the collection',
    )
    expect(prompt).toContain('Birthday collection names must include the year')
    expect(prompt).toContain('July Birthday 2026')
    expect(prompt).toContain(
      'Boxed display photos for earrings, rings, necklaces, and similar dancers are acceptable when the jewelry is centered, close, and clear',
    )
    expect(prompt).toContain(
      'Rejecting or demanding a retake is a last resort',
    )
    expect(prompt).toContain(
      'Do not critique a label/details photo as if it is a bad jewelry photo',
    )
    expect(prompt).toContain(
      'If the only uploaded image is a label/details or back-of-card photo, say you still need the first customer-facing jewelry photo',
    )
    expect(prompt).toContain(
      'Tiny or partial jewelry visible in a label/details photo does not make it the jewelry photo',
    )
    expect(prompt).toContain(
      'A label/details photo is only a label/details photo',
    )
    expect(prompt).toContain(
      'Visible jewelry in that label/details photo does not satisfy the jewelry photo requirement',
    )
    expect(prompt).toContain(
      'Do not say "the photo of the earrings needs" unless the rep actually uploaded a dedicated jewelry photo',
    )
    expect(prompt).toContain(
      'Do not call a label/details photo a boxed display photo',
    )
    expect(prompt).toContain(
      'After a label/details photo, ask for the separate customer-facing jewelry photo without critiquing label-photo distance or framing',
    )
    expect(prompt).toContain(
      'Do not ask for unboxed, no-packaging, or plain-background retakes',
    )
    expect(prompt).toContain(
      'Do not ask for retakes without the box/card or on a plain surface',
    )
    expect(prompt).toContain(
      'If enough usable inputs already exist in recent conversation photos or chat text, call add_listing',
    )
    expect(prompt).toContain(
      'If the rep insists a clear boxed display photo is final, proceed instead of arguing',
    )
    expect(prompt).toContain(
      'Use recent add-flow photos, not just the latest message',
    )
    expect(prompt).toContain(
      'If the rep confirms a prior jewelry-front photo, call add_listing with that photo context instead of asking for a reupload',
    )
    expect(prompt).toContain(
      'Never send the rep to backend/Louis/manual creation when add_listing is active',
    )
    expect(prompt).toContain('Never claim a dancer is added until add_listing returns success')
    expect(prompt).not.toContain('add_show')
    expect(prompt).not.toContain('send_sms_notification')
    expect(prompt.length).toBeLessThan(10_200)
  })

  it('includes active workflow prompt state before Dance Floor instructions', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['trade_board'],
      activeToolNames: ['add_listing', 'search_jewelry_database'],
      workflowPromptState:
        'Active workflow: trade_board_add_listing\nMissing: jewelryFrontPhoto\nNext action: ask_for_jewelry_front_photo',
    })

    expect(prompt).toContain('Active workflow: trade_board_add_listing')
    expect(prompt).toContain('Missing: jewelryFrontPhoto')
    expect(prompt.indexOf('Active workflow: trade_board_add_listing')).toBeLessThan(
      prompt.indexOf('Trade-board tools:'),
    )
  })

  it('includes active calendar workflow state and optional description guidance before Calendar tools', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['calendar'],
      activeToolNames: ['prepare_calendar_work', 'add_show', 'list_my_shows'],
      workflowPromptState:
        'Active workflow: calendar_event_work\nWorkflow phase: ready_to_add\nDescription: optional; do not ask for description before add_show.',
    })

    expect(prompt).toContain('Active workflow rules:')
    expect(prompt).toContain('Active workflow: calendar_event_work')
    expect(prompt).toContain('Description: optional')
    expect(prompt).toContain('Do not ask for description if the required scheduling fields are known')
    expect(prompt).toContain('Do not add recurring unless the rep explicitly asks')
    expect(prompt.indexOf('Active workflow: calendar_event_work')).toBeLessThan(
      prompt.indexOf('Calendar tools:'),
    )
  })

  it('keeps provider guardrails in notification prompts', () => {
    const prompt = buildNicNacSystemPrompt({
      intents: ['notification'],
      activeToolNames: [
        'send_sms_notification',
        'send_email_notification',
        'get_notification_preferences',
        'get_customer_audience',
      ],
    })

    expect(prompt).toContain(
      'Telnyx campaign C7BAANX is active, but live SMS still requires number assignment and handset smoke proof.',
    )
    expect(prompt).toContain('can draft the text but cannot send it yet')
    expect(prompt).toContain(
      'Do not claim live SMS delivery unless the actual send tool returns success.',
    )
      expect(prompt).toContain('bulk SMS/email campaigns and subscriber blasts are not live')
      expect(prompt).toContain(
        'Automated pre-show reminders are handled by the scheduled reminder job',
      )
      expect(prompt).toContain('set_notification_preferences saves defaults')
    expect(prompt).toContain(
      'Do not replace the approval dialog with a natural-language "Want me to save it?" question',
    )
    expect(prompt).toContain('No payment collection')
  })
})
