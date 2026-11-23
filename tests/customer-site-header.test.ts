import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'

async function template(page: string) {
  const source = readFileSync('public/amethyst/'+page+'.jsx','utf8')
  const compiled = await build({stdin:{contents:source+'\nwindow.audit = { Ticker, LiveQueueStrip, LiveLineupContext };',loader:'jsx',resolveDir:resolve('public/amethyst')},bundle:true,write:false,format:'iife',external:['react'],jsx:'transform'})
  const window = {location:new URL('http://localhost/'),AMETHYST_RUNTIME_CONTEXT:{targeted:true},AMETHYST_HOMEPAGE_TEMPLATE_DATA:{liveQueueEntries:[]},AMETHYST_TRADE_TEMPLATE_DATA:{liveQueueEntries:[]},AMETHYST_JOIN_TEMPLATE_DATA:{liveQueueEntries:[]}}
  const context = vm.createContext({window,React,ReactDOM:{createRoot:()=>({render(){}})},document:{getElementById:()=>({})},URL,URLSearchParams,console,require:()=>React})
  vm.runInContext(readFileSync('public/amethyst/live-lineup.js','utf8'),context)
  vm.runInContext(compiled.outputFiles[0].text,context)
  const api=(window as unknown as {audit:{Ticker:React.ElementType,LiveQueueStrip:React.ElementType,LiveLineupContext:React.Context<unknown>}}).audit
  return (state:string,entries:unknown[]=[],href:string|null='/smokecodex#events',runtime=true,preset='amethyst')=>{
    const content={liveQueueState:state,liveQueueEntries:entries,liveQueueSummary:'Waiting for update.',liveQueueLastUpdated:'2026-10-02T18:00:00Z',liveQueueCalendarHref:href}
    for(const data of [window.AMETHYST_HOMEPAGE_TEMPLATE_DATA,window.AMETHYST_TRADE_TEMPLATE_DATA,window.AMETHYST_JOIN_TEMPLATE_DATA]) Object.assign(data,content)
    const target=window as unknown as {SparkleLiveLineup?:unknown}; const helper=target.SparkleLiveLineup
    if(!runtime) target.SparkleLiveLineup=undefined
    const html=renderToStaticMarkup(React.createElement(api.LiveLineupContext.Provider,{value:content},React.createElement('div',{'data-preset':preset},React.createElement(api.Ticker,{topText:'A real announcement'}),React.createElement(api.LiveQueueStrip,{state,live:state==='live',onOpen(){}}))))
    target.SparkleLiveLineup=helper
    return html
  }
}
const names=[{name:'Sample Harper',position:1,token:'sample-one',remainingOrders:2}]
describe('public customer lineup follows entries, independently of showtime and skin',()=>{
  for(const page of ['homepage','trade','join']) {
    const prepared=template(page)
    it(page+': empty without names displays its connection status',async()=>{
      const html=(await prepared)('empty')
      expect(html).toContain('I have an open lineup.')
      expect(html).not.toContain('Check the calendar for the next show')
      expect(html).not.toContain('href="/smokecodex#events"')
      expect(html).not.toContain('Working on live lineup issue')
    })
    it(page+': delayed without names keeps the open lineup prompt and no calendar link',async()=>{
      const html=(await prepared)('delayed')
      expect(html).toContain('data-lineup-surface="delayed"')
      expect(html).toContain('I have an open lineup.')
      expect(html).not.toContain('Live Lineup is updating automatically.')
      expect(html).not.toContain('Check the calendar for the next show')
      expect(html).not.toContain('Check back for upcoming shows')
      expect(html).not.toContain('href="/smokecodex#events"')
      expect(html).not.toContain('Working on live lineup issue')
      expect(html).not.toContain('back up and running soon')
      expect(html.slice(html.indexOf('<section'))).not.toMatch(/View (full )?lineup|Waiting for update|Updated|live-dot/)
    })
    for(const state of ['offline','loading']) {
      it(page+': '+state+' without names has only a compact calendar action',async()=>{
        const html=(await prepared)(state)
        expect(html).toContain('data-lineup-surface="calendar"')
        expect(html).toContain('Check the calendar for the next show')
        expect(html).toContain('href="/smokecodex#events"')
        expect(html.slice(html.indexOf('<section'))).not.toMatch(/View (full )?lineup|Waiting for update|Updated|live-dot/)
        expect(html).not.toContain('data-lineup-surface="list"')
      })
    }
    for(const state of ['live','delayed']) {
      it(page+': '+state+' names remain visible without any scheduled show',async()=>{
        const html=(await prepared)(state,names,null)
        expect(html).toContain('data-lineup-surface="list"')
        expect(html).toContain('Sample Harper')
        expect(html).toContain('2 orders')
        expect(html).toMatch(/<button[^>]*>View (full )?lineup<\/button>/)
        expect(html).not.toContain('data-lineup-surface="calendar"')
        expect(html).not.toContain('Working on live lineup issue')
        expect(html).not.toContain('back up and running soon')
        if(state==='delayed') expect(html).toContain('Last update')
      })
    }
    it(page+': unavailable calendar has no dead link',async()=>{
      const html=(await prepared)('offline',[],null)
      expect(html).toContain('Check the calendar for the next show.')
      expect(html).not.toContain('Check back for upcoming shows')
      expect(html).not.toContain('href="/smokecodex#events"')
      expect(html).not.toContain('View lineup')
    })
    it(page+': optional runtime failure keeps the page and compact fallback usable',async()=>{
      const html=(await prepared)('offline',[],null,false)
      expect(html).toContain('Check the calendar for the next show.')
      expect(html).not.toContain('Check back for upcoming shows')
      expect(html).not.toContain('href="/smokecodex#events"')
      expect(html).not.toMatch(/View (full )?lineup/)
    })
    it(page+': preserves original announcement/Dance Floor order and one strip',async()=>{
      for(const state of ['offline','live']) {
        const html=(await prepared)(state,state==='live'?names:[])
        expect(html.match(/data-lineup-surface=/g)).toHaveLength(1)
        expect(html.indexOf('Announcements')).toBeLessThan(html.indexOf('data-lineup-surface='))
        expect(html).toContain('Dance Floor')
        expect(html).not.toContain('hp-lineup-ticker')
      }
    })
    for(const preset of [...AMETHYST_APPEARANCE_PRESET_IDS,'future_inherited_skin']) {
      it(page+': '+preset+' inherits both display states',async()=>{
        const render=await prepared
        expect(render('empty',[],null,true,preset)).toContain('I have an open lineup.')
        expect(render('live',names,null,true,preset)).toContain('Sample Harper')
      })
    }
  }
})

