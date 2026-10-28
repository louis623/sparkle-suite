(function midnightRoseMotion() {
  const assets = '/amethyst/skins/midnight-rose/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null;

  function mount(hero) {
    const media = document.createElement('div');
    media.className = 'mdr-media'; media.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img');
    poster.className = 'mdr-poster'; poster.src = assets + 'hero-poster.webp';
    poster.alt = ''; poster.width = 1280; poster.height = 720;
    const video = document.createElement('video');
    video.className = 'mdr-video'; video.muted = true; video.playsInline = true; video.loop = true;
    video.preload = 'none'; video.tabIndex = -1; video.setAttribute('aria-hidden', 'true');
    media.append(poster, video); hero.prepend(media);
    const control = document.createElement('button');
    control.type = 'button'; control.className = 'mdr-toggle'; media.after(control);
    let wanted = true, visible = false, disposed = false, failed = false;
    let pending = false, interrupted = false;
    const allowed = () => !disposed && !failed && !reduced.matches && hero.dataset.heroMotion !== 'off';
    const shouldPlay = () => allowed() && wanted && visible && !document.hidden;
    function pause() {
      if (pending) interrupted = true;
      video.pause(); media.removeAttribute('data-mdr-playing');
    }
    function release() {
      pause(); media.removeAttribute('data-mdr-has-frame');
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
    }
    function update() {
      if (disposed) return;
      control.hidden = !allowed();
      control.textContent = wanted ? 'Pause animation' : 'Play animation';
      control.setAttribute('aria-pressed', String(allowed() && wanted));
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
        // Retry only a play canceled by our own visibility/preference pause.
        // Unexplained failures leave manual Play instead of an autoplay loop.
        if (error?.name !== 'AbortError' || !interrupted) wanted = false;
        update();
      });
    }
    function playing() {
      if (!shouldPlay()) { pause(); return; }
      media.setAttribute('data-mdr-has-frame', 'true'); media.setAttribute('data-mdr-playing', 'true');
    }
    function error() {
      if (!video.hasAttribute('src') || disposed) return;
      failed = true; update();
    }
    function toggle() { if (!allowed()) return; wanted = !wanted; update(); }
    video.addEventListener('playing', playing); video.addEventListener('error', error);
    control.addEventListener('click', toggle);
    reduced.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    intersection.observe(hero); update();
    return { hero, preferenceChanged: update, dispose() {
      disposed = true; release(); intersection.disconnect();
      reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update);
      video.removeEventListener('playing', playing); video.removeEventListener('error', error); control.removeEventListener('click', toggle);
      media.remove(); control.remove();
    }};
  }
  function sync(records) {
    const hero = document.body?.classList.contains('bg-midnight-rose')
      ? document.querySelector('.hp-hero[data-appearance-preset="midnight_rose"]') : null;
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
