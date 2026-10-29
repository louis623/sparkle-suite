// Runs immediately after the server tree, before deferred React hydration.
// The same DOM controller keeps early visitor intent through hydration and late data.
export const earlyHomepageControls = String.raw`(function(){
function start(){document.querySelectorAll('[data-ssr-hero]').forEach(function(hero){
 if(hero.dataset.motionBound)return;hero.dataset.motionBound='true';
 var button=hero.querySelector('[data-hero-motion-toggle]'),sound=hero.querySelector('[data-hero-sound-toggle]'),video=hero.querySelector('[data-hero-video]');
 if(!button)return;
 if(hero.dataset.ssrSurface==='utility'){var fx=document.querySelector('[data-hero-fx]');button.hidden=!hero.querySelector('.gg-scene,.nb-scene,.hpw-scene')&&(!fx||getComputedStyle(fx).display==='none')}
 var wanted=true,muted=true,pending=false;
 function labels(){button.textContent=wanted?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(wanted));hero.dataset.visitorPaused=String(!wanted);document.querySelectorAll('[data-hero-fx]').forEach(function(fx){fx.dataset.visitorPaused=String(!wanted)});if(sound){sound.textContent=(muted?'Enable ':'Mute ')+sound.dataset.heroSoundToggle;sound.setAttribute('aria-pressed',String(!muted))}}
 function update(){labels();if(!video)return;if(!wanted){video.pause();return}video.muted=muted;video.defaultMuted=true;if(pending||!video.paused)return;pending=true;Promise.resolve(video.play()).catch(function(error){if(!muted&&error.name==='NotAllowedError'){muted=true;video.muted=true;labels()}}).finally(function(){pending=false})}
 button.addEventListener('click',function(event){event.preventDefault();wanted=!wanted;update()});
 if(sound)sound.addEventListener('click',function(){muted=!muted;update()});
 if(video){video.muted=true;video.defaultMuted=true;video.loop=true;video.addEventListener('playing',function(){var media=hero.querySelector('[data-hero-media]');if(media)media.setAttribute(media.dataset.heroMedia,'true')});video.addEventListener('canplay',update)}
 update();
})}
window.sparkleStartHeroMotion=start;start();
})();`
