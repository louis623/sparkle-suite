/* Christmas Jewelry Workshop: one decorative video clock and a separate visitor-started music clock. */
(function christmasJewelryWorkshop() {
  if (window.sparkleChristmasJewelryWorkshopController) return;
  window.sparkleChristmasJewelryWorkshopController = true;
  const assets = '/amethyst/skins/christmas-jewelry-workshop/';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null, hydrated = !window.SPARKLE_FIRST_PAINT;
  const credit = '<details class="cjw-credit"><summary>Credits</summary>“Jingle Bells (Calm)” · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100188" target="_blank" rel="noopener">Kevin MacLeod</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · Fireplace audio by <a href="https://freesound.org/people/ceich93/sounds/263864/">ceich93</a>. Hearth footage by the National Park Service.</details><span class="cjw-status" role="status"></span>';
  function mount(hero) {
    const trade = hero.matches('.tp-hero');
    const host = hero.querySelector('.hp-hero-media,.jp-hero-media') || hero;
    let media = hero.querySelector('.cjw-media');
    const ownMedia = !media && !trade;
    if (ownMedia) {
      media = document.createElement('div'); media.className = 'cjw-media'; media.setAttribute('aria-hidden', 'true');
      media.innerHTML = '<picture style="display:contents"><source media="(max-width:640px)" srcset="'+assets+'hero-poster-phone.webp"><img class="cjw-poster" src="'+assets+'hero-poster.webp" width="1672" height="941" alt="" fetchpriority="high"></picture><video class="cjw-video" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>';
      host.prepend(media);
    }
    const video = media?.querySelector('video');
    let controls = hero.querySelector('.cjw-controls:not([inert] .cjw-controls)');
    const ownControls = !controls;
    if (!controls) {
      controls = document.createElement('div'); controls.className = 'cjw-controls'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Christmas scene controls');
      controls.innerHTML = '<div class="cjw-actions">'+(video?'<button type="button" class="cjw-toggle" data-hero-motion-toggle>Pause animation</button>':'')+'<button type="button" class="cjw-music-toggle">Play sound</button><button type="button" class="cjw-mute">Mute</button></div>'+credit;
      const danceFloor = hero.querySelector('.hp-hero-trade-board-cta,.mhf-cta-dance-floor,.bwb-cta-dance-floor,.bk-home-cta-dance-floor');
      if (danceFloor) danceFloor.after(controls);
      else (hero.querySelector('.jp-hero-card,.tp-hero-inner') || hero).append(controls);
    }
    const motion = controls.querySelector('[data-hero-motion-toggle]'), musicButton = controls.querySelector('.cjw-music-toggle'), status = controls.querySelector('.cjw-status');
    // Audio is outside React's tree and never shares the 28.5-second video timeline.
    const audio = document.createElement('audio'); audio.preload = 'none'; audio.loop = true; audio.volume = 1; audio.dataset.christmasJewelryWorkshopAudio = 'true'; document.body.append(audio);
    const connection = navigator.connection;
    const slow = connection?.saveData || ['slow-2g','2g','3g'].includes(connection?.effectiveType) || (connection?.downlink > 0 && connection.downlink < 2);
    const savedOff = () => hero.dataset.heroMotion === 'off' || ['still','none'].includes((window.HOMEPAGE_TWEAK_DEFAULTS || window.JOIN_TWEAK_DEFAULTS)?.heroMotion);
    let wanted = !reduced.matches && !slow && !savedOff(), musicWanted = false, visible = true, ready = false, disposed = false, videoPending = false, audioPending = false, videoFailed = false, audioFailed = false;
    let idle, timer;
    const listeners = [];
    function on(target, event, fn) { target?.addEventListener(event, fn); listeners.push(() => target?.removeEventListener(event, fn)); }
    if (video) { video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none'; video.poster = assets+(matchMedia('(max-width:640px)').matches?'hero-poster-phone.webp':'hero-poster.webp'); }
    const mute = controls.querySelector('.cjw-mute');
    on(mute,'click',() => { audio.muted = !audio.muted; mute.textContent = audio.muted ? 'Unmute' : 'Mute'; mute.setAttribute('aria-pressed', String(audio.muted)); });
    function label() {
      if (motion) { motion.textContent = wanted ? 'Pause animation' : 'Play animation'; motion.setAttribute('aria-pressed', String(wanted)); motion.disabled = videoFailed; }
      musicButton.textContent = musicWanted ? 'Pause sound' : 'Play sound'; musicButton.setAttribute('aria-pressed', String(musicWanted)); musicButton.disabled = audioFailed;
    }
    function update() {
      if (disposed) return;
      label();
      const animate = wanted && ready && visible && !document.hidden;
      if (video && (!animate || videoFailed)) video.pause();
      if (video && animate && !videoFailed && !videoPending && video.paused) {
        if (!video.getAttribute('src')) video.src = assets+(matchMedia('(max-width:850px)').matches?'hero-loop-phone.mp4':'hero-loop.mp4');
        videoPending = true;
        Promise.resolve(video.play()).catch(error => {
          if (disposed || error?.name === 'AbortError') return;
          wanted = false; label();
        }).finally(() => { videoPending = false; if (disposed || !wanted || !visible || document.hidden) video.pause(); });
      }
      // Pausing or looping the scene never pauses, restarts, or seeks the music.
      if (!musicWanted || document.hidden || audioFailed) audio.pause();
      else if (audio.paused && !audioPending) {
        if (!audio.getAttribute('src')) audio.src = assets+'workshop-sound.mp3';
        audioPending = true;
        Promise.resolve(audio.play()).catch(error => {
          if (disposed || error?.name === 'AbortError') return;
          musicWanted = false; status.textContent = 'Tap Play sound to try again.'; label();
        }).finally(() => { audioPending = false; if (disposed || !musicWanted || document.hidden) audio.pause(); });
      }
    }
    on(motion,'click',() => { wanted = !wanted; ready = true; update(); });
    on(musicButton,'click',() => { musicWanted = !musicWanted; status.textContent = ''; update(); });
    on(video,'playing',() => { if (!wanted || !visible || document.hidden) video.pause(); else media.setAttribute('data-cjw-has-frame','true'); });
    on(video,'error',() => { videoFailed = true; wanted = false; media.removeAttribute('data-cjw-has-frame'); status.textContent = 'Animation unavailable; showing the still scene.'; update(); });
    on(audio,'error',() => { audioFailed = true; musicWanted = false; status.textContent = 'Music unavailable.'; update(); });
    on(document,'visibilitychange',update);
    on(reduced,'change',() => { if (reduced.matches) wanted = false; update(); });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); },{threshold:.01}); observer.observe(hero);
    function queue() { if ('requestIdleCallback' in window) idle = requestIdleCallback(() => {ready=true;update();},{timeout:2500}); else timer=setTimeout(()=>{ready=true;update();},500); }
    if (document.readyState === 'complete') queue(); else on(window,'load',queue);
    update();
    return {hero,dispose() {disposed=true;observer.disconnect();listeners.forEach(remove=>remove());if(idle!==undefined)cancelIdleCallback(idle);clearTimeout(timer);video?.pause();audio.pause();audio.remove();if(ownMedia)media.remove();if(ownControls)controls.remove();}};
  }
  function sync() {
    const defaults = window.HOMEPAGE_TWEAK_DEFAULTS || window.TRADE_TWEAK_DEFAULTS || window.JOIN_TWEAK_DEFAULTS;
    const candidate = document.querySelector('.hp-hero,.jp-hero,.tp-hero,.mhf-hero,.bwb-hero,.bk-home-hero,.bkf-hero');
    const selected = candidate?.dataset.appearancePreset || defaults?.preset;
    if (selected === 'christmas_jewelry_workshop') document.documentElement.dataset.customerTheme = selected;
    const hero = selected === 'christmas_jewelry_workshop' ? candidate : null;
    if (active && active.hero !== hero) {active.dispose();active=null;}
    if (hero && !active && hydrated) active = mount(hero);
  }
  window.addEventListener('sparkle:page-hydrated',()=>{hydrated=true;sync();});
  window.addEventListener('sparkle:homepage-hydrated',()=>{hydrated=true;sync();});
  window.addEventListener('sparkle:christmas-jewelry-workshop-hydrated',()=>{hydrated=true;sync();});
  function start() {sync();new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-appearance-preset']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pagehide',()=>active?.dispose());
})();