async function lineupPage(root: string, page: string) {
  const source = readFileSync(root+'/'+page+'.jsx','utf8')
  const compiled = await build({stdin:{contents:source+'\nwindow.audit = { LiveQueueStrip, LiveQueueModal, LiveLineupContext };',loader:'jsx',resolveDir:resolve(root)},bundle:true,write:false,format:'iife',external:['react'],jsx:'transform'})
  const window = {React,location:new URL('http://localhost/'),AMETHYST_RUNTIME_CONTEXT:{targeted:true},AMETHYST_HOMEPAGE_TEMPLATE_DATA:{liveQueueEntries:[]},AMETHYST_TRADE_TEMPLATE_DATA:{liveQueueEntries:[]},AMETHYST_JOIN_TEMPLATE_DATA:{liveQueueEntries:[]}}
  const context = vm.createContext({window,React,ReactDOM:{createRoot:()=>({render(){}})},document:{getElementById:()=>({})},URL,URLSearchParams,console,require:(id:string)=>id==='react/jsx-runtime'?{jsx:React.createElement,jsxs:React.createElement,Fragment:React.Fragment}:React})
  vm.runInContext(readFileSync('public/amethyst/live-lineup.js','utf8'),context)
  vm.runInContext(compiled.outputFiles[0].text,context)
  const api=(window as unknown as {audit:{LiveQueueStrip:React.ElementType,LiveQueueModal:React.ElementType,LiveLineupContext:React.Context<unknown>}}).audit
  return (state:string,entries:unknown[]=[],href:string|null=null,runtime=true)=>{
    const content={liveQueueState:state,liveQueueEntries:entries,liveQueueSummary:entries.length?'Live Lineup is updating automatically.':state==='empty'||state==='delayed'?'I have an open lineup.':'Check the calendar for the next show.',liveQueueLastUpdated:'2026-10-02T18:00:00Z',liveQueueCalendarHref:href}
    for(const data of [window.AMETHYST_HOMEPAGE_TEMPLATE_DATA,window.AMETHYST_TRADE_TEMPLATE_DATA,window.AMETHYST_JOIN_TEMPLATE_DATA]) Object.assign(data,content)
    const target=window as unknown as {SparkleLiveLineup?:unknown}; const helper=target.SparkleLiveLineup
    if(!runtime) target.SparkleLiveLineup=undefined
    const node=(type:React.ElementType)=>React.createElement(api.LiveLineupContext.Provider,{value:content},React.createElement(type,{open:true,state,live:state==='live',onOpen(){},onClose(){}}))
    const strip=renderToStaticMarkup(node(api.LiveQueueStrip))
    const modal=renderToStaticMarkup(node(api.LiveQueueModal))
    target.SparkleLiveLineup=helper
    return {strip,modal}
  }
}
function rowSignature(html:string) {
  return [
    html.match(/<section[^>]*>/)?.[0],
    html.match(/<span class="hp-ticker-label hp-lineup-label">/)?.[0],
    html.match(/<div class="hp-lineup-body">/)?.[0],
    html.match(/<div class="hp-trade-preview-items"[^>]*>/)?.[0],
    html.match(/<div class="hp-lineup-meta">/)?.[0],
  ].join('\n')
}
const lineupCss = readFileSync('public/amethyst/homepage.css','utf8')
describe('fast public lineup rows keep one left label and one fixed mobile height',()=>{
  for(const [lane,root] of [['v2','lib/amethyst/v2'],['preview','public/amethyst']] as const) {
    for(const page of ['homepage','trade','join']) {
      const prepared=lineupPage(root,page)
      it(lane+' '+page+': labels calendar, open, delayed, and populated rows',async()=>{
        const render=await prepared
        const calendar=render('offline',[],'/smokecodex#events')
        const open=render('empty')
        const delayedEmpty=render('delayed')
        const populated=render('live',names)
        const delayedNames=render('delayed',names)
        for(const html of [calendar.strip,open.strip,delayedEmpty.strip,populated.strip,delayedNames.strip]) {
          expect(html).toMatch(/<section[^>]*>\s*<span class="hp-ticker-label hp-lineup-label">/)
          expect(html).toContain('>Live Lineup<')
          expect(html).not.toContain('hp-trade-preview-head')
        }
        expect(calendar.strip).toContain('Check the calendar for the next show.')
        expect(calendar.strip).toContain('href="/smokecodex#events"')
        expect(calendar.strip).not.toContain('live-dot')
        expect(calendar.strip).not.toContain('I have an open lineup.')
        expect(open.strip).toContain('I have an open lineup.')
        expect(open.strip).toContain('class="live-dot"')
        expect(delayedEmpty.strip).toContain('I have an open lineup.')
        expect(delayedEmpty.strip).not.toContain('live-dot')
        expect(populated.strip).not.toContain('I have an open lineup.')
        expect(delayedNames.strip).not.toContain('I have an open lineup.')
        expect(populated.strip.match(/>Live Lineup</g)).toHaveLength(1)
        expect(populated.modal).not.toContain('I have an open lineup.')
        expect(delayedNames.modal).not.toContain('I have an open lineup.')
        expect(open.modal).toContain('I have an open lineup.')
      })
      it(lane+' '+page+': one and twelve names use the same non-wrapping row',async()=>{
        const render=await prepared
        const one=render('live',names).strip
        const twelve=render('live',Array.from({length:12},(_,index)=>({name:'Sample '+index,position:index+1,token:'sample-'+index,remainingOrders:1}))).strip
        expect(rowSignature(one)).toBe(rowSignature(twelve))
        expect(one).not.toMatch(/class="[^"]*\bwrap\b/)
        expect(twelve).not.toMatch(/class="[^"]*\bwrap\b/)
        expect((one.match(/hp-trade-preview-pill/g)||[]).length).toBe(1)
        expect((twelve.match(/hp-trade-preview-pill/g)||[]).length).toBe(12)
        expect(one).toContain('View full lineup')
        expect(one).not.toContain('I have an open lineup.')
        expect(twelve).not.toContain('I have an open lineup.')
      })
      it(lane+' '+page+': missing runtime matches the calendar renderEmpty row',async()=>{
        const render=await prepared
        expect(render('offline',[],null,false).strip).toBe(render('offline',[],null,true).strip)
      })
    }
  }
  it('locks the mobile lineup row and scrolls pills on one line',()=>{
    expect(lineupCss).toMatch(/\.hp-lineup-label\s*\{[^}]*position:\s*static;[^}]*flex:\s*none;[^}]*align-self:\s*stretch[^}]*gap:\s*6px/)
    expect(lineupCss).toMatch(/\.hp-lineup-row \.hp-lineup-idle-prompt\s*\{[^}]*min-height:\s*0;[^}]*min-block-size:\s*0/)
    expect(lineupCss).toMatch(/\.hp-lineup-row\s*\{[^}]*display:\s*flex;[^}]*max-width:\s*none;[^}]*margin:\s*0/)
    expect(lineupCss).toMatch(/\.hp-lineup-row \.hp-trade-preview-items\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto/)
    expect(lineupCss).toMatch(/@media \(max-width: 640px\)\s*\{[^}]*\.hp-lineup-row\s*\{[^}]*min-height:\s*56px;[^}]*height:\s*56px/)
    expect(lineupCss).toMatch(/@container \(max-width: 520px\)/)
    expect(lineupCss).toMatch(/\.hp-lineup-row\s*\{[^}]*min-height:\s*64px;[^}]*height:\s*64px;[^}]*overflow:\s*hidden/)
    expect(lineupCss).toMatch(/html\[data-customer-theme="silver_bells"\] body \.hp-lineup-label\s*\{[^}]*background:\s*#0a1b36/)
    expect(lineupCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hp-lineup-label \.live-dot[\s\S]*animation:\s*none/)
    expect(lineupCss).not.toMatch(/\.hp-lineup-row[^{]*\{[^}]*max-width:\s*1280px/)
    expect(lineupCss).not.toMatch(/\.hp-lineup-idle-inner[^{]*\{[^}]*margin:\s*0 auto/)
  })
})
