import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { readSwapJson, verifySwapOrigin, swapIpHash, SwapHttpError } from '@/lib/amethyst/swap-http'
import { createTradeUploadTicket, confirmTradeUpload, discardTradeUpload } from '@/lib/services/trade-request-uploads'
import { opportunisticSweep } from '@/lib/services/swap-maintenance'
import { ServiceError } from '@/lib/services/errors'

type Operation = 'ticket' | 'confirm' | 'discard'

export async function handleSwapUpload(request: Request, operation: Operation) {
  try {
    verifySwapOrigin(request)
    const input = await readSwapJson(request, 16 * 1024)
    const stringField = (key: string) => typeof input[key] === 'string' ? input[key] as string : ''
    const admin = createAdminClient()
    const target = resolveAmethystRequestTarget(request)
    const rep = target.targeted ? await resolveAmethystPreviewRep(admin, {
      env: process.env, publicSiteSlug:target.publicSiteSlug, repId:target.repId ?? target.customDomain, select:'id, email',
    }) : null
    if (target.targeted && !rep?.id) return NextResponse.json({code:'TRADE_UPLOAD_UNAVAILABLE',error:'Swap requests are temporarily unavailable.'},{status:503})
    const identity = {listingId:stringField('listingId'),submissionId:stringField('submissionId'),expectedRepId:rep?.id}
    let result: unknown
    if (operation === 'ticket') {
      const ipHash = swapIpHash(request)
      await opportunisticSweep(request.url)
      result = await createTradeUploadTicket(admin,{...identity,contentType:stringField('contentType'),
        byteSize:typeof input.byteSize==='number'?input.byteSize:0,ipHash})
    } else {
      const binding = {...identity,uploadId:stringField('uploadId')}
      result = operation === 'confirm' ? await confirmTradeUpload(admin,binding) : await discardTradeUpload(admin,binding)
    }
    return NextResponse.json(result,{status:operation==='ticket'?201:200,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
  } catch (error) {
    if (error instanceof SwapHttpError) return NextResponse.json({code:'TRADE_UPLOAD_INVALID_REQUEST',error:error.message},{status:error.status})
    if (error instanceof ServiceError) {
      const headers = new Headers({'Cache-Control':'no-store'})
      if ('retryAfter' in error && typeof error.retryAfter==='number') headers.set('Retry-After',String(error.retryAfter))
      return NextResponse.json({code:error.code,error:error.userMessage},{status:error.statusCode,headers})
    }
    console.error('[swap-upload] request failed')
    return NextResponse.json({code:'TRADE_UPLOAD_UNAVAILABLE',error:'Photo upload is temporarily unavailable.'},{status:503})
  }
}
