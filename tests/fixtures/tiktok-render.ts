import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

export function extractTikTokFunction(source: string, name: string) {
  const start = source.indexOf(`function ${name}(`)
  if (start < 0) return ''
  const next = source.slice(start + 1).search(/\nfunction [A-Za-z]/)
  return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next)
}
export function renderTikTokCard(source: string, content: Record<string, unknown>, component = 'CustomerVideoCard', props: Record<string, unknown> = {}) {
  const names = ['getTikTokIdFromUrl','tiktokCanonicalHref','isTikTokCardUrl','getSlotVideoPresentation','TikTokLinkCard','HostedVideo','getTikTokVideoId','getYouTubeVideoId','getCustomerVideoSourceUrl','isCustomerVideoHost','getCustomerVideoProvider','getThemeSampleVideoPath','getCustomerVideoPresentation','CustomerMediaIcon','CustomerMediaCard','CustomerVideoCard','getInstagramEmbedUrl','getFacebookVideoEmbedUrl','TikTokEmbed','CustomerVideoEmbed','SocialLogo','mediaEmptyPrompt','BrittWithBlingRevealExplainer','BrittWithBlingFeaturedReveal']
  const code = transformSync(names.map(name => extractTikTokFunction(source,name)).join('\n'),{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code
  const context = {React,CONTENT:content,RUNTIME_CONTEXT:{targeted:true},useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,URL,props,
    window:{HOMEPAGE_TWEAK_DEFAULTS:{}},linkProps:(href: string) => ({href})}
  const player = readFileSync('public/amethyst/hosted-video.js','utf8')
  const element = runInNewContext(`${player}\n${code}\nReact.createElement(${component},props)`,context)
  return renderToStaticMarkup(element)
}
