// Runs immediately after the server tree, before deferred React hydration.
// The same DOM controller keeps early visitor intent through hydration and late data.
export const earlyHomepageControls = String.raw`(function(){
var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function start(){document.querySelectorAll('[data-ssr-hero]').forEach(function(hero){
 if(hero.dataset.motionBound)return;hero.dataset.motionBound='true';
 var button=hero.querySelector('[data-hero-motion-toggle]'),sound=hero.querySelector('[data-hero-sound-toggle]'),video=hero.querySelector('[data-hero-video]');
 if(!button)return;
 if(hero.dataset.ssrSurface==='utility'){var fx=document.querySelector('[data-hero-fx]');button.hidden=!hero.querySelector('.gg-scene,.nb-scene,.hpw-scene')&&(!fx||getComputedStyle(fx).display==='none')}
 var wanted=!reduced.matches,muted=true,pending=false;
 function labels(){button.textContent=wanted?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(wanted));hero.dataset.visitorPaused=String(!wanted);document.querySelectorAll('[data-hero-fx]').forEach(function(fx){fx.dataset.visitorPaused=String(!wanted)});if(sound){sound.textContent=(muted?'Enable ':'Mute ')+sound.dataset.heroSoundToggle;sound.setAttribute('aria-pressed',String(!muted))}}
 function update(){labels();if(!video)return;video.autoplay=wanted;if(!wanted){video.pause();var media=hero.querySelector('[data-hero-media]');if(media)media.removeAttribute(media.dataset.heroMedia);return}video.muted=muted;video.defaultMuted=true;if(pending||!video.paused)return;pending=true;Promise.resolve(video.play()).then(function(){if(!wanted)video.pause()}).catch(function(error){if(!muted&&error.name==='NotAllowedError'){muted=true;video.muted=true;labels()}}).finally(function(){pending=false})}
 button.addEventListener('click',function(event){event.preventDefault();wanted=!wanted;update()});
 if(sound)sound.addEventListener('click',function(){muted=!muted;update()});
 reduced.addEventListener('change',function(){wanted=!reduced.matches;update()});
 if(video){video.muted=true;video.defaultMuted=true;video.loop=true;video.addEventListener('playing',function(){if(!wanted){video.pause();return}var media=hero.querySelector('[data-hero-media]');if(media)media.setAttribute(media.dataset.heroMedia,'true')});video.addEventListener('canplay',update)}
 update();
})}
window.sparkleStartHeroMotion=start;start();
})();`


// The bespoke SSR aurora hero has an accessible visitor Pause/Play control. Do not emit
// native autoplay before the browser's media preference is known. This runs
// synchronously after its server tree, before deferred React hydration.
export const earlyMileHighFizzControls = String.raw`(function(){
var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function start(){document.querySelectorAll('body.mile-high-fizz .mhf-hero').forEach(function(hero){
 var video=hero.querySelector('.mhf-hero-video'),button=hero.querySelector('[data-mhf-video-toggle]');if(!video||!button)return;
 if(hero.dataset.mhfMotionBound)return;hero.dataset.mhfMotionBound='true';
 video.muted=true;video.defaultMuted=true;video.loop=true;
 var wanted=hero.dataset.heroMotion!=='off'&&!reduced.matches;
 function label(){var text=wanted?'Pause background video':'Play background video';button.textContent=text;button.setAttribute('aria-label',text)}
 function update(){label();video.autoplay=wanted;if(!wanted){video.pause();return}Promise.resolve(video.play()).then(function(){if(!wanted)video.pause()}).catch(function(){wanted=false;label()})}
 button.addEventListener('click',function(){wanted=!wanted;update()});
 reduced.addEventListener('change',function(){wanted=hero.dataset.heroMotion!=='off'&&!reduced.matches;update()});
 update();
})}
window.sparkleStartMileHighFizzHero=start;
start();
})();`
