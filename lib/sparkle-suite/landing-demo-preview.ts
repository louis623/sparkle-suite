import { buildSkinPreviewDocument, SKIN_PREVIEW_SKINS, type SkinPreviewSkin } from '@/lib/amethyst/skin-preview'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import type { LandingDemo } from './landing-demo-model'

export async function landingPreviewDocument(demo: LandingDemo, theme: AmethystAppearancePresetId, origin: string) {
  const data = {
    ...defaultAmethystHomepageTemplateData,
    businessName: demo.businessName, repName: '', teamName: '',
    heroEyebrow: '', heroHeadline: demo.headline || defaultAmethystHomepageTemplateData.heroHeadline,
    heroSub: demo.subtitle, tickerTopText: demo.ticker,
    aboutParagraphs: ['', '', ''] as [string, string, string],
    streamLinks: {shop:'#preview-action',watch:'#preview-action',tiktok:'#preview-action',facebook:'#preview-action'}, socialLinks: [], heroMotion: 'still' as const,
  }
  const bootstrap = buildAmethystHomepageBootstrapScript({...data, liveQueueState:'empty', liveQueueEntries:[], tradeBoardTickerItems:[]}, [], theme, { targeted: true }) + `
    Object.assign(window.HOMEPAGE_TWEAK_DEFAULTS, {showSlots:false,showNicNac:false,showSignup:false,showAbout:false,showWibp:false,showFooter:false,showEvents:false,sparkleLevel:'none',heroMotion:'still'});
    window.AMETHYST_HOMEPAGE_EVENTS=[];
    window.AMETHYST_HOMEPAGE_TEMPLATE_DATA.liveQueueEntries=[];
  `
  // All themes share Homepage.html. The supported sample key chooses only the
  // asset allowlist; the exact saved/requested theme is supplied by bootstrap.
  const assetKey = SKIN_PREVIEW_SKINS.includes(theme as SkinPreviewSkin) ? theme as SkinPreviewSkin : 'rose_gold'
  let document = await buildSkinPreviewDocument(assetKey, 'homepage', origin, null, bootstrap)
  // Use customer rendering (no invented sample lineup), without starting polling.
  document = document.replace("return window.SparkleLiveLineup.start({ url: withCurrentSearch('/api/amethyst/live-lineup'), initial: CONTENT, onUpdate: setLineup });", 'return;')
  document = document.replace(/<title>[^<]*<\/title>/, '<title>Website preview</title>')
  document = document.replace('</head>', `<style>
    html{scrollbar-width:none}body{overflow-x:hidden}
    .hp-nicnac,.hp-signup,.tweaks-toggle,.tweaks-panel{display:none!important}
    *,*::before,*::after{animation:none!important;transition:none!important}
    @media(max-width:600px){.hp-hero{min-height:0!important;padding-top:36px!important;padding-bottom:36px!important}.hp-hero h1{font-size:44px!important;line-height:1.08!important}}
  </style></head>`)
  // The sandbox has no same-origin, forms, popups, downloads or top navigation.
  // Signal readiness only after the actual customer component has rendered.
  const ready = `<script>(function(){
    var sent=false;
    function ready(){
      document.querySelectorAll('video').forEach(function(v){v.autoplay=false;v.pause();});
      if(sent||!document.querySelector('.hp-hero'))return;
      sent=true;
      Promise.resolve(document.fonts&&document.fonts.ready).then(function(){
        document.documentElement.dataset.previewReady='true';
        parent.postMessage({type:'sparkle-landing-ready',theme:${JSON.stringify(theme)}},'*');
      });
    }
    new MutationObserver(ready).observe(document.getElementById('root'),{childList:true,subtree:true});ready();
  })();</script>`
  return document.replace('</body>', ready + '</body>')
}
