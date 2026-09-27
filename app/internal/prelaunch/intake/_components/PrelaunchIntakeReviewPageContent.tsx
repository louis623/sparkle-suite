import Link from 'next/link'
import {
  getPasswordMinLength,
  getPasswordRequirements,
} from '@/lib/auth/password-policy'
import {
  buildPrelaunchScoutInput,
  type PrelaunchIntakeReviewSubmission,
} from '@/lib/prelaunch/intake-review'
import {
  buildPrelaunchLaunchCheckItems,
  type PrelaunchLaunchCheck,
} from '@/lib/prelaunch/launch-checks'
import type { PrelaunchAgreementDocument } from '@/lib/prelaunch/agreement-documents'
import {
  buildPrelaunchLaunchGateItems,
  type PrelaunchLaunchGate,
} from '@/lib/prelaunch/launch-gates'
import type { PrelaunchWaitlistReviewLead } from '@/lib/prelaunch/waitlist-review'
import type { PrelaunchLaunchBuild } from '@/lib/prelaunch/launch-builds'
import type { PrelaunchLaunchSetupProfile } from '@/lib/prelaunch/setup-profiles'
import {
  getPrelaunchGateReadiness,
  type PrelaunchGateReadinessItem,
} from '@/lib/prelaunch/gate-readiness'
import type { PrelaunchSafeSmokeStatusItem } from '@/lib/prelaunch/safe-smoke-status'
import { buildCameraQualityPrep } from '@/lib/prelaunch/camera-quality-prep'
import { buildPhotographyKitPrep } from '@/lib/prelaunch/photography-kit-prep'
import { getApprovedPrelaunchQrManifest } from '@/lib/prelaunch/qr-assets'
import { buildScribeReadiness } from '@/lib/prelaunch/scribe-readiness'
import { buildPrelaunchOperatorHandoffBrief } from '@/lib/prelaunch/operator-handoff'
import { ControlCenterThemeToggle } from './ControlCenterThemeToggle'
import { PrelaunchScoutRunButton } from './PrelaunchScoutRunButton'

interface PrelaunchIntakeReviewPageContentProps {
  submissions: PrelaunchIntakeReviewSubmission[]
  waitlistLeads?: PrelaunchWaitlistReviewLead[]
  activeLane?: PrelaunchIntakeReviewLane | null
  activeWaitlistView?: PrelaunchWaitlistReviewView | null
  agreementDocuments?: PrelaunchAgreementDocument[]
  basePath?: string
  launchChecks?: PrelaunchLaunchCheck[]
  launchGates?: PrelaunchLaunchGate[]
  launchBuilds?: PrelaunchLaunchBuild[]
  launchSetupProfiles?: PrelaunchLaunchSetupProfile[]
  safeSmokeStatus?: PrelaunchSafeSmokeStatusItem[]
  surface?: 'prelaunch_review' | 'control_center'
}

interface OperatorReadinessItem {
  label: string
  detail: string
  status: 'blocked' | 'review' | 'ready'
}

export type PrelaunchIntakeReviewLane =
  | 'needs_review'
  | 'failed_scout'
  | 'missing_transcript'
  | 'meeting_ready'
  | 'gate_blocked'

export type PrelaunchWaitlistReviewView =
  | 'contact_batch'
  | 'contacted'
  | 'meeting_scheduled'
  | 'conversation_complete'
  | 'setup_profile_drafted'
  | 'start_work_ready'

const PRELAUNCH_INTAKE_LANES: Array<{
  key: PrelaunchIntakeReviewLane
  label: string
  detail: string
}> = [
  {
    key: 'needs_review',
    label: 'Needs review',
    detail: 'Fit or setup review',
  },
  {
    key: 'failed_scout',
    label: 'Failed Scout',
    detail: 'Scout error review',
  },
  {
    key: 'missing_transcript',
    label: 'Missing transcript',
    detail: 'Meeting-ready without Scribe',
  },
  {
    key: 'meeting_ready',
    label: 'Meeting ready',
    detail: 'Transcript handoff queued',
  },
  {
    key: 'gate_blocked',
    label: 'Gate blocked',
    detail: 'Launch gates still blocked',
  },
]

export function normalizePrelaunchIntakeReviewLane(
  value: string | string[] | undefined,
): PrelaunchIntakeReviewLane | null {
  const lane = Array.isArray(value) ? value[0] : value
  return PRELAUNCH_INTAKE_LANES.some((candidate) => candidate.key === lane)
    ? (lane as PrelaunchIntakeReviewLane)
    : null
}

export function normalizePrelaunchWaitlistReviewView(
  value: string | string[] | undefined,
): PrelaunchWaitlistReviewView | null {
  const view = Array.isArray(value) ? value[0] : value
  return view === 'contact_batch' ||
    view === 'contacted' ||
    view === 'meeting_scheduled' ||
    view === 'conversation_complete' ||
    view === 'setup_profile_drafted' ||
    view === 'start_work_ready'
    ? view
    : null
}

