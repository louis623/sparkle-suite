import { z } from 'zod'

const idFormats = { tiktok: /^[0-9]{8,22}$/, youtube: /^[A-Za-z0-9_-]{11}$/, instagram: /^[A-Za-z0-9_-]{5,32}$/, facebook: /^[0-9]{5,25}$/ }
export const dismissalInput = z.object({
  repId: z.string().uuid(),
  provider: z.enum(['tiktok', 'youtube', 'instagram', 'facebook']).default('tiktok'),
  tiktokVideoId: z.string().max(32),
}).refine(input => idFormats[input.provider].test(input.tiktokVideoId))
