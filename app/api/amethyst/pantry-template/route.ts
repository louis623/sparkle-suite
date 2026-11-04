import { NextResponse } from 'next/server'
import { buildPantryTemplateResponse } from '@/lib/bling-kitchen/pantry-template-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const result = await buildPantryTemplateResponse(request)
  if (result instanceof Response) return result
  return new NextResponse(result.bootstrapScript, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