function formatValue(value: string | null | undefined) {
  return value?.trim() || 'Not provided'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatLabel(value: string | null | undefined) {
  return value?.replaceAll('_', ' ') ?? 'Not provided'
}

function formatTitleLabel(value: string | null | undefined) {
  const label = formatLabel(value)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatScoutInputStatus(value: string) {
  if (value === 'ready') return 'Scout input ready'
  if (value === 'generated') return 'Scout generated'
  return formatLabel(value)
}

function formatActiveBuildPhase(build: PrelaunchLaunchBuild | null) {
  if (!build) return 'No info'
  if (build.stage === 'ready_for_launch') return 'Ready for launch'
  if (build.status === 'ready') return 'Ready to build'
  if (build.blockers.length > 0) return 'Needs attention'
  return 'In progress'
}

function formatActiveBuildDetail(build: PrelaunchLaunchBuild | null) {
  if (!build) return 'Build slot is open'
  if (build.stage === 'ready_for_launch') return 'Production roster is connected'
  if (build.status === 'ready') return 'Ready for local smoke'
  if (build.blockers.length > 0) return 'Clear blockers before continuing'
  return 'Moving through setup'
}

function formatActiveBuildNextAction(build: PrelaunchLaunchBuild | null) {
  if (!build) return 'Select one lead when ready to start onboarding'
  if (build.stage === 'ready_for_launch') return 'Review production roster'
  if (build.status === 'ready') return 'Smoke test the client account'
  if (build.blockers.length > 0) return 'Clear blockers'
  return 'Keep setup moving'
}

function formatActiveBuildNextHref(
  build: PrelaunchLaunchBuild | null,
  basePath: string,
) {
  if (build?.stage === 'ready_for_launch') return `${basePath}#reps`
  return formatWaitlistViewHref('start_work_ready', basePath)
}

function formatLaneHref(lane: PrelaunchIntakeReviewLane | null, basePath: string) {
  return lane ? `${basePath}?lane=${lane}` : basePath
}

function formatWaitlistViewHref(
  view: PrelaunchWaitlistReviewView | null,
  basePath: string,
) {
  return view ? `${basePath}?waitlist=${view}` : basePath
}

function hasBlockedGate(gateReadiness: PrelaunchGateReadinessItem[]) {
  return gateReadiness.some((gate) => gate.status === 'blocked')
}

function submissionMatchesLane(
  submission: PrelaunchIntakeReviewSubmission,
  lane: PrelaunchIntakeReviewLane,
  gateReadiness: PrelaunchGateReadinessItem[],
) {
  if (lane === 'needs_review') {
    return (
      submission.prequalificationStatus === 'needs_review' ||
      submission.fitFlags.length > 0
    )
  }

  if (lane === 'failed_scout') {
    return submission.latestScoutRun?.status === 'failed'
  }

  if (lane === 'missing_transcript') {
    return (
      submission.handoffStatus === 'meeting_ready' &&
      !submission.latestScribeTranscriptRun
    )
  }

  if (lane === 'meeting_ready') {
    return submission.handoffStatus === 'meeting_ready'
  }

  return hasBlockedGate(gateReadiness)
}

function formatCount(
  value: number | null | undefined,
  singular: string,
  plural = `${singular}s`,
) {
  const count = value ?? 0
  return `${count} ${count === 1 ? singular : plural}`
}

function gateStatusClass(status: string) {
  if (status === 'blocked') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function operatorStepClass(status: string) {
  if (status === 'blocked') return 'border-red-200 bg-red-50 text-red-900'
  if (status === 'review') return 'border-amber-200 bg-amber-50 text-amber-900'

  return 'border-emerald-200 bg-emerald-50 text-emerald-900'
}

function photographyPrepClass(status: string) {
  if (status === 'required') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  return 'border-sky-200 bg-sky-50 text-sky-900'
}

function scribeReadinessClass(status: string) {
  if (status === 'missing') return 'border-red-200 bg-red-50 text-red-900'
  if (status === 'review') return 'border-amber-200 bg-amber-50 text-amber-900'

  return 'border-emerald-200 bg-emerald-50 text-emerald-900'
}

function welcomeEmailStatusClass(status: string) {
  if (status === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (status === 'failed') return 'border-red-200 bg-red-50 text-red-900'
  if (status === 'skipped') return 'border-amber-200 bg-amber-50 text-amber-900'

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function safeSmokeStatusClass(status: string) {
  if (status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (status === 'guarded') return 'border-sky-200 bg-sky-50 text-sky-900'

  return 'border-amber-200 bg-amber-50 text-amber-900'
}

function agreementDocumentStatusClass(status: string) {
  if (status === 'signed') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (status === 'failed' || status === 'voided') {
    return 'border-red-200 bg-red-50 text-red-900'
  }
  if (status === 'created' || status === 'sent') {
    return 'border-sky-200 bg-sky-50 text-sky-900'
  }

  return 'border-amber-200 bg-amber-50 text-amber-900'
}

function formatWelcomeEmailStatus(status: string) {
  if (status === 'sent') return 'Confirmation sent'
  if (status === 'failed') return 'Confirmation failed'
  if (status === 'skipped') return 'Confirmation skipped'

  return 'Confirmation pending'
}

function buildWaitlistLeadNextAction(lead: PrelaunchWaitlistReviewLead) {
  if (lead.leadStatus === 'contact_batch_selected') {
    return {
      label: 'Selected for contact batch',
      detail:
        'This lead is queued for the next manual outreach batch. Review the batch before sending anything.',
    }
  }

  if (lead.leadStatus === 'contacted') {
    return {
      label: 'Contacted',
      detail:
        'Manual outreach has happened. Next step is operator-led scheduling or follow-up notes.',
    }
  }

  if (lead.leadStatus === 'meeting_scheduled') {
    return {
      label: 'Meeting scheduled',
      detail:
        'A manual setup conversation is on the calendar. Keep the calendar invite and transcript capture operator-led.',
    }
  }

  if (lead.leadStatus === 'conversation_complete') {
    return {
      label: 'Conversation complete',
      detail:
        'The setup conversation is complete. Keep transcript import, profile drafting, and Start Work decisions operator-led.',
    }
  }

  if (lead.leadStatus === 'setup_profile_drafted') {
    return {
      label: 'Setup profile drafted',
      detail:
        'A manual setup profile draft exists for operator review. Keep Start Work, payment, agreement, and build decisions separate.',
    }
  }

  if (lead.leadStatus === 'start_work_ready') {
    return {
      label: 'Start Work ready',
      detail:
        'Louis approved this profile for the Start Work lane. Keep Stripe, SignWell, build readiness, and live queue actions behind their own gates.',
    }
  }

  if (lead.intakeSubmissionId) {
    return {
      label: 'Continue intake handoff',
      detail:
        'This waitlist lead is already linked to an intake record. Review the intake card before any Start Work action.',
    }
  }

  if (lead.welcomeEmailStatus === 'failed') {
    return {
      label: 'Fix confirmation email',
      detail:
        'The lead was saved, but the welcome email failed. Review the error before putting this person in a contact batch.',
    }
  }

  if (lead.welcomeEmailStatus === 'skipped') {
    return {
      label: 'Review before outreach',
      detail:
        'The lead was saved without a confirmation email. Keep them on the list until you choose the next manual contact batch.',
    }
  }

  return {
    label: 'Ready for contact batch',
    detail: lead.smsConsent
      ? 'This lead can be considered for the next approved email or text outreach batch.'
      : 'This lead is email-only for now. Do not use SMS outreach unless consent is captured later.',
  }
}

function isWaitlistLeadSelectedForContactBatch(
  lead: PrelaunchWaitlistReviewLead,
) {
  return lead.leadStatus === 'contact_batch_selected'
}

function isWaitlistLeadContacted(lead: PrelaunchWaitlistReviewLead) {
  return lead.leadStatus === 'contacted'
}

function isWaitlistLeadMeetingScheduled(lead: PrelaunchWaitlistReviewLead) {
  return lead.leadStatus === 'meeting_scheduled'
}

function isWaitlistLeadConversationComplete(lead: PrelaunchWaitlistReviewLead) {
  return lead.leadStatus === 'conversation_complete'
}

function isWaitlistLeadSetupProfileDrafted(
  lead: PrelaunchWaitlistReviewLead,
) {
  return lead.leadStatus === 'setup_profile_drafted'
}

function isWaitlistLeadStartWorkReady(lead: PrelaunchWaitlistReviewLead) {
  return lead.leadStatus === 'start_work_ready'
}

function isWaitlistLeadReadyForContactBatch(lead: PrelaunchWaitlistReviewLead) {
  return (
    lead.welcomeEmailStatus === 'sent' &&
    lead.handoffStatus === 'not_started' &&
    lead.leadStatus === 'new' &&
    !lead.intakeSubmissionId
  )
}

function summarizeSnapshotNames(leads: PrelaunchWaitlistReviewLead[]) {
  if (leads.length === 0) return 'No info'

  const names = leads.slice(0, 2).map((lead) => lead.name)
  const remaining = leads.length - names.length

  return remaining > 0 ? `${names.join(', ')} +${remaining}` : names.join(', ')
}

function buildOperatorReadiness(
  submission: PrelaunchIntakeReviewSubmission,
  gates: PrelaunchGateReadinessItem[],
) {
  const items: OperatorReadinessItem[] = []

  if (
    submission.prequalificationStatus === 'needs_review' ||
    submission.fitFlags.length > 0
  ) {
    items.push({
      label: 'Resolve fit review',
      detail:
        submission.fitFlags.length > 0
          ? `Open fit flags: ${submission.fitFlags.join(', ')}.`
          : 'Prequalification still needs operator review.',
      status: 'blocked',
    })
  } else {
    items.push({
      label: 'Fit review clear',
      detail: 'No current fit flags are attached to this intake.',
      status: 'ready',
    })
  }

  items.push(
    submission.waitlistId
      ? {
          label: 'Waitlist linked',
          detail: 'The intake is connected to a waitlist lead.',
          status: 'ready',
        }
      : {
          label: 'Link waitlist lead',
          detail: 'Connect the intake to the matching waitlist row before handoff.',
          status: 'blocked',
        },
  )

  if (!submission.latestScoutRun) {
    items.push({
      label: 'Run Scout',
      detail: 'No saved Scout run is visible for this intake yet.',
      status: 'review',
    })
  } else if (submission.latestScoutRun.status === 'failed') {
    items.push({
      label: 'Review failed Scout run',
      detail:
        submission.latestScoutRun.errorMessage ??
        'The latest Scout run failed and needs operator review.',
      status: 'blocked',
    })
  } else {
    items.push({
      label: 'Scout run saved',
      detail: `Latest Scout status: ${formatLabel(
        submission.latestScoutRun.status,
      )}.`,
      status: 'ready',
    })
  }

  const scribeWarnings =
    submission.latestScribeTranscriptRun?.scribeBrief?.manualReviewWarnings ?? []

  if (scribeWarnings.length > 0) {
    items.push({
      label: 'Review Scribe guardrails',
      detail: scribeWarnings[0],
      status: 'blocked',
    })
  } else if (submission.latestScribeTranscriptRun?.scribeBrief) {
    items.push({
      label: 'Scribe brief ready',
      detail: 'Scribe has a read-only follow-up brief ready for operator review.',
      status: 'ready',
    })
  } else if (submission.handoffStatus === 'meeting_ready') {
    items.push({
      label: 'Review transcript handoff',
      detail: 'The intake is marked meeting-ready, but no Scribe brief is visible yet.',
      status: 'review',
    })
  }

  items.push({
    label: 'Keep launch gates disabled',
    detail: gates
      .map((gate) => `${gate.label}: ${gate.displayStatus}`)
      .join('; '),
    status: 'review',
  })

  return {
    label: items.some((item) => item.status === 'blocked')
      ? 'Handoff blocked'
      : 'Operator review needed',
    items,
  }
}

function BriefList({
  items,
  title,
}: {
  items: string[]
  title: string
}) {
  if (items.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function PrelaunchIntakeReviewPageContent({
  activeLane = null,
  activeWaitlistView = null,
  agreementDocuments = [],
  basePath = '/internal/prelaunch/intake',
  launchChecks = [],
  launchGates = [],
  launchBuilds = [],
  launchSetupProfiles = [],
  safeSmokeStatus = [],
  submissions,
  surface = 'prelaunch_review',
  waitlistLeads = [],
}: PrelaunchIntakeReviewPageContentProps) {
  const isControlCenter = surface === 'control_center'
  const activeLaunchBuild = launchBuilds[0] ?? null
  const activeLaunchSetupProfile = activeLaunchBuild
    ? launchSetupProfiles.find(
        (profile) => profile.launchBuildId === activeLaunchBuild.id,
      ) ?? null
    : null
  const activeLaunchCheckItems = activeLaunchBuild
    ? buildPrelaunchLaunchCheckItems(
        activeLaunchBuild.id,
        launchChecks.filter(
          (check) => check.launchBuildId === activeLaunchBuild.id,
        ),
      )
    : []
  const activeLaunchGateItems = activeLaunchBuild
    ? buildPrelaunchLaunchGateItems(
        activeLaunchBuild.id,
        launchGates.filter((gate) => gate.launchBuildId === activeLaunchBuild.id),
      )
    : []
  const activeAgreementDocument = activeLaunchBuild
    ? agreementDocuments.find(
        (document) => document.launchBuildId === activeLaunchBuild.id,
      ) ?? null
    : null
  const total = submissions.length
  const confirmationSent = waitlistLeads.filter(
    (lead) => lead.welcomeEmailStatus === 'sent',
  ).length
  const contactBatchReady = waitlistLeads.filter(
    isWaitlistLeadReadyForContactBatch,
  ).length
  const contactBatchSelected = waitlistLeads.filter(
    isWaitlistLeadSelectedForContactBatch,
  ).length
  const contactedLeads = waitlistLeads.filter(isWaitlistLeadContacted).length
  const meetingScheduledLeads = waitlistLeads.filter(
    isWaitlistLeadMeetingScheduled,
  ).length
  const conversationCompleteLeads = waitlistLeads.filter(
    isWaitlistLeadConversationComplete,
  ).length
  const setupProfileDraftedLeads = waitlistLeads.filter(
    isWaitlistLeadSetupProfileDrafted,
  ).length
  const startWorkReadyLeads = waitlistLeads.filter(
    isWaitlistLeadStartWorkReady,
  ).length
  const visibleWaitlistLeads =
    activeWaitlistView === 'contact_batch'
      ? waitlistLeads.filter(isWaitlistLeadSelectedForContactBatch)
      : activeWaitlistView === 'contacted'
        ? waitlistLeads.filter(isWaitlistLeadContacted)
        : activeWaitlistView === 'meeting_scheduled'
          ? waitlistLeads.filter(isWaitlistLeadMeetingScheduled)
          : activeWaitlistView === 'conversation_complete'
            ? waitlistLeads.filter(isWaitlistLeadConversationComplete)
            : activeWaitlistView === 'setup_profile_drafted'
              ? waitlistLeads.filter(isWaitlistLeadSetupProfileDrafted)
              : activeWaitlistView === 'start_work_ready'
                ? waitlistLeads.filter(isWaitlistLeadStartWorkReady)
              : waitlistLeads
  const needsReview = submissions.filter(
    (submission) => submission.prequalificationStatus === 'needs_review',
  ).length
  const qualified = submissions.filter(
    (submission) => submission.prequalificationStatus === 'qualified',
  ).length
  const scoutGenerated = submissions.filter(
    (submission) => submission.scoutInputStatus === 'generated',
  ).length
  const meetingReady = submissions.filter(
    (submission) => submission.handoffStatus === 'meeting_ready',
  ).length
  const gateReadiness = getPrelaunchGateReadiness()
  const needsAttention = submissions.filter(
    (submission) =>
      submissionMatchesLane(submission, 'needs_review', gateReadiness) ||
      submissionMatchesLane(submission, 'failed_scout', gateReadiness) ||
      submissionMatchesLane(submission, 'missing_transcript', gateReadiness) ||
      submissionMatchesLane(submission, 'gate_blocked', gateReadiness),
  ).length
  const inBuildLeads = waitlistLeads.filter(isWaitlistLeadStartWorkReady)
  const companySnapshotTiles = [
    {
      label: 'Comms',
      value: 'Please connect',
      detail: 'Comms center',
      href: `${basePath}#comms`,
      status: 'alert',
    },
    {
      label: 'Needs attention',
      value: formatCount(needsAttention, 'flag'),
      detail: 'Review queue',
      href: formatLaneHref('needs_review', basePath),
      status: needsAttention > 0 ? 'alert' : 'neutral',
    },
    {
      label: 'Leads',
      value: waitlistLeads.length.toString(),
      detail: 'Waitlist',
      href: formatWaitlistViewHref(null, basePath),
      status: 'neutral',
    },
    {
      label: 'Reps',
      value: 'Please connect',
      detail: 'Production roster',
      href: `${basePath}#reps`,
      status: 'alert',
    },
    {
      label: 'In build',
      value:
        inBuildLeads.length > 0 ? inBuildLeads.length.toString() : 'No info',
      detail:
        inBuildLeads.length > 0
          ? `Ready onboarding: ${summarizeSnapshotNames(inBuildLeads)}`
          : 'Ready for onboarding',
      href: formatWaitlistViewHref('start_work_ready', basePath),
      status: 'neutral',
    },
    {
      label: 'Monthly net',
      value: 'Please connect',
      detail: 'Revenue - expenses',
      href: `${basePath}#monthly-net`,
      status: 'alert',
    },
    {
      label: 'PMCS',
      value: 'Please connect',
      detail: 'Systems check',
      href: `${basePath}#pmcs`,
      status: 'alert',
    },
  ]
  const activeLaneConfig =
    PRELAUNCH_INTAKE_LANES.find((lane) => lane.key === activeLane) ?? null
  const visibleSubmissions = activeLaneConfig
    ? submissions.filter((submission) =>
        submissionMatchesLane(submission, activeLaneConfig.key, gateReadiness),
      )
    : submissions
  const laneSummaries = PRELAUNCH_INTAKE_LANES.map((lane) => ({
    ...lane,
    count: submissions.filter((submission) =>
      submissionMatchesLane(submission, lane.key, gateReadiness),
    ).length,
  }))
  const qrManifest = isControlCenter
    ? null
    : getApprovedPrelaunchQrManifest({
        baseUrl: process.env.NEXT_PUBLIC_APP_URL,
      })
  const activeWorkItems = [
    {
      label: 'Active client',
      value: activeLaunchBuild?.leadName ?? 'No active client',
      detail: formatActiveBuildDetail(activeLaunchBuild),
      anchor: 'active-client',
      href: `${basePath}#active-client`,
      status: activeLaunchBuild?.status === 'blocked' ? 'alert' : 'neutral',
    },
    {
      label: 'Current phase',
      value: formatActiveBuildPhase(activeLaunchBuild),
      detail: activeLaunchBuild
        ? formatTitleLabel(activeLaunchBuild.status)
        : 'Build phase appears after client selection',
      anchor: 'current-phase',
      href: `${basePath}#current-phase`,
      status: activeLaunchBuild?.status === 'blocked' ? 'alert' : 'neutral',
    },
    {
      label: 'Agent touchpoint',
      value: 'Please connect',
      detail: 'Future agent handoffs and PMCS notes',
      anchor: 'agent-touchpoint',
      href: `${basePath}#pmcs`,
      status: 'alert',
    },
    {
      label: 'Attention',
      value: activeLaunchBuild?.blockers[0] ?? 'No info',
      detail: activeLaunchBuild
        ? formatCount(activeLaunchBuild.blockers.length, 'blocker')
        : 'Stuck work or Louis action will land here',
      anchor: 'attention',
      href: `${basePath}#comms`,
      status:
        activeLaunchBuild && activeLaunchBuild.blockers.length > 0
          ? 'alert'
          : 'neutral',
    },
    {
      label: 'Next action',
      value: formatActiveBuildNextAction(activeLaunchBuild),
      detail: activeLaunchBuild ? activeLaunchBuild.leadEmail : 'Start from the ready list',
      anchor: 'next-action',
      href: formatActiveBuildNextHref(activeLaunchBuild, basePath),
      status: 'neutral',
    },
  ]

  return (
    <main
      className={`min-h-screen bg-slate-50 px-5 py-8 text-slate-950 sm:px-8 ${
        isControlCenter ? 'control-center-surface' : ''
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isControlCenter ? 'Sparkle Suite Control Center' : 'Sparkle Suite'}
          </p>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {isControlCenter ? 'Client intake' : 'Prelaunch intake review'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {isControlCenter
                  ? 'Review new leads, keep the active build visible, and spot where agent or human attention is needed before Start Work.'
                  : 'Review submitted rep fit checks, spot handoff blockers, and copy Scout-ready context for the next onboarding step.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {isControlCenter ? <ControlCenterThemeToggle /> : null}
              <Link
                className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                href="/prelaunch"
              >
                View public page
              </Link>
            </div>
          </div>
        </header>

        {isControlCenter ? (
          <section
            aria-label="Company snapshot"
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company snapshot
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Morning command-post glance
                </h2>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Please connect = source not wired
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-12">
              {companySnapshotTiles.map((tile, index) => {
                const tileClass =
                  tile.status === 'alert'
                    ? 'border-red-200 bg-red-50 text-red-950 hover:border-red-300 hover:bg-red-100'
                    : 'border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100'
                const valueClass =
                  tile.status === 'alert' ? 'text-red-700' : 'text-slate-950'
                const spanClass =
                  index < 3 ? 'lg:col-span-4' : 'lg:col-span-3'

                return (
                  <a
                    className={`min-h-24 rounded-md border p-3 text-left transition ${spanClass} ${tileClass}`}
                    href={tile.href}
                    key={tile.label}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {tile.label}
                    </p>
                    <p
                      className={`mt-2 text-xl font-semibold leading-6 ${valueClass}`}
                    >
                      {tile.value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {tile.detail}
                    </p>
                  </a>
                )
              })}
            </div>
          </section>
        ) : null}

        {qrManifest ? (
          <section className="rounded-lg border border-pink-100 bg-pink-50 p-4 text-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-700">
                  Approved QR flyer
                </p>
                <p className="mt-2 max-w-3xl leading-6 text-slate-700">
                  Use this approved image-first flyer for QR promotion work. It
                  points to the public waitlist target below.
                </p>
                <p className="mt-3 break-all rounded-md bg-white p-3 text-xs font-semibold text-slate-700">
                  Canonical waitlist target: {qrManifest.targetUrl}
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-700">
                      QR verification steps
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                      {qrManifest.verificationSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-700">
                      Provider status
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-700">
                      No external QR provider is required. Use{' '}
                      {qrManifest.displayUrl} with the approved static PNG.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                      {qrManifest.blockedActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <a
                className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-pink-200 bg-white px-4 text-sm font-semibold text-pink-800 shadow-sm transition hover:border-pink-300 hover:bg-pink-100"
                href={qrManifest.approvedFlyer.path}
                rel="noreferrer"
                target="_blank"
              >
                Open approved flyer
              </a>
            </div>
          </section>
        ) : null}

        {!isControlCenter ? (
          <section
            aria-label="Intake summary"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              [`${total} total`, 'Submitted intake forms'],
              [`${needsReview} needs review`, 'Fit flags or incomplete setup'],
              [`${qualified} qualified`, 'No current fit flags'],
              [`${scoutGenerated} Scout generated`, 'Saved Scout output'],
              [`${meetingReady} meeting ready`, 'Transcript handoff queued'],
            ].map(([value, label]) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={label}
              >
                <p className="text-2xl font-semibold text-slate-950">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </section>
        ) : null}

        {isControlCenter ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Active work board
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Current build watch
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-slate-600">
                One client at a time: who is moving, what agent is touching it,
                and whether anything is stuck.
              </p>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {activeWorkItems.map((item) => {
                const itemClass =
                  item.status === 'alert'
                    ? 'border-red-200 bg-red-50 text-red-950 hover:border-red-300 hover:bg-red-100'
                    : 'border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100'
                const valueClass =
                  item.status === 'alert' ? 'text-red-700' : 'text-slate-950'

                return (
                  <a
                    className={`min-h-28 rounded-md border p-3 transition ${itemClass}`}
                    href={item.href}
                    id={item.anchor}
                    key={item.label}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {item.label}
                    </p>
                    <p
                      className={`mt-2 text-base font-semibold leading-6 ${valueClass}`}
                    >
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {item.detail}
                    </p>
                  </a>
                )
              })}
            </div>
            {activeLaunchBuild ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {formatActiveBuildPhase(activeLaunchBuild)}
                </p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-slate-950">
                    {activeLaunchBuild.leadName}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                    {formatTitleLabel(activeLaunchBuild.status)}
                  </p>
                </div>
                {activeLaunchBuild.blockers.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-amber-950">
                    {activeLaunchBuild.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {safeSmokeStatus.length > 0 ? (
              <section className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Safe smoke status
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      Launch readiness snapshot
                    </h3>
                  </div>
                  <p className="max-w-sm text-xs leading-5 text-slate-600">
                    Read-only checks for the real launch path. No provider actions run
                    from this panel.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-4">
                  {safeSmokeStatus.map((item) => (
                    <div
                      className={`rounded-md border p-3 ${safeSmokeStatusClass(
                        item.status,
                      )}`}
                      key={item.key}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                          {formatTitleLabel(item.status)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {activeLaunchBuild ? (
              <form
                action="/api/control-center/intake/setup-profile"
                className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
                method="post"
              >
                <input
                  name="launchBuildId"
                  type="hidden"
                  value={activeLaunchBuild.id}
                />
                <input
                  name="returnTo"
                  type="hidden"
                  value={`${basePath}#active-client`}
                />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Setup profile
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      {activeLaunchSetupProfile
                        ? activeLaunchSetupProfile.businessName
                        : 'Create setup profile'}
                    </h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    Status
                    <select
                      className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                      defaultValue={activeLaunchSetupProfile?.status ?? 'draft'}
                      name="status"
                    >
                      <option value="draft">Draft</option>
                      <option value="ready">Ready</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Business name
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.businessName ??
                        activeLaunchBuild.leadName
                      }
                      name="businessName"
                      required
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Primary social URL
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.primarySocialUrl ?? ''
                      }
                      name="primarySocialUrl"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Secondary social URL
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.secondarySocialUrl ?? ''
                      }
                      name="secondarySocialUrl"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Shop URL
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      defaultValue={activeLaunchSetupProfile?.shopUrl ?? ''}
                      name="shopUrl"
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Public site goal
                    <textarea
                      className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.publicSiteGoal ?? ''
                      }
                      name="publicSiteGoal"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Brand notes
                    <textarea
                      className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                      defaultValue={activeLaunchSetupProfile?.brandNotes ?? ''}
                      name="brandNotes"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Must-have launch notes
                    <textarea
                      className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.mustHaveLaunchNotes ?? ''
                      }
                      name="mustHaveLaunchNotes"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Open questions
                    <textarea
                      className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                      defaultValue={
                        activeLaunchSetupProfile?.openQuestions.join('\n') ?? ''
                      }
                      name="openQuestions"
                    />
                  </label>
                </div>
                <button
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                  type="submit"
                >
                  Save setup profile
                </button>
              </form>
            ) : null}
            {activeLaunchBuild ? (
              <section
                className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
                id="launch-gates"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Payment and agreement gates
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      Internal launch gate review
                    </h3>
                  </div>
                  <p className="max-w-sm text-xs leading-5 text-slate-600">
                    Stripe checkout can email the customer a test-mode payment
                    link. Gate status updates when the webhook confirms payment.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {activeLaunchGateItems.map((gate) => (
                    <form
                      action="/api/control-center/intake/launch-gate"
                      className="rounded-md border border-slate-200 bg-white p-3"
                      key={gate.gateKey}
                      method="post"
                    >
                      <input
                        name="launchBuildId"
                        type="hidden"
                        value={activeLaunchBuild.id}
                      />
                      <input
                        name="gateKey"
                        type="hidden"
                        value={gate.gateKey}
                      />
                      <input
                        name="returnTo"
                        type="hidden"
                        value={`${basePath}#launch-gates`}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {gate.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {gate.detail}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {gate.mode === 'test'
                              ? 'test mode only'
                              : 'sandbox only'}
                          </p>
                        </div>
                        <select
                          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
                          defaultValue={gate.status}
                          name="status"
                        >
                          <option value="disabled">Disabled</option>
                          <option value="ready">Ready</option>
                        </select>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Notes
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                          defaultValue={gate.notes}
                          name="notes"
                        />
                      </label>
                      <button
                        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                        type="submit"
                      >
                        Save gate
                      </button>
                    </form>
                  ))}
                </div>
                <form
                  action="/api/prelaunch/payment-gates/checkout"
                  className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3"
                  method="post"
                >
                  <input
                    name="launchBuildId"
                    type="hidden"
                    value={activeLaunchBuild.id}
                  />
                  <input name="gateType" type="hidden" value="start_work_fee" />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={`${basePath}#launch-gates`}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        Send Stripe test checkout
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        Emails {activeLaunchBuild.leadEmail} a Stripe test-mode
                        checkout link for the Start Work payment gate.
                      </p>
                    </div>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
                      type="submit"
                    >
                      Send checkout email
                    </button>
                  </div>
                </form>
                <form
                  action="/api/control-center/intake/agreement-document"
                  className="mt-4 rounded-md border border-slate-200 bg-white p-3"
                  method="post"
                >
                  <input
                    name="launchBuildId"
                    type="hidden"
                    value={activeLaunchBuild.id}
                  />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={`${basePath}#launch-gates`}
                  />
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Agreement draft tracker
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Records which SignWell template belongs to this build.
                        This does not send or create a live agreement.
                      </p>
                    </div>
                    <div
                      className={`rounded-md border px-3 py-2 text-xs font-semibold ${agreementDocumentStatusClass(
                        activeAgreementDocument?.status ?? 'draft',
                      )}`}
                    >
                      {activeAgreementDocument
                        ? formatTitleLabel(activeAgreementDocument.status)
                        : 'Not recorded'}
                    </div>
                  </div>
                  {activeAgreementDocument ? (
                    <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Template
                        </dt>
                        <dd>{activeAgreementDocument.templateLabel}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Pricing
                        </dt>
                        <dd>{formatLabel(activeAgreementDocument.pricingCohort)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Recipient
                        </dt>
                        <dd>{activeAgreementDocument.recipientEmail}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          SignWell document
                        </dt>
                        <dd className="break-all">
                          {activeAgreementDocument.providerDocumentId ??
                            'Draft tracker only'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Signed at
                        </dt>
                        <dd>{activeAgreementDocument.signedAt ?? 'Not signed'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Signed PDF
                        </dt>
                        <dd className="break-all">
                          {activeAgreementDocument.signedPdfUrl ? (
                            <a
                              className="text-sky-700 underline-offset-2 hover:underline"
                              href={activeAgreementDocument.signedPdfUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open stored proof
                            </a>
                          ) : (
                            'Not stored'
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">
                      SignWell document ID
                      <input
                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                        defaultValue={
                          activeAgreementDocument?.providerDocumentId ?? ''
                        }
                        name="providerDocumentId"
                        placeholder="Optional sandbox document ID"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Notes
                      <input
                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                        defaultValue={activeAgreementDocument?.notes ?? ''}
                        name="notes"
                        placeholder="Sandbox draft, no send"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Signed PDF URL
                      <input
                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                        defaultValue={activeAgreementDocument?.signedPdfUrl ?? ''}
                        name="signedPdfUrl"
                        placeholder="Optional stored signed PDF URL"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Signed at
                      <input
                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                        defaultValue={activeAgreementDocument?.signedAt ?? ''}
                        name="signedAt"
                        placeholder="Blank uses the current time"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                      name="createSandboxDraft"
                      type="submit"
                      value="false"
                    >
                      Record agreement draft
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-900 shadow-sm transition hover:border-sky-400 hover:bg-sky-100"
                      name="createSandboxDraft"
                      type="submit"
                      value="true"
                    >
                      Create SignWell test draft
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-indigo-300 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-100"
                      name="sendTestAgreement"
                      type="submit"
                      value="true"
                    >
                      Send test agreement email
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
                      name="markSigned"
                      type="submit"
                      value="true"
                    >
                      Record test signature
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Test draft creation requires the sandbox guard flag. It
                    keeps test mode on, keeps the document as a draft, and
                    leaves email disabled. Test agreement email sends through
                    SignWell test mode. Recording a test signature marks the
                    agreement gate ready.
                  </p>
                </form>
              </section>
            ) : null}
            {activeLaunchBuild ? (
              <section
                className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
                id="launch-checks"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Launch checks
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      Build readiness checklist
                    </h3>
                  </div>
                  <p className="max-w-sm text-xs leading-5 text-slate-600">
                    Passing these checks does not move this build to production.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {activeLaunchCheckItems.map((check) => (
                    <form
                      action="/api/control-center/intake/launch-check"
                      className="rounded-md border border-slate-200 bg-white p-3"
                      key={check.checkKey}
                      method="post"
                    >
                      <input
                        name="launchBuildId"
                        type="hidden"
                        value={activeLaunchBuild.id}
                      />
                      <input
                        name="checkKey"
                        type="hidden"
                        value={check.checkKey}
                      />
                      <input
                        name="returnTo"
                        type="hidden"
                        value={`${basePath}#launch-checks`}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {check.label}
                          </p>
                          {check.detail ? (
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {check.detail}
                            </p>
                          ) : null}
                        </div>
                        <select
                          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
                          defaultValue={check.status}
                          name="status"
                        >
                          <option value="not_started">Not started</option>
                          <option value="blocked">Blocked</option>
                          <option value="passed">Passed</option>
                        </select>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Notes
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                          defaultValue={check.notes}
                          name="notes"
                        />
                      </label>
                      <button
                        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                        type="submit"
                      >
                        Save check
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {isControlCenter ? (
          <section
            aria-label="Client roster"
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            id="reps"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Client roster
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {activeLaunchBuild?.repId
                    ? '1 production client connected'
                    : 'No production clients yet'}
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-slate-600">
                Clients move here after launch. Open a client later for the
                full status dossier.
              </p>
            </div>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                {activeLaunchBuild?.repId
                  ? activeLaunchBuild.leadName
                  : 'No active clients'}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {activeLaunchBuild?.repId
                  ? `Connected rep ID: ${activeLaunchBuild.repId}`
                  : 'Production roster will show client health, services, agent touchpoints, and open flags.'}
              </p>
            </div>
            {activeLaunchBuild?.repId ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Live account links
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <Link
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                    href="/nic-nac"
                  >
                    Nic-Nac
                  </Link>
                  <a
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                    href={`/amethyst/Homepage.html?c=${encodeURIComponent(
                      activeLaunchBuild.repId,
                    )}`}
                  >
                    Public homepage
                  </a>
                  <a
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                    href={`/amethyst/Trade.html?c=${encodeURIComponent(
                      activeLaunchBuild.repId,
                    )}`}
                  >
                    Dance Floor
                  </a>
                  <a
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                    href={`/amethyst/Join.html?c=${encodeURIComponent(
                      activeLaunchBuild.repId,
                    )}`}
                  >
                    Join page
                  </a>
                </div>
              </div>
            ) : null}
            {activeLaunchBuild && !activeLaunchBuild.repId ? (
              <form
                action="/api/control-center/intake/production-roster"
                className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
                method="post"
              >
                <input
                  name="launchBuildId"
                  type="hidden"
                  value={activeLaunchBuild.id}
                />
                <input name="returnTo" type="hidden" value={`${basePath}#reps`} />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Connect production roster
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      Link an existing rep account
                    </h3>
                  </div>
                  <p className="max-w-sm text-xs leading-5 text-slate-600">
                    Link an existing rep row, or create the client account shell
                    from this ready build. This does not send an invite.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Existing rep ID
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      name="repId"
                      placeholder="Use this when the rep already exists"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Notes
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      defaultValue="Existing demo rep account confirmed."
                      name="notes"
                    />
                  </label>
                  <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
                    <input
                      className="h-4 w-4 rounded border-slate-300"
                      name="createClientAccount"
                      type="checkbox"
                      value="true"
                    />
                    Create five-day trial account
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Temporary password
                    <input
                      autoComplete="new-password"
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      minLength={getPasswordMinLength()}
                      name="temporaryPassword"
                      placeholder="Required only when creating account"
                      type="password"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Confirm temporary password
                    <input
                      autoComplete="new-password"
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                      minLength={getPasswordMinLength()}
                      name="temporaryPasswordConfirm"
                      placeholder="Enter the same password again"
                      type="password"
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Account creation uses the customer email on this build and
                  does not send an email. Hand the login details to the rep
                  yourself. The five-day trial starts on their first successful
                  sign-in, not when you create the account. {getPasswordRequirements()}
                </p>
                <button
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                  type="submit"
                >
                  Save roster connection
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Waitlist signups
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {activeWaitlistView === 'contact_batch'
                  ? 'Showing contact batch'
                  : activeWaitlistView === 'contacted'
                    ? 'Showing contacted outreach'
                    : activeWaitlistView === 'meeting_scheduled'
                      ? 'Showing scheduled meetings'
                      : activeWaitlistView === 'conversation_complete'
                        ? 'Showing completed conversations'
                        : activeWaitlistView === 'setup_profile_drafted'
                          ? 'Showing drafted setup profiles'
                          : activeWaitlistView === 'start_work_ready'
                            ? 'Showing Start Work ready leads'
                          : formatCount(waitlistLeads.length, 'waitlist lead')}
              </h2>
            </div>
            <div className="text-sm font-semibold text-emerald-700">
              <p>{formatCount(confirmationSent, 'confirmation')} sent</p>
              {isControlCenter ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {contactBatchSelected} selected / {contactedLeads} contacted /{' '}
                  {meetingScheduledLeads} meeting scheduled / {contactBatchReady}{' '}
                  ready to select / {conversationCompleteLeads} conversation
                  complete / {setupProfileDraftedLeads} setup profile drafted /{' '}
                  {startWorkReadyLeads} start work ready
                </p>
              ) : null}
            </div>
          </div>
          {isControlCenter ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-slate-950 bg-slate-950 text-white'
                }`}
                href={formatWaitlistViewHref(null, basePath)}
              >
                All leads
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'contact_batch'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref('contact_batch', basePath)}
              >
                Contact batch view
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'contacted'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref('contacted', basePath)}
              >
                Contacted view
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'meeting_scheduled'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref('meeting_scheduled', basePath)}
              >
                Meeting scheduled view
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'conversation_complete'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref('conversation_complete', basePath)}
              >
                Conversation complete view
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'setup_profile_drafted'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref(
                  'setup_profile_drafted',
                  basePath,
                )}
              >
                Setup profile drafted view
              </a>
              <a
                className={`rounded-md border px-3 py-2 ${
                  activeWaitlistView === 'start_work_ready'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                href={formatWaitlistViewHref('start_work_ready', basePath)}
              >
                Start work ready view
              </a>
            </div>
          ) : null}
          {visibleWaitlistLeads.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              {activeWaitlistView === 'contact_batch'
                ? 'No leads are selected for the manual contact batch yet.'
                : 'New waitlist form submissions will appear here as soon as the signup automation saves them.'}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {visibleWaitlistLeads.map((lead) => {
                const nextAction = buildWaitlistLeadNextAction(lead)
                const isReadyForContactBatch =
                  isWaitlistLeadReadyForContactBatch(lead)
                const isSelectedForContactBatch =
                  isWaitlistLeadSelectedForContactBatch(lead)
                const isContacted = isWaitlistLeadContacted(lead)
                const isMeetingScheduled =
                  isWaitlistLeadMeetingScheduled(lead)
                const isConversationComplete =
                  isWaitlistLeadConversationComplete(lead)
                const isSetupProfileDrafted =
                  isWaitlistLeadSetupProfileDrafted(lead)
                const isStartWorkReady = isWaitlistLeadStartWorkReady(lead)

                return (
                  <article
                    className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
                    key={lead.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Lead overview
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-950">
                          {lead.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Joined {formatDate(lead.createdAt)}
                        </p>
                      </div>
                      <div
                        className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${welcomeEmailStatusClass(
                          lead.welcomeEmailStatus,
                        )}`}
                      >
                        {lead.welcomeEmailStatus === 'sent' ? (
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full bg-current"
                          />
                        ) : null}
                        <span>
                          {formatWelcomeEmailStatus(lead.welcomeEmailStatus)}
                        </span>
                      </div>
                    </div>
                    <details
                      aria-label={`Waitlist details for ${lead.name}`}
                      className="mt-3 rounded-md border border-slate-200 bg-white"
                    >
                      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Details
                      </summary>
                      <div className="border-t border-slate-200 p-3">
                        <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                          <div>
                            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Contact details
                            </p>
                            <p className="mt-1 font-semibold text-slate-800">
                              {lead.email}
                            </p>
                            <p className="mt-1">{lead.phone}</p>
                          </div>
                          <div>
                            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Source
                            </p>
                            <p className="mt-1">{lead.tiktokHandle}</p>
                            <p className="mt-1">
                              Team rep: {lead.teamRepName}
                            </p>
                          </div>
                          <span>Lead status: {formatLabel(lead.leadStatus)}</span>
                          <span>Handoff: {formatLabel(lead.handoffStatus)}</span>
                          <span>
                            SMS consent: {lead.smsConsent ? 'yes' : 'no'}
                          </span>
                          <span>
                            Intake:{' '}
                            {lead.intakeSubmissionId
                              ? 'linked'
                              : 'not started'}
                          </span>
                          {lead.welcomeEmailSentAt ? (
                            <span>
                              Confirmation:{' '}
                              {formatDate(lead.welcomeEmailSentAt)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Next action
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {nextAction.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {nextAction.detail}
                          </p>
                          {isControlCenter && isReadyForContactBatch ? (
                            <form
                              action="/api/control-center/intake/waitlist-contact-batch"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={basePath}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Select for contact batch
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'contact_batch' &&
                          isSelectedForContactBatch ? (
                            <form
                              action="/api/control-center/intake/waitlist-contact-progress"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={formatWaitlistViewHref(
                                  'contacted',
                                  basePath,
                                )}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Mark contacted
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'contacted' &&
                          isContacted ? (
                            <form
                              action="/api/control-center/intake/waitlist-meeting-scheduled"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={formatWaitlistViewHref(
                                  'meeting_scheduled',
                                  basePath,
                                )}
                              />
                              <label className="mt-3 block text-xs font-semibold text-slate-700">
                                Consult date/time
                                <input
                                  className="mt-1 min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                  name="consultScheduledAt"
                                  placeholder="May 22, 2026 at 4:00 PM ET"
                                  required
                                />
                              </label>
                              <label className="mt-2 block text-xs font-semibold text-slate-700">
                                Meeting link
                                <input
                                  className="mt-1 min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950"
                                  name="consultMeetingUrl"
                                  placeholder="https://meet.google.com/..."
                                  type="url"
                                />
                              </label>
                              <label className="mt-2 block text-xs font-semibold text-slate-700">
                                Notes for the customer email
                                <textarea
                                  className="mt-1 min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950"
                                  name="consultNotes"
                                />
                              </label>
                              <button
                                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Schedule consult
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'meeting_scheduled' &&
                          isMeetingScheduled ? (
                            <form
                              action="/api/control-center/intake/waitlist-conversation-complete"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={formatWaitlistViewHref(
                                  'conversation_complete',
                                  basePath,
                                )}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Mark conversation complete
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'conversation_complete' &&
                          isConversationComplete ? (
                            <form
                              action="/api/control-center/intake/waitlist-setup-profile-drafted"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={formatWaitlistViewHref(
                                  'setup_profile_drafted',
                                  basePath,
                                )}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Mark setup profile drafted
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'setup_profile_drafted' &&
                          isSetupProfileDrafted ? (
                            <form
                              action="/api/control-center/intake/waitlist-start-work-ready"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="leadId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={formatWaitlistViewHref(
                                  'start_work_ready',
                                  basePath,
                                )}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Mark Start Work ready
                              </button>
                            </form>
                          ) : null}
                          {isControlCenter &&
                          activeWaitlistView === 'start_work_ready' &&
                          isStartWorkReady &&
                          !activeLaunchBuild ? (
                            <form
                              action="/api/control-center/intake/launch-build-draft"
                              className="mt-3"
                              method="post"
                            >
                              <input
                                name="waitlistId"
                                type="hidden"
                                value={lead.id}
                              />
                              <input
                                name="returnTo"
                                type="hidden"
                                value={basePath}
                              />
                              <button
                                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                                type="submit"
                              >
                                Start active build
                              </button>
                            </form>
                          ) : null}
                        </div>
                        {lead.setupPain ? (
                          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                            <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Setup notes
                            </p>
                            <p className="mt-1">{lead.setupPain}</p>
                          </div>
                        ) : null}
                        {lead.welcomeEmailError ? (
                          <p className="mt-3 rounded-md border border-red-100 bg-white p-3 text-xs leading-5 text-red-700">
                            {lead.welcomeEmailError}
                          </p>
                        ) : null}
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Priority lanes
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {activeLaneConfig
                  ? `Showing ${activeLaneConfig.label} lane`
                  : 'All operator lanes'}
              </h2>
            </div>
            {activeLaneConfig ? (
              <a
                className="text-sm font-semibold text-slate-600 hover:text-slate-950"
                href={formatLaneHref(null, basePath)}
              >
                Clear lane
              </a>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {laneSummaries.map((lane) => (
              <a
                className={`rounded-md border p-3 text-left transition ${
                  activeLaneConfig?.key === lane.key
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                }`}
                href={formatLaneHref(lane.key, basePath)}
                key={lane.key}
              >
                <p className="text-sm font-semibold">
                  {lane.count} {lane.label}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    activeLaneConfig?.key === lane.key
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {lane.detail}
                </p>
              </a>
            ))}
          </div>
        </section>

        {visibleSubmissions.length === 0 ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-950">
              {activeLaneConfig
                ? `No ${activeLaneConfig.label.toLowerCase()} submissions`
                : 'No intake submissions yet'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {activeLaneConfig
                ? 'Choose another lane or clear the lane filter to see the full queue.'
                : 'New /prelaunch intake forms will appear here after reps submit their fit check.'}
            </p>
          </section>
        ) : (
          <section className="flex flex-col gap-4" aria-label="Submissions">
            {visibleSubmissions.map((submission) => {
              const operatorReadiness = buildOperatorReadiness(
                submission,
                gateReadiness,
              )
              const operatorHandoffBrief = buildPrelaunchOperatorHandoffBrief({
                submission,
                gateReadiness,
                nextReviewBullets: operatorReadiness.items.map(
                  (item) => `${item.label}: ${item.detail}`,
                ),
              })
              const photographyKitPrep = buildPhotographyKitPrep(submission)
              const cameraQualityPrep = buildCameraQualityPrep(submission)
              const scribeReadiness = buildScribeReadiness(submission)
              const shouldShowScribeReadiness =
                submission.handoffStatus === 'meeting_ready' ||
                Boolean(submission.latestScribeTranscriptRun)

              return (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  key={submission.id}
                >
                  <section className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Next operator steps
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-950">
                            {operatorReadiness.label}
                          </h3>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {operatorReadiness.items.map((item) => (
                          <div
                            className={`rounded-md border p-3 ${operatorStepClass(
                              item.status,
                            )}`}
                            key={item.label}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                              {item.label}
                            </p>
                            <p className="mt-1 text-xs leading-5">
                              {item.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {operatorHandoffBrief.title}
                    </p>
                    <h3 className="font-semibold text-slate-950">
                      {operatorHandoffBrief.status}
                    </h3>
                  </div>
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800">
                    {operatorHandoffBrief.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    <p className="mt-3 font-sans font-semibold text-slate-600">
                      Next review
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 font-sans">
                      {operatorHandoffBrief.nextReviewBullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    <p className="mt-3 font-sans font-semibold text-slate-600">
                      Guardrails
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 font-sans">
                      {operatorHandoffBrief.guardrails.map((guardrail) => (
                        <li key={guardrail}>{guardrail}</li>
                      ))}
                    </ul>
                  </div>
                </section>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Submitted {formatDate(submission.createdAt)}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {submission.businessName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {submission.name} - {submission.email} -{' '}
                      {submission.phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                      {submission.prequalificationStatus.replace('_', ' ')}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
                      {formatScoutInputStatus(submission.scoutInputStatus)}
                    </span>
                    <span className="rounded-md bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase text-fuchsia-700">
                      {submission.handoffStatus === 'meeting_ready'
                        ? 'Meeting ready'
                        : formatLabel(submission.handoffStatus)}
                    </span>
                    <span className="rounded-md bg-violet-50 px-3 py-1 text-xs font-semibold uppercase text-violet-700">
                      {submission.waitlistId
                        ? 'Waitlist linked'
                        : 'No waitlist link'}
                    </span>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Primary platform
                    </dt>
                    <dd className="mt-1 text-slate-900">
                      {submission.primaryPlatform}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Streaming cadence
                    </dt>
                    <dd className="mt-1 text-slate-900">
                      {submission.streamingFrequency}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Device setup
                    </dt>
                    <dd className="mt-1 text-slate-900">
                      {submission.deviceSetup}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Team</dt>
                    <dd className="mt-1 text-slate-900">
                      {formatValue(submission.team.name)} -{' '}
                      {submission.team.size}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 grid gap-4 text-sm lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-slate-500">
                      Setup goal
                    </h3>
                    <p className="mt-1 leading-6 text-slate-800">
                      {submission.setupGoal}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-500">
                      Current setup
                    </h3>
                    <p className="mt-1 leading-6 text-slate-800">
                      {submission.currentSetup}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {submission.fitFlags.length > 0 ? (
                    submission.fitFlags.map((flag) => (
                      <span
                        className="rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                        key={flag}
                      >
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      No fit flags
                    </span>
                  )}
                </div>

                <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Photography kit prep
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-950">
                      Hardware decision stays operator-only
                    </h3>
                    <p className="mt-1 leading-5 text-slate-600">
                      Read-only hardware-decision checklist. This does not
                      select a vendor, show pricing, create shipments, or change
                      hardware automatically.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {photographyKitPrep.items.map((item) => (
                      <div
                        className={`rounded-md border p-3 ${photographyPrepClass(
                          item.status,
                        )}`}
                        key={item.label}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs leading-5">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photographyKitPrep.guardrails.map((guardrail) => (
                      <span
                        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        key={guardrail}
                      >
                        {guardrail}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Camera quality prep
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-950">
                      Sample-photo quality needs human review
                    </h3>
                    <p className="mt-1 leading-5 text-slate-600">
                      Operator-only sample-photo screening for blur, lighting,
                      framing, and white-background quality. This does not
                      approve hardware, shipping, pricing, or fulfillment.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {cameraQualityPrep.items.map((item) => (
                      <div
                        className={`rounded-md border p-3 ${photographyPrepClass(
                          item.status,
                        )}`}
                        key={item.label}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs leading-5">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cameraQualityPrep.guardrails.map((guardrail) => (
                      <span
                        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        key={guardrail}
                      >
                        {guardrail}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        Gate readiness
                      </h3>
                      <p className="mt-1 leading-5 text-slate-600">
                        No live send or payment action is enabled here yet.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {gateReadiness.map((gate) => (
                      <div
                        className={`rounded-md border p-3 ${gateStatusClass(
                          gate.status,
                        )}`}
                        key={gate.key}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                          {gate.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {gate.displayStatus}
                        </p>
                        <p className="mt-1 text-xs leading-5">{gate.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {submission.latestScoutRun ? (
                  <section className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                          Latest saved Scout run
                        </p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {formatLabel(submission.latestScoutRun.status)} via{' '}
                          {formatLabel(submission.latestScoutRun.triggerSource)}
                        </p>
                        {submission.latestScoutRun.summary ? (
                          <p className="mt-2 leading-6 text-slate-700">
                            {submission.latestScoutRun.summary}
                          </p>
                        ) : null}
                        {submission.latestScoutRun.errorMessage ? (
                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                            <p className="text-xs font-semibold uppercase text-red-700">
                              Scout run error
                            </p>
                            <p className="mt-1 leading-6 text-red-900">
                              {submission.latestScoutRun.errorMessage}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 lg:text-right">
                        <span>{formatDate(submission.latestScoutRun.createdAt)}</span>
                        <span>{formatLabel(submission.latestScoutRun.model)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {submission.latestScoutRun.capturedEvidenceCount != null ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                          {submission.latestScoutRun.capturedEvidenceCount}{' '}
                          captured evidence items
                        </span>
                      ) : null}
                      {submission.latestScoutRun.synthesisStatus ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                          {formatLabel(
                            submission.latestScoutRun.synthesisStatus,
                          )}{' '}
                          synthesis
                        </span>
                      ) : null}
                      {submission.latestScoutRun.synthesisConfidence ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                          {formatLabel(
                            submission.latestScoutRun.synthesisConfidence,
                          )}{' '}
                          confidence
                        </span>
                      ) : null}
                      {submission.latestScoutRun.reusedLessonCount != null ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                          {submission.latestScoutRun.reusedLessonCount}{' '}
                          reused{' '}
                          {submission.latestScoutRun.reusedLessonCount === 1
                            ? 'lesson'
                            : 'lessons'}
                        </span>
                      ) : null}
                      {submission.latestScoutRun.reusedLessonStatus ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                          lesson reuse{' '}
                          {formatLabel(
                            submission.latestScoutRun.reusedLessonStatus,
                          )}
                        </span>
                      ) : null}
                    </div>
                    {submission.latestScoutRun.researchSynthesis &&
                    submission.latestScoutRun.researchSynthesis.status !==
                      'not_available' ? (
                      <div className="mt-3 rounded-md border border-violet-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                          Saved synthesis
                        </p>
                        {submission.latestScoutRun.researchSynthesis
                          .discoveryAngle ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                            {
                              submission.latestScoutRun.researchSynthesis
                                .discoveryAngle
                            }
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs font-semibold uppercase text-violet-700">
                          Confidence:{' '}
                          {
                            submission.latestScoutRun.researchSynthesis
                              .confidence
                          }
                        </p>
                        {submission.latestScoutRun.researchSynthesis
                          .summaryBullets.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              What stands out
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.researchSynthesis.summaryBullets.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScoutRun.researchSynthesis
                          .evidenceBackedObservations.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Grounded observations
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.researchSynthesis.evidenceBackedObservations.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScoutRun.researchSynthesis
                          .manualVerificationNeeded.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Manual verification needed
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.researchSynthesis.manualVerificationNeeded.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScoutRun.researchSynthesis
                          .contradictions.length > 0 ? (
                          <div className="mt-3 rounded-md bg-violet-50 p-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Contradictions or tensions
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.researchSynthesis.contradictions.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScoutRun.researchSynthesis
                          .followUpQuestions.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Follow-up questions
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.researchSynthesis.followUpQuestions.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {(submission.latestScoutRun.evidenceSourceStatuses ?? [])
                      .length > 0 ? (
                      <div className="mt-3 rounded-md border border-sky-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                          Saved source checks
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-slate-700">
                          {(
                            submission.latestScoutRun.evidenceSourceStatuses ?? []
                          ).map((item) => (
                            <li key={`${item.label}:${item.url ?? item.status}`}>
                              <span className="font-semibold text-slate-900">
                                {item.label}: {formatLabel(item.status)}
                              </span>
                              {item.url ? (
                                <a
                                  className="ml-2 break-all font-semibold text-sky-700 underline"
                                  href={item.url}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {item.url}
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {submission.latestScoutRun.publicFunnel ? (
                      <div className="mt-3 rounded-md border border-sky-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                          Saved public funnel
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatLabel(
                            submission.latestScoutRun.publicFunnel.shape,
                          )}
                        </p>
                        <p className="mt-1 leading-6 text-slate-700">
                          {submission.latestScoutRun.publicFunnel.summary}
                        </p>
                        {submission.latestScoutRun.publicFunnel.primaryLinks
                          .length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Primary public links
                            </p>
                            <ul className="mt-2 space-y-1 text-xs">
                              {submission.latestScoutRun.publicFunnel.primaryLinks.map(
                                (link) => (
                                  <li key={link}>
                                    <a
                                      className="break-all font-semibold text-sky-700 underline"
                                      href={link}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {link}
                                    </a>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScoutRun.publicFunnel.concerns
                          .length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Funnel checks
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScoutRun.publicFunnel.concerns.map(
                                (concern) => (
                                  <li key={concern}>{concern}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {(submission.latestScoutRun.reusedLessons ?? []).length >
                    0 ? (
                      <div className="mt-3 rounded-md border border-amber-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                          Saved reused lessons
                        </p>
                        <ul className="mt-2 space-y-3 text-xs text-slate-700">
                          {(submission.latestScoutRun.reusedLessons ?? []).map(
                            (lesson) => (
                              <li
                                className="rounded-md border border-amber-100 bg-amber-50 p-3"
                                key={lesson.sourceRunKey}
                              >
                                <p className="text-sm leading-6 text-slate-800">
                                  {lesson.lesson}
                                </p>
                                {lesson.similarityReasons &&
                                lesson.similarityReasons.length > 0 ? (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold uppercase text-amber-700">
                                      Why Scout reused this
                                    </p>
                                    <ul className="mt-1 space-y-1 text-amber-900">
                                      {lesson.similarityReasons.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                                <p className="mt-2 break-all text-xs font-semibold text-slate-500">
                                  {lesson.sourceRunKey}
                                </p>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}
                    <p className="mt-3 break-all text-xs font-semibold text-slate-500">
                      {submission.latestScoutRun.runKey}
                    </p>
                  </section>
                ) : null}

                {shouldShowScribeReadiness ? (
                  <section className="mt-5 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                        Scribe handoff readiness
                      </p>
                      <h3 className="mt-1 font-semibold text-slate-950">
                        {scribeReadiness.label}
                      </h3>
                      <p className="mt-1 leading-5 text-slate-600">
                        Operator-only transcript and follow-up readiness. This
                        does not write profile fields, approve launch gates, or
                        send agreements.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {scribeReadiness.items.map((item) => (
                        <div
                          className={`rounded-md border p-3 ${scribeReadinessClass(
                            item.status,
                          )}`}
                          key={item.label}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs leading-5">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scribeReadiness.guardrails.map((guardrail) => (
                        <span
                          className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                          key={guardrail}
                        >
                          {guardrail}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {submission.latestScribeTranscriptRun ? (
                  <section className="mt-5 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-700">
                          Latest Meet transcript
                        </p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {formatLabel(
                            submission.latestScribeTranscriptRun.status,
                          )}{' '}
                          via{' '}
                          {formatLabel(
                            submission.latestScribeTranscriptRun.triggerSource,
                          )}
                        </p>
                        {submission.latestScribeTranscriptRun.summary ? (
                          <p className="mt-2 leading-6 text-slate-700">
                            {submission.latestScribeTranscriptRun.summary}
                          </p>
                        ) : null}
                        {submission.latestScribeTranscriptRun.meetingTitle ? (
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            {submission.latestScribeTranscriptRun.meetingTitle}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 lg:text-right">
                        <span>
                          {formatDate(
                            submission.latestScribeTranscriptRun.createdAt,
                          )}
                        </span>
                        <span>
                          {formatLabel(
                            submission.latestScribeTranscriptRun.model,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {submission.latestScribeTranscriptRun.statusForScribe ? (
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
                          {formatLabel(
                            submission.latestScribeTranscriptRun
                              .statusForScribe,
                          )}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
                        {formatCount(
                          submission.latestScribeTranscriptRun.speakerCount,
                          'speaker',
                        )}
                      </span>
                      <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
                        {formatCount(
                          submission.latestScribeTranscriptRun.decisionCount,
                          'decision',
                        )}
                      </span>
                      <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
                        {formatCount(
                          submission.latestScribeTranscriptRun.actionItemCount,
                          'action item',
                        )}
                      </span>
                      <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-fuchsia-800">
                        {formatCount(
                          submission.latestScribeTranscriptRun
                            .clientPreferenceCount,
                          'client preference',
                        )}
                      </span>
                    </div>
                    {submission.latestScribeTranscriptRun.speakerNames.length >
                    0 ? (
                      <p className="mt-3 text-xs font-semibold text-slate-600">
                        Speakers:{' '}
                        {submission.latestScribeTranscriptRun.speakerNames.join(
                          ', ',
                        )}
                      </p>
                    ) : null}
                    {submission.latestScribeTranscriptRun.preview ? (
                      <p className="mt-3 rounded-md border border-fuchsia-100 bg-white p-3 text-xs leading-5 text-slate-700">
                        {submission.latestScribeTranscriptRun.preview}
                      </p>
                    ) : null}
                    {submission.latestScribeTranscriptRun.signals.decisions
                      .length > 0 ||
                    submission.latestScribeTranscriptRun.signals
                      .clientPreferences.length > 0 ||
                    submission.latestScribeTranscriptRun.signals.actionItems
                      .length > 0 ||
                    submission.latestScribeTranscriptRun.signals.openQuestions
                      .length > 0 ? (
                      <div className="mt-3 rounded-md border border-fuchsia-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
                          Transcript signals
                        </p>
                        {submission.latestScribeTranscriptRun.signals.decisions
                          .length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Decisions
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScribeTranscriptRun.signals.decisions.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScribeTranscriptRun.signals
                          .clientPreferences.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Client preferences
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScribeTranscriptRun.signals.clientPreferences.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScribeTranscriptRun.signals
                          .actionItems.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Action items
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScribeTranscriptRun.signals.actionItems.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                        {submission.latestScribeTranscriptRun.signals
                          .openQuestions.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Open questions
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-700">
                              {submission.latestScribeTranscriptRun.signals.openQuestions.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {submission.latestScribeTranscriptRun.scribeBrief ? (
                      <div className="mt-3 rounded-md border border-violet-100 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                          Scribe follow-up brief
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                          {submission.latestScribeTranscriptRun.scribeBrief.summary}
                        </p>
                        <div className="mt-3 rounded-md bg-violet-50 p-3">
                          <p className="text-xs font-semibold uppercase text-violet-700">
                            Profile draft
                          </p>
                          <BriefList
                            items={
                              submission.latestScribeTranscriptRun.scribeBrief
                                .profileDraft.confirmedDecisions
                            }
                            title="Confirmed decisions"
                          />
                          <BriefList
                            items={
                              submission.latestScribeTranscriptRun.scribeBrief
                                .profileDraft.styleAndSetupSignals
                            }
                            title="Style and setup signals"
                          />
                          <BriefList
                            items={
                              submission.latestScribeTranscriptRun.scribeBrief
                                .profileDraft.actionItems
                            }
                            title="Action items"
                          />
                          <BriefList
                            items={
                              submission.latestScribeTranscriptRun.scribeBrief
                                .profileDraft.openQuestions
                            }
                            title="Open questions"
                          />
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Operator review checks
                          </p>
                          <ul className="mt-2 space-y-1 text-xs text-slate-700">
                            {submission.latestScribeTranscriptRun.scribeBrief.operatorChecklist.map(
                              (item) => (
                                <li key={item}>{item}</li>
                              ),
                            )}
                          </ul>
                        </div>
                        {submission.latestScribeTranscriptRun.scribeBrief
                          .manualReviewWarnings.length > 0 ? (
                          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold uppercase text-amber-800">
                              Scribe guardrails
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-amber-900">
                              {submission.latestScribeTranscriptRun.scribeBrief.manualReviewWarnings.map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-col gap-1 text-xs font-semibold text-slate-500">
                      {submission.latestScribeTranscriptRun.driveFileUrl ? (
                        <a
                          className="break-all text-fuchsia-700 underline"
                          href={submission.latestScribeTranscriptRun.driveFileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {submission.latestScribeTranscriptRun.driveFileUrl}
                        </a>
                      ) : null}
                      {submission.latestScribeTranscriptRun.meetUrl ? (
                        <a
                          className="break-all text-fuchsia-700 underline"
                          href={submission.latestScribeTranscriptRun.meetUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {submission.latestScribeTranscriptRun.meetUrl}
                        </a>
                      ) : null}
                      <span className="break-all">
                        {submission.latestScribeTranscriptRun.runKey}
                      </span>
                    </div>
                  </section>
                ) : null}

                <PrelaunchScoutRunButton intakeId={submission.id} />

                <details className="mt-5 rounded-lg border border-slate-200 bg-slate-950 text-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                    Scout input JSON
                  </summary>
                  <pre className="overflow-x-auto border-t border-white/10 p-4 text-xs leading-5 text-slate-100">
                    {JSON.stringify(buildPrelaunchScoutInput(submission), null, 2)}
                  </pre>
                </details>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
