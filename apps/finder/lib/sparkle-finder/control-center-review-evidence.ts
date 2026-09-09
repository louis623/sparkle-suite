import { createHash,timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { buildShowcaseStudioAssetPath,isShowcaseStudioImageType,showcaseStudioBucket,showcaseStudioMaxImageBytes } from './showcase-studio-persistence'

export class ReviewEvidenceError extends Error { constructor(public status:number,message:string){super(message)} }
export function authorizeReviewEvidence(request:Request,expectedDigest=process.env.SPARKLE_FINDER_CONTROL_CENTER_REVIEW_TOKEN_SHA256) {
 if(!expectedDigest||!/^[a-f0-9]{64}$/.test(expectedDigest))throw new ReviewEvidenceError(503,'review_evidence_not_configured')
 const match=/^Bearer ([^\s]{32,512})$/i.exec(request.headers.get('authorization')??'')
 if(!match)throw new ReviewEvidenceError(401,'unauthorized')
 const actual=createHash('sha256').update(match[1]).digest()
 if(!timingSafeEqual(actual,Buffer.from(expectedDigest,'hex')))throw new ReviewEvidenceError(401,'unauthorized')
}
const querySchema=z.object({finderSubmissionId:z.uuid(),finderAssetId:z.uuid()}).strict()
export function parseReviewEvidenceQuery(url:URL){return querySchema.parse(Object.fromEntries(url.searchParams))}
export async function readControlCenterReviewEvidence(admin:SupabaseClient,input:z.infer<typeof querySchema>,now=new Date()) {
 const {data:submission,error:submissionError}=await admin.from('sparkle_finder_nic_nac_intake_submissions').select('id,user_id,status').eq('id',input.finderSubmissionId).eq('status','publish_queued').maybeSingle()
 if(submissionError)throw new ReviewEvidenceError(502,'review_evidence_unavailable')
 if(!submission)throw new ReviewEvidenceError(404,'queued_submission_not_found')
 const ownerId=z.uuid().parse(submission.user_id)
 const {data:asset,error:assetError}=await admin.from('sparkle_finder_nic_nac_intake_assets').select('id,submission_id,user_id,asset_kind,storage_bucket,storage_path,content_type,byte_size').eq('id',input.finderAssetId).eq('submission_id',input.finderSubmissionId).eq('user_id',ownerId).maybeSingle()
 if(assetError)throw new ReviewEvidenceError(502,'review_evidence_unavailable')
 if(!asset)throw new ReviewEvidenceError(404,'submission_asset_not_found')
 const kind=asset.asset_kind
 if(kind!=='original_label'&&kind!=='jewelry_front')throw new ReviewEvidenceError(409,'invalid_evidence_kind')
 if(!isShowcaseStudioImageType(asset.content_type)||!Number.isSafeInteger(asset.byte_size)||asset.byte_size<1||asset.byte_size>showcaseStudioMaxImageBytes)throw new ReviewEvidenceError(409,'invalid_evidence_metadata')
 const path=buildShowcaseStudioAssetPath(ownerId,input.finderSubmissionId,kind,asset.content_type)
 if(asset.storage_bucket!==showcaseStudioBucket||asset.storage_path!==path||asset.submission_id!==input.finderSubmissionId||asset.user_id!==ownerId||asset.id!==input.finderAssetId)throw new ReviewEvidenceError(409,'invalid_evidence_binding')
 const {data:signed,error}=await admin.storage.from(showcaseStudioBucket).createSignedUrl(path,120)
 if(error||!signed?.signedUrl)throw new ReviewEvidenceError(502,'evidence_signing_unavailable')
 return {...input,imageUrl:signed.signedUrl,expiresAt:new Date(now.getTime()+120000).toISOString(),contentType:asset.content_type,assetKind:kind,byteSize:asset.byte_size}
}
