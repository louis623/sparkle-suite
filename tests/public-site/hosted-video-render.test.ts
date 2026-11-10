import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import fixtures from '../fixtures/tiktok-url-cases.json'
import { renderTikTokCard } from '../fixtures/tiktok-render'

const paths = ['lib/amethyst/v2/homepage.jsx','lib/amethyst/legacy/assets/homepage.jsx','public/amethyst/homepage.jsx']
it('tiktok render: hosted, card and no-ID card in all 3 sources with the shared parser fixtures', () => {
  const blocks: string[] = []
  for (const path of paths) {
    const source = readFileSync(path,'utf8')
    const block = source.split('// tiktok-id-parser:start')[1].split('// tiktok-id-parser:end')[0]
    blocks.push(block)
    for (const fixture of fixtures) {
      const actual = runInNewContext(`${block}\n({id:getTikTokIdFromUrl(url),canonical:tiktokCanonicalHref(url),card:isTikTokCardUrl(url)})`,{URL,url:fixture.url})
      expect(actual).toEqual({id:fixture.id,canonical:fixture.canonical,card:fixture.card})
    }
    const props = {videoUrl:'https://www.tiktok.com/@user/video/12345678',title:'Reveal',variant:'short',hostedVideo:{src:'https://fixture/video.mp4',poster:'https://fixture/poster.webp',width:720,height:1280}}
    const hosted = renderTikTokCard(source,{tiktokHostedMode:true},'CustomerVideoCard',props)
    expect(hosted).toContain('<video')
    expect(hosted).toContain('playsInline=""')
    expect(hosted).toContain('muted=""')
    expect(hosted).toContain('preload="none"')
    expect(hosted).toContain('poster="https://fixture/poster.webp"')
    expect(hosted).not.toContain('<iframe')
    const pending = renderTikTokCard(source,{tiktokHostedMode:true},'CustomerVideoCard',{...props,hostedVideo:undefined})
    expect(pending).toContain('Watch on TikTok')
    expect(pending).not.toContain('<iframe')
    const noId = renderTikTokCard(source,{tiktokHostedMode:true},'CustomerVideoCard',{...props,hostedVideo:undefined,videoUrl:'https://vm.tiktok.com/ZMabcdef/'})
    expect(noId).toContain('href="https://vm.tiktok.com/ZMabcdef/"')
    expect(noId).not.toContain('coming soon')
    expect(source).toContain('getSlotVideoPresentation(slot?.href, slot?.hostedVideo, slot?.tiktokPoster).isPopulated')
  }
  expect(new Set(blocks).size).toBe(1)
})
it("tiktok render: disabled rep keeps today's output", () => {
  for (const path of paths) {
    const baseline = execFileSync('git',['show',`c19fc975:${path}`],{encoding:'utf8'})
    const source = readFileSync(path,'utf8')
    for (const videoUrl of ['https://www.tiktok.com/@user/video/12345678','https://www.youtube.com/watch?v=abcdefghijk','https://vm.tiktok.com/ZMabcdef/','#']) {
      const props = {videoUrl,title:'Reveal',variant:'short',subtitle:'Caption'}
      expect(renderTikTokCard(source,{},'CustomerVideoCard',props)).toBe(renderTikTokCard(baseline,{},'CustomerVideoCard',props))
    }
  }
})
it('tiktok artifacts: legacy manifest and page runtimes match served files', () => {
  const manifest = JSON.parse(readFileSync('lib/amethyst/legacy/manifest.json','utf8'))
  const bytes = readFileSync('lib/amethyst/legacy/assets/homepage.jsx')
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  expect(manifest.files['homepage.jsx']).toMatchObject({blob,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length})
  const runtimes = JSON.parse(readFileSync('lib/amethyst/generated/page-runtimes.json','utf8'))
  expect(runtimes['compiled/homepage.js']).toBe(readFileSync('public/amethyst/compiled/homepage.js','utf8'))
})
