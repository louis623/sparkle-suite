import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { transformSync } from 'esbuild'
import { describe, expect, it } from 'vitest'

const source=readFileSync('public/amethyst/homepage.jsx','utf8')
function component(name:string) {
  const start=source.indexOf(`function ${name}(`)
  const end=source.indexOf('\nfunction ',start+1)
  const jsx=source.slice(start,end === -1 ? undefined : end)
  const context:Record<string,unknown>={React, CONTENT:{footerLinks:{joinTeam:'/join'},pantryPageUrl:'/pantry'}, getHeroWatchLinks:()=>[{id:'tiktok',label:'Watch',href:'/watch'}],getShopHref:()=>'/shop',getTradeBoardHref:()=>'/trade',linkProps:(href:string)=>({href}),isBrittDanceFloorComingSoon:false}
  for (const match of jsx.matchAll(/<([A-Z]\w*)[\s/>]/g)) context[match[1]]=()=>null
  const code=transformSync(`${jsx}\nglobalThis.Subject=${name}`,{loader:'jsx',format:'iife'}).code
  runInNewContext(code,context)
  return context.Subject as (props:unknown)=>React.ReactElement
}
function hostTree(node:unknown):unknown {
  if(Array.isArray(node)) return node.map(hostTree).filter(Boolean)
  if(!React.isValidElement<{children?:unknown;className?:string;href?:string}>(node)) return typeof node==='string'?node:null
  if(typeof node.type!=='string'||node.type==='video') return null
  return {tag:node.type,class:node.props.className,href:node.props.href,children:hostTree(node.props.children)}
}
function elements(node:unknown):React.ReactElement<Record<string,unknown>>[] {
  if(Array.isArray(node))return node.flatMap(elements)
  if(!React.isValidElement<Record<string,unknown>>(node))return []
  return [node,...elements(node.props.children)]
}
describe('Gilded Autumn respects custom customer layouts',()=>{
  it.each([['MileHighFizzHomepage','mhf-hero'],['BrittWithBlingHomepage','bwb-hero'],['BlingKitchenHomepage','bk-home-hero']])('%s keeps its existing structure, customer copy and actions', (name,heroClass)=>{
    const Subject=component(name)
    const props={repName:'Sample Rep',businessName:'Customer Business',isLive:false,liveShow:null,queueState:'offline'}
    const base=Subject({...props,t:{preset:'sparkle_suite_morganite',heroMotion:'still'}})
    const autumn=Subject({...props,t:{preset:'gilded_autumn',heroMotion:'still'}})
    expect(hostTree(autumn)).toEqual(hostTree(base))
    expect(elements(autumn).find(el=>el.props.className===heroClass)?.props['data-hero-motion']).toBe('off')
    expect(elements(autumn).filter(el=>el.type==='a').map(el=>el.props.href)).toContain('/trade')
    if(name==='MileHighFizzHomepage') {
      expect(elements(base).some(el=>el.type==='video')).toBe(true)
      expect(elements(autumn).some(el=>el.type==='video')).toBe(false)
    }
  })
})
