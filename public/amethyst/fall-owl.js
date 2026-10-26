(function fallOwlMotion() {
  const assets = '/amethyst/skins/fall-owl/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null;
  function mount(hero) {
    const host = hero.querySelector?.('.hp-hero-media') || hero;
    const hostHidden = host.getAttribute('aria-hidden');
    host.removeAttribute('aria-hidden');
    const media = document.createElement('div');
    media.className = 'fow-media'; media.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img');
    poster.className = 'fow-poster'; if (window.sparkleHeroPoster) window.sparkleHeroPoster(poster, assets + 'hero-poster.webp'); else poster.src = assets + 'hero-poster.webp';
    poster.alt = ''; poster.width = 1280; poster.height = 720;
    const video = document.createElement('video');
    video.className = 'fow-video'; video.muted = false; video.playsInline = true; video.loop = true;
    video.preload = 'none'; video.tabIndex = -1; video.setAttribute('aria-hidden', 'true');
    media.append(poster, video); host.prepend(media);
    const controls = document.createElement('div'); controls.className = 'fow-controls';
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Autumn scene controls');
    const control = document.createElement('button'); control.type = 'button'; control.className = 'fow-toggle';
    const sound = document.createElement('button'); sound.type = 'button'; sound.className = 'fow-toggle';
    controls.append(control, sound); host.append(controls);
    let wanted = true, muted = false, visible = false, disposed = false, failed = false;
    let pending = false, interrupted = false;
    let cancelAudioRetry = () => {};
    const allowed = () => !disposed && !failed && !reduced.matches && hero.dataset.heroMotion !== 'off';
    const shouldPlay = () => allowed() && wanted && visible && !document.hidden;
    function pause() {
      if (pending) interrupted = true;
      video.pause(); media.removeAttribute('data-fow-playing');
    }
    function release() {
      pause(); media.removeAttribute('data-fow-has-frame');
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
    }
    function update() {
      if (disposed) return;
      control.hidden = sound.hidden = !allowed();
      control.textContent = wanted ? 'Pause animation' : 'Play animation';
      control.setAttribute('aria-pressed', String(allowed() && wanted));
      sound.textContent = muted ? 'Enable autumn sounds' : 'Mute autumn sounds';
      sound.setAttribute('aria-pressed', String(!muted)); video.muted = muted;
      if (!allowed()) { release(); return; }
      if (!shouldPlay()) { pause(); return; }
      if (!video.hasAttribute('src')) video.src = assets + 'hero-loop.mp4';
      if (pending || !video.paused) return;
      pending = true; interrupted = false;
      let playback;
      try { playback = video.play(); } catch { pending = false; wanted = false; update(); return; }
      Promise.resolve(playback).then(() => {
        pending = false;
        if (!shouldPlay()) pause();
        else if (video.paused) update();
      }).catch(error => {
        pending = false;
        if (disposed) return;
        // A rejected audible play falls back to muted video with an honest sound control.
        if (error?.name === 'NotAllowedError' && !muted) {
          muted = true;
          cancelAudioRetry();
          cancelAudioRetry = window.sparkleHeroAudioFallback?.(video, controls, shouldPlay, () => { muted = false; update(); }) || (() => {});
          update(); return;
        }
        if (error?.name !== 'AbortError' || !interrupted) wanted = false;
        update();
      });
    }
    function playing() {
      if (!shouldPlay()) { pause(); return; }
      media.setAttribute('data-fow-has-frame', 'true'); media.setAttribute('data-fow-playing', 'true');
    }
    function error() { if (video.hasAttribute('src') && !disposed) { failed = true; update(); } }
    function toggle() { cancelAudioRetry(); if (allowed()) { wanted = !wanted; update(); } }
    function toggleSound() { cancelAudioRetry(); if (allowed()) { muted = !muted; if (!muted) wanted = true; update(); } }
    video.addEventListener('playing', playing); video.addEventListener('error', error);
    control.addEventListener('click', toggle); sound.addEventListener('click', toggleSound);
    reduced.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    intersection.observe(hero); update();
    return { hero, preferenceChanged: update, dispose() {
      disposed = true; cancelAudioRetry(); release(); intersection.disconnect();
      reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update);
      video.removeEventListener('playing', playing); video.removeEventListener('error', error);
      control.removeEventListener('click', toggle); sound.removeEventListener('click', toggleSound);
      media.remove(); controls.remove();
      if (hostHidden !== null) host.setAttribute('aria-hidden', hostHidden);
    }};
  }
  function sync(records) {
    const hero = document.body?.classList.contains('bg-fall-owl')
      ? document.querySelector('.hp-hero[data-appearance-preset="fall_owl_harvest_moon"]') : null;
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
    if (active && records?.some(record => record.target === hero && record.attributeName === 'data-hero-motion')) active.preferenceChanged();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-hero-motion', 'data-appearance-preset'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
