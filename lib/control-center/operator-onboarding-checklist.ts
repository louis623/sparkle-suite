export type OperatorOnboardingChecklistItemKey = 'workspace_access' | 'about_section_intake' | 'public_site_foundation' | 'public_route_proof' | 'calendar_and_show_links' | 'live_queue_readiness' | 'welcome_communication' | 'custom_domain_authority' | 'custom_domain_vercel' | 'custom_domain_dns' | 'custom_domain_mapping' | 'custom_domain_route_proof' | 'custom_domain_brand_assets' | 'search_visibility' | 'analytics_setup' | 'closeout'

export interface OperatorOnboardingChecklistItemDefinition { key: OperatorOnboardingChecklistItemKey; title: string; description: string; guidance?: readonly string[] }

// A deliberately simple operator checklist. It records only whether a named launch task is done.
export const OPERATOR_ONBOARDING_CHECKLIST_ITEMS: readonly OperatorOnboardingChecklistItemDefinition[] = [
  { key: 'workspace_access', title: 'Make sure they can use Sparkle Suite', description: 'Confirm the new rep can get into their Sparkle Suite Workspace.' },
  { key: 'about_section_intake', title: 'Get what you need for their About page', description: 'Ask these five questions, then write the About page manually.', guidance: ['Your origin story: How did you discover Bomb Party, and what made you decide to become a rep?', 'Your live vibe: What should someone expect in one of your lives—music, energy, style, favorite collections, or anything else?', 'The big reveal: Any favorite reveals, milestones, unicorns/diamonds, or moments you’d like highlighted?', 'Just for fun: A few personal details you’re comfortable sharing, such as family, pets, hobbies, interests, or favorite things.', 'Your promise: What do you want customers to feel when they shop or spend time with you?'] },
  { key: 'public_site_foundation', title: 'Set up their website basics', description: 'Add their show name, shop link, and social links in Site Settings.' },
  { key: 'public_route_proof', title: 'Check their public website', description: 'Open their Home, Dance Floor, and Join pages and make sure they look like their business.' },
  { key: 'calendar_and_show_links', title: 'Check their Calendar links', description: 'Make sure show cards link to the right social platform when a rep names one.' },
  { key: 'live_queue_readiness', title: 'Make sure Live Queue is ready', description: 'Confirm the rep has what they need to use Live Queue during a show.' },
  { key: 'welcome_communication', title: 'Send their welcome and next steps', description: 'Prepare or send the approved welcome information.' },
  { key: 'custom_domain_authority', title: 'Confirm they can access their domain', description: 'If they want a custom domain, make sure they can log in to their domain provider.' },
  { key: 'custom_domain_vercel', title: 'Connect their custom domain', description: 'Add the approved custom domain to Sparkle Suite.' },
  { key: 'custom_domain_dns', title: 'Update their domain settings', description: 'Make only the needed DNS change and leave everything else alone.' },
  { key: 'custom_domain_mapping', title: 'Link the domain to the right website', description: 'Make sure the domain opens this rep’s Sparkle Suite site.' },
  { key: 'custom_domain_route_proof', title: 'Check their custom-domain pages', description: 'Open the home page and subpages on their domain to make sure they work.' },
  { key: 'custom_domain_brand_assets', title: 'Check their sharing image and favicon', description: 'Make sure their browser icon and link-preview image are ready; previews can take time to update.' },
  { key: 'search_visibility', title: 'Make their site easy to find', description: 'Check that their sitemap, search details, and AI-friendly public information use their real site—not a demo. Submit it to Google and Bing only after that is correct.' },
  { key: 'analytics_setup', title: "Set up the rep's site analytics.", description: "Create the rep's GA4 property and web stream. Add the reader account as Viewer. Save both IDs on the admin analytics record for the rep. Confirm Realtime on the rep's domain." },
  { key: 'closeout', title: 'Finish up and share next steps', description: 'Make sure the rep knows what happens next and any remaining tasks are clear.' },
]

export interface OperatorOnboardingChecklistEntry { itemKey: OperatorOnboardingChecklistItemKey; isCompleted: boolean; updatedAt: string | null }
export interface OperatorOnboardingChecklistItem extends OperatorOnboardingChecklistItemDefinition { entry: OperatorOnboardingChecklistEntry }
export function isOperatorOnboardingChecklistItemKey(value: string): value is OperatorOnboardingChecklistItemKey { return OPERATOR_ONBOARDING_CHECKLIST_ITEMS.some((item) => item.key === value) }
export function buildOperatorOnboardingChecklist(entries: readonly OperatorOnboardingChecklistEntry[] = []): OperatorOnboardingChecklistItem[] {
  const entriesByKey = new Map(entries.map((entry) => [entry.itemKey, entry]))
  return OPERATOR_ONBOARDING_CHECKLIST_ITEMS.map((item) => ({ ...item, entry: entriesByKey.get(item.key) ?? { itemKey: item.key, isCompleted: false, updatedAt: null } }))
}
