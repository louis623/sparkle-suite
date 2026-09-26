import { resolveSocialPlatformUrl } from './social-hero'

/**
 * The Workspace "Facebook" social handle is the rep's VIP group or page.
 * Landing heroes read this URL; they do not have a second VIP link field.
 */
export function resolveFacebookVipUrl(value: string | null | undefined) {
  return resolveSocialPlatformUrl('facebook', value)
}
