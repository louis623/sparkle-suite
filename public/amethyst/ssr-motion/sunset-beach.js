(function sunsetBeach() {
  const assets = '/amethyst/skins/sunset-beach/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null, paintFrame = 0;
  const observed = new WeakSet();
  const resize = new ResizeObserver(schedulePaint);
  function schedulePaint() {
    if (paintFrame || !document.body.classList.contains('bg-sunset-beach')) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = 0;
      document.querySelectorAll('.hp-event-card').forEach(card => {
        const meta = card.querySelector('.hp-event-meta');
        if (!meta) return;
        const height = Math.ceil(meta.getBoundingClientRect().bottom - card.getBoundingClientRect().top + 7);
        if (height > 0) card.style.setProperty('--sunset-band-height', height + 'px');
        [card, meta, card.querySelector('.hp-event-name')].filter(Boolean).forEach(el => {
          if (!observed.has(el)) { observed.add(el); resize.observe(el); }
        });
      });
    });
  }
  function mount(hero) {
    const layer = document.createElement('div');
    layer.className = 'beach-motion-layer'; layer.setAttribute('aria-hidden', 'true');
    const video = document.createElement('video');
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
    video.preload = 'none'; video.volume = .35; video.tabIndex = -1; video.poster = assets + 'hero-poster.webp';
    layer.append(video); hero.querySelector('.hp-hero-media').append(layer);
    const controls = document.createElement('div'); controls.className = 'beach-motion-controls';
    const motion = document.createElement('button'), sound = document.createElement('button');
    motion.type = sound.type = 'button'; controls.append(motion, sound); hero.append(controls);
    let wanted = !reduced.matches, visible = false, failed = false, disposed = false, pending = false;
    const allowed = () => !disposed && !failed && hero.dataset.heroMotion !== 'off';
    const shouldPlay = () => allowed() && wanted && visible && !document.hidden;
    function labels() {
      if (disposed) return;
      const playing = shouldPlay() && !video.paused;
      controls.hidden = hero.dataset.heroMotion === 'off';
      motion.textContent = failed ? 'Still image' : playing ? 'Pause animation' : 'Play animation';
      motion.setAttribute('aria-pressed', String(playing)); motion.disabled = failed;
      sound.textContent = video.muted ? 'Enable wave sound' : 'Mute wave sound';
      sound.setAttribute('aria-pressed', String(!video.muted)); sound.hidden = failed;
    }
    function release() {
      video.pause(); layer.dataset.playing = 'false';
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
    }
    async function sync() {
      if (disposed) return;
      if (!allowed()) { release(); labels(); return; }
      if (!shouldPlay()) { video.pause(); labels(); return; }
      if (!video.hasAttribute('src')) video.src = assets + 'hero-loop.mp4';
      if (pending || !video.paused) { labels(); return; }
      pending = true;
      try { await video.play(); }
      catch (error) {
        if (disposed) return;
        if (error?.name === 'NotAllowedError' && !video.muted) {
          video.muted = true;
          try { if (shouldPlay()) await video.play(); } catch { wanted = false; }
        } else if (error?.name !== 'AbortError') wanted = false;
      } finally { pending = false; }
      if (!shouldPlay()) video.pause();
      labels();
    }
    function toggle() { wanted = !wanted; sync(); }
    function toggleSound() { video.muted = !video.muted; if (!video.muted) wanted = true; sync(); labels(); }
    function playing() { if (!shouldPlay()) video.pause(); else layer.dataset.playing = 'true'; labels(); }
    function error() { if (!video.hasAttribute('src') || disposed) return; failed = true; sync(); }
    function preference() { wanted = !reduced.matches; if (!wanted) release(); sync(); }
    motion.addEventListener('click', toggle); sound.addEventListener('click', toggleSound);
    video.addEventListener('playing', playing); video.addEventListener('pause', labels); video.addEventListener('error', error);
    document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', preference);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .05 });
    intersection.observe(hero); labels();
    return { hero, sync, dispose() {
      disposed = true; release(); intersection.disconnect();
      document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', preference);
      motion.removeEventListener('click', toggle); sound.removeEventListener('click', toggleSound);
      video.removeEventListener('playing', playing); video.removeEventListener('pause', labels); video.removeEventListener('error', error);
      controls.remove(); layer.remove();
    } };
  }
  function sync(records) {
    const hero = document.body.classList.contains('bg-sunset-beach')
      ? document.querySelector('.hp-hero:not([data-ssr-hero])[data-appearance-preset="sunset_beach"]') : null;
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
    if (active && records?.some(record => record.target === hero && record.attributeName === 'data-hero-motion')) active.sync();
    schedulePaint();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class','data-hero-motion','data-appearance-preset'] });
    document.fonts.ready.then(schedulePaint);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
