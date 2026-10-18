import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  normalizePrelaunchIntakeReviewLane,
  normalizePrelaunchWaitlistReviewView,
  PrelaunchIntakeReviewPageContent,
} from '@/app/internal/prelaunch/intake/_components/PrelaunchIntakeReviewPageContent'
import { PrelaunchScoutRecommendationResult } from '@/app/internal/prelaunch/intake/_components/PrelaunchScoutRunButton'
import type { PrelaunchAgreementDocument } from '@/lib/prelaunch/agreement-documents'
import type { PrelaunchScoutOutput } from '@/lib/prelaunch/scout'
import type { PrelaunchIntakeReviewSubmission } from '@/lib/prelaunch/intake-review'
import type { PrelaunchLaunchCheck } from '@/lib/prelaunch/launch-checks'
import type { PrelaunchLaunchGate } from '@/lib/prelaunch/launch-gates'
import type { PrelaunchLaunchBuild } from '@/lib/prelaunch/launch-builds'
import type { PrelaunchLaunchSetupProfile } from '@/lib/prelaunch/setup-profiles'
import type { PrelaunchWaitlistReviewLead } from '@/lib/prelaunch/waitlist-review'

const submission: PrelaunchIntakeReviewSubmission = {
  id: 'intake-1',
  name: 'Jamie Hart',
  email: 'jamie@example.com',
  phone: '303-555-0123',
  businessName: 'Jamie Hart Jewelry',
  social: {
    tiktok: '@jamieh',
    instagram: '@jamiebling',
    facebook: null,
  },
  team: {
    name: 'Lindsey Team',
    size: '6-20',
  },
  primaryPlatform: 'tiktok',
  streamingFrequency: 'multiple_weekly',
  currentSetup: 'TikTok bio link and DMs',
  setupGoal: 'Cleaner show-night hub',
  deviceSetup: 'phone_only',
  brandVibe: 'polished and warm',
  colorPreferences: 'plum and pearl',
  specialRequests: 'Needs help with launch links',
  intakeStatus: 'submitted',
  prequalificationStatus: 'needs_review',
  fitFlags: ['phone_only_setup'],
  waitlistId: 'waitlist-1',
  scoutInputStatus: 'ready',
  handoffStatus: 'scout_ready',
  latestScoutRun: null,
  createdAt: '2026-05-09T18:00:00Z',
  updatedAt: '2026-05-09T18:00:00Z',
}

const gateEnvKeys = [
  'NEXT_PUBLIC_APP_URL',
  'SIGNWELL_API_KEY',
  'SIGNWELL_API_BASE_URL',
  'SIGNWELL_TEMPLATE_ID',
  'STRIPE_PRICE_START_WORK_FEE',
  'STRIPE_PRICE_LAUNCH_FEE',
] as const

const waitlistLead: PrelaunchWaitlistReviewLead = {
  id: 'waitlist-kim',
  name: 'Kim Hart',
  email: 'kim@example.com',
  phone: '919-555-0101',
  tiktokHandle: '@kimslivejewelry',
  teamRepName: 'Lindsey',
  setupPain: 'Getting my live setup organized',
  smsConsent: true,
  emailConsent: true,
  leadStatus: 'new',
  welcomeEmailStatus: 'sent',
  welcomeEmailSentAt: '2026-05-13T20:26:34.729Z',
  welcomeEmailError: null,
  handoffStatus: 'not_started',
  warmupStatus: 'not_started',
  intakeSubmissionId: null,
  createdAt: '2026-05-13T20:26:34.527Z',
}

const launchBuild: PrelaunchLaunchBuild = {
  id: 'build-1',
  waitlistId: 'waitlist-start-work',
  intakeSubmissionId: null,
  repId: null,
  stage: 'draft',
  status: 'blocked',
  leadName: 'Start Work Lead',
  leadEmail: 'startwork@example.com',
  setupProfileStatus: 'drafted',
  paymentGateStatus: 'disabled',
  agreementGateStatus: 'disabled',
  buildCheckStatus: 'not_started',
  productionRosterStatus: 'not_started',
  blockers: [
    'Payment gate is disabled.',
    'Agreement gate is disabled.',
    'Build checks have not started.',
  ],
  createdAt: '2026-05-21T20:00:00Z',
  updatedAt: '2026-05-21T20:01:00Z',
}

const launchSetupProfile: PrelaunchLaunchSetupProfile = {
  id: 'profile-1',
  launchBuildId: 'build-1',
  businessName: 'Sparkle Demo Shop',
  publicSiteGoal: 'Launch a clean live shopping hub.',
  customDomain: null,
  primarySocialUrl: 'https://example.com/social',
  secondarySocialUrl: null,
  shopUrl: null,
  brandNotes: 'Bright, practical, friendly.',
  mustHaveLaunchNotes: 'Start with profile and show links.',
  openQuestions: ['Confirm logo.', 'Confirm launch date.'],
  status: 'draft',
  createdAt: '2026-05-21T21:00:00Z',
  updatedAt: '2026-05-21T21:01:00Z',
}

const launchCheck: PrelaunchLaunchCheck = {
  id: 'check-1',
  launchBuildId: 'build-1',
  checkKey: 'setup_profile_ready',
  label: 'Setup profile ready',
  status: 'passed',
  notes: 'Profile reviewed.',
  checkedAt: '2026-05-21T22:00:00Z',
  createdAt: '2026-05-21T21:55:00Z',
  updatedAt: '2026-05-21T22:00:00Z',
}

const launchGate: PrelaunchLaunchGate = {
  id: 'gate-1',
  launchBuildId: 'build-1',
  gateKey: 'payment',
  label: 'Payment gate',
  mode: 'test',
  status: 'ready',
  notes: 'Stripe test config reviewed.',
  updatedByRepId: null,
  createdAt: '2026-05-21T22:10:00Z',
  updatedAt: '2026-05-21T22:11:00Z',
}

const agreementDocument: PrelaunchAgreementDocument = {
  id: 'agreement-1',
  launchBuildId: 'build-1',
  waitlistId: 'waitlist-start-work',
  intakeSubmissionId: null,
  provider: 'signwell',
  mode: 'sandbox',
  gateType: 'service_agreement',
  status: 'draft',
  templateId: 'template_123',
  templateLabel: 'Sparkle Suite service agreement',
  pricingCohort: 'founder_first_20',
  providerDocumentId: null,
  recipientName: 'Start Work Lead',
  recipientEmail: 'startwork@example.com',
  sendEmail: false,
  draft: true,
  testMode: true,
  providerStatus: null,
  signedAt: null,
  signedPdfUrl: null,
  notes: 'Demo-only sandbox draft tracker.',
  updatedByRepId: null,
  createdAt: '2026-05-22T14:00:00Z',
  updatedAt: '2026-05-22T14:01:00Z',
}

function snapshotGateEnv() {
  return Object.fromEntries(
    gateEnvKeys.map((key) => [key, process.env[key]]),
  ) as Record<(typeof gateEnvKeys)[number], string | undefined>
}

