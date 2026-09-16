import { OnboardingExperience } from './OnboardingExperience'

export const dynamic = 'force-dynamic'

type OnboardingPageProps = {
  params: Promise<{ inviteSlug: string }>
  searchParams: Promise<{ invite?: string | string[] }>
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const query = await searchParams
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite
  return <OnboardingExperience token={invite?.trim() || null} />
}
