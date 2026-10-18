import { pantryNotFoundResponse } from '@/lib/bling-kitchen/pantry-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Pantry has no public subpages. Other reps never receive this path either. */
export function GET() {
  return pantryNotFoundResponse()
}
