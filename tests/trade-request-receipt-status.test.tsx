// @vitest-environment jsdom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {it,expect,vi} from 'vitest'
import {validDanceFloorBackHref} from '@/app/trade-request/status/[token]/receipt-back'
import ReceiptStatus from '@/app/trade-request/status/[token]/receipt-status'
import {getTradeRequestReceiptStatus} from '@/lib/services/trade-requests'
it.each(['javascript:alert(1)','JaVaScRiPt:alert(1)','//evil.com','https://evil.com','/\\evil','/bad\\path','/bad\u0000path','/'+ 'a'.repeat(300),['/one','/two'],undefined])('rejects invalid already-decoded return target %j',value=>expect(validDanceFloorBackHref(value)).toBeNull())
it('validates the once-decoded query and permits local query/hash paths',()=>{
 expect(validDanceFloorBackHref(new URL('https://x.invalid/?back=/%5Cevil').searchParams.get('back'))).toBeNull()
 expect(validDanceFloorBackHref('/smokecodex/trade?filter=ring#floor')).toBe('/smokecodex/trade?filter=ring#floor')
})
it.each(['Your rep could not approve this swap.','<script>alert(1)</script>'])('renders denial as one escaped text child and includes a normal return link',async message=>{
 vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({status:'denied',denialExplanation:message,updatedAt:null}))))
 const host=document.createElement('div'),root=createRoot(host)
 try{await act(async()=>root.render(<ReceiptStatus token={'a'.repeat(64)} backHref="/smokecodex/trade"/>));expect(host.querySelectorAll('script')).toHaveLength(0);expect(host.textContent?.split(message)).toHaveLength(2);expect(host.querySelector('a')!.getAttribute('href')).toBe('/smokecodex/trade')
 await act(async()=>root.render(<ReceiptStatus token={'a'.repeat(64)}/>));expect(host.querySelector('a')).toBeNull()
 }finally{await act(async()=>root.unmount());vi.unstubAllGlobals()}
})
it('real receipt service selects only public status fields and never request notes',async()=>{
 const q:any={eq:()=>q,maybeSingle:async()=>({data:{status:'denied',rejection_reason:'other',denial_explanation:'No thanks',updated_at:null,rep_notes:'secret'},error:null})}
 const select=vi.fn(()=>q);const result=await getTradeRequestReceiptStatus({from:()=>({select})} as never,'a'.repeat(64))
 expect(select).toHaveBeenCalledWith('status, rejection_reason, denial_explanation, updated_at');expect(JSON.stringify(result)).not.toContain('secret');expect(result).not.toHaveProperty('rep_notes')
})
