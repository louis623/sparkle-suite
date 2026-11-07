(function starlightChristmas() {
  if (window.sparkleStarlightController) return;
  window.sparkleStarlightController = true;
  const theme = 'starlight_christmas_hollow';
  const assets = '/amethyst/skins/starlight-christmas-hollow/';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let hydrated = !window.SPARKLE_FIRST_PAINT;
  window.addEventListener('sparkle:homepage-hydrated', () => { hydrated = true; sync(); });
  function mount(hero) {
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
      poster.alt = ''; poster.width = 1280; poster.height = 720;
      video = document.createElement('video'); video.className = 'sch-video';
      video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
      media.append(poster, video); host.prepend(media);
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
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true; video.preload = 'none';
    const music = document.createElement('audio'); music.preload = 'none'; music.loop = true; music.volume = 0.35;
    music.setAttribute('aria-hidden', 'true'); music.dataset.starlightAudio = 'true'; document.body.append(music);
    const savedMotion = () => hero.dataset.heroMotion || (
      ['still', 'none'].includes(window.HOMEPAGE_TWEAK_DEFAULTS?.heroMotion) ? 'off' : 'on');
    let wanted = !reduced.matches && savedMotion() !== 'off';
    let musicWanted = false, visible = false, disposed = false, failed = false, pending = false, audioPending = false;
    let interrupted = false, audioInterrupted = false;
    const allowed = () => !disposed && !reduced.matches && savedMotion() !== 'off';
    const shouldPlay = () => allowed() && wanted && visible && !document.hidden;
    function label() {
      motion.textContent = wanted ? 'Pause animation' : 'Play animation';
      motion.setAttribute('aria-pressed', String(wanted));
      motion.disabled = !allowed() || failed;
      sound.textContent = musicWanted ? 'Mute Christmas music' : 'Enable Christmas music';
      sound.setAttribute('aria-pressed', String(musicWanted));
      sound.disabled = !allowed();
    }
    function update() {
      if (disposed) return;
      if (!allowed()) { wanted = false; musicWanted = false; }
      label();
      if (!shouldPlay()) { if (pending) interrupted = true; if (audioPending) audioInterrupted = true; video.pause(); music.pause(); return; }
      if (!failed && !video.getAttribute('src')) video.src = assets + 'hero-loop.mp4';
      if (!failed && video.paused && !pending) {
        pending = true; interrupted = false;
        Promise.resolve(video.play()).catch(error => {
          if (error?.name === 'AbortError' && interrupted) return;
          wanted = false; label(); music.pause();
        }).finally(() => {
          pending = false; if (!shouldPlay()) video.pause(); else if (video.paused) update();
        });
      }
      if (!musicWanted) { if (audioPending) audioInterrupted = true; music.pause(); }
      else if (music.paused && !audioPending) {
        if (!music.getAttribute('src')) music.src = assets + 'christmas-music-box.mp3';
        audioPending = true; audioInterrupted = false;
        Promise.resolve(music.play()).catch(error => {
          if (error?.name === 'AbortError' && audioInterrupted) return;
          musicWanted = false; label();
        }).finally(() => {
          audioPending = false; if (!shouldPlay() || !musicWanted) music.pause();
          else if (music.paused) update();
        });
      }
    }
    function toggle() { if (allowed()) { wanted = !wanted; update(); } }
    function toggleSound() { if (allowed()) { musicWanted = !musicWanted; if (musicWanted) wanted = true; update(); } }
    function playing() { if (shouldPlay()) media.setAttribute('data-sch-has-frame', 'true'); else video.pause(); }
    function videoError() { failed = true; media.removeAttribute('data-sch-has-frame'); wanted = false; update(); }
    function audioError() { musicWanted = false; label(); sound.textContent = 'Music unavailable'; sound.disabled = true; }
    motion.addEventListener('click', toggle); sound.addEventListener('click', toggleSound);
    video.addEventListener('playing', playing); video.addEventListener('error', videoError);
    music.addEventListener('error', audioError);
    document.addEventListener('visibilitychange', update); reduced.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    observer.observe(hero); update();
    return { hero, update, dispose() {
      disposed = true; observer.disconnect(); video.pause(); music.pause();
      document.removeEventListener('visibilitychange', update); reduced.removeEventListener('change', update);
      motion.removeEventListener('click', toggle); sound.removeEventListener('click', toggleSound);
      video.removeEventListener('playing', playing); video.removeEventListener('error', videoError);
      music.removeEventListener('error', audioError); music.remove();
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
    if (selected === theme) document.documentElement.dataset.customerTheme = theme;
    else if (document.documentElement.dataset.customerTheme === theme) delete document.documentElement.dataset.customerTheme;
    const hero = selected === theme ? candidate : null;
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    const waitingForHydration = hero && !hero.querySelector('.sch-media') &&
      document.getElementById('root')?.dataset.serverRendered === 'true' && !hydrated;
    if (hero && !active && !waitingForHydration) active = mount(hero);
    if (active && records?.some(r => r.target === hero && r.attributeName === 'data-hero-motion')) active.update();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-appearance-preset', 'data-hero-motion'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
