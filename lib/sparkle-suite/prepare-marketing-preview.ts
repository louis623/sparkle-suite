/** Fetch only public, repository-owned media through the parent page's session.
 * The frame stays opaque and cannot fetch APIs or access the parent's account.
 */
export async function prepareMarketingPreview(url: string, signal: AbortSignal) {
  const response = await fetch(url, {signal, credentials:'same-origin'})
  if (!response.ok) throw new Error('Preview unavailable')
  let html = await response.text()
  const match = html.match(/<script id="marketing-preview-assets" type="application\/json">([^<]*)<\/script>/)
  const assets: unknown = match ? JSON.parse(match[1]) : []
  if (!Array.isArray(assets) || assets.length > 12 || assets.some(value => typeof value !== 'string' || !/^\/amethyst\/skins\/[a-z0-9-]+\/[a-z0-9-]+\.(?:mp4|webm|webp|png|svg)$/.test(value))) throw new Error('Invalid preview assets')
  const blobs: Record<string,string> = {}
  const dispose = () => Object.values(blobs).forEach(value => URL.revokeObjectURL(value))
  try {
    // Wait for every job to settle before cleanup, including failed/aborted loads.
    const results = await Promise.allSettled(assets.map(async asset => {
      const media = await fetch(asset, {signal, credentials:'same-origin', cache:'force-cache'})
      if (!media.ok) throw new Error('Preview media unavailable')
      const blob = await media.blob()
      if (signal.aborted) throw new Error('Preview canceled')
      blobs[asset] = URL.createObjectURL(blob)
    }))
    if (signal.aborted || results.some(result => result.status === 'rejected')) throw new Error('Preview media unavailable')
    // CSS uses literal paths. Customer JS also composes paths at runtime, so map
    // image/video setters before those unchanged scripts execute in this frame.
    for (const [asset, blob] of Object.entries(blobs)) html = html.replaceAll(asset, blob)
    const script = `<script>(function(){var assets=${JSON.stringify(blobs)};function resolve(value){try{return assets[new URL(value,document.baseURI).pathname]||value}catch{return value}};[[HTMLImageElement.prototype,'src'],[HTMLMediaElement.prototype,'src'],[HTMLVideoElement.prototype,'poster']].forEach(function(pair){var descriptor=Object.getOwnPropertyDescriptor(pair[0],pair[1]);Object.defineProperty(pair[0],pair[1],{configurable:true,get:descriptor.get,set:function(value){descriptor.set.call(this,resolve(value))}})});var set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){return set.call(this,name,/^(src|poster)$/.test(name)?resolve(value):value)};})();</script>`
    html = html.replace('</head>', script + '</head>')
    return {html, dispose}
  } catch(error) { dispose(); throw error }
}
