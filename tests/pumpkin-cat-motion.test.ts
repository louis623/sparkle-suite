import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

class Element extends EventTarget {
  attrs = new Map<string,string>(); dataset: Record<string,string> = {}; children: Element[]=[]
  className=''; hidden=false; textContent=''; currentTime=0; paused=true; parent: Element|null=null
  classList={contains:(name:string)=>this.className.split(' ').includes(name)}
  constructor(readonly tagName:string){super()}
  setAttribute(k:string,v:string){this.attrs.set(k,v)}
  getAttribute(k:string){return this.attrs.get(k)??null}
  hasAttribute(k:string){return this.attrs.has(k)}
  removeAttribute(k:string){this.attrs.delete(k)}
  set src(v:string){this.setAttribute('src',v)}
  append(...nodes:Element[]){nodes.forEach(n=>{n.parent=this;this.children.push(n)})}
  prepend(n:Element){n.parent=this;this.children.unshift(n)}
  after(n:Element){if(this.parent){n.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n)}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
  play=vi.fn(()=>{this.paused=false;return Promise.resolve()})
  pause=vi.fn(()=>{this.paused=true})
  load=vi.fn()
}
function harness({mobile=false,reduced=false,still=false}={}){
  vi.useFakeTimers()
  const hero=new Element('section');hero.dataset.catMotion=still?'off':'on'
  const body=new Element('body');body.className='bg-halloween-pumpkin-cat'
  const doc=Object.assign(new EventTarget(),{body,hidden:false,readyState:'complete',querySelector:()=>hero,createElement:(tag:string)=>new Element(tag)})
  const desktop=Object.assign(new EventTarget(),{matches:!mobile})
  const motion=Object.assign(new EventTarget(),{matches:reduced})
  let intersection:(entries:{isIntersecting:boolean}[])=>void=()=>{}
  let mutation:(records?:{attributeName:string}[])=>void=()=>{}
  runInNewContext(readFileSync('public/amethyst/halloween-pumpkin-cat.js','utf8'),{
    document:doc, matchMedia:(q:string)=>q.includes('min-width')?desktop:motion,
    setTimeout,clearTimeout,
    IntersectionObserver:class{constructor(fn:typeof intersection){intersection=fn}observe(){}disconnect(){}},
    MutationObserver:class{constructor(fn:typeof mutation){mutation=fn}observe(){}},
  })
  const media=hero.children[0],video=media.children[1],button=hero.children.find(n=>n.tagName==='button')!
  return {hero,body,doc,desktop,motion,media,video,button,intersection,mutation}
}
afterEach(()=>vi.useRealTimers())
describe('Pumpkin and Cat motion lifecycle',()=>{
  it.each([{reduced:true},{still:true},{mobile:true,reduced:true},{mobile:true,still:true}])('does not download video for %j',options=>{
    const h=harness(options);expect(h.video.hasAttribute('src')).toBe(false);expect(h.video.play).not.toHaveBeenCalled()
  })
  it.each([false,true])('plays the approved scene, rests between cycles and supports pause/resume (mobile=%s)',mobile=>{
    const h=harness({mobile});expect(h.video.play).toHaveBeenCalledTimes(1)
    expect(h.video.getAttribute('src')).toContain('hero-desktop-motion.mp4')
    expect(h.media.children[0].children.map(n=>n.getAttribute('src'))).toEqual(['/amethyst/skins/halloween-pumpkin-cat/hero-desktop.webp'])
    expect(h.button.hidden).toBe(false)
    h.video.dispatchEvent(new Event('ended'));vi.advanceTimersByTime(3999);expect(h.video.play).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1);expect(h.video.play).toHaveBeenCalledTimes(2)
    h.button.dispatchEvent(new Event('click'));expect(h.video.paused).toBe(true);expect(h.button.textContent).toBe('Play animation')
    h.button.dispatchEvent(new Event('click'));expect(h.video.play).toHaveBeenCalledTimes(3)
  })
  it('pauses hidden/offscreen, keeps playback across sizes, and removes listeners on skin changes',()=>{
    const h=harness();h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));expect(h.video.paused).toBe(true)
    h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));h.intersection([{isIntersecting:false}]);expect(h.video.paused).toBe(true)
    h.intersection([{isIntersecting:true}]);expect(h.video.paused).toBe(false)
    h.desktop.matches=false;h.desktop.dispatchEvent(new Event('change'));expect(h.video.hasAttribute('src')).toBe(true);expect(h.button.hidden).toBe(false)
    h.body.className='homepage';h.mutation();expect(h.hero.children).toHaveLength(0)
    const plays=h.video.play.mock.calls.length;h.desktop.matches=true;h.desktop.dispatchEvent(new Event('change'));expect(h.video.play).toHaveBeenCalledTimes(plays)
  })
  it('offers a working manual Play button when autoplay is blocked on a phone',async()=>{
    const h=harness({mobile:true,still:true})
    h.video.play.mockRejectedValueOnce(Object.assign(new Error('Autoplay blocked'),{name:'NotAllowedError'}))
    h.button.dispatchEvent(new Event('click'));await Promise.resolve()
    expect(h.button.textContent).toBe('Play animation');expect(h.button.hidden).toBe(false)
    expect(h.media.hasAttribute('data-playing')).toBe(false)
    h.button.dispatchEvent(new Event('click'));await Promise.resolve()
    expect(h.video.paused).toBe(false);expect(h.button.textContent).toBe('Pause animation')
  })
  it('returns to the poster on failure and when reduced motion is enabled',()=>{
    const h=harness();h.video.dispatchEvent(new Event('playing'));expect(h.media.hasAttribute('data-playing')).toBe(true)
    h.motion.matches=true;h.motion.dispatchEvent(new Event('change'));expect(h.video.paused).toBe(true);expect(h.media.hasAttribute('data-playing')).toBe(false)
    h.video.dispatchEvent(new Event('error'));expect(h.button.hidden).toBe(true)
  })
})
