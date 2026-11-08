(function starlightChristmas() {
  if (window.sparkleStarlightController) return;
  window.sparkleStarlightController = true;
  const supported = ['starlight_christmas_hollow', 'macies_christmas_globe'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let hydrated = !window.SPARKLE_FIRST_PAINT;
  window.addEventListener('sparkle:homepage-hydrated', () => { hydrated = true; sync(); });
  function mount(hero, theme) {
    const globe = theme === 'macies_christmas_globe';
    const assets = '/amethyst/skins/' + theme.replaceAll('_', '-') + '/';
    hero.dataset.schActive = 'true';
    const host = hero.querySelector('.hp-hero-media') || hero;
    const own = !hero.querySelector('.sch-media');
    let media = hero.querySelector('.sch-media'), video, controls;
    const previousHidden = host.getAttribute('aria-hidden');
    host.removeAttribute('aria-hidden');
    if (own) {
      media = document.createElement('div'); media.className = 'sch-media';
      media.setAttribute('aria-hidden', 'true');
      const poster = document.createElement('img');
      poster.className = 'sch-poster'; poster.src = assets + 'hero-poster.webp';
      poster.srcset = assets + 'hero-poster-phone.webp 640w, ' + assets + 'hero-poster.webp 1280w';
      poster.sizes = '100vw'; poster.fetchPriority = 'high';
      poster.alt = ''; poster.width = 1280; poster.height = 720;
      video = document.createElement('video'); video.className = 'sch-video';
      video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
      const picture = document.createElement('picture');
      picture.style.display = 'contents';
      const phone = document.createElement('source');
      phone.media = '(max-width: 640px)'; phone.srcset = assets + 'hero-poster-phone.webp';
      picture.append(phone, poster);
      media.append(picture, video); host.prepend(media);
      controls = document.createElement('div'); controls.className = 'sch-controls';
      controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Christmas scene controls');
      for (let i = 0; i < 2; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'sch-toggle'; controls.append(b); }
      host.append(controls);
    } else {
      video = media.querySelector('video'); controls = hero.querySelector('.sch-controls');
    }
    if (!video || !controls) return { hero, dispose() {} };
    const [motion, sound] = controls.querySelectorAll('button');
    const replaced = [...hero.querySelectorAll('video')].filter(v => v !== video);
    const stopReplaced = () => replaced.forEach(v => v.pause());
    replaced.forEach(v => v.addEventListener('playing', stopReplaced));
    stopReplaced();
    const connection = navigator.connection;
    const slowConnection = () => connection?.saveData ||
      ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) ||
      (connection?.downlink > 0 && connection.downlink < 2);
    let mediaReady = false;
    let idleHandle, fallbackTimer;
    function enableMedia() { mediaReady = true; update(); }
    function queueMedia() {
      if ('requestIdleCallback' in window) idleHandle = requestIdleCallback(enableMedia, { timeout: 2500 });
      else fallbackTimer = setTimeout(enableMedia, 500);
    }
    video.poster = matchMedia('(max-width: 640px)').matches ? assets + 'hero-poster-phone.webp' : assets + 'hero-poster.webp';
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true; video.preload = 'none';
    const music = document.createElement('audio'); music.preload = 'none'; music.loop = !globe; music.volume = 0.35;
    music.setAttribute('aria-hidden', 'true'); music.dataset.starlightAudio = 'true'; document.body.append(music);
    const savedMotion = () => globe && ['still', 'none'].includes(window.HOMEPAGE_TWEAK_DEFAULTS?.heroMotion)
      ? 'off' : hero.dataset.heroMotion || (
        ['still', 'none'].includes(window.HOMEPAGE_TWEAK_DEFAULTS?.heroMotion) ? 'off' : 'on');
    let wanted = !reduced.matches && savedMotion() !== 'off' && !slowConnection();
    let visitorStartedGlobe = false;
    let musicWanted = false, visible = false, disposed = false, failed = false, pending = false, audioPending = false;
    let interrupted = false, audioInterrupted = false;
    const canChooseMotion = () => !disposed && !reduced.matches && (globe || savedMotion() !== 'off');
    const allowed = () => canChooseMotion() && (savedMotion() !== 'off' || visitorStartedGlobe);
    const shouldPlay = () => allowed() && wanted && mediaReady && visible && !document.hidden;
    const canPlaySound = () => globe ? !disposed && visible && !document.hidden : shouldPlay();
    function label() {
      motion.textContent = wanted ? 'Pause animation' : 'Play animation';
      motion.setAttribute('aria-pressed', String(wanted));
      motion.disabled = !canChooseMotion() || failed;
      sound.textContent = musicWanted ? 'Mute Christmas music' : (globe ? 'Wind up the globe' : 'Enable Christmas music');
      sound.setAttribute('aria-pressed', String(musicWanted));
      sound.disabled = !globe && !allowed();
    }
    function update() {
      if (disposed) return;
      if (!allowed()) { wanted = false; if (!globe) musicWanted = false; }
      label();
      const animate = shouldPlay();
      if (!animate) { if (pending) interrupted = true; video.pause(); }
      if (animate && !failed && !video.getAttribute('src')) video.src = assets + (matchMedia('(max-width: 850px)').matches ? 'hero-loop-phone.mp4' : 'hero-loop.mp4');
      if (animate && !failed && video.paused && !pending) {
        pending = true; interrupted = false;
        Promise.resolve(video.play()).catch(error => {
          if (error?.name === 'AbortError' && interrupted) return;
          wanted = false; label(); if (!globe) music.pause();
        }).finally(() => {
          pending = false; if (!shouldPlay()) video.pause(); else if (video.paused) update();
        });
      }
      if (!musicWanted || !canPlaySound()) { if (audioPending) audioInterrupted = true; music.pause(); }
      else if (music.paused && !audioPending) {
        if (!music.getAttribute('src')) music.src = assets + 'christmas-music-box.mp3';
        audioPending = true; audioInterrupted = false;
        Promise.resolve(music.play()).catch(error => {
          if (error?.name === 'AbortError' && audioInterrupted) return;
          musicWanted = false; label();
        }).finally(() => {
          audioPending = false; if (!canPlaySound() || !musicWanted) music.pause();
          else if (music.paused) update();
        });
      }
    }
    function toggle() {
      if (!canChooseMotion() || failed) return;
      wanted = !wanted;
      visitorStartedGlobe = globe && wanted;
      mediaReady = true;
      update();
    }
    function toggleSound() { if (globe || allowed()) { musicWanted = !musicWanted; if (musicWanted && !globe) { wanted = true; mediaReady = true; } update(); } }
    function playing() { if (shouldPlay()) media.setAttribute('data-sch-has-frame', 'true'); else video.pause(); }
    function videoError() { failed = true; media.removeAttribute('data-sch-has-frame'); wanted = false; update(); }
    function audioError() { musicWanted = false; label(); sound.textContent = 'Music unavailable'; sound.disabled = true; }
    function musicEnded() { musicWanted = false; music.currentTime = 0; label(); }
    music.addEventListener('ended', musicEnded);
    motion.addEventListener('click', toggle); sound.addEventListener('click', toggleSound);
    video.addEventListener('playing', playing); video.addEventListener('error', videoError);
    music.addEventListener('error', audioError);
    document.addEventListener('visibilitychange', update); reduced.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    observer.observe(hero); update();
    if (document.readyState === 'complete') queueMedia();
    else window.addEventListener('load', queueMedia, { once: true });
    return { hero, theme, update, dispose() {
      disposed = true;
      window.removeEventListener('load', queueMedia);
      if (idleHandle !== undefined) cancelIdleCallback(idleHandle);
      clearTimeout(fallbackTimer);
      observer.disconnect(); video.pause(); music.pause();
      document.removeEventListener('visibilitychange', update); reduced.removeEventListener('change', update);
      motion.removeEventListener('click', toggle); sound.removeEventListener('click', toggleSound);
      video.removeEventListener('playing', playing); video.removeEventListener('error', videoError);
      music.removeEventListener('ended', musicEnded); music.removeEventListener('error', audioError); music.remove();
      replaced.forEach(v => v.removeEventListener('playing', stopReplaced));
      delete hero.dataset.schActive;
      if (own) { video.removeAttribute('src'); video.load(); media.remove(); controls.remove(); }
      if (previousHidden !== null) host.setAttribute('aria-hidden', previousHidden);
    }};
  }
  function sync(records) {
    const defaults = window.HOMEPAGE_TWEAK_DEFAULTS || window.TRADE_TWEAK_DEFAULTS || window.JOIN_TWEAK_DEFAULTS;
    const candidate = document.querySelector('.hp-hero[data-appearance-preset], .mhf-hero, .bwb-hero, .bk-home-hero, .bkf-hero');
    const selected = candidate?.getAttribute('data-appearance-preset') || defaults?.preset;
    if (supported.includes(selected)) document.documentElement.dataset.customerTheme = selected;
    else if (supported.includes(document.documentElement.dataset.customerTheme)) delete document.documentElement.dataset.customerTheme;
    const hero = supported.includes(selected) ? candidate : null;
    if (active && (active.hero !== hero || active.theme !== selected)) { active.dispose(); active = null; }
    const waitingForHydration = hero && !hero.querySelector('.sch-media') &&
      document.getElementById('root')?.dataset.serverRendered === 'true' && !hydrated;
    if (hero && !active && !waitingForHydration) active = mount(hero, selected);
    if (active && records?.some(r => r.target === hero && r.attributeName === 'data-hero-motion')) active.update();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-appearance-preset', 'data-hero-motion'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
