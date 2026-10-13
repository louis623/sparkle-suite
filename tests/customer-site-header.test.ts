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
    for(const state of ['offline','empty','loading','delayed']) {
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
        if(state==='delayed') expect(html).toContain('Updating · Last update')
      })
    }
    it(page+': unavailable calendar has no dead link',async()=>{
      const html=(await prepared)('offline',[],null)
      expect(html).toContain('Check back for upcoming shows')
      expect(html).not.toContain('href="/smokecodex#events"')
      expect(html).not.toContain('View lineup')
    })
    it(page+': optional runtime failure keeps the page and compact fallback usable',async()=>{
      const html=(await prepared)('offline',[],null,false)
      expect(html).toContain('Check back for upcoming shows')
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
        expect(render('empty',[],null,true,preset)).toContain('data-lineup-surface="calendar"')
        expect(render('live',names,null,true,preset)).toContain('Sample Harper')
      })
    }
  }
})
