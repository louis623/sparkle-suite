// @vitest-environment jsdom
import React,{act,useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {it,expect,vi} from 'vitest'
function component(path:string,name:string){
 const source=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JSX)
 const keep=[name,'visibleDancerDetail','SparkleMark']
 const funcs=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&keep.includes(n.name?.text??'')).map(n=>n.getText(ast)).join('\n')
 return runInNewContext(ts.transpileModule(funcs+'\n'+name,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText,{
 React,useEffect,useRef,useState,useTradeDialog:()=>({current:null}),displayCollectionLabel:(s:string)=>s,isSpecificDancerNote:()=>false,responsiveRepImage:(src:string,o:any)=>({src,alt:o.alt})
 })
}
it.each(['lib/amethyst/v2/trade.jsx','public/amethyst/trade.jsx'])('renders card polish and URL-keyed failed images in %s',async path=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const host=document.createElement('div'),root=createRoot(host),base={id:'x',name:'Unicorn Rain',collection:'Birthday',type:'Ring',size:'7',material:'Shown in photo',stone:'',tier:'unicorn',quantityAvailable:12,photoUrl:'/first'}
 const complete=vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(false),width=vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(0)
 try{
 for(const name of ['TradeCard','ExpandedCard']){
  const Component=component(path,name)
  await act(async()=>root.render(React.createElement(Component,{piece:base,onTap:()=>{},onClose:()=>{},onWantThis:()=>{}})))
  expect(host.querySelector('[class*=tp-card-tier]')).toBeNull();expect(host.textContent).not.toContain('12 available');expect(host.textContent).not.toContain('Shown in photo')
  if(name==='TradeCard'){expect(host.textContent).toContain('Ring · Size 7 · Birthday');expect(host.querySelector('button')!.textContent).toBe('View & Swap')}
  complete.mockReturnValue(true)
  await act(async()=>root.render(React.createElement(Component,{piece:{...base,photoUrl:'/second'},onTap:()=>{},onClose:()=>{},onWantThis:()=>{}})))
  expect(host.querySelector('img')).toBeNull();expect(host.querySelector('.tp-sparkle-mark')).not.toBeNull()
  complete.mockReturnValue(false)
 }
 }finally{await act(async()=>root.unmount());complete.mockRestore();width.mockRestore();vi.unstubAllGlobals()}
})
