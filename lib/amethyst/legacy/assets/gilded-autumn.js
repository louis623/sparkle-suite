(function gildedAutumnMotion() {
  const assets = '/amethyst/skins/gilded-autumn/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null;
  function mount(hero) {
    const media = document.createElement('div');
    media.className = 'ga-art'; media.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img');
    poster.src = assets + 'hero-poster.webp'; poster.alt = ''; poster.width = 1204; poster.height = 764;
    const video = document.createElement('video');
    video.className = 'ga-video'; video.muted = true; video.playsInline = true; video.loop = true;
    video.preload = 'none'; video.tabIndex = -1; video.setAttribute('aria-hidden', 'true');
    media.append(poster, video); hero.prepend(media);
    const control = document.createElement('button');
    control.type = 'button'; control.className = 'ga-motion-control'; media.after(control);
    let wanted = !reduced.matches && hero.dataset.heroMotion !== 'off';
    let visible = false, disposed = false, failed = false, playPending = false;
    function update() {
      if (disposed) return;
      control.textContent = wanted ? 'Pause animation' : 'Play animation';
      control.setAttribute('aria-pressed', String(wanted)); control.hidden = failed;
      if (!wanted || document.hidden || !visible || failed) { video.pause(); return; }
      if (!video.hasAttribute('src')) video.src = assets + 'hero-motion.mp4';
      if (playPending || !video.paused) return;
      playPending = true;
      video.play().then(() => {
        playPending = false;
        if (disposed || !wanted || document.hidden || !visible || failed) video.pause();
      }).catch(error => {
        playPending = false;
        if (disposed) return;
        if (error.name !== 'AbortError') wanted = false;
        // Visibility may have returned while the interrupted request was pending.
        update();
      });
    }
    video.addEventListener('playing', () => { if (!disposed) media.setAttribute('data-playing', 'true'); });
    video.addEventListener('error', () => {
      if (!video.hasAttribute('src')) return;
      failed = true; media.removeAttribute('data-playing'); update();
    });
    control.addEventListener('click', () => { wanted = !wanted; update(); });
    const preferenceChanged = () => {
      wanted = !reduced.matches && hero.dataset.heroMotion !== 'off';
      if (!wanted) media.removeAttribute('data-playing'); update();
    };
    reduced.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', update);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, {threshold:0.01});
    intersection.observe(hero); update();
    return {hero, preferenceChanged, dispose() {
      disposed = true; video.pause(); intersection.disconnect();
      reduced.removeEventListener('change', preferenceChanged); document.removeEventListener('visibilitychange', update);
      video.removeAttribute('src'); video.load(); media.remove(); control.remove();
    }};
  }
  function sync(records) {
    const hero = document.body?.classList.contains('bg-gilded-autumn')
      ? document.querySelector('.hp-hero, .mhf-hero, .bwb-hero, .bk-home-hero') : null;
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
    if (active && records?.some(record => record.target === hero && record.attributeName === 'data-hero-motion')) active.preferenceChanged();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','data-hero-motion']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
