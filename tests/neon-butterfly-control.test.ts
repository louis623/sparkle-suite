import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

it('pauses and resumes Neon while retaining its button text node', () => {
 const label={nodeValue:'Pause animation'},attributes:Record<string,string>={}
 let click:()=>void=()=>{},decoration:any=null
 const control={firstChild:label,addEventListener:(_name:string,fn:()=>void)=>{click=fn},setAttribute:(key:string,value:string)=>{attributes[key]=value},set textContent(_value:string){throw Error('Do not replace the text node and rescan the scene')}}
 const hero={querySelector:()=>decoration,appendChild:(node:any)=>{decoration=node}}
 const document={body:{classList:{contains:()=>true}},documentElement:{classList:{toggle:()=>{}}},hidden:false,readyState:'complete',querySelectorAll:()=>[hero],createElement:()=>({dataset:{},innerHTML:'',querySelector:()=>control}),addEventListener:()=>{}}
 runInNewContext(readFileSync('public/amethyst/neon-butterfly.js','utf8'),{document,MutationObserver:class{observe(){}},Math})
 click()
 expect(decoration.dataset.paused).toBe('true')
 expect(label.nodeValue).toBe('Resume animation')
 expect(attributes['aria-pressed']).toBe('true')
 click()
 expect(decoration.dataset.paused).toBe('false')
 expect(label.nodeValue).toBe('Pause animation')
 expect(control.firstChild).toBe(label)
 expect(attributes['aria-pressed']).toBe('false')
})
