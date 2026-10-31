// Fixed scope and controls: config cannot change cases, selectors or waivers.
const pages=[['halloween_pumpkin_cat','homepage'],['fall_owl_harvest_moon','homepage'],['midnight_rose','homepage'],['rose_gold','homepage'],['pearl_rose','join'],['midnight_rose','join'],
  ...['gilded_autumn','alpine_opal'].flatMap(theme=>['homepage','join','trade'].map(page=>[theme,page]))];
const targets=[...pages,['amethyst','homepage']];
const idFor=([theme,page])=>theme+'/'+page;
const layoutFor=theme=>['gilded_autumn','alpine_opal'].includes(theme)?'mile_high_fizz':'standard';
function selectorsFor(id,renderer) {
  const [theme,page]=id.split('/');
  const nav='.hp-header-nav a[href]:not([aria-current])';
  const cta=page==='join'?'.jp-hero-card:not([data-ssr-reservation]) .hp-btn-primary':page==='trade'?'.hp-header .hp-shop-btn':layoutFor(theme)==='mile_high_fizz'?'.mhf-hero-content:not([data-ssr-reservation]) .mhf-cta-shop':'.hp-hero .hp-btn-primary';
  let motion, sound;
  if(page==='homepage') {
    if(theme==='alpine_opal') { if(renderer==='candidate')motion='[data-mhf-video-toggle]'; }
    else if(theme==='gilded_autumn')motion='.ga-motion-control';
    else if(renderer==='candidate')motion='[data-hero-motion-toggle]';
    else motion=({amethyst:'.au-controls button:first-child',fall_owl_harvest_moon:'.fow-controls button:first-child',halloween_pumpkin_cat:'.hpc-motion-control',midnight_rose:'.mdr-toggle'})[theme];
    if(['amethyst','fall_owl_harvest_moon'].includes(theme)) sound=renderer==='candidate'?'[data-hero-sound-toggle]':({amethyst:'.au-controls button:nth-child(2)',fall_owl_harvest_moon:'.fow-controls button:nth-child(2)',midnight_rose:'.mr-controls button:nth-child(2)'})[theme];
  } else if(page==='join' && layoutFor(theme)==='standard' && renderer==='candidate') motion='[data-hero-motion-toggle]';
  return {motion,sound,nav,cta};
}
function actionsFor(id,renderer) {
  const s=selectorsFor(id,renderer);
  return [...(s.motion?['pause','play']:[]),...(s.sound?['sound']:[]),'nav','cta'];
}
const cases={pages:targets.map(idFor),interactions:targets.map(idFor),actions:actionsFor};
module.exports={pages,targets,idFor,layoutFor,selectorsFor,actionsFor,cases};
