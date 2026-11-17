// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { TradeRequestReviewDialog } from '@/app/nic-nac/components/TradeRequestReviewDialog'
let host: HTMLDivElement, root: Root, opener: HTMLButtonElement
const request: any = { id:'request', customerName:'Jamie', customerDescription:'Birthday ring', manualReviewRequested:true, screening:{status:'mismatch',reason:'Check family'}, listing:{quantityAvailable:1,design:{itemNumber:'RG123',designName:'Blue ring',collectionName:'Birthday',typePrefix:'RG'}}, createdAt:new Date().toISOString() }
const submit = vi.fn(), close = vi.fn()
async function render(props = {}) { await act(async()=>{root.render(<TradeRequestReviewDialog request={request} onClose={close} onSubmit={submit} {...props} />)}) }
function button(label: string) { const b=[...host.querySelectorAll('button')].find(x=>x.textContent===label);if(!b)throw Error(label);return b }
async function click(label: string) { await act(async()=>button(label).click()) }
async function input(node: HTMLInputElement | HTMLTextAreaElement, value: string) {
 await act(async()=>{Object.getOwnPropertyDescriptor(node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}))})
}
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);submit.mockReset();close.mockReset();opener=document.createElement('button');document.body.append(opener);opener.focus();host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();opener.remove();vi.unstubAllGlobals()})
it('choose → approve → Back → deny preserves focus, submits discriminated payloads without verification or ring size',async()=>{
 await render();expect(host.textContent).toContain('Rule exception');expect(host.querySelector('select')).toBeNull();expect(host.querySelector('input[type=checkbox]')).toBeNull()
 await click('Approve');expect(document.activeElement).toBe(host.querySelector('h2'))
 await input(host.querySelector('input')!,' nk402 ');await input(host.querySelector('textarea')!,'private')
 await click('Confirm approval');expect(submit).toHaveBeenCalledWith({action:'approve',requestId:'request',revealedItemNumber:'NK402',repNotes:'private'})
 await click('Back');await click('Deny');expect(document.activeElement).toBe(host.querySelector('h2'))
 const fields=host.querySelectorAll('textarea');await input(fields[0],'<b>No thanks</b>');expect(host.textContent).toContain('16/240')
 await click('Confirm denial');expect(submit).toHaveBeenLastCalledWith({action:'reject',requestId:'request',customerMessage:'<b>No thanks</b>',repNotes:'private'})
})
it('Back and choosing another action restart focus; Tab and Shift-Tab wrap including pending',async()=>{
 await render({initialAction:'approve'});await click('Back');await click('Deny')
 const heading=host.querySelector('h2')!, controls=[...host.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')] as HTMLElement[]
 await act(async()=>heading.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));expect(document.activeElement).toBe(controls.at(-1))
 await act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));expect(document.activeElement).toBe(controls[0])
 await render({initialAction:'approve',pending:true});await click('Back');await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));expect(close).not.toHaveBeenCalled();expect(host.textContent).toContain('Message to customer')
 await act(async()=>heading.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));expect(document.activeElement).toBe(heading)
 await act(async()=>root.unmount());expect(document.activeElement).toBe(opener);root=createRoot(host)
})
it('initial reject maps to deny; blank deny and blank approve need no extra fields',async()=>{
 await render({initialAction:'reject'});expect(host.querySelector('textarea')!.maxLength).toBe(240);await click('Confirm denial');expect(submit).toHaveBeenCalledWith({action:'reject',requestId:'request'})
 await click('Back');await click('Approve');await click('Confirm approval');expect(submit).toHaveBeenLastCalledWith({action:'approve',requestId:'request'})
})
it('expired screenshot retains exact notice and removes all timing/order and dancer image copy',async()=>{
 await render({request:{...request,photoExpired:true,dancerPhotoUrl:'/catalog.jpg',pendingPosition:3}})
 expect(host.textContent).toContain('Photo expired after 7 days. Ask the customer to resend.');expect(host.querySelector('img')).toBeNull();expect(host.textContent).not.toContain('remaining')
})
