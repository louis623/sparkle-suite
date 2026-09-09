import { z } from 'zod'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role'
import { authorizeReviewEvidence,parseReviewEvidenceQuery,readControlCenterReviewEvidence,ReviewEvidenceError } from '@/lib/sparkle-finder/control-center-review-evidence'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'cache-control':'no-store, private','x-content-type-options':'nosniff'}
export async function GET(request:Request) {
 try {
  authorizeReviewEvidence(request)
  const input=parseReviewEvidenceQuery(new URL(request.url))
  const admin=createSupabaseServiceRoleClient()
  if(!admin)throw new ReviewEvidenceError(503,'finder_service_not_configured')
  return Response.json({ok:true,...await readControlCenterReviewEvidence(admin,input)},{headers})
 } catch(error) {
  const status=error instanceof ReviewEvidenceError?error.status:error instanceof z.ZodError?400:502
  return Response.json({ok:false,error:error instanceof ReviewEvidenceError?error.message:status===400?'invalid_evidence_request':'review_evidence_unavailable'},{status,headers})
 }
}
