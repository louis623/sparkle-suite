export interface SelfServeOnboardingChecklistItem {
  id: string
  title: string
  description: string
  nicNacPrompt: string
}

export const SELF_SERVE_ONBOARDING_CHECKLIST: SelfServeOnboardingChecklistItem[] = [
  {
    id: 'business-profile',
    title: 'Confirm business/profile basics',
    description: 'Review your display name, business name, contact details, and rep-facing profile.',
    nicNacPrompt: 'Ask Nic-Nac to help confirm my business/profile basics.',
  },
  {
    id: 'skin-and-branding',
    title: 'Confirm the Sparkle Suite/Morganite theme',
    description: 'Use the locked Sparkle Suite look before deeper public-site edits.',
    nicNacPrompt: 'Ask Nic-Nac to confirm my Sparkle Suite/Morganite theme.',
  },
  {
    id: 'public-links',
    title: 'Add public links and social profiles',
    description: 'Add TikTok, Facebook, Instagram, shopping, and other public links shoppers need.',
    nicNacPrompt: 'Ask Nic-Nac to help add my public links and social profiles.',
  },
  {
    id: 'site-copy',
    title: 'Adjust site copy',
    description: 'Tune banner text, ticker text, tagline, and other visible public-site copy.',
    nicNacPrompt: 'Ask Nic-Nac to help adjust my site copy.',
  },
  {
    id: 'shows',
    title: 'Add or update shows',
    description: 'Put upcoming lives and recurring shows into the calendar so timing stays current.',
    nicNacPrompt: 'Ask Nic-Nac to help add or update my shows.',
  },
  {
    id: 'trade-board',
    title: 'Set up starter dance floor content',
    description: 'Add the first pieces customers can request and learn the listing status flow.',
    nicNacPrompt: 'Ask Nic-Nac to help set up starter dance floor content.',
  },
  {
    id: 'calculator',
    title: 'Learn the calculator',
    description: 'Use the calculator to estimate monthly goals, show goals, costs, and take-home.',
    nicNacPrompt: 'Ask Nic-Nac to show me how the calculator works.',
  },
  {
    id: 'chrome-extension-live-queue',
    title: 'Understand the Chrome extension and Live Lineup',
    description: 'Learn why the extension exists, what it syncs, and how to check Live Lineup status.',
    nicNacPrompt: 'Ask Nic-Nac to explain the Chrome extension and Live Lineup.',
  },
  {
    id: 'publish-readiness',
    title: 'Review publish/share readiness',
    description: 'Check the public site, help resources, and escalation path before sharing widely.',
    nicNacPrompt: 'Ask Nic-Nac to review my publish/share readiness.',
  },
]

export function getSelfServeOnboardingChecklist() {
  return SELF_SERVE_ONBOARDING_CHECKLIST
}
