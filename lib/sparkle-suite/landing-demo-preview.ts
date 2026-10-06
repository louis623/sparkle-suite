import { buildSkinPreviewDocument, GNOME_PREVIEW_LINEUP, SKIN_PREVIEW_SKINS, type SkinPreviewSkin } from '@/lib/amethyst/skin-preview'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import type { LandingDemo } from './landing-demo-model'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function landingPreviewDocument(demo: LandingDemo, theme: AmethystAppearancePresetId, origin: string, sampleLineup = false) {
  const data = {
    ...defaultAmethystHomepageTemplateData,
    businessName: demo.businessName, repName: '', teamName: '',
    heroEyebrow: '', heroHeadline: demo.headline || defaultAmethystHomepageTemplateData.heroHeadline,
    heroSub: demo.subtitle, tickerTopText: demo.ticker,
    aboutParagraphs: ['', '', ''] as [string, string, string],
    streamLinks: {shop:'#preview-action',watch:'#preview-action',tiktok:'#preview-action',facebook:'#preview-action'}, socialLinks: [],
  }
  const lineup = sampleLineup ? {...GNOME_PREVIEW_LINEUP, liveQueueLastUpdated:null, liveQueueStaleAfterSeconds:86400} : {liveQueueState:'empty' as const, liveQueueEntries:[]}
  const bootstrap = buildAmethystHomepageBootstrapScript({...data, ...lineup, tradeBoardTickerItems:[]}, [], theme, { targeted: true }) + `
    Object.assign(window.HOMEPAGE_TWEAK_DEFAULTS, {showSlots:false,showNicNac:false,showSignup:false,showAbout:false,showWibp:false,showFooter:false,showEvents:false});
    window.AMETHYST_HOMEPAGE_EVENTS=[];
  `
  // All themes share Homepage.html. The supported sample key chooses only the
  // asset allowlist; the exact saved/requested theme is supplied by bootstrap.
  const assetKey = SKIN_PREVIEW_SKINS.includes(theme as SkinPreviewSkin) ? theme as SkinPreviewSkin : 'rose_gold'
  let document = await buildSkinPreviewDocument(assetKey, 'homepage', origin, null, bootstrap)
  // Opaque sandboxes cannot send the protected Smoke deployment's auth cookie.
  // Bundle repository CSS; never loosen the frame's origin or API restrictions.
  for (const match of document.matchAll(/<link rel="stylesheet" href="(?:\/amethyst\/)?([a-z0-9-]+\.css)(?:\?[^"]*)?"\s*\/>/g)) {
    const css = await readFile(join(process.cwd(), 'public', 'amethyst', match[1]), 'utf8')
    document = document.replace(match[0], '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>')
  }
  const mediaFolders: Partial<Record<AmethystAppearancePresetId, string>> = {
    amethyst:'am01-unicorn', gilded_autumn:'gilded-autumn', gnome_garden:'gnome-garden',
    halloween_pumpkin_cat:'halloween-pumpkin-cat', halloween_pumpkin_witch:'halloween-pumpkin-witch',
    midnight_rose:'midnight-rose', pearl_rose:'pearl-rose', rose_champagne:'rose-champagne', neon_butterfly:'neon-butterfly',
  }
  const folder = mediaFolders[theme]
  const assets = folder ? (await readdir(join(process.cwd(), 'public', 'amethyst', 'skins', folder)))
    .filter(name => /^[a-z0-9-]+\.(?:mp4|webm|webp|png|svg)$/.test(name)).map(name => '/amethyst/skins/' + folder + '/' + name) : []
  document = document.replace(/media-src [^;]+;/, 'media-src data:;')
  document = document.replace('</head>', '<script id="marketing-preview-assets" type="application/json">' + JSON.stringify(assets) + '</script></head>')
  // Use customer rendering (no invented sample lineup), without starting polling.
  document = document.replace("return window.SparkleLiveLineup.start({ url: withCurrentSearch('/api/amethyst/live-lineup'), initial: CONTENT, onUpdate: setLineup });", 'return;')
  document = document.replace(/<title>[^<]*<\/title>/, '<title>Website preview</title>')
  document = document.replace('</head>', `<style>
    html{scrollbar-width:none}body{overflow-x:hidden}
    .hp-nicnac,.hp-signup,.tweaks-toggle,.tweaks-panel{display:none!important}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
    html[data-marketing-paused] *,html[data-marketing-paused] *::before,html[data-marketing-paused] *::after{animation-play-state:paused!important}
    .hp-queue-modal-mask{z-index:2147483000!important}
    ${sampleLineup ? '.hp-hero{min-height:0!important;padding:36px 20px!important}.hp-hero h1{font-size:42px!important}.hp-hero .hp-hero-sub{display:none}.hp-lineup-status{display:none}' : ''}
    @media(max-width:600px){.hp-hero{min-height:0!important;padding-top:36px!important;padding-bottom:36px!important}.hp-hero h1{font-size:44px!important;line-height:1.08!important}}
  </style></head>`)
  // The sandbox has no same-origin, forms, popups, downloads or top navigation.
  // Signal readiness only after the actual customer component has rendered.
  const ready = `<script>(function(){
    var sent=false;
    function ready(){
      document.querySelectorAll('video').forEach(function(v){v.muted=true;v.defaultMuted=true;});
      if(sent||!document.querySelector('.hp-hero'))return;
      sent=true;
      Promise.resolve(document.fonts&&document.fonts.ready).then(function(){
        document.documentElement.dataset.previewReady='true';
        parent.postMessage({type:'sparkle-landing-ready',theme:${JSON.stringify(theme)}},'*');
      });
    }
    window.addEventListener('message',function(event){
      if(event.source!==parent||event.data?.type!=='sparkle-marketing-motion')return;
      var paused=event.data.paused===true||matchMedia('(prefers-reduced-motion:reduce)').matches;
      document.documentElement.toggleAttribute('data-marketing-paused',paused);
      document.querySelectorAll('video').forEach(function(v){v.muted=true;if(paused)v.pause();else v.play().catch(function(){});});
    });
    new MutationObserver(ready).observe(document.getElementById('root'),{childList:true,subtree:true});ready();
  })();</script>`
  return document.replace('</body>', ready + '</body>')
}
