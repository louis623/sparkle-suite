import { buildSkinPreviewDocument } from '@/lib/amethyst/skin-preview'

/** Desktop viewport for the marketing card. Tall enough for the header, ticker, and the full hero, including the art margins. */
export const CHASING_UNICORNS_PREVIEW = { width: 1200, height: 980 } as const

/**
 * Marketing-only motion. The product player in am01-unicorn.js stays once-and-stop
 * with sound. This card loops a muted scene and never offers Play again.
 */
const marketingMotion = `(function marketingUnicorn() {
  var assets = '/amethyst/skins/am01-unicorn/';
  var reduced = matchMedia('(prefers-reduced-motion:reduce)');
  var active = null;
  function mount(hero) {
    var media = document.createElement('div');
    media.className = 'au-art';
    media.setAttribute('aria-hidden', 'true');
    var poster = document.createElement('img');
    poster.src = assets + 'hero-poster.webp';
    poster.alt = '';
    poster.width = 1310;
    poster.height = 704;
    var video = document.createElement('video');
    video.className = 'au-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'metadata';
    video.poster = assets + 'hero-poster.webp';
    video.width = 1310;
    video.height = 704;
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    media.append(poster, video);
    hero.prepend(media);
    var magic = document.createElement('div');
    magic.className = 'au-magic';
    magic.setAttribute('aria-hidden', 'true');
    magic.innerHTML = '<svg viewBox="0 0 1400 760" preserveAspectRatio="none"><path d="M-90 190 Q250 420 680 310 T1500 200"/><path d="M-100 480 Q300 720 790 540 T1500 470"/><path d="M-80 660 Q410 500 870 660 T1510 600"/></svg>' +
      Array.from({length:12}, function (_, i) { return '<i style="--x:' + ((i * 29 + 7) % 97) + '%;--y:' + ((i * 37 + 9) % 93) + '%;--delay:-' + (i * 0.7) + 's"></i>'; }).join('');
    hero.append(magic);
    var disposed = false;
    function still() { return reduced.matches; }
    function sync() {
      if (disposed) return;
      if (still() || document.hidden) {
        video.pause();
        media.removeAttribute('data-video');
        return;
      }
      if (!video.getAttribute('src')) video.src = assets + 'hero-motion.mp4';
      video.muted = true;
      video.loop = true;
      var play = video.play();
      if (play && play.catch) play.catch(function () { media.removeAttribute('data-video'); });
    }
    video.addEventListener('playing', function () {
      if (!disposed && !still()) media.setAttribute('data-video', 'true');
    });
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return { hero: hero, dispose: function () {
      disposed = true;
      video.pause();
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      media.remove();
      magic.remove();
    } };
  }
  function syncHero() {
    var hero = document.querySelector('.hp-hero[data-appearance-preset="amethyst"]');
    if (active && active.hero !== hero) { active.dispose(); active = null; }
    if (hero && !active) active = mount(hero);
  }
  function start() {
    syncHero();
    new MutationObserver(syncHero).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();`

export async function buildChasingUnicornsMarketingDocument(origin: string) {
  const document = await buildSkinPreviewDocument('amethyst', 'homepage', origin)
  if (!document.includes('function amethystUnicorn')) throw new Error('Amethyst homepage is missing the Chasing Unicorns runtime')
  let found = false
  const replaced = document.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (match, attrs, body) => {
    if (!body.includes('function amethystUnicorn')) return match
    found = true
    return `<script${attrs}>${marketingMotion}</script>`
  })
  if (!found) throw new Error('Could not replace the Chasing Unicorns product player')
  if (replaced.includes('Play again') || replaced.includes('video.loop = false') || !replaced.includes('hero-motion.mp4')) {
    throw new Error('Marketing preview still contains the product player')
  }
  return replaced
}
