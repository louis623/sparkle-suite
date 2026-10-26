import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import sharp from 'sharp'

it('lossless Neon web delivery preserves every visible pixel and alpha value', async () => {
  for(const tone of ['pink','gold','violet']){
    const root=`public/amethyst/skins/neon-butterfly/kelly-sign-${tone}`
    const source=await sharp(root+'.png').ensureAlpha().raw().toBuffer()
    const delivery=await sharp(root+'.webp').ensureAlpha().raw().toBuffer()
    expect(delivery.length).toBe(source.length)
    for(let i=0;i<source.length;i+=4){
      // Encoders may normalize invisible RGB values under fully transparent pixels.
      if(source[i+3]===0){source[i]=source[i+1]=source[i+2]=0;delivery[i]=delivery[i+1]=delivery[i+2]=0}
    }
    expect(delivery.equals(source)).toBe(true)
    expect(readFileSync(root+'.webp').length).toBeLessThan(readFileSync(root+'.png').length)
  }
})
