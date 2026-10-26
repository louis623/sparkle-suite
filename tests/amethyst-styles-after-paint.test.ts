import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import { inlineHomepageStyles } from '@/lib/amethyst/homepage-theme-assets'

it('does not fetch full styles until hero paint, then applies them together', async () => {
 const html=await inlineHomepageStyles('<head><link rel="stylesheet" href="/amethyst/homepage.css"/><link rel="stylesheet" href="/amethyst/components.css"/></head>')
 const script=html.match(/<script>\(function\(\)\{var remaining=[\s\S]*?<\/script>/)?.[0].slice(8,-9)
 expect(script).toBeTruthy()
 const links=[{media:'print',href:undefined as string|undefined,getAttribute:()=>'/one.css'},{media:'print',href:undefined as string|undefined,getAttribute:()=>'/two.css'}]
 let afterPaint:()=>void=()=>{}
 const window={sparkleAfterHeroPaint:(fn:()=>void)=>{afterPaint=fn},sparkleHomepageStylesLoaded:()=>{}}
 runInNewContext(script!,{window,document:{querySelectorAll:()=>links}})
 expect(links.every(link=>link.href===undefined)).toBe(true)
 afterPaint()
 expect(links.map(link=>link.href)).toEqual(['/one.css','/two.css'])
 window.sparkleHomepageStylesLoaded()
 expect(links.map(link=>link.media)).toEqual(['print','print'])
 window.sparkleHomepageStylesLoaded()
 expect(links.map(link=>link.media)).toEqual(['all','all'])
 const active=html.replace(/<noscript>[\s\S]*?<\/noscript>/g,'')
 expect(active).not.toMatch(/<link rel="stylesheet" href=/)
 expect(html).toContain('<noscript><link rel="stylesheet" href=')
})
