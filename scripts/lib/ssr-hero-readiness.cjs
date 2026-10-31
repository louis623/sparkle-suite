// Executed in the page by the Smoke benchmark, identically for SSR and legacy.
// Opacity zero is a transition state, not a reason to skip an unready video.
function heroReadiness() {
  const hero = document.querySelector('.mhf-hero,.hp-hero,.tp-hero,.jp-hero');
  if (!hero) return { ready: false, reasons: ['hero missing'] };
  const cache = window.__heroBackgroundReadiness ||= {};
  const reasons = [], backgrounds = [], videos = [];
  function laidOut(el) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
    }
    return true;
  }
  for (const image of hero.querySelectorAll('img')) {
    if (laidOut(image) && (!image.complete || !image.naturalWidth)) reasons.push('image pending: ' + (image.currentSrc || image.src));
  }
  // Include legacy .hp-hero-media and every descendant/pseudo-element rather
  // than assuming only SSR's data-hero-media element owns the CSS background.
  for (const el of [hero, ...hero.querySelectorAll('*')]) {
    if (!laidOut(el)) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const background = getComputedStyle(el, pseudo).backgroundImage;
      let matches = [...background.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      if (background.includes('image-set(')) {
        // Wait for the browser-selected codec; never fetch the unused fallback
        // merely to check readiness and compete with the real animation.
        matches = matches.filter(m => performance.getEntriesByName(new URL(m[1], location.href).href).some(e => e.responseEnd > 0));
        if (!matches.length) { reasons.push('selected background pending: ' + background); continue; }
      }
      for (const match of matches) {
        const url = new URL(match[1], location.href).href;
        if (!cache[url]) cache[url] = { ready: false, error: false, painting: false };
        const state = cache[url];
        const completed = url.startsWith('data:') ? { responseEnd: 1, responseStatus: 200 }
          : performance.getEntriesByName(url).find(e => e.responseEnd > 0);
        // Observe the native request, never create another Image. A probe must
        // not redownload a no-cache legacy PNG or delay its actual video.
        if (completed && !state.painting) {
          state.error = completed.responseStatus >= 400;
          state.painting = true;
          requestAnimationFrame(() => requestAnimationFrame(() => { state.ready = !state.error; }));
        }
        backgrounds.push({ url, ...cache[url] });
        if (!cache[url].ready) reasons.push((cache[url].error ? 'background error: ' : 'background pending: ') + url);
      }
    }
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const video of hero.querySelectorAll('video')) {
    if (!laidOut(video)) continue;
    const src = video.currentSrc || video.src || video.querySelector('source')?.src || video.dataset.heroVideoSrc;
    if (!src) continue;
    const frames = video.getVideoPlaybackQuality?.().totalVideoFrames || video.webkitDecodedFrameCount || 0;
    const state = { src, readyState: video.readyState, paused: video.paused, ended: video.ended, currentTime: video.currentTime, frames, error: video.error?.code || null };
    videos.push(state);
    if (reduced) { if (!video.paused) reasons.push('reduced-motion video playing: ' + src); }
    else if (video.error || video.readyState < 2 || (!video.ended && video.paused) || video.currentTime <= 0 || !frames) reasons.push('video first frame pending: ' + src);
  }
  return { ready: reasons.length === 0, reasons, backgrounds, videos };
}

module.exports = { heroReadiness };
