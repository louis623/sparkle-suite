(function pumpkinCatMotion() {
  const ASSETS = '/amethyst/skins/halloween-pumpkin-cat/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null;
  function mount(hero) {
    const picture = document.createElement('picture');
    picture.className = 'hpc-art';
    picture.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img');
    poster.src = ASSETS + 'hero-desktop.webp';
    poster.alt = '';
    poster.width = 1672; poster.height = 941;
    picture.append(poster);
    const video = document.createElement('video');
    video.className = 'hpc-video';
    video.muted = true; video.playsInline = true; video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    // Keep the video outside picture's responsive image selection tree.
    const media = document.createElement('div');
    media.className = 'hpc-art';
    picture.className = 'hpc-poster';
    media.append(picture, video);
    hero.prepend(media);
    const control = document.createElement('button');
    control.type = 'button'; control.className = 'hpc-motion-control';
    media.after(control);
    let wanted = !reduced.matches && hero.dataset.catMotion !== 'off';
    let visible = true, failed = false, disposed = false, restTimer = null;
    let resting = false;
    function pause() { video.pause(); clearTimeout(restTimer); restTimer = null; }
    function update() {
      if (disposed) return;
      control.textContent = wanted ? 'Pause animation' : 'Play animation';
      control.setAttribute('aria-pressed', String(wanted));
      control.hidden = failed;
      if (!wanted || document.hidden || !visible || failed) { pause(); return; }
      if (resting) {
        if (!restTimer) restTimer = setTimeout(() => { restTimer = null; resting = false; video.currentTime = 0; update(); }, 4000);
        return;
      }
      if (!video.hasAttribute('src')) video.src = ASSETS + 'hero-desktop-motion.mp4';
      video.play().catch(error => {
        if (!disposed && error.name !== 'AbortError') { wanted = false; update(); }
      });
    }
    video.addEventListener('playing', () => media.setAttribute('data-playing', 'true'));
    video.addEventListener('error', () => {
      if (!video.hasAttribute('src')) return;
      failed = true; media.removeAttribute('data-playing'); update();
    });
    video.addEventListener('ended', () => {
      video.dataset.completedCycles = String(Number(video.dataset.completedCycles || 0) + 1);
      resting = true; update();
    });
    control.addEventListener('click', () => { wanted = !wanted; update(); });
    const preferenceChanged = () => { wanted = !reduced.matches && hero.dataset.catMotion !== 'off'; if (!wanted) media.removeAttribute('data-playing'); update(); };
    reduced.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', update);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, {threshold:0.05});
    intersection.observe(media);
    update();
    return { hero, preferenceChanged, dispose() {
      disposed = true; pause(); intersection.disconnect();
      reduced.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', update);
      video.removeAttribute('src'); video.load(); media.remove(); control.remove();
    }};
  }
  function sync(records) {
    const hero = document.body?.classList.contains('bg-halloween-pumpkin-cat') ? document.querySelector('.hp-hero') : null;
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
    if (active && records?.some(r => r.attributeName === 'data-cat-motion')) active.preferenceChanged();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','data-cat-motion']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
