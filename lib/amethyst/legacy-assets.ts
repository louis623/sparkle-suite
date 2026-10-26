import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import manifest from './legacy/manifest.json'

type AssetRecord={source:string;sha256:string;bytes:number;blob:string}
const files=manifest.files as Record<string,AssetRecord>
export function legacyAssetFilePath(asset:string) {
  const record=Object.hasOwn(files,asset)?files[asset]:null
  if(!record)return null
  return record.source==='snapshot'?join(process.cwd(),'lib/amethyst/legacy/assets',asset):join(process.cwd(),'public/amethyst',asset)
}

// Keep API targets on /api/amethyst: that endpoint applies the same server
// allowlist. Only static legacy paths get their own immutable asset namespace.
export function legacyStaticAssetUrls(text:string) {
  return text.replace(/(?<!\/api)\/amethyst\/(?!render-v1\/)/g,'/amethyst/render-v1/')
}

export async function withLegacyStaticAssets(response:Response) {
  if(!/(?:text\/|image\/svg|application\/json)/.test(response.headers.get('content-type')??''))return response
  return new Response(legacyStaticAssetUrls(await response.text()),{status:response.status,headers:response.headers})
}

export async function legacyStaticAssetResponse(asset:string[],request?:Request) {
  const name=asset.join('/'),file=legacyAssetFilePath(name)
  if(!file)return new Response('Not found',{status:404})
  const types:Record<string,string>={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',jsx:'text/javascript; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',json:'application/json',md:'text/markdown; charset=utf-8'}
  try {
    // Keep each runtime read statically scoped for Next's file tracer. Passing
    // an opaque helper result can otherwise include the entire repository.
    const body=files[name].source==='snapshot'
      ? await readFile(join(process.cwd(),'lib/amethyst/legacy/assets',name))
      : await readFile(join(process.cwd(),'public/amethyst',name))
    const headers:Record<string,string>={'Content-Type':types[name.split('.').at(-1)!]??'application/octet-stream','Cache-Control':'public, max-age=0, must-revalidate'}
    if(name.endsWith('.mp4')){
      headers['Accept-Ranges']='bytes'
      const range=request?.headers.get('range')
      if(range){
        const match=range.match(/^bytes=(\d*)-(\d*)$/)
        const start=match?.[1]?Number(match[1]):match?.[2]?Math.max(0,body.length-Number(match[2])):NaN
        const end=match?.[1]&&match[2]?Math.min(Number(match[2]),body.length-1):body.length-1
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=body.length)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${body.length}`}})
        return new Response(new Uint8Array(body.subarray(start,end+1)),{status:206,headers:{...headers,'Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${body.length}`}})
      }
      headers['Content-Length']=String(body.length)
    }
    const response=new Response(new Uint8Array(body),{headers})
    return withLegacyStaticAssets(response)
  }catch{return new Response('Not found',{status:404})}
}
