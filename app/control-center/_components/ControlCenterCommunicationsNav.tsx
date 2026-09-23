import Link from 'next/link'

import type { ControlCenterCommunicationView } from './control-center-communications'

const views: Array<{
  key: ControlCenterCommunicationView
  label: string
  description: string
}> = [
  {
    key: 'support',
    label: 'Support Inbox',
    description: 'Rep questions, problems, and ideas',
  },
  {
    key: 'direct',
    label: 'Direct messages',
    description: 'Private conversations with reps',
  },
  {
    key: 'broadcasts',
    label: 'Broadcasts',
    description: 'Official Sparkle Suite updates',
  },
  {
    key: 'safety',
    label: 'Network Safety',
    description: 'Reported rep conversations',
  },
  {
    key: 'approvals',
    label: 'Remy approvals',
    description: 'One-time reply permission',
  },
]

export function ControlCenterCommunicationsNav({
  active,
  ownerAccess = false,
}: {
  active: ControlCenterCommunicationView
  ownerAccess?: boolean
}) {
  return (
    <nav
      aria-label="Communication views"
      className="border-b border-slate-200 bg-white px-5"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-3">
        {views.filter((view) => ownerAccess || view.key !== 'direct').map((view) => (
          <Link
            aria-current={active === view.key ? 'page' : undefined}
            className={`min-w-48 rounded-lg border px-4 py-3 transition ${
              active === view.key
                ? 'border-violet-300 bg-violet-50 text-violet-950'
                : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
            }`}
            href={`/control-center/messages?view=${view.key}`}
            key={view.key}
          >
            <span className="block text-sm font-semibold">{view.label}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {view.description}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
