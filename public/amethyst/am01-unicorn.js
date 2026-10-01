(function amethystUnicorn() {
  const assets = '/amethyst/skins/am01-unicorn/';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let active = null;
  function mount(hero) {
    const media = document.createElement('div');
    media.className = 'au-art'; media.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img');
    poster.src = assets + 'hero-poster.webp'; poster.alt = ''; poster.width = 1310; poster.height = 704;
    const video = document.createElement('video');
    video.className = 'au-video'; video.muted = true; video.playsInline = true; video.loop = false;
    video.volume = 0.85; video.preload = 'none'; video.tabIndex = -1;
    video.poster = assets + 'opening-poster.webp'; video.setAttribute('aria-hidden', 'true');
    media.append(poster, video); hero.prepend(media);
    const magic = document.createElement('div');
    magic.className = 'au-magic'; magic.setAttribute('aria-hidden', 'true');
    magic.innerHTML = '<svg viewBox="0 0 1400 760" preserveAspectRatio="none"><path d="M-90 190 Q250 420 680 310 T1500 200"/><path d="M-100 480 Q300 720 790 540 T1500 470"/><path d="M-80 660 Q410 500 870 660 T1510 600"/></svg>' +
      Array.from({length:12}, (_, i) => '<i style="--x:' + ((i * 29 + 7) % 97) + '%;--y:' + ((i * 37 + 9) % 93) + '%;--delay:-' + (i * 0.7) + 's"></i>').join('');
    hero.append(magic);
    const controls = document.createElement('div'); controls.className = 'au-controls';
    const motion = document.createElement('button'); motion.type = 'button';
    const sound = document.createElement('button'); sound.type = 'button';
    sound.title = 'Moonlit Magic · gentle ambience';
    controls.append(motion, sound); hero.append(controls);
    let wanted = !reduced.matches && hero.dataset.heroMotion !== 'off';
    let visible = false, disposed = false, failed = false, pending = false, finished = false;
    let showFinalPoster = !wanted;
    const canPlay = () => !disposed && wanted && visible && !document.hidden && !failed && !finished;
    function update() {
      if (disposed) return;
      motion.textContent = finished ? 'Play again' : wanted ? 'Pause animation' : 'Play animation';
      motion.setAttribute('aria-pressed', String(wanted && !finished));
      sound.textContent = video.muted ? 'Sound off' : 'Mute sound';
      sound.setAttribute('aria-label', video.muted ? 'Play with sound' : 'Mute sound');
      sound.setAttribute('aria-pressed', String(!video.muted));
      controls.hidden = failed;
      poster.src = assets + (showFinalPoster || failed ? 'hero-poster.webp' : 'opening-poster.webp');
      if (showFinalPoster || failed) media.removeAttribute('data-video');
      hero.setAttribute('data-unicorn-motion', canPlay() ? 'playing' : 'paused');
      if (!canPlay()) { video.pause(); return; }
      if (!video.hasAttribute('src')) video.src = assets + 'hero-motion.mp4';
      if (pending || !video.paused) return;
      pending = true;
      video.play().then(() => {
        pending = false;
        if (!canPlay()) video.pause();
      }).catch(error => {
        pending = false;
        if (disposed) return;
        if (error.name !== 'AbortError') { wanted = false; showFinalPoster = true; }
        update();
      });
    }
    const playing = () => { if (!disposed && !showFinalPoster && !failed) media.setAttribute('data-video', 'true'); };
    const ended = () => { if (!disposed) { finished = true; update(); } };
    const error = () => { if (!disposed && video.hasAttribute('src')) { failed = true; update(); } };
    video.addEventListener('playing', playing); video.addEventListener('ended', ended); video.addEventListener('error', error);
    motion.addEventListener('click', () => {
      if (finished) { video.currentTime = 0; finished = false; wanted = true; }
      else wanted = !wanted;
      if (wanted) showFinalPoster = false;
      update();
    });
    sound.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) {
        // An explicit gesture starts the quiet fade from the entrance, including
        // when the silent animation has already reached its final held pose.
        video.currentTime = 0; finished = false; wanted = true; showFinalPoster = false;
      }
      update();
    });
    const preferenceChanged = () => {
      wanted = !reduced.matches && hero.dataset.heroMotion !== 'off';
      showFinalPoster = !wanted; update();
    };
    reduced.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', update);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, {threshold:0.01});
    intersection.observe(hero); update();
    return {hero, preferenceChanged, dispose() {
      disposed = true; video.pause(); intersection.disconnect();
      reduced.removeEventListener('change', preferenceChanged); document.removeEventListener('visibilitychange', update);
      video.removeEventListener('playing', playing); video.removeEventListener('ended', ended); video.removeEventListener('error', error);
      video.removeAttribute('src'); video.load(); media.removeAttribute('data-video'); media.remove(); magic.remove(); controls.remove();
      hero.removeAttribute('data-unicorn-motion');
    }};
  }
  function sync(records) {
    const hero = document.querySelector('.hp-hero[data-appearance-preset="amethyst"]');
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
    if (active && records?.some(record => record.target === hero && record.attributeName === 'data-hero-motion')) active.preferenceChanged();
  }
  function start() {
    sync();
    new MutationObserver(sync).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['data-appearance-preset','data-hero-motion']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
