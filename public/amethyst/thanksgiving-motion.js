(function thanksgivingMotion() {
  const themes = { gobble_and_fizz: 'gobble-and-fizz', pie_please: 'pie-please' };
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let active=null;
  function mount(hero){
    const theme=themes[hero.dataset.appearancePreset];
    const assets='/amethyst/skins/'+theme+'/';
    const revision=theme==='pie-please'?'-v4':'';
    const host=hero.querySelector('.hp-hero-media');if(!host)return null;
    const previousHidden=host.getAttribute('aria-hidden');host.removeAttribute('aria-hidden');
    const media=document.createElement('div');media.className='tg-media';media.setAttribute('aria-hidden','true');
    const poster=document.createElement('img');poster.className='tg-poster';if(globalThis.sparkleHeroPoster)globalThis.sparkleHeroPoster(poster,assets+'hero-poster'+revision+'.webp');else poster.src=assets+'hero-poster'+revision+'.webp';poster.alt='';
    const video=document.createElement('video');video.className='tg-video';video.muted=true;video.playsInline=true;video.loop=true;video.preload='none';video.tabIndex=-1;video.setAttribute('aria-hidden','true');
    media.append(poster,video);host.prepend(media);
    const control=document.createElement('button');control.type='button';control.className='tg-toggle';host.append(control);
    let wanted=true,visible=false,disposed=false,failed=false,pending=false,interrupted=false;
    const allowed=()=>!disposed&&!failed&&!reduced.matches&&hero.dataset.heroMotion!=='off';
    const shouldPlay=()=>allowed()&&wanted&&visible&&!document.hidden;
    function pause(){if(pending)interrupted=true;video.pause();}
    function release(){pause();media.removeAttribute('data-has-frame');if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}}
    function update(){
      if(disposed)return;
      control.hidden=!allowed();control.textContent=wanted?'Pause animation':'Play animation';control.setAttribute('aria-pressed',String(allowed()&&wanted));
      if(!allowed()){release();return;}if(!shouldPlay()){pause();return;}
      if(!video.hasAttribute('src'))video.src=assets+'hero-loop'+revision+'.mp4';
      if(pending||!video.paused)return;pending=true;interrupted=false;
      let playback;try{playback=video.play();}catch{pending=false;wanted=false;update();return;}
      Promise.resolve(playback).then(()=>{pending=false;if(!shouldPlay())pause();else if(video.paused)update();}).catch(error=>{
        pending=false;if(disposed)return;if(error?.name!=='AbortError'||!interrupted)wanted=false;update();
      });
    }
    function playing(){if(!shouldPlay()){pause();return;}media.setAttribute('data-has-frame','true');}
    function error(){if(video.hasAttribute('src')&&!disposed){failed=true;update();}}
    function toggle(){if(allowed()){wanted=!wanted;update();}}
    video.addEventListener('playing',playing);video.addEventListener('error',error);control.addEventListener('click',toggle);
    reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.01});observer.observe(host);update();
    return {hero,theme,update,dispose(){disposed=true;release();observer.disconnect();reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);video.removeEventListener('playing',playing);video.removeEventListener('error',error);control.removeEventListener('click',toggle);media.remove();control.remove();if(previousHidden!==null)host.setAttribute('aria-hidden',previousHidden);}};
  }
  function sync(records){const candidate=document.querySelector('.hp-hero');const hero=candidate&&themes[candidate.dataset.appearancePreset]&&document.body.classList.contains('bg-'+themes[candidate.dataset.appearancePreset])?candidate:null;if(active&&(active.hero!==hero||active.theme!==themes[hero?.dataset.appearancePreset])){active.dispose();active=null;}if(hero&&!active)active=mount(hero);if(active&&records?.some(r=>r.target===hero&&r.attributeName==='data-hero-motion'))active.update();}
  function start(){sync();new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-appearance-preset','data-hero-motion']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
