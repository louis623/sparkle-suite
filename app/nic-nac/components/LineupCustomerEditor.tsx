'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WorkspaceLineupEntry } from '@/lib/live-lineup/types'
import type { CustomerCardMatch } from '@/lib/live-lineup/customer-cards'
import type { CustomerAudienceMember } from '@/lib/services/types'
import { NIC_NAC_WORKSPACE_REFRESH_EVENT } from '@/lib/nic-nac/workspace-refresh-events'
import styles from './LineupCustomerEditor.module.css'
const fields = [
 ['identityLabel','Private distinguishing label',80],['birthday','Birthday (MM-DD)',5],
 ['favoriteGemOrStone','Favorite stone',120],['favoriteMaterial','Favorite metal / material',120],
 ['favoriteCut','Favorite cut',120],['favoriteCollection','Favorite collection',160],['notes','Private rep notes',2000],
] as const
function values(customer:CustomerAudienceMember) {return Object.fromEntries(fields.map(([key])=>[key,customer[key] ?? ''])) as Record<string,string>}
const errorText:Record<string,string>={identity_changed:'This order changed. Close this card and open it again.',show_changed:'The lineup changed. Close this card and open it again.',source_not_ready:'Wait for a fresh Bomb Party update before confirming a match.',invalid_customer:'That customer no longer matches this order. Reload the card.',label_required:'Add a private label so you can tell these customers apart.'}
export function LineupCustomerEditor({entry,generation,valid,onClose,onAsk}: {entry:WorkspaceLineupEntry;generation:number;valid:boolean;onClose:()=>void;onAsk?:(prompt:string)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null)
 const alive=useRef(true)
 const [match,setMatch]=useState<CustomerCardMatch|null>(null)
 const [customer,setCustomer]=useState<CustomerAudienceMember|null>(null)
 const [draft,setDraft]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [choose,setChoose]=useState(false)
 const [create,setCreate]=useState(false)
 const [label,setLabel]=useState('')
 const newId=useRef<string|null>(null)
 const notify=()=>window.dispatchEvent(new CustomEvent(NIC_NAC_WORKSPACE_REFRESH_EVENT,{detail:{topics:['audience']}}))
 async function request(action:'inspect'|'resolve'|'create',customerId?:string,signal?:AbortSignal) {
  const response=await fetch('/api/workspace/live-lineup/customers',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action,generation,entryId:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion,
   ...(customerId?{customerId}:{}),...(action==='create'?{newCustomerId:newId.current,label}: {})})})
  const result=await response.json()
  if(!response.ok || !result.match) throw Error(errorText[result.error] ?? 'Could not load or confirm this customer. Try again.')
  return result as {match:CustomerCardMatch;customer:CustomerAudienceMember|null}
 }
 function accept(result:{match:CustomerCardMatch;customer:CustomerAudienceMember|null}) {
  setMatch(result.match);setCustomer(result.customer);setDraft(result.customer?values(result.customer):{});setChoose(!result.customer);setCreate(false)
 }
 useEffect(()=>{
  alive.current=true
  const previous=document.activeElement as HTMLElement|null
  dialog.current?.showModal()
  const controller=new AbortController()
  void request('inspect',undefined,controller.signal).then(result=>{if(alive.current)accept(result)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(alive.current)setBusy(false)})
  return()=>{alive.current=false;controller.abort();previous?.focus()}
 // This component is keyed by the selected order identity.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 async function resolve(id?:string) {
  if(busy || !valid)return
  if(!id && !newId.current)newId.current=crypto.randomUUID()
  setBusy(true);setError('');setNotice('')
  try {const result=await request(id?'resolve':'create',id);if(alive.current){accept(result);setNotice('Customer matched to this order.');notify()}}
  catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setBusy(false)}
 }
 async function save(event:React.FormEvent) {
  event.preventDefault();if(!customer || busy || !valid)return
  const patch=Object.fromEntries(fields.filter(([key])=>draft[key] !== (customer[key] ?? '')).map(([key])=>[key,draft[key]]))
  if(!Object.keys(patch).length){setNotice('No changes to save.');return}
  setBusy(true);setError('');setNotice('')
  try {
   const response=await fetch('/api/nic-nac/customer-audience',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({audienceId:customer.id,expectedVersion:customer.profileVersion,...patch})})
   const result=await response.json()
   if(!response.ok || result.customer?.id!==customer.id)throw Error(result.error ?? 'Save not confirmed. Reload the card before trying again.')
   if(alive.current){setCustomer(result.customer);setDraft(values(result.customer));setNotice('Customer details saved.');notify()}
  }catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setBusy(false)}
 }
 async function reload(){setBusy(true);setError('');try{const result=await request('inspect');if(alive.current){accept(result);setNotice('Latest saved details loaded.')}}catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setBusy(false)}}
 return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="lineup-customer-title" onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <header className={styles.header}><div><small>Customer card · Private to your workspace</small><h2 id="lineup-customer-title">{entry.name} {entry.lastName}</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close customer card">×</button></header>
  <div className={styles.body}>
   {!valid && <p role="alert">This order changed. Close this card and open it again before saving.</p>}
   {error && <div role="alert" className={styles.error}>{error} <button type="button" disabled={busy || !valid} onClick={()=>void reload()}>Reload card</button></div>}
   <p role="status" className={styles.status}>{busy?'Working…':notice || '\u00a0'}</p>
   {choose && <section><h3>Which customer is this?</h3><p>Personal details stay hidden until you choose. This match applies to this order.</p>
    <div className={styles.choices}>{match?.candidates.map(candidate=><button type="button" key={candidate.id} disabled={busy || !valid} onClick={()=>void resolve(candidate.id)}><strong>{candidate.label || 'No distinguishing label yet'}</strong><span>{candidate.name} · Card {candidate.id.slice(-6)}</span></button>)}</div>
   </section>}
   {customer && !choose && <form onSubmit={save}><div className={styles.fields}>{fields.map(([key,title,max])=><label key={key}>{title}{key==='notes'?<textarea value={draft[key]??''} maxLength={max} rows={3} onChange={e=>setDraft({...draft,[key]:e.target.value})} disabled={busy || !valid}/>:<input value={draft[key]??''} maxLength={max} placeholder={key==='identityLabel'?'e.g. Ohio or local pickup':key==='birthday'?'02-14':undefined} pattern={key==='birthday'?'[0-9]{2}-[0-9]{2}':undefined} onChange={e=>setDraft({...draft,[key]:e.target.value})} disabled={busy || !valid}/>}</label>)}</div>
    <div className={styles.buttons}><button className={styles.primary} type="submit" disabled={busy || !valid}>Save details</button>{onAsk && <button type="button" disabled={busy} onClick={()=>{onAsk(`Look up my customer card ${customer.id} for ${customer.name}${customer.identityLabel?' ('+customer.identityLabel+')':''} and tell me their birthday and preferences.`);onClose()}}>Ask Nic-Nac</button>}</div>
   </form>}
   {match && !create && <div className={styles.secondary}><button type="button" disabled={busy || !valid} onClick={()=>{setChoose(true);setCreate(true)}}>Different person with the same name</button>{customer && !choose && match.candidates.length>1 && <button type="button" disabled={busy || !valid} onClick={()=>setChoose(true)}>Choose another existing card</button>}</div>}
   {create && <section className={styles.newCard}><h3>Create a separate customer</h3><p>Keep the full name. Add a private label to tell these people apart.</p><label>Private distinguishing label<input value={label} maxLength={80} onChange={e=>{setLabel(e.target.value);newId.current=null}} placeholder="e.g. Ohio or local pickup" disabled={busy}/></label><div className={styles.buttons}><button type="button" className={styles.primary} disabled={busy || !valid || !label.trim()} onClick={()=>void resolve()}>Create and match this order</button><button type="button" disabled={busy} onClick={()=>{setCreate(false);setChoose(!customer)}}>Cancel</button></div></section>}
  </div>
 </dialog>,document.body)
}
