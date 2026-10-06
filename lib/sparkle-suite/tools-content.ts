/** Marketing hierarchy approved by Louis, October 6, 2026. */
export const featuredSuiteTools = [
  { id: 'dance-floor', name: 'Dance Floor', description: 'Give shoppers a place to browse your pieces.', benefits: ['Bring your listings together', 'Make pieces easier to find'] },
  { id: 'live-lineup', name: 'Live Lineup', description: 'Help shoppers follow the line during your live.', benefits: ['Keep the lineup visible on your site', 'Open the full lineup in one tap'] },
  { id: 'live-show-calendar', name: 'Live Show Calendar', description: 'Give customers one place to find your next show.', benefits: ['Share upcoming show details', 'Help shoppers plan when to join you'] },
  { id: 'team-management', name: 'Team Management', description: 'Give your team a home and new reps a clear starting point.', benefits: ['Send a private onboarding guide', 'Follow progress and answer questions'] },
] as const

export const suiteToolNavigation = [
  ...featuredSuiteTools.map(({ id, name }) => ({ id, name })),
  { id: 'nic-nac', name: 'Nic-Nac' },
  { id: 'workspace-essentials', name: 'Workspace essentials' },
] as const
