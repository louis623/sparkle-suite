import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'

// Execute the actual page provider + its URL helpers, with only React lifecycle
// scheduling stubbed. No browser, provider, or fetch is contacted.
function pagePoll(page: 'homepage' | 'join' | 'trade', pageUrl: string, context: Record<string, unknown>) {
  const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
  const ast = ts.createSourceFile(`${page}.jsx`, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const names = new Set(['runtimeText', 'buildContextSearch', 'withCurrentSearch'])
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text ?? ''))
    .map(node => node.getText(ast)).join('\n')
  const script = ts.transpileModule(`${functions}\nwithCurrentSearch('/api/amethyst/live-lineup');`, {
    compilerOptions:{jsx:ts.JsxEmit.React, target:ts.ScriptTarget.ES2020},
  }).outputText
  const url = runInNewContext(script, {
    window:{location:new URL(pageUrl)}, URLSearchParams, RUNTIME_CONTEXT:context,
  })
  return {url: new URL(url, pageUrl), request:() => new Request(new URL(url, pageUrl), {headers:{referer:pageUrl}})}
}

function providerStart(page: 'join' | 'trade', pageUrl: string, context: Record<string, unknown>) {
  const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
  const ast = ts.createSourceFile(`${page}.jsx`, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const names = new Set(['runtimeText', 'buildContextSearch', 'withCurrentSearch', 'LiveLineupProvider'])
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text ?? ''))
    .map(node => node.getText(ast)).join('\n')
  const script = ts.transpileModule(`${functions}\nLiveLineupProvider({children:null});`, {
    compilerOptions:{jsx:ts.JsxEmit.React, target:ts.ScriptTarget.ES2020},
  }).outputText
  const start = vi.fn<(_options: {url:string}) => () => void>(() => () => {})
  runInNewContext(script, {
    React:{useState:(initialize: () => unknown) => [initialize(), () => {}],
      useEffect:(effect: () => unknown) => effect(), createElement:() => null},
    window:{location:new URL(pageUrl), SparkleLiveLineup:{start}},
    URLSearchParams, CONTENT:{}, RUNTIME_CONTEXT:context, LiveLineupContext:{Provider:()=>null},
  })
  return start
}

function dialogHook(page: 'homepage' | 'join' | 'trade', runtime?: {useDialog: (...args: unknown[]) => unknown}) {
  const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
  const ast = ts.createSourceFile(`${page}.jsx`, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const declaration = ast.statements.find(node =>
    ts.isVariableStatement(node) && node.declarationList.declarations.some(item =>
      ts.isIdentifier(item.name) && item.name.text === 'LIVE_LINEUP_DIALOG_HOOK'))
  const hook = ast.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'useLiveLineupDialog')
  const script = ts.transpileModule(
    `${declaration?.getText(ast)}\n${hook?.getText(ast)}\nuseLiveLineupDialog(false, () => {});`,
    {compilerOptions:{target:ts.ScriptTarget.ES2020}},
  ).outputText
  return runInNewContext(script, {
    React:{useRef:(current: unknown) => ({current})},
    window:{SparkleLiveLineup:runtime},
  })
}

describe.each(['homepage', 'join', 'trade'] as const)('%s lineup tenant context', page => {
  it('uses the server bootstrap custom-domain identity on a clean child URL', () => {
    const {request} = pagePoll(page, `https://synthetic.example/${page}`, {targeted:true, repId:'synthetic.example'})
    expect(new URL(request().url).pathname).toBe('/api/amethyst/live-lineup')
    expect(resolveAmethystRequestTarget(request())).toMatchObject({repId:'synthetic.example', publicSiteSlug:null, source:'query-rep-id', targeted:true})
  })
  it('preserves a platform slug supplied by the server bootstrap', () => {
    const {request} = pagePoll(page, `https://www.yoursparklesuite.com/syntheticrep/${page}`, {targeted:true, publicSiteSlug:'syntheticrep'})
    expect(resolveAmethystRequestTarget(request())).toMatchObject({publicSiteSlug:'syntheticrep', source:'query-public-site-slug', targeted:true})
  })
  it('replaces hostile identity parameters with server identity while preserving harmless parameters', () => {
    const {url, request} = pagePoll(page,
      `https://synthetic.example/${page}?c=attacker&repId=other&publicSiteSlug=attacker&view=compact&view=wide`,
      {targeted:true, repId:'rep-synthetic', publicSiteSlug:'syntheticrep'})
    expect(url.searchParams.get('c')).toBe('rep-synthetic')
    expect(url.searchParams.has('repId')).toBe(false)
    expect(url.searchParams.get('publicSiteSlug')).toBe('syntheticrep')
    expect(url.searchParams.getAll('view')).toEqual(['compact', 'wide'])
    expect(resolveAmethystRequestTarget(request())).toMatchObject({repId:'rep-synthetic', publicSiteSlug:'syntheticrep', source:'query-rep-id'})
  })

  it('keeps the page renderable when the shared lineup runtime is unavailable', () => {
    expect(dialogHook(page)).toEqual({current:null})
  })

  it('keeps using the shared accessible dialog behavior when the runtime is available', () => {
    const useDialog = vi.fn(() => ({current:'shared-dialog'}))
    expect(dialogHook(page, {useDialog})).toEqual({current:'shared-dialog'})
    expect(useDialog).toHaveBeenCalledOnce()
  })
})

describe.each(['join', 'trade'] as const)('%s lineup provider targeting', page => {
  it('does not start a source lookup on an untargeted sample page', () => {
    expect(providerStart(page, `https://www.yoursparklesuite.com/amethyst/${page}.html`, {targeted:false})).not.toHaveBeenCalled()
  })

  it('uses the guarded context URL in the actual provider', () => {
    const pageUrl = `https://synthetic.example/${page}?c=attacker&view=compact`
    const context = {targeted:true, repId:'synthetic.example'}
    const start = providerStart(page, pageUrl, context)
    expect(start).toHaveBeenCalledWith(expect.objectContaining({url:pagePoll(page, pageUrl, context).url.pathname + pagePoll(page, pageUrl, context).url.search}))
  })
})