function restoreGateEnv(snapshot: ReturnType<typeof snapshotGateEnv>) {
  for (const key of gateEnvKeys) {
    const value = snapshot[key]

    if (value == null) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('PrelaunchIntakeReviewPageContent', () => {
  it('normalizes supported operator lane filters', () => {
    expect(normalizePrelaunchIntakeReviewLane('failed_scout')).toBe(
      'failed_scout',
    )
    expect(normalizePrelaunchIntakeReviewLane(['meeting_ready'])).toBe(
      'meeting_ready',
    )
    expect(normalizePrelaunchIntakeReviewLane('unknown')).toBeNull()
    expect(normalizePrelaunchIntakeReviewLane(undefined)).toBeNull()
    expect(normalizePrelaunchWaitlistReviewView('contact_batch')).toBe(
      'contact_batch',
    )
    expect(normalizePrelaunchWaitlistReviewView('contacted')).toBe('contacted')
    expect(normalizePrelaunchWaitlistReviewView('meeting_scheduled')).toBe(
      'meeting_scheduled',
    )
    expect(normalizePrelaunchWaitlistReviewView('conversation_complete')).toBe(
      'conversation_complete',
    )
    expect(normalizePrelaunchWaitlistReviewView('setup_profile_drafted')).toBe(
      'setup_profile_drafted',
    )
    expect(normalizePrelaunchWaitlistReviewView('start_work_ready')).toBe(
      'start_work_ready',
    )
    expect(
      normalizePrelaunchWaitlistReviewView(['contact_batch']),
    ).toBe('contact_batch')
    expect(normalizePrelaunchWaitlistReviewView('unknown')).toBeNull()
  })

  it('renders operator summary counts and intake cards', () => {
    const originalEnv = snapshotGateEnv()
    delete process.env.SIGNWELL_API_KEY
    delete process.env.SIGNWELL_API_BASE_URL
    delete process.env.SIGNWELL_TEMPLATE_ID
    delete process.env.STRIPE_PRICE_START_WORK_FEE
    delete process.env.STRIPE_PRICE_LAUNCH_FEE
    delete process.env.NEXT_PUBLIC_APP_URL

    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            handoffStatus: 'meeting_ready',
            scoutInputStatus: 'generated',
          },
          submission,
          {
            ...submission,
            id: 'intake-2',
            email: 'morgan@example.com',
            prequalificationStatus: 'qualified',
            fitFlags: [],
            waitlistId: null,
          },
        ],
      }),
    )

    restoreGateEnv(originalEnv)

    expect(html).toContain('Prelaunch intake review')
    expect(html).not.toContain('Control Center theme')
    expect(html).not.toContain('control-center-surface')
    expect(html).toContain('3 total')
    expect(html).toContain('2 needs review')
    expect(html).toContain('1 qualified')
    expect(html).toContain('1 Scout generated')
    expect(html).toContain('1 meeting ready')
    expect(html).toContain('Scout input ready')
    expect(html).toContain('Scout generated')
    expect(html).toContain('Meeting ready')
    expect(html).toContain('Jamie Hart Jewelry')
    expect(html).toContain('jamie@example.com')
    expect(html).toContain('phone_only_setup')
    expect(html).toContain('Waitlist linked')
    expect(html).toContain('Gate readiness')
    expect(html).toContain('Agreement gate')
    expect(html).toContain('SignWell not configured')
    expect(html).toContain('Start work fee')
    expect(html).toContain('Stripe price missing')
    expect(html).toContain('Launch fee')
    expect(html).toContain('No live send or payment action is enabled here yet.')
    expect(html).not.toContain('Send agreement')
    expect(html).not.toContain('Collect payment')
    expect(html).toContain('Approved QR flyer')
    expect(html).toContain('Open approved flyer')
    expect(html).toContain(
      '/sparkle-suite-social/exports/sparkle-suite-qr-flyer-tiktok-brand-image-v1.png',
    )
    expect(html).toContain('QR verification steps')
    expect(html).toContain('Use the approved static flyer PNG only.')
    expect(html).toContain('No external QR provider is required.')
    expect(html).toContain('Canonical waitlist target')
    expect(html).toContain('prelaunch?utm_source=sparkle_suite_qr')
    expect(html).not.toContain('sparkle-suite-qr-flyer-example-one')
    expect(html).not.toContain('api.qrserver.com')
    expect(html).toContain('Run Scout')
    expect(html).toContain('Operator handoff brief')
    expect(html).toContain('Owner/business: Jamie Hart - Jamie Hart Jewelry')
    expect(html).toContain('No live SMS send.')
    expect(html).toContain('No kit fulfillment approval.')
    expect(html).not.toContain('Send SMS')
    expect(html).toContain('&quot;intakeId&quot;: &quot;intake-1&quot;')
  })

  it('renders the intake surface as the Sparkle Suite Control Center', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [
          {
            ...submission,
            handoffStatus: 'meeting_ready',
            scoutInputStatus: 'generated',
          },
          {
            ...submission,
            id: 'intake-2',
            email: 'morgan@example.com',
            prequalificationStatus: 'qualified',
            fitFlags: [],
            handoffStatus: 'converted',
          },
        ],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-selected',
            name: 'Selected Lead',
            email: 'selected@example.com',
            leadStatus: 'contact_batch_selected',
          },
          {
            ...waitlistLead,
            id: 'waitlist-contacted',
            name: 'Contacted Lead',
            email: 'contacted@example.com',
            leadStatus: 'contacted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-meeting',
            name: 'Meeting Lead',
            email: 'meeting@example.com',
            leadStatus: 'meeting_scheduled',
          },
          {
            ...waitlistLead,
            id: 'waitlist-conversation',
            name: 'Conversation Lead',
            email: 'conversation@example.com',
            leadStatus: 'conversation_complete',
          },
          {
            ...waitlistLead,
            id: 'waitlist-profile',
            name: 'Profile Lead',
            email: 'profile@example.com',
            leadStatus: 'setup_profile_drafted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-start-work',
            name: 'Start Work Lead',
            email: 'startwork@example.com',
            leadStatus: 'start_work_ready',
          },
        ],
      }),
    )

    expect(html).toContain('Sparkle Suite Control Center')
    expect(html).toContain('control-center-surface')
    expect(html).toContain('Control Center theme')
    expect(html).toContain('Light mode')
    expect(html).toContain('Dark mode')
    expect(html).toContain('Client intake')
    expect(html).toContain('View public page')
    expect(html).toContain('href="/prelaunch"')
    expect(html).toContain('Company snapshot')
    expect(html).toContain('Comms')
    expect(html).toContain('Please connect')
    expect(html).toContain('Needs attention')
    expect(html).toContain('2 flags')
    expect(html).toContain('Leads')
    expect(html).toContain('7')
    expect(html).toContain('Reps')
    expect(html).toContain('In build')
    expect(html).toContain('Start Work Lead')
    expect(html).toContain('Monthly net')
    expect(html).toContain('PMCS')
    expect(html).toContain('lg:grid-cols-12')
    expect(html).toContain('lg:col-span-4')
    expect(html).toContain('lg:col-span-3')
    expect(html).toContain('border-red-200 bg-red-50 text-red-950')
    expect(html).toContain('text-red-700')
    expect(html).toContain('href="/control-center/intake#comms"')
    expect(html).toContain('href="/control-center/intake?lane=needs_review"')
    expect(html).toContain('href="/control-center/intake#reps"')
    expect(html).toContain(
      'href="/control-center/intake?waitlist=start_work_ready"',
    )
    expect(html).toContain('href="/control-center/intake#monthly-net"')
    expect(html).toContain('href="/control-center/intake#pmcs"')
    expect(html).not.toContain('Approved QR flyer')
    expect(html).not.toContain('Open approved flyer')
    expect(html).not.toContain('QR verification steps')
    expect(html).not.toContain('aria-label="Intake summary"')
    expect(html).not.toContain('Submitted intake forms')
    expect(html).not.toContain('Saved Scout output')
    expect(html).not.toContain('Open intake form')
    expect(html).not.toContain('href="/prelaunch/intake"')
    expect(html).toContain('keep the active build visible')
    expect(html).toContain('Active work board')
    expect(html).toContain('Current build watch')
    expect(html).not.toContain('Demo run launcher')
    expect(html).not.toContain('Demo path is clear')
    expect(html).not.toContain('Smoke test the demo account')
    expect(html).not.toContain('Create/refresh demo run')
    expect(html).not.toContain(
      'action="/api/control-center/intake/demo-launch-flow"',
    )
    expect(html).toContain('One client at a time')
    expect(html).toContain('Active client')
    expect(html).toContain('No active client')
    expect(html).toContain('Current phase')
    expect(html).toContain('No info')
    expect(html).toContain('Agent touchpoint')
    expect(html).toContain('Please connect')
    expect(html).toContain('Attention')
    expect(html).toContain('Next action')
    expect(html).toContain('Select one lead when ready to start onboarding')
    expect(html).toContain('Client roster')
    expect(html).toContain('No production clients yet')
    expect(html).toContain('Clients move here after launch')
    expect(html).toContain('No active clients')
    expect(html).not.toContain('Client intake pipeline')
    expect(html).not.toContain('Prelaunch path')
    expect(html).not.toContain('Quick map from waitlist lead to Start Work.')
    expect(html).not.toContain('Payment pending')
    expect(html).not.toContain('Agreement pending')
    expect(html).not.toContain('Build ready')
    expect(html).toContain('Contact batch view')
    expect(html).toContain('Contacted view')
    expect(html).toContain('Meeting scheduled view')
    expect(html).toContain('Conversation complete view')
    expect(html).toContain('Setup profile drafted view')
    expect(html).toContain('Start work ready view')
    expect(html).toContain('1 selected')
    expect(html).toContain('1 contacted')
    expect(html).toContain('1 meeting scheduled')
    expect(html).toContain('1 conversation complete')
    expect(html).toContain('1 setup profile drafted')
    expect(html).toContain('1 start work ready')
    expect(html).toContain('1 ready to select')
    expect(html).toContain('href="/control-center/intake?waitlist=contact_batch"')
    expect(html).toContain('href="/control-center/intake?waitlist=contacted"')
    expect(html).toContain(
      'href="/control-center/intake?waitlist=meeting_scheduled"',
    )
    expect(html).toContain(
      'href="/control-center/intake?waitlist=conversation_complete"',
    )
    expect(html).toContain(
      'href="/control-center/intake?waitlist=setup_profile_drafted"',
    )
    expect(html).toContain(
      'href="/control-center/intake?waitlist=start_work_ready"',
    )
    expect(html).toContain('Select for contact batch')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-contact-batch"',
    )
    expect(html).toContain('Lead overview')
    expect(html).toContain('Joined May 13, 2026, 4:26 PM')
    expect(html).toContain('Details')
    expect(html).toContain('aria-label="Waitlist details for Kim Hart"')
    expect(html).toContain('Contact details')
    expect(html).not.toContain('Description:')
    expect(html).not.toContain('Louis does:')
    expect(html).not.toContain('Automation:')
    expect(html).not.toContain('Skills/plugins:')
    expect(html).not.toContain('Hard stop:')
    expect(html).not.toContain(
      'The waitlist form saves the lead and tracks welcome email status.',
    )
    expect(html).not.toContain(
      'Do not affect live queue shows, attach SMS numbers, or run live-provider actions early.',
    )
    expect(html).toContain('/control-center/intake?lane=failed_scout')
    expect(html).toContain('/control-center/intake?lane=meeting_ready')
    expect(html).not.toContain('/internal/prelaunch/intake?lane=failed_scout')
  })

  it('filters Control Center waitlist leads to the selected contact batch', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'contact_batch',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-selected',
            name: 'Selected Lead',
            email: 'selected@example.com',
            leadStatus: 'contact_batch_selected',
          },
        ],
      }),
    )

    expect(html).toContain('Showing contact batch')
    expect(html).toContain('Selected Lead')
    expect(html).toContain('selected@example.com')
    expect(html).toContain('Selected for contact batch')
    expect(html).toContain('Lead overview')
    expect(html).toContain('Details')
    expect(html).toContain('aria-label="Waitlist details for Selected Lead"')
    expect(html).toContain('Mark contacted')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-contact-progress"',
    )
    expect(html).toContain('Contact details')
    expect(html).toContain('selected@example.com')
    expect(html).toContain('919-555-0101')
    expect(html).toContain('SMS consent: yes')
    expect(html).toContain('@kimslivejewelry')
    expect(html).toContain('Team rep: Lindsey')
    expect(html).toContain('Setup notes')
    expect(html).toContain('Getting my live setup organized')
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Manual contact batch roster')
    expect(html).not.toContain('Select for contact batch')
  })

  it('filters Control Center waitlist leads to contacted outreach', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'contacted',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-selected',
            name: 'Selected Lead',
            email: 'selected@example.com',
            leadStatus: 'contact_batch_selected',
          },
          {
            ...waitlistLead,
            id: 'waitlist-contacted',
            name: 'Contacted Lead',
            email: 'contacted@example.com',
            leadStatus: 'contacted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-meeting',
            name: 'Meeting Lead',
            email: 'meeting@example.com',
            leadStatus: 'meeting_scheduled',
          },
          {
            ...waitlistLead,
            id: 'waitlist-conversation',
            name: 'Conversation Lead',
            email: 'conversation@example.com',
            leadStatus: 'conversation_complete',
          },
          {
            ...waitlistLead,
            id: 'waitlist-profile',
            name: 'Profile Lead',
            email: 'profile@example.com',
            leadStatus: 'setup_profile_drafted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-start-work',
            name: 'Start Work Lead',
            email: 'startwork@example.com',
            leadStatus: 'start_work_ready',
          },
        ],
      }),
    )

    expect(html).toContain('Showing contacted outreach')
    expect(html).toContain('Contacted Lead')
    expect(html).toContain('contacted@example.com')
    expect(html).toContain('Contacted')
    expect(html).toContain('Schedule consult')
    expect(html).toContain('Consult date/time')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-meeting-scheduled"',
    )
    expect(html).toContain(
      'Manual outreach has happened. Next step is operator-led scheduling or follow-up notes.',
    )
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Selected Lead')
    expect(html).not.toContain('Meeting Lead')
    expect(html).not.toContain('Mark contacted')
    expect(html).not.toContain('Select for contact batch')
  })

  it('filters Control Center waitlist leads to scheduled meetings', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'meeting_scheduled',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-contacted',
            name: 'Contacted Lead',
            email: 'contacted@example.com',
            leadStatus: 'contacted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-meeting',
            name: 'Meeting Lead',
            email: 'meeting@example.com',
            leadStatus: 'meeting_scheduled',
          },
        ],
      }),
    )

    expect(html).toContain('Showing scheduled meetings')
    expect(html).toContain('Meeting Lead')
    expect(html).toContain('meeting@example.com')
    expect(html).toContain('Meeting scheduled')
    expect(html).toContain('Mark conversation complete')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-conversation-complete"',
    )
    expect(html).toContain(
      'A manual setup conversation is on the calendar. Keep the calendar invite and transcript capture operator-led.',
    )
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Contacted Lead')
    expect(html).not.toContain('Conversation Lead')
    expect(html).not.toContain('Mark meeting scheduled')
  })

  it('filters Control Center waitlist leads to completed conversations', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'conversation_complete',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-meeting',
            name: 'Meeting Lead',
            email: 'meeting@example.com',
            leadStatus: 'meeting_scheduled',
          },
          {
            ...waitlistLead,
            id: 'waitlist-conversation',
            name: 'Conversation Lead',
            email: 'conversation@example.com',
            leadStatus: 'conversation_complete',
          },
        ],
      }),
    )

    expect(html).toContain('Showing completed conversations')
    expect(html).toContain('Conversation Lead')
    expect(html).toContain('conversation@example.com')
    expect(html).toContain('Conversation complete')
    expect(html).toContain('Mark setup profile drafted')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-setup-profile-drafted"',
    )
    expect(html).toContain(
      'The setup conversation is complete. Keep transcript import, profile drafting, and Start Work decisions operator-led.',
    )
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Meeting Lead')
    expect(html).not.toContain('Profile Lead')
    expect(html).not.toContain('Mark conversation complete')
    expect(html).not.toContain('Mark meeting scheduled')
  })

  it('filters Control Center waitlist leads to drafted setup profiles', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'setup_profile_drafted',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-conversation',
            name: 'Conversation Lead',
            email: 'conversation@example.com',
            leadStatus: 'conversation_complete',
          },
          {
            ...waitlistLead,
            id: 'waitlist-profile',
            name: 'Profile Lead',
            email: 'profile@example.com',
            leadStatus: 'setup_profile_drafted',
          },
        ],
      }),
    )

    expect(html).toContain('Showing drafted setup profiles')
    expect(html).toContain('Profile Lead')
    expect(html).toContain('profile@example.com')
    expect(html).toContain('Setup profile drafted')
    expect(html).toContain('Mark Start Work ready')
    expect(html).toContain(
      'action="/api/control-center/intake/waitlist-start-work-ready"',
    )
    expect(html).toContain(
      'A manual setup profile draft exists for operator review. Keep Start Work, payment, agreement, and build decisions separate.',
    )
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Conversation Lead')
    expect(html).not.toContain('Start Work Lead')
    expect(html).not.toContain('Mark setup profile drafted')
    expect(html).not.toContain('Mark conversation complete')
  })

  it('filters Control Center waitlist leads to Start Work ready decisions', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeWaitlistView: 'start_work_ready',
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-profile',
            name: 'Profile Lead',
            email: 'profile@example.com',
            leadStatus: 'setup_profile_drafted',
          },
          {
            ...waitlistLead,
            id: 'waitlist-start-work',
            name: 'Start Work Lead',
            email: 'startwork@example.com',
            leadStatus: 'start_work_ready',
          },
        ],
      }),
    )

    expect(html).toContain('Showing Start Work ready leads')
    expect(html).toContain('Start Work Lead')
    expect(html).toContain('startwork@example.com')
    expect(html).toContain('Start Work ready')
    expect(html).toContain(
      'Louis approved this profile for the Start Work lane. Keep Stripe, SignWell, build readiness, and live queue actions behind their own gates.',
    )
    expect(html).toContain('Start active build')
    expect(html).toContain(
      'action="/api/control-center/intake/launch-build-draft"',
    )
    expect(html).not.toContain('Kim Hart')
    expect(html).not.toContain('Profile Lead')
    expect(html).not.toContain('Mark Start Work ready')
    expect(html).not.toContain('Mark setup profile drafted')
  })

  it('renders no info for the connected build tile when no leads are ready for onboarding', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        waitlistLeads: [
          {
            ...waitlistLead,
            leadStatus: 'new',
          },
        ],
      }),
    )

    expect(html).toContain('In build')
    expect(html).toContain('No info')
    expect(html).toContain('Ready for onboarding')
  })

  it('renders active builds in the active work board', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [launchBuild],
        waitlistLeads: [
          {
            ...waitlistLead,
            id: 'waitlist-start-work',
            name: 'Start Work Lead',
            email: 'startwork@example.com',
            leadStatus: 'start_work_ready',
          },
        ],
      }),
    )

    expect(html).toContain('Active work board')
    expect(html).toContain('Start Work Lead')
    expect(html).toContain('Needs attention')
    expect(html).toContain('Blocked')
    expect(html).toContain('Payment gate is disabled.')
    expect(html).toContain('Agreement gate is disabled.')
    expect(html).toContain('Build checks have not started.')
    expect(html).not.toContain('Build slot is open')
  })

  it('labels a connected ready demo build as ready for launch', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [
          {
            ...launchBuild,
            repId: 'rep-1',
            stage: 'ready_for_launch',
            status: 'ready',
            blockers: [],
          },
        ],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Ready for launch')
    expect(html).toContain('Production roster is connected')
    expect(html).toContain('Review production roster')
    expect(html).toContain('href="/control-center/intake#reps"')
    expect(html).toContain('Live account links')
    expect(html).toContain('href="/nic-nac"')
    expect(html).toContain('href="/amethyst/Homepage.html?c=rep-1"')
    expect(html).toContain('href="/amethyst/Trade.html?c=rep-1"')
    expect(html).toContain('href="/amethyst/Join.html?c=rep-1"')
  })

  it('renders a compact safe smoke status without provider actions', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [
          {
            ...launchBuild,
            repId: 'rep-demo',
            status: 'ready',
            blockers: [],
          },
        ],
        safeSmokeStatus: [
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
            detail:
              'Test key, webhook secret, and Sparkle Suite test prices are present.',
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
        ],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Safe smoke status')
    expect(html).toContain('Client account')
    expect(html).toContain('Stripe test mode')
    expect(html).toContain('SignWell sandbox')
    expect(html).toContain('Missing SIGNWELL_API_KEY')
    expect(html).toContain('Live actions')
    expect(html).not.toContain('Create Stripe checkout')
    expect(html).not.toContain('Send SignWell')
    expect(html).not.toContain('Charge card')
  })

  it('renders the setup profile editor for the active launch build', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [launchBuild],
        launchSetupProfiles: [launchSetupProfile],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Setup profile')
    expect(html).toContain('Sparkle Demo Shop')
    expect(html).toContain('Launch a clean live shopping hub.')
    expect(html).toContain('Confirm logo.')
    expect(html).toContain('action="/api/control-center/intake/setup-profile"')
    expect(html).toContain('name="launchBuildId"')
    expect(html).toContain('value="build-1"')
    expect(html).toContain('Save setup profile')
    expect(html).not.toContain('Send setup profile')
    expect(html).not.toContain('Charge')
  })

  it('renders launch checks for the active build without live actions', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [launchBuild],
        launchChecks: [launchCheck],
        launchSetupProfiles: [launchSetupProfile],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Launch checks')
    expect(html).toContain('Setup profile ready')
    expect(html).toContain('Profile reviewed.')
    expect(html).toContain('Site shell review')
    expect(html).toContain('action="/api/control-center/intake/launch-check"')
    expect(html).toContain('name="checkKey"')
    expect(html).toContain('Save check')
    expect(html).not.toContain('Launch client')
    expect(html).not.toContain('Move to production roster')
  })

  it('renders payment and agreement gates without provider actions', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [launchBuild],
        launchChecks: [launchCheck],
        agreementDocuments: [agreementDocument],
        launchGates: [launchGate],
        launchSetupProfiles: [launchSetupProfile],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Payment and agreement gates')
    expect(html).toContain('Payment gate')
    expect(html).toContain('Agreement gate')
    expect(html).toContain('Stripe test config reviewed.')
    expect(html).toContain('action="/api/control-center/intake/launch-gate"')
    expect(html).toContain('name="gateKey"')
    expect(html).toContain('Save gate')
    expect(html).toContain('Agreement draft tracker')
    expect(html).toContain('Sparkle Suite service agreement')
    expect(html).toContain('founder pricing')
    expect(html).not.toContain('founder first 20')
    expect(html).toContain('Draft tracker only')
    expect(html).toContain(
      'action="/api/control-center/intake/agreement-document"',
    )
    expect(html).toContain('Record agreement draft')
    expect(html).toContain('Create SignWell test draft')
    expect(html).toContain('Record test signature')
    expect(html).toContain('Signed PDF URL')
    expect(html).toContain('Blank uses the current time')
    expect(html).toContain('marks the agreement gate ready')
    expect(html).toContain('Send test agreement email')
    expect(html).toContain('keeps test mode on')
    expect(html).toContain('test mode only')
    expect(html).toContain('sandbox only')
    expect(html).not.toContain('Create Stripe checkout')
    expect(html).not.toContain('Send SignWell')
    expect(html).not.toContain('Charge card')
  })

  it('renders the production roster connector with real client account preparation', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [launchBuild],
        launchSetupProfiles: [launchSetupProfile],
        waitlistLeads: [],
      }),
    )

    expect(html).toContain('Connect production roster')
    expect(html).toContain(
      'action="/api/control-center/intake/production-roster"',
    )
    expect(html).toContain('Existing rep ID')
    expect(html).toContain('Create payment link')
    expect(html).toContain('Waive setup fee')
    expect(html).toContain('name="pricingTier"')
    expect(html).toContain('Nothing on this page sends email')
    expect(html).toContain('Save roster connection')
    expect(html).not.toContain('Create five-day trial account')
    expect(html).not.toContain('Temporary password')
    expect(html).not.toMatch(/five-day|trial/i)
    expect(html).not.toContain('Send invite')
    expect(html).not.toContain('Launch client')
  })

  it('shows a payment-link draft without asking for an email or intake record', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        basePath: '/control-center/intake',
        surface: 'control_center',
        submissions: [],
        launchBuilds: [],
        launchSetupProfiles: [],
        waitlistLeads: [],
        paymentLinks: [
          {
            id: 'link-1',
            launchBuildId: null,
            leadName: null,
            leadEmail: null,
            status: 'open',
            buildFeeWaived: true,
            pricingTier: 'founder',
            expiresAt: null,
            repId: null,
            checkoutUrl: 'https://checkout.stripe.test/cs_test',
            paymentEmailDraft: 'Hello,\n\nhttps://checkout.stripe.test/cs_test',
            welcomeEmailDraft: null,
            welcomeEmailStatus: 'not_queued',
          },
        ],
      }),
    )

    expect(html).toContain('Link ready')
    expect(html).toContain('setup fee waived')
    expect(html).toContain('founder pricing')
    expect(html).toContain('https://checkout.stripe.test/cs_test')
    expect(html).toContain('name="pricingTier"')
    expect(html).toContain('name="waiveSetupFee"')
    expect(html).not.toContain('name="leadEmail"')
    expect(html).not.toContain('name="launchBuildId"')
    expect(html).not.toMatch(/spots remaining|five-day|trial|founder first/i)
  })

  it('renders waitlist leads with confirmation email status', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [],
        waitlistLeads: [
          waitlistLead,
          {
            ...waitlistLead,
            id: 'waitlist-failed',
            name: 'Morgan Lee',
            email: 'morgan@example.com',
            welcomeEmailStatus: 'failed',
            welcomeEmailSentAt: null,
            welcomeEmailError: 'Resend rejected the message.',
          },
        ],
      }),
    )

    expect(html).toContain('Waitlist signups')
    expect(html).toContain('2 waitlist leads')
    expect(html).toContain('1 confirmation sent')
    expect(html).toContain('Kim Hart')
    expect(html).toContain('kim@example.com')
    expect(html).toContain('Lindsey')
    expect(html).toContain('Confirmation sent')
    expect(html).toContain('Next action')
    expect(html).toContain('Ready for contact batch')
    expect(html).toContain(
      'This lead can be considered for the next approved email or text outreach batch.',
    )
    expect(html).toContain('Morgan Lee')
    expect(html).toContain('Confirmation failed')
    expect(html).toContain('Fix confirmation email')
    expect(html).toContain(
      'The lead was saved, but the welcome email failed.',
    )
    expect(html).toContain('Resend rejected the message.')
  })

  it('renders operator priority lanes and filters by the active lane', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        activeLane: 'failed_scout',
        submissions: [
          {
            ...submission,
            businessName: 'Needs Review Jewelry',
          },
          {
            ...submission,
            id: 'intake-failed-scout',
            email: 'failed@example.com',
            businessName: 'Failed Scout Jewelry',
            prequalificationStatus: 'qualified',
            fitFlags: [],
            scoutInputStatus: 'generated',
            handoffStatus: 'reviewing',
            latestScoutRun: {
              runKey: 'scout:intake-failed-scout:2026-05-09T19:30:00.000Z',
              status: 'failed',
              triggerSource: 'intake_submission',
              model: 'deterministic_scout_v1',
              summary: null,
              errorMessage: 'Public evidence fetch timed out.',
              createdAt: '2026-05-09T19:30:00Z',
              synthesisStatus: null,
              synthesisConfidence: null,
              capturedEvidenceCount: null,
            },
          },
          {
            ...submission,
            id: 'intake-meeting',
            email: 'meeting@example.com',
            businessName: 'Meeting Ready Jewelry',
            prequalificationStatus: 'qualified',
            fitFlags: [],
            scoutInputStatus: 'generated',
            handoffStatus: 'meeting_ready',
            latestScoutRun: null,
            latestScribeTranscriptRun: null,
          },
          {
            ...submission,
            id: 'intake-clear',
            email: 'clear@example.com',
            businessName: 'Clear Lane Jewelry',
            prequalificationStatus: 'qualified',
            fitFlags: [],
            scoutInputStatus: 'generated',
            handoffStatus: 'scout_ready',
            latestScoutRun: null,
          },
        ],
      }),
    )

    expect(html).toContain('Priority lanes')
    expect(html).toContain('1 Needs review')
    expect(html).toContain('1 Failed Scout')
    expect(html).toContain('1 Missing transcript')
    expect(html).toContain('1 Meeting ready')
    expect(html).toContain('4 Gate blocked')
    expect(html).toContain('Showing Failed Scout lane')
    expect(html).toContain('Failed Scout Jewelry')
    expect(html).not.toContain('Clear Lane Jewelry')
  })

  it('renders a clear empty state when there are no submissions yet', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, { submissions: [] }),
    )

    expect(html).toContain('No intake submissions yet')
    expect(html).toContain('New /prelaunch intake forms will appear here')
  })

  it('renders Scribe handoff readiness when an intake is meeting-ready without a transcript', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            handoffStatus: 'meeting_ready',
          },
        ],
      }),
    )

    expect(html).toContain('Scribe handoff readiness')
    expect(html).toContain('Transcript handoff needed')
    expect(html).toContain('Attach transcript hook output')
    expect(html).toContain(
      'This intake is meeting-ready, but no Meet/Gemini transcript run is visible yet.',
    )
    expect(html).toContain('No autonomous profile writeback.')
    expect(html).toContain('No live SignWell send.')
    expect(html).not.toContain('Send agreement')
    expect(html).not.toContain('Collect payment')
  })

  it('renders consolidated next operator steps for blocked intake handoffs', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            waitlistId: null,
            latestScoutRun: {
              runKey: 'scout:intake-1:2026-05-09T19:30:00.000Z',
              status: 'failed',
              triggerSource: 'intake_submission',
              model: 'deterministic_scout_v1',
              summary: null,
              errorMessage: 'Public evidence fetch timed out.',
              createdAt: '2026-05-09T19:30:00Z',
              synthesisStatus: null,
              synthesisConfidence: null,
              capturedEvidenceCount: null,
            },
            latestScribeTranscriptRun: {
              runKey: 'scribe_hook:intake-1:drive-file-123',
              status: 'queued',
              triggerSource: 'google_meet_gemini_transcript',
              model: 'gemini_transcript_hook_v1',
              summary: 'Gemini transcript captured; Scribe processing is queued.',
              errorMessage: null,
              createdAt: '2026-05-13T17:00:00Z',
              driveFileId: 'drive-file-123',
              driveFileUrl: null,
              meetUrl: null,
              meetingTitle: null,
              transcriptCharCount: 248,
              speakerCount: 2,
              decisionCount: 1,
              actionItemCount: 1,
              clientPreferenceCount: 1,
              scribeStatus: 'queued',
              statusForScribe: 'ready_for_scribe',
              speakerNames: ['Louis', 'Jamie'],
              preview: null,
              signals: {
                decisions: [],
                clientPreferences: [],
                actionItems: ['send the SignWell agreement.'],
                openQuestions: [],
              },
              scribeBrief: {
                status: 'draft_ready',
                sourceRunKey: 'scribe_hook:intake-1:drive-file-123',
                summary: 'Scribe draft is ready for operator review.',
                meeting: {
                  title: null,
                  startedAt: null,
                  speakerNames: ['Louis', 'Jamie'],
                },
                profileDraft: {
                  intakeId: 'intake-1',
                  ownerName: 'Jamie Hart',
                  businessName: 'Jamie Hart Jewelry',
                  confirmedDecisions: [],
                  styleAndSetupSignals: [],
                  actionItems: ['send the SignWell agreement.'],
                  openQuestions: [],
                },
                operatorChecklist: [
                  'Review all Scribe draft fields before copying them into onboarding or Builder work.',
                ],
                manualReviewWarnings: [
                  'Transcript signals mention legal, agreement, payment, pricing, or launch-gate work. Keep those items operator-only until the matching gate is configured and approved.',
                ],
                provenance: {
                  meetingProvider: 'google_meet',
                  transcriptionProvider: 'gemini',
                  driveFileId: 'drive-file-123',
                  driveFileUrl: null,
                  meetUrl: null,
                  transcriptCharCount: 248,
                },
              },
            },
          },
        ],
      }),
    )

    expect(html).toContain('Next operator steps')
    expect(html).toContain('Handoff blocked')
    expect(html).toContain('Resolve fit review')
    expect(html).toContain('phone_only_setup')
    expect(html).toContain('Link waitlist lead')
    expect(html).toContain('Review failed Scout run')
    expect(html).toContain('Public evidence fetch timed out.')
    expect(html).toContain('Review Scribe guardrails')
    expect(html).toContain('Keep launch gates disabled')
    expect(html).not.toContain('Send agreement')
    expect(html).not.toContain('Collect payment')
  })

  it('renders photography kit prep as operator-only readiness guidance', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [submission],
      }),
    )

    expect(html).toContain('Photography kit prep')
    expect(html).toContain('Hardware decision stays operator-only')
    expect(html).toContain('DUCLUS lightbox or equivalent white setup')
    expect(html).toContain('Use the rep phone or existing camera first')
    expect(html).toContain('Require sample photo before hardware decision')
    expect(html).toContain('Use screening result to decide hardware path')
    expect(html).toContain(
      'Coach framing, distance, lighting, and white background before changing hardware.',
    )
    expect(html).toContain('Manual exception')
    expect(html).not.toContain('Order kit')
    expect(html).not.toContain('Ship kit')
    expect(html).not.toContain('Collect kit fee')
  })

  it('renders camera quality prep without live fulfillment actions', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [submission],
      }),
    )

    expect(html).toContain('Camera quality prep')
    expect(html).toContain('Sample-photo quality needs human review')
    expect(html).toContain('Sample photo still needs Nic-Nac screening')
    expect(html).toContain('Confirm two-device workflow')
    expect(html).toContain('Screening is not hardware approval')
    expect(html).not.toContain('Send SMS')
    expect(html).not.toContain('Order camera')
    expect(html).not.toContain('Approve shipment')
    expect(html).not.toContain('Collect kit fee')
  })

  it('keeps the internal operator page free of live action commands', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            latestScribeTranscriptRun: {
              runKey: 'scribe_hook:intake-1:drive-file-123',
              status: 'queued',
              triggerSource: 'google_meet_gemini_transcript',
              model: 'gemini_transcript_hook_v1',
              summary: 'Gemini transcript captured; Scribe processing is queued.',
              errorMessage: null,
              createdAt: '2026-05-13T17:00:00Z',
              driveFileId: 'drive-file-123',
              driveFileUrl: null,
              meetUrl: null,
              meetingTitle: 'Sparkle Suite discovery call - Jamie Hart',
              transcriptCharCount: 248,
              speakerCount: 2,
              decisionCount: 1,
              actionItemCount: 1,
              clientPreferenceCount: 1,
              scribeStatus: 'queued',
              statusForScribe: 'ready_for_scribe',
              speakerNames: ['Louis', 'Jamie'],
              preview: null,
              signals: {
                decisions: [],
                clientPreferences: [],
                actionItems: ['send the SignWell agreement.'],
                openQuestions: ['Can we keep my current team name?'],
              },
            },
          },
        ],
      }),
    )

    expect(html).not.toContain('Send SMS')
    expect(html).not.toContain('Attach +19044383050')
    expect(html).not.toContain('Send agreement')
    expect(html).not.toContain('Collect payment')
    expect(html).not.toContain('Run live Scribe')
    expect(html).not.toContain('Write profile automatically')
    expect(html).not.toContain('Order camera')
    expect(html).not.toContain('Approve shipment')
    expect(html).not.toContain('Call external QR provider')
  })

  it('renders the latest saved Scout run on each intake card', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            scoutInputStatus: 'generated',
            latestScoutRun: {
              runKey: 'scout:intake-1:2026-05-09T19:30:00.000Z',
              status: 'completed',
              triggerSource: 'intake_submission',
              model: 'deterministic_scout_v1',
              summary:
                'Scout captured public evidence and suggested a call angle.',
              errorMessage: null,
              createdAt: '2026-05-09T19:30:00Z',
              synthesisStatus: 'deterministic_fallback',
              synthesisConfidence: 'high',
              capturedEvidenceCount: 2,
              reusedLessonCount: 1,
              reusedLessonStatus: 'available',
              researchSynthesis: {
                status: 'deterministic_fallback',
                discoveryAngle:
                  'The public path is ready for a focused discovery call.',
                summaryBullets: ['TikTok points directly to live shopping.'],
                followUpQuestions: [
                  'Which live-shopping action should Scout prioritize?',
                ],
                evidenceBackedObservations: [
                  'Public profile and customer link both mention live shopping.',
                ],
                manualVerificationNeeded: [
                  'Confirm the live link is still current before outreach.',
                ],
                contradictions: [
                  'Instagram profile still points to an older link.',
                ],
                confidence: 'high',
              },
              publicFunnel: {
                shape: 'direct_site_first',
                summary:
                  'Public profiles point customers straight to the live shopping page.',
                primaryLinks: ['https://jamiehartjewelry.com/live'],
                concerns: [
                  'Confirm the live link still matches the current show-night flow.',
                ],
              },
              reusedLessons: [
                {
                  sourceRunKey: 'scout:tiktok-intake:2026-05-09T18:30:00.000Z',
                  lesson:
                    'TikTok phone-only reps need a two-device plan before launch copy.',
                  similarityReasons: [
                    'same primary platform',
                    'same device setup',
                  ],
                },
              ],
              evidenceSourceStatuses: [
                {
                  label: 'TikTok',
                  status: 'captured',
                  url: 'https://www.tiktok.com/@jamieh',
                },
                {
                  label: 'Instagram',
                  status: 'metadata_missing',
                  url: 'https://www.instagram.com/jamiebling/',
                },
              ],
            },
          },
        ],
      }),
    )

    expect(html).toContain('Latest saved Scout run')
    expect(html).toContain('completed')
    expect(html).toContain('intake submission')
    expect(html).toContain('deterministic scout v1')
    expect(html).toContain(
      'Scout captured public evidence and suggested a call angle.',
    )
    expect(html).toContain('2 captured evidence items')
    expect(html).toContain('deterministic fallback synthesis')
    expect(html).toContain('high confidence')
    expect(html).toContain('1 reused lesson')
    expect(html).toContain('lesson reuse available')
    expect(html).toContain('Saved synthesis')
    expect(html).toContain(
      'The public path is ready for a focused discovery call.',
    )
    expect(html).toContain('What stands out')
    expect(html).toContain('TikTok points directly to live shopping.')
    expect(html).toContain('Grounded observations')
    expect(html).toContain(
      'Public profile and customer link both mention live shopping.',
    )
    expect(html).toContain('Manual verification needed')
    expect(html).toContain(
      'Confirm the live link is still current before outreach.',
    )
    expect(html).toContain('Contradictions or tensions')
    expect(html).toContain('Instagram profile still points to an older link.')
    expect(html).toContain('Follow-up questions')
    expect(html).toContain(
      'Which live-shopping action should Scout prioritize?',
    )
    expect(html).toContain('Saved public funnel')
    expect(html).toContain('direct site first')
    expect(html).toContain(
      'Public profiles point customers straight to the live shopping page.',
    )
    expect(html).toContain('https://jamiehartjewelry.com/live')
    expect(html).toContain(
      'Confirm the live link still matches the current show-night flow.',
    )
    expect(html).toContain('Saved reused lessons')
    expect(html).toContain(
      'TikTok phone-only reps need a two-device plan before launch copy.',
    )
    expect(html).toContain('Why Scout reused this')
    expect(html).toContain('same primary platform')
    expect(html).toContain('same device setup')
    expect(html).toContain('scout:tiktok-intake:2026-05-09T18:30:00.000Z')
    expect(html).toContain('TikTok: captured')
    expect(html).toContain('Instagram: metadata missing')
    expect(html).toContain('scout:intake-1:2026-05-09T19:30:00.000Z')
  })

  it('renders saved Scout source checks on the latest run card', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            latestScoutRun: {
              runKey: 'scout:intake-1:2026-05-09T19:30:00.000Z',
              status: 'completed',
              triggerSource: 'operator_review',
              model: 'deterministic_scout_v1',
              summary: 'Scout captured public evidence.',
              errorMessage: null,
              createdAt: '2026-05-09T19:30:00Z',
              synthesisStatus: 'deterministic_fallback',
              synthesisConfidence: 'medium',
              capturedEvidenceCount: 1,
              evidenceSourceStatuses: [
                {
                  label: 'TikTok',
                  status: 'captured',
                  url: 'https://www.tiktok.com/@jamieh',
                },
                {
                  label: 'Instagram',
                  status: 'metadata_missing',
                  url: 'https://www.instagram.com/jamiebling/',
                },
              ],
            },
          },
        ],
      }),
    )

    expect(html).toContain('Saved source checks')
    expect(html).toContain('TikTok: captured')
    expect(html).toContain('Instagram: metadata missing')
    expect(html).toContain('https://www.tiktok.com/@jamieh')
    expect(html).toContain('https://www.instagram.com/jamiebling/')
  })

  it('renders the latest Meet transcript hook on each intake card', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            latestScribeTranscriptRun: {
              runKey: 'scribe_hook:intake-1:drive-file-123',
              status: 'queued',
              triggerSource: 'google_meet_gemini_transcript',
              model: 'gemini_transcript_hook_v1',
              summary:
                'Gemini transcript captured for Jamie Hart Jewelry; Scribe processing is queued.',
              errorMessage: null,
              createdAt: '2026-05-13T17:00:00Z',
              driveFileId: 'drive-file-123',
              driveFileUrl:
                'https://docs.google.com/document/d/drive-file-123/edit',
              meetUrl: 'https://meet.google.com/abc-defg-hij',
              meetingTitle: 'Sparkle Suite discovery call - Jamie Hart',
              transcriptCharCount: 248,
              speakerCount: 2,
              decisionCount: 1,
              actionItemCount: 1,
              clientPreferenceCount: 2,
              scribeStatus: 'queued',
              statusForScribe: 'ready_for_scribe',
              speakerNames: ['Louis', 'Jamie'],
              preview: 'Louis: Key decision: keep the velvet direction.',
              signals: {
                decisions: ['keep the velvet direction.'],
                clientPreferences: ['I prefer plum and pearl.'],
                actionItems: ['send the SignWell agreement.'],
                openQuestions: ['Can we keep my current team name?'],
              },
              scribeBrief: {
                status: 'draft_ready',
                sourceRunKey: 'scribe_hook:intake-1:drive-file-123',
                summary:
                  'Scribe draft for Jamie Hart Jewelry is ready for operator review: 1 decision, 1 client preference, 1 action item, and 1 open question captured.',
                meeting: {
                  title: 'Sparkle Suite discovery call - Jamie Hart',
                  startedAt: '2026-05-13T16:00:00Z',
                  speakerNames: ['Louis', 'Jamie'],
                },
                profileDraft: {
                  intakeId: 'intake-1',
                  ownerName: 'Jamie Hart',
                  businessName: 'Jamie Hart Jewelry',
                  confirmedDecisions: ['keep the velvet direction.'],
                  styleAndSetupSignals: ['I prefer plum and pearl.'],
                  actionItems: ['send the SignWell agreement.'],
                  openQuestions: ['Can we keep my current team name?'],
                },
                operatorChecklist: [
                  'Confirm the Drive transcript belongs to this intake before running Scribe.',
                  'Review all Scribe draft fields before copying them into onboarding or Builder work.',
                  'Do not treat this draft as legal, payment, or launch approval.',
                ],
                manualReviewWarnings: [
                  'Transcript signals mention legal, agreement, payment, pricing, or launch-gate work. Keep those items operator-only until the matching gate is configured and approved.',
                ],
                provenance: {
                  meetingProvider: 'google_meet',
                  transcriptionProvider: 'gemini',
                  driveFileId: 'drive-file-123',
                  driveFileUrl:
                    'https://docs.google.com/document/d/drive-file-123/edit',
                  meetUrl: 'https://meet.google.com/abc-defg-hij',
                  transcriptCharCount: 248,
                },
              },
            },
          },
        ],
      }),
    )

    expect(html).toContain('Latest Meet transcript')
    expect(html).toContain('queued via google meet gemini transcript')
    expect(html).toContain('gemini transcript hook v1')
    expect(html).toContain(
      'Gemini transcript captured for Jamie Hart Jewelry; Scribe processing is queued.',
    )
    expect(html).toContain('ready for scribe')
    expect(html).toContain('2 speakers')
    expect(html).toContain('1 decision')
    expect(html).toContain('1 action item')
    expect(html).toContain('2 client preferences')
    expect(html).toContain('Sparkle Suite discovery call - Jamie Hart')
    expect(html).toContain('Louis, Jamie')
    expect(html).toContain('Louis: Key decision: keep the velvet direction.')
    expect(html).toContain('Transcript signals')
    expect(html).toContain('keep the velvet direction.')
    expect(html).toContain('I prefer plum and pearl.')
    expect(html).toContain('send the SignWell agreement.')
    expect(html).toContain('Scribe handoff readiness')
    expect(html).toContain('Scribe follow-up incomplete')
    expect(html).toContain('Open questions need operator follow-up')
    expect(html).toContain('Manual review warnings')
    expect(html).toContain('Scribe follow-up brief')
    expect(html).toContain(
      'Scribe draft for Jamie Hart Jewelry is ready for operator review',
    )
    expect(html).toContain('Profile draft')
    expect(html).toContain('Confirmed decisions')
    expect(html).toContain('Style and setup signals')
    expect(html).toContain('Open questions')
    expect(html).toContain('Can we keep my current team name?')
    expect(html).toContain('Operator review checks')
    expect(html).toContain(
      'Review all Scribe draft fields before copying them into onboarding or Builder work.',
    )
    expect(html).toContain(
      'Do not treat this draft as legal, payment, or launch approval.',
    )
    expect(html).toContain('Scribe guardrails')
    expect(html).toContain(
      'Transcript signals mention legal, agreement, payment, pricing, or launch-gate work.',
    )
    expect(html).not.toContain('Run Scribe')
    expect(html).toContain('https://docs.google.com/document/d/drive-file-123/edit')
    expect(html).toContain('https://meet.google.com/abc-defg-hij')
    expect(html).toContain('scribe_hook:intake-1:drive-file-123')
  })

  it('surfaces transcript open questions even before a Scribe brief exists', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            latestScribeTranscriptRun: {
              runKey: 'scribe_hook:intake-1:drive-file-open-question',
              status: 'queued',
              triggerSource: 'google_meet_gemini_transcript',
              model: 'gemini_transcript_hook_v1',
              summary: 'Gemini transcript captured; Scribe processing is queued.',
              errorMessage: null,
              createdAt: '2026-05-13T17:00:00Z',
              driveFileId: 'drive-file-open-question',
              driveFileUrl: null,
              meetUrl: null,
              meetingTitle: 'Sparkle Suite discovery call - Jamie Hart',
              transcriptCharCount: 186,
              speakerCount: 2,
              decisionCount: 0,
              actionItemCount: 0,
              clientPreferenceCount: 0,
              scribeStatus: 'queued',
              statusForScribe: 'ready_for_scribe',
              speakerNames: ['Louis', 'Jamie'],
              preview: null,
              signals: {
                decisions: [],
                clientPreferences: [],
                actionItems: [],
                openQuestions: ['Can we keep my current team name?'],
              },
            },
          },
        ],
      }),
    )

    expect(html).toContain('Transcript signals')
    expect(html).toContain('Transcript open questions need operator follow-up')
    expect(html).toContain(
      '1 open question is visible before Scribe brief generation.',
    )
    expect(html).toContain('Open questions')
    expect(html).toContain('Can we keep my current team name?')
    expect(html).not.toContain('Scribe follow-up brief')
    expect(html).not.toContain('Send agreement')
    expect(html).not.toContain('Collect payment')
  })

  it('renders the latest failed Scout run error on the intake card', () => {
    const html = renderToStaticMarkup(
      createElement(PrelaunchIntakeReviewPageContent, {
        submissions: [
          {
            ...submission,
            latestScoutRun: {
              runKey: 'scout:intake-1:2026-05-09T19:30:00.000Z',
              status: 'failed',
              triggerSource: 'intake_submission',
              model: 'deterministic_scout_v1',
              summary: null,
              errorMessage: 'Public evidence fetch timed out.',
              createdAt: '2026-05-09T19:30:00Z',
              synthesisStatus: null,
              synthesisConfidence: null,
              capturedEvidenceCount: null,
            },
          },
        ],
      }),
    )

    expect(html).toContain('Latest saved Scout run')
    expect(html).toContain('failed')
    expect(html).toContain('Scout run error')
    expect(html).toContain('Public evidence fetch timed out.')
  })

  it('renders Scout research handoff details after a run', () => {
    const output: PrelaunchScoutOutput = {
      briefTitle: 'Scout brief: Jamie Hart Jewelry',
      summary:
        'Jamie Hart Jewelry is a TikTok prospect. External social research is not connected yet.',
      recommendedNextStep: 'operator_review_first',
      researchTargets: [
        { label: 'TikTok', value: '@jamieh', priority: 'high' },
      ],
      researchPlan: {
        status: 'manual_research_required',
        searchQueries: ['Jamie Hart Jewelry @jamieh TikTok'],
        evidenceChecklist: [
          'Confirm recent live-show cadence and audience engagement.',
        ],
        blockers: ['External social research is not connected yet.'],
        capturedEvidence: [],
        sourceReports: [
          {
            label: 'TikTok',
            status: 'fetch_failed',
            url: 'https://www.tiktok.com/@jamieh',
            note: 'Scout could not fetch the public page metadata.',
          },
          {
            label: 'Instagram',
            status: 'metadata_missing',
            url: 'https://www.instagram.com/jamiebling/',
            note: 'Scout reached the public page but did not find usable title or description metadata.',
          },
          {
            label: 'Facebook',
            status: 'not_provided',
            url: null,
            note: 'No public handle or URL was provided in the intake.',
          },
        ],
      },
      setupRisks: ['Confirm a two-device live setup.'],
      suggestedQuestions: ['Can they support a two-device setup?'],
      reusedLessons: [],
      generatedBy: 'deterministic_scout_v1',
      publicFunnel: {
        shape: 'unclear',
        summary:
          'Scout does not have enough public link evidence to describe the customer path yet.',
        primaryLinks: [],
        concerns: ['Public customer path still needs manual confirmation.'],
      },
      researchSynthesis: {
        status: 'not_available',
        discoveryAngle: null,
        summaryBullets: [],
        followUpQuestions: [],
        evidenceBackedObservations: [],
        manualVerificationNeeded: [],
        contradictions: [],
        confidence: 'low',
      },
    }

    const html = renderToStaticMarkup(
      createElement(PrelaunchScoutRecommendationResult, { output }),
    )

    expect(html).toContain('Manual research handoff')
    expect(html).toContain('Jamie Hart Jewelry @jamieh TikTok')
    expect(html).toContain(
      'Confirm recent live-show cadence and audience engagement.',
    )
    expect(html).toContain('External social research is not connected yet.')
    expect(html).toContain('Source check results')
    expect(html).toContain('TikTok: fetch failed')
    expect(html).toContain(
      'Scout reached the public page but did not find usable title or description metadata.',
    )
  })

  it('renders captured public profile evidence when Scout finds it', () => {
    const output: PrelaunchScoutOutput = {
      briefTitle: 'Scout brief: Jamie Hart Jewelry',
      summary:
        'Jamie Hart Jewelry is a TikTok prospect. Scout captured lightweight public-profile evidence from TikTok.',
      recommendedNextStep: 'operator_review_first',
      researchTargets: [
        { label: 'TikTok', value: '@jamieh', priority: 'high' },
      ],
      researchPlan: {
        status: 'evidence_captured',
        searchQueries: ['Jamie Hart Jewelry @jamieh TikTok'],
        evidenceChecklist: [
          'Look for one discovery-call angle from the captured bio/title language.',
        ],
        blockers: [],
        capturedEvidence: [
          {
            label: 'TikTok',
            url: 'https://www.tiktok.com/@jamieh',
            title: 'Jamie Hart Jewelry | TikTok',
            description:
              'Live jewelry sales, trade nights, and customer follow-up clips.',
            canonicalUrl: 'https://www.tiktok.com/@jamieh',
            evidenceSnippets: [
              'Live reveals every Tuesday',
              "Shop tonight's live board",
            ],
            outboundLinks: ['https://jamiehartjewelry.com/live'],
            primaryOutboundLink: 'https://jamiehartjewelry.com/live',
            primaryOutboundLinkReason:
              'Direct brand or shop links are more likely the real customer action than a generic link hub.',
          },
          {
            label: 'Primary customer link',
            url: 'https://jamiehartjewelry.com/live',
            title: 'Jamie Hart Jewelry Live Shop',
            description:
              'Shop the current live reveal board and see next-show details.',
            canonicalUrl: 'https://jamiehartjewelry.com/live',
            evidenceSnippets: [
              'Claim favorites before the next show',
              'Join the VIP text list',
            ],
            outboundLinks: [],
            primaryOutboundLink: null,
            primaryOutboundLinkReason: null,
          },
        ],
        sourceReports: [
          {
            label: 'TikTok',
            status: 'captured',
            url: 'https://www.tiktok.com/@jamieh',
            note: 'Usable public profile metadata was captured.',
          },
          {
            label: 'Instagram',
            status: 'metadata_missing',
            url: 'https://www.instagram.com/jamiebling/',
            note: 'Scout reached the public page but did not find usable title or description metadata.',
          },
          {
            label: 'Facebook',
            status: 'not_provided',
            url: null,
            note: 'No public handle or URL was provided in the intake.',
          },
          {
            label: 'Primary customer link',
            status: 'captured',
            url: 'https://jamiehartjewelry.com/live',
            note: 'Usable public customer-link metadata was captured.',
          },
        ],
      },
      setupRisks: ['Confirm a two-device live setup.'],
      suggestedQuestions: ['Can they support a two-device setup?'],
      reusedLessons: [],
      generatedBy: 'deterministic_scout_v1',
      publicFunnel: {
        shape: 'direct_site_first',
        summary:
          'The public profile points customers straight to a direct brand or shop link first.',
        primaryLinks: ['https://jamiehartjewelry.com/live'],
        concerns: [],
      },
      researchSynthesis: {
        status: 'deterministic_fallback',
        discoveryAngle:
          'The public TikTok profile is enough to start from customer-facing language instead of a blank first pass.',
        summaryBullets: [
          'Profile copy points toward live-sale momentum.',
        ],
        followUpQuestions: [
          'Which customer action is breaking most often right now?',
        ],
        evidenceBackedObservations: [
          'Profile copy points toward live-sale momentum.',
        ],
        manualVerificationNeeded: [
          'Confirm the direct customer-link page still matches the public profile promise.',
        ],
        contradictions: [],
        confidence: 'high',
      },
    }

    const html = renderToStaticMarkup(
      createElement(PrelaunchScoutRecommendationResult, { output }),
    )

    expect(html).toContain('Captured public evidence')
    expect(html).toContain('Jamie Hart Jewelry | TikTok')
    expect(html).toContain('https://www.tiktok.com/@jamieh')
    expect(html).toContain(
      'Live jewelry sales, trade nights, and customer follow-up clips.',
    )
    expect(html).toContain('Likely primary customer link')
    expect(html).toContain('Primary customer link')
    expect(html).toContain('Jamie Hart Jewelry Live Shop')
    expect(html).toContain(
      'Shop the current live reveal board and see next-show details.',
    )
    expect(html).toContain('Page signals')
    expect(html).toContain('Live reveals every Tuesday')
    expect(html).toContain('Shop tonight&#x27;s live board')
    expect(html).toContain('Claim favorites before the next show')
    expect(html).toContain('Join the VIP text list')
    expect(html).toContain(
      'Direct brand or shop links are more likely the real customer action than a generic link hub.',
    )
    expect(html).toContain('Public funnel read')
    expect(html).toContain('direct site first')
    expect(html).toContain(
      'The public profile points customers straight to a direct brand or shop link first.',
    )
    expect(html).toContain('Possible customer links')
    expect(html).toContain('https://jamiehartjewelry.com/live')
    expect(html).toContain('TikTok: captured')
    expect(html).toContain('Usable public customer-link metadata was captured.')
  })

  it('renders Scout synthesis when it exists', () => {
    const output: PrelaunchScoutOutput = {
      briefTitle: 'Scout brief: Jamie Hart Jewelry',
      summary:
        'Jamie Hart Jewelry is a TikTok prospect. Scout captured lightweight public-profile evidence from TikTok.',
      recommendedNextStep: 'operator_review_first',
      researchTargets: [
        { label: 'TikTok', value: '@jamieh', priority: 'high' },
      ],
      researchPlan: {
        status: 'evidence_captured',
        searchQueries: ['Jamie Hart Jewelry @jamieh TikTok'],
        evidenceChecklist: [],
        blockers: [],
        capturedEvidence: [
          {
            label: 'TikTok',
            url: 'https://www.tiktok.com/@jamieh',
            title: 'Jamie Hart Jewelry | TikTok',
            description:
              'Live jewelry sales, trade nights, and customer follow-up clips.',
            canonicalUrl: 'https://www.tiktok.com/@jamieh',
            outboundLinks: ['https://jamiehartjewelry.com/live'],
            primaryOutboundLink: 'https://jamiehartjewelry.com/live',
            primaryOutboundLinkReason:
              'Direct brand or shop links are more likely the real customer action than a generic link hub.',
          },
        ],
        sourceReports: [
          {
            label: 'TikTok',
            status: 'captured',
            url: 'https://www.tiktok.com/@jamieh',
            note: 'Usable public profile metadata was captured.',
          },
          {
            label: 'Instagram',
            status: 'metadata_missing',
            url: 'https://www.instagram.com/jamiebling/',
            note: 'Scout reached the public page but did not find usable title or description metadata.',
          },
          {
            label: 'Facebook',
            status: 'not_provided',
            url: null,
            note: 'No public handle or URL was provided in the intake.',
          },
        ],
      },
      setupRisks: ['Confirm a two-device live setup.'],
      suggestedQuestions: ['Can they support a two-device setup?'],
      reusedLessons: [],
      generatedBy: 'deterministic_scout_v1',
      publicFunnel: {
        shape: 'direct_site_first',
        summary:
          'The public profile points customers straight to a direct brand or shop link first.',
        primaryLinks: ['https://jamiehartjewelry.com/live'],
        concerns: [],
      },
      researchSynthesis: {
        status: 'model_generated',
        discoveryAngle:
          'The public TikTok language already sounds customer-first, so the discovery call can focus on smoothing the live-show path.',
        summaryBullets: [
          'Profile language points to active live-sale momentum.',
          'Customer follow-up already appears in the public positioning.',
        ],
        followUpQuestions: [
          'Which customer action breaks most often between the live and the replay window?',
        ],
        evidenceBackedObservations: [
          'The public profile and customer-link page both point to live-show shopping.',
        ],
        manualVerificationNeeded: [
          'Confirm the direct customer-link page still matches the public profile promise.',
        ],
        contradictions: [
          'TikTok and Instagram appear to point to different public links.',
        ],
        confidence: 'medium',
      },
    }

    const html = renderToStaticMarkup(
      createElement(PrelaunchScoutRecommendationResult, { output }),
    )

    expect(html).toContain('Scout synthesis')
    expect(html).toContain(
      'The public TikTok language already sounds customer-first, so the discovery call can focus on smoothing the live-show path.',
    )
    expect(html).toContain(
      'Profile language points to active live-sale momentum.',
    )
    expect(html).toContain(
      'Which customer action breaks most often between the live and the replay window?',
    )
    expect(html).toContain('Grounded observations')
    expect(html).toContain(
      'The public profile and customer-link page both point to live-show shopping.',
    )
    expect(html).toContain('Manual verification needed')
    expect(html).toContain(
      'Confirm the direct customer-link page still matches the public profile promise.',
    )
    expect(html).toContain('Contradictions or tensions')
    expect(html).toContain(
      'TikTok and Instagram appear to point to different public links.',
    )
    expect(html).toContain('Confidence: medium')
  })

  it('renders reused Scout lessons with similarity reasons', () => {
    const output: PrelaunchScoutOutput = {
      briefTitle: 'Scout brief: Jamie Hart Jewelry',
      summary:
        'Jamie Hart Jewelry is a TikTok prospect. External social research is not connected yet.',
      recommendedNextStep: 'operator_review_first',
      researchTargets: [
        { label: 'TikTok', value: '@jamieh', priority: 'high' },
      ],
      researchPlan: {
        status: 'manual_research_required',
        searchQueries: [],
        evidenceChecklist: [],
        blockers: [],
        capturedEvidence: [],
        sourceReports: [],
      },
      setupRisks: [],
      suggestedQuestions: [],
      reusedLessons: [
        {
          sourceRunKey: 'scout:tiktok-intake:2026-05-09T18:30:00.000Z',
          lesson:
            'TikTok phone-only reps need a two-device plan before launch copy.',
          similarityReasons: [
            'same primary platform',
            'same device setup',
            'shared fit flag: phone_only_setup',
          ],
        },
      ],
      generatedBy: 'deterministic_scout_v1',
      publicFunnel: {
        shape: 'unclear',
        summary:
          'Scout does not have enough public link evidence to describe the customer path yet.',
        primaryLinks: [],
        concerns: [],
      },
      researchSynthesis: {
        status: 'not_available',
        discoveryAngle: null,
        summaryBullets: [],
        followUpQuestions: [],
        evidenceBackedObservations: [],
        manualVerificationNeeded: [],
        contradictions: [],
        confidence: 'low',
      },
    }

    const html = renderToStaticMarkup(
      createElement(PrelaunchScoutRecommendationResult, { output }),
    )

    expect(html).toContain('Reused Scout lessons')
    expect(html).toContain(
      'TikTok phone-only reps need a two-device plan before launch copy.',
    )
    expect(html).toContain('Why Scout reused this')
    expect(html).toContain('same primary platform')
    expect(html).toContain('same device setup')
    expect(html).toContain('shared fit flag: phone_only_setup')
    expect(html).toContain('scout:tiktok-intake:2026-05-09T18:30:00.000Z')
  })
})
